import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma.mjs";
import { createLabSession, getLabSession } from "../auth/labSessions.mjs";
import { verifyPassword } from "../auth/passwords.mjs";
import { getDoctorSession } from "../auth/doctorSessions.mjs";
import { encryptText } from "../utils/encryption.mjs";
import { createLabReportPdf } from "../utils/labReportPdf.mjs";
import { deleteLabReportPdf, downloadLabReportPdf, r2LabConfigured, uploadLabReportPdf } from "../storage/r2.mjs";

const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const missingDoctor = () => json({ message: "Please sign in again to continue." }, 401);
const missingLabStaff = () => json({ message: "Please sign in to the laboratory workspace again." }, 401);

function patientDisplayName(patient) {
  const name = [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim();
  if (!name) return "Patient details unavailable";
  if (name.length > 100 || /^[a-f\d]{32,}$/i.test(name) || /^[A-Za-z0-9+/_=-]{48,}$/.test(name)) {
    return "Patient details unavailable";
  }
  return name;
}

export async function loginLabStaff(request) {
  let input;
  try { input = await request.json(); } catch { return json({ message: "Enter your username and password." }, 400); }
  const username = typeof input?.username === "string" ? input.username.trim().toLowerCase() : "";
  const password = typeof input?.password === "string" ? input.password : "";
  if (!username || !password || username.length > 120 || password.length > 200) return json({ message: "Enter your username and password." }, 400);
  try {
    const account = await prisma.labStaffAuthentication.findUnique({ where: { username }, include: { staff: true } });
    if (!account || !await verifyPassword(password, account.passwordHash)) return json({ message: "Those sign-in details were not recognized." }, 401);
    const token = createLabSession(account.staffId);
    return json({ token, role: "LAB", staffId: account.staff.id, name: account.staff.name, department: account.staff.department, roleTitle: account.staff.role, expiresIn: 28800 });
  } catch (error) {
    console.error("Lab staff login failed:", error);
    return json({ message: "Lab sign-in is temporarily unavailable. Please try again." }, 503);
  }
}

export async function createLabTestRequest(request, nationalId) {
  const doctor = getDoctorSession(request);
  if (!doctor) return missingDoctor();
  let input;
  try { input = await request.json(); } catch { return json({ message: "Enter the test details and try again." }, 400); }
  const testName = typeof input?.testName === "string" ? input.testName.trim().slice(0, 150) : "";
  if (!testName) return json({ message: "Add a test name before sending this request." }, 400);
  try {
    const patient = await prisma.patients.findUnique({ where: { nationalID: nationalId }, select: { patientID: true, firstName: true, lastName: true } });
    if (!patient) return json({ message: "We couldn’t find this patient. Check the patient ID and try again." }, 404);
    const item = await prisma.labTestRequest.create({ data: {
      patientId: patient.patientID,
      testName,
      requestedBy: `Doctor ${doctor.doctorId}`,
      requestedByDoctorId: doctor.doctorId,
      requestedByDoctorSource: "DOCTOR",
    }, select: { id: true, testName: true, status: true, createdAt: true } });
    return json({ request: item, message: "Test request sent to the laboratory." }, 201);
  } catch (error) {
    console.error("Lab test request creation failed:", error);
    return json({ message: "The test request couldn’t be sent. Please try again." }, 503);
  }
}

export async function getLabRequests(request) {
  if (!getLabSession(request)) return missingLabStaff();
  try {
    const requests = await prisma.labTestRequest.findMany({
      where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: { patient: { select: { patientID: true, nationalID: true, firstName: true, lastName: true, date_of_birth: true } } },
    });
    return json(requests.map((item) => ({
      id: item.id, testName: item.testName, status: item.status, requestedBy: item.requestedBy, createdAt: item.createdAt,
      patientName: patientDisplayName(item.patient),
    })));
  } catch (error) {
    console.error("Lab worklist read failed:", error);
    return json({ message: "The lab worklist is unavailable right now." }, 503);
  }
}

export async function uploadLabReport(request, requestId) {
  const session = getLabSession(request);
  if (!session) return missingLabStaff();
  if (!r2LabConfigured) return json({ message: "Lab report storage is not ready yet. Ask your administrator to finish storage setup." }, 503);
  let input;
  try { input = await request.json(); } catch { return json({ message: "Enter the report results and try again." }, 400); }
  const parameters = Array.isArray(input?.parameters) ? input.parameters.slice(0, 100).map((row) => ({
    parameter: typeof row?.parameter === "string" ? row.parameter.trim().slice(0, 160) : "",
    result: typeof row?.result === "string" ? row.result.trim().slice(0, 160) : "",
    unit: typeof row?.unit === "string" ? row.unit.trim().slice(0, 60) : "",
    referenceRange: typeof row?.referenceRange === "string" ? row.referenceRange.trim().slice(0, 120) : "",
    flag: ["Not assessed", "Normal", "Low", "High", "Critical"].includes(row?.flag) ? row.flag : "Not assessed",
    remarks: typeof row?.remarks === "string" ? row.remarks.trim().slice(0, 500) : "",
  })).filter((row) => row.parameter && row.result) : [];
  const testMethod = typeof input?.testMethod === "string" ? input.testMethod.trim().slice(0, 250) : "";
  const sampleQuality = typeof input?.sampleQuality === "string" ? input.sampleQuality.trim().slice(0, 100) : "";
  const technicalObservations = typeof input?.technicalObservations === "string" ? input.technicalObservations.trim().slice(0, 4000) : "";
  const note = typeof input?.additionalRemarks === "string" ? input.additionalRemarks.trim().slice(0, 2000) : "";
  if (!parameters.length) return json({ message: "Add at least one parameter and result before filing the report." }, 400);

  let work;
  let staff;
  try {
    [work, staff] = await Promise.all([
      prisma.labTestRequest.findUnique({
        where: { id: Number(requestId) },
        include: { report: true, patient: { select: { firstName: true, lastName: true } } },
      }),
      prisma.labStaff.findUnique({ where: { id: session.staffId }, select: { name: true, department: true } }),
    ]);
    if (!work) return json({ message: "This test request is no longer available." }, 404);
    if (work.report || work.status === "COMPLETED") return json({ message: "A report has already been filed for this test." }, 409);
  } catch (error) {
    console.error("Lab request lookup failed:", error);
    return json({ message: "This test request couldn’t be opened. Refresh and try again." }, 503);
  }

  const objectKey = `${work.patientId}/${work.id}/${randomUUID()}.pdf`;
  let storedObjectKey;
  let uploaded = false;
  try {
    const pdf = await createLabReportPdf({
      reportId: `LAB-${new Date(work.createdAt).getFullYear()}-${String(work.id).padStart(6, "0")}`,
      patientName: patientDisplayName(work.patient), testName: work.testName, testMethod, parameters, sampleQuality, technicalObservations, note,
      staffName: staff?.name, department: staff?.department, requestedAt: work.createdAt,
    });
    storedObjectKey = await uploadLabReportPdf(objectKey, pdf);
    uploaded = true;
    const safeTestName = work.testName.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "test";
    const saved = await prisma.$transaction(async (tx) => {
      const report = await tx.labReport.create({ data: {
        requestId: work.id, patientId: work.patientId, fileName: `${safeTestName}-report.pdf`,
        fileType: "application/pdf", objectKey: storedObjectKey, noteEncrypted: note ? encryptText(note) : null, uploadedBy: session.staffId,
      }, select: { id: true, createdAt: true } });
      await tx.labTestRequest.update({ where: { id: work.id }, data: { status: "COMPLETED" } });
      return report;
    });
    return json({ message: "Report saved securely and attached to the patient’s test.", report: saved }, 201);
  } catch (error) {
    if (uploaded) await deleteLabReportPdf(storedObjectKey).catch((cleanupError) => console.error("Lab report cleanup failed:", cleanupError));
    console.error("Lab report upload failed:", error);
    return json({ message: "The report couldn’t be filed. Your selected file is still available; please try again." }, 503);
  }
}

export async function downloadLabReport(request, reportId, audience) {
  if (audience === "lab" ? !getLabSession(request) : !getDoctorSession(request)) return audience === "lab" ? missingLabStaff() : missingDoctor();
  try {
    const report = await prisma.labReport.findUnique({ where: { id: Number(reportId) }, select: { objectKey: true, fileEncrypted: true, fileName: true } });
    if (!report) return json({ message: "This report is no longer available." }, 404);
    const file = report.objectKey ? await downloadLabReportPdf(report.objectKey) : report.fileEncrypted;
    if (!file) return json({ message: "This report couldn’t be opened. Please contact your administrator." }, 503);
    const filename = (report.fileName || "lab-report.pdf").replace(/[\r\n"\\]/g, "_");
    return new Response(file, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Lab report download failed:", error);
    return json({ message: "This report couldn’t be opened right now. Please try again." }, 503);
  }
}
