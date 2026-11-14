import { randomUUID } from "node:crypto";
import { getDoctorSession } from "../auth/doctorSessions.mjs";
import { prisma } from "../db/prisma.mjs";
import { decryptBuffer, decryptText } from "../utils/encryption.mjs";
import { createPrescriptionPdf } from "../utils/prescriptionPdf.mjs";
import { deleteR2Object, downloadLabReportPdf, downloadPrescriptionPdf, r2Configured, uploadPrescriptionPdf } from "../storage/r2.mjs";

const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const unavailable = () => json({ message: "Patient records could not be loaded. Check the database connection and try again." }, 503);

function activeDoctor(request) {
  return getDoctorSession(request);
}

async function patientForNationalId(nationalId) {
  const normalizedId = typeof nationalId === "string" ? nationalId.trim() : "";
  if (!normalizedId || normalizedId.length > 200) return null;
  return prisma.patients.findUnique({ where: { nationalID: normalizedId } });
}

async function ensurePatientForRecord(nationalId, patientName) {
  const normalizedId = typeof nationalId === "string" ? nationalId.trim() : "";
  if (!normalizedId || normalizedId.length > 200) return null;
  const name = typeof patientName === "string" ? patientName.trim().replace(/\s+/g, " ").slice(0, 300) : "";
  const existing = await patientForNationalId(normalizedId);
  if (existing || !name) return existing;

  const [firstName, ...lastParts] = name.split(" ");
  return prisma.patients.upsert({
    where: { nationalID: normalizedId },
    create: { nationalID: normalizedId, firstName, lastName: lastParts.join(" ") || null },
    update: {},
  });
}

function responseWithoutPrivateFields(record) {
  return {
    recordID: record.recordID,
    recordDATE: record.recordDATE,
    recordType: record.recordType,
    chiefComplaint: record.cheif_complaint,
    followUpDate: record.follow_up_date,
    caseStatus: record.caseStatus,
    prescriptionObjectKey: record.prescriptionObjectKey,
    diagnoses: record.RecordDiagnosis.map(({ Diagnosis, Diagnosisnotes }) => ({ diagnosis: Diagnosis, notes: Diagnosisnotes })),
    notes: record.ClinicalNotes.map(({ Notes }) => Notes).filter(Boolean),
    prescriptions: record.RecordMedicines.map(({ dosage, frequency, duration_days, Medications }) => ({
      name: Medications?.MedicineName,
      strength: Medications?.Strength,
      formula: Medications?.Formula,
      dosage,
      frequency,
      durationDays: duration_days,
    })),
  };
}

export async function getPatientMedicalRecords(request, nationalId) {
  if (!activeDoctor(request)) return json({ message: "Please sign in again to view patient records." }, 401);
  try {
    const patient = await patientForNationalId(nationalId);
    if (!patient) return json({ message: "No patient was found for this national ID." }, 404);
    const records = await prisma.medicalRecords.findMany({
      where: { patientID: patient.patientID },
      orderBy: [{ recordDATE: "desc" }, { recordID: "desc" }],
      include: { RecordDiagnosis: true, ClinicalNotes: true, RecordMedicines: { include: { Medications: true } } },
    });
    return json({ patient: { patientID: patient.patientID, nationalID: patient.nationalID, name: [patient.firstName, patient.lastName].filter(Boolean).join(" ") }, records: records.map(responseWithoutPrivateFields) });
  } catch (error) {
    console.error("Medical record read failed:", error);
    return unavailable();
  }
}

export async function createPatientMedicalRecord(request, nationalId) {
  const session = activeDoctor(request);
  if (!session) return json({ message: "Please sign in again before saving a medical record." }, 401);
  if (!r2Configured) return json({ message: "Prescription PDF storage is not configured. Add the Cloudflare R2 access key ID and secret access key to .env, then restart the backend." }, 503);

  let input;
  try { input = await request.json(); }
  catch { return json({ message: "Request body must be valid JSON." }, 400); }

  const complaint = typeof input?.chiefComplaint === "string" ? input.chiefComplaint.trim().slice(0, 4000) : "";
  const diagnosis = typeof input?.diagnosis === "string" ? input.diagnosis.trim().slice(0, 4000) : "";
  const notes = typeof input?.notes === "string" ? input.notes.trim().slice(0, 12000) : "";
  const followUpDate = typeof input?.followUpDate === "string" && input.followUpDate ? new Date(`${input.followUpDate}T00:00:00.000Z`) : null;
  const prescriptions = Array.isArray(input?.prescriptions) ? input.prescriptions.slice(0, 30).map((item) => ({
    name: typeof item?.name === "string" ? item.name.trim().slice(0, 180) : "",
    strength: typeof item?.strength === "string" ? item.strength.trim().slice(0, 100) : "",
    dosage: typeof item?.dosage === "string" ? item.dosage.trim().slice(0, 180) : "",
    frequency: typeof item?.frequency === "string" ? item.frequency.trim().slice(0, 180) : "",
    durationDays: Number.isInteger(Number(item?.durationDays)) && Number(item.durationDays) > 0 ? Number(item.durationDays) : null,
    instructions: typeof item?.instructions === "string" ? item.instructions.trim().slice(0, 500) : "",
  })).filter((item) => item.name) : [];
  if (!complaint && !diagnosis && !notes && prescriptions.length === 0) {
    return json({ message: "Add a complaint, diagnosis, clinical note, or prescription before saving." }, 400);
  }
  if (followUpDate && Number.isNaN(followUpDate.getTime())) return json({ message: "Enter a valid follow-up date." }, 400);

  let patient;
  try { patient = await ensurePatientForRecord(nationalId, input?.patientName); }
  catch (error) { console.error("Patient lookup failed:", error); return unavailable(); }
  if (!patient) return json({ message: "Patient details are incomplete. Return to the appointment and refresh the patient information before saving." }, 422);

  const recordInput = { chiefComplaint: complaint, diagnosis, notes, followUpDate: input.followUpDate || "" };
  const objectKey = `prescriptions/${patient.patientID}/${randomUUID()}.pdf`;
  let uploaded = false;
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: session.doctorId },
      select: {
        name: true,
        Hospitals: { select: { hospitalName: true } },
        Specialities: { select: { name: true } },
      },
    });
    const doctorName = doctor?.name?.trim() || session.doctorName || `Doctor ${session.doctorId}`;
    const hospitalName = doctor?.Hospitals?.hospitalName?.trim() || process.env.HOSPITAL_NAME?.trim() || "NHRX Hospital";
    const specialty = doctor?.Specialities?.name?.trim() || "Not specified";
    const pdf = await createPrescriptionPdf({ patient, doctorName, hospitalName, specialty, record: recordInput, prescriptions });
    await uploadPrescriptionPdf(objectKey, pdf);
    uploaded = true;

    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.medicalRecords.create({ data: {
        patientID: patient.patientID,
        doctorID: session.doctorId,
        recordDATE: new Date(),
        recordType: "CONSULTATION",
        cheif_complaint: complaint || null,
        follow_up_date: followUpDate,
        caseStatus: "COMPLETED",
        doctorSource: "DOCTOR",
        prescriptionObjectKey: objectKey,
      } });
      if (diagnosis) await tx.recordDiagnosis.create({ data: { recordID: created.recordID, Diagnosis: diagnosis } });
      if (notes) await tx.clinicalNotes.create({ data: { recordID: created.recordID, Notes: notes } });
      for (const item of prescriptions) {
        const medication = await tx.medications.create({ data: { MedicineName: item.name, Strength: item.strength || null } });
        await tx.recordMedicines.create({ data: {
          record_id: created.recordID,
          medicineID: medication.MedID,
          dosage: [item.dosage, item.instructions].filter(Boolean).join(" — ") || null,
          frequency: item.frequency || null,
          duration_days: item.durationDays,
        } });
      }
      return created;
    });
    return json({ message: "Medical record saved and prescription PDF uploaded.", record: { recordID: record.recordID, recordDATE: record.recordDATE, prescriptionObjectKey: objectKey } }, 201);
  } catch (error) {
    if (uploaded) await deleteR2Object(objectKey).catch((cleanupError) => console.error("Prescription cleanup failed:", cleanupError));
    if (error?.message === "R2_NOT_CONFIGURED") return json({ message: "Prescription PDF storage is not configured. Check the R2 credentials in .env." }, 503);
    console.error("Medical record create failed:", error);
    return unavailable();
  }
}

export async function getPatientReports(request, nationalId) {
  if (!activeDoctor(request)) return json({ message: "Please sign in again to view patient reports." }, 401);
  try {
    const patient = await patientForNationalId(nationalId);
    if (!patient) return json({ message: "No patient was found for this national ID." }, 404);
    const reports = await prisma.labReport.findMany({
      where: { patientId: patient.patientID },
      orderBy: { createdAt: "desc" },
      select: { id: true, fileName: true, fileType: true, noteEncrypted: true, createdAt: true, sentAt: true, request: { select: { testName: true, status: true } } },
    });
    return json({ reports: reports.map(({ noteEncrypted, ...report }) => {
      let note = null;
      try { note = decryptText(noteEncrypted); } catch { /* Keep report metadata available when old keys are unavailable. */ }
      return { ...report, note };
    }) });
  } catch (error) {
    console.error("Patient reports read failed:", error);
    return unavailable();
  }
}

export async function downloadPatientReport(request, nationalId, reportId) {
  if (!activeDoctor(request)) return json({ message: "Please sign in again to view patient reports." }, 401);
  try {
    const patient = await patientForNationalId(nationalId);
    if (!patient) return json({ message: "No patient was found for this national ID." }, 404);
    const report = await prisma.labReport.findFirst({ where: { id: Number(reportId), patientId: patient.patientID }, select: { fileName: true, fileType: true, fileEncrypted: true, objectKey: true } });
    if (!report) return json({ message: "Report not found." }, 404);
    const file = report.objectKey ? await downloadLabReportPdf(report.objectKey) : decryptBuffer(report.fileEncrypted);
    const filename = report.fileName.replace(/[\r\n"\\]/g, "_");
    return new Response(file, { headers: { "Content-Type": report.fileType || "application/octet-stream", "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Patient report download failed:", error);
    return json({ message: "This report could not be opened right now. Please try again." }, 503);
  }
}

export async function getPatientTests(request, nationalId) {
  if (!activeDoctor(request)) return json({ message: "Please sign in again to view patient tests." }, 401);
  try {
    const patient = await patientForNationalId(nationalId);
    if (!patient) return json({ message: "No patient was found for this national ID." }, 404);
    const [results, requests] = await Promise.all([
      prisma.medical_record_tests.findMany({ where: { MedicalRecords: { patientID: patient.patientID } }, orderBy: { performed_at: "desc" }, include: { medical_tests: true } }),
      prisma.labTestRequest.findMany({ where: { patientId: patient.patientID }, orderBy: { createdAt: "desc" }, select: { id: true, testName: true, status: true, createdAt: true } }),
    ]);
    return json({ tests: results.map((item) => ({ id: item.id, name: item.medical_tests.name, performedAt: item.performed_at, status: item.status, result: item.result })), requests });
  } catch (error) {
    console.error("Patient tests read failed:", error);
    return unavailable();
  }
}

export async function downloadPrescription(request, nationalId, recordId) {
  if (!activeDoctor(request)) return json({ message: "Please sign in again to view prescriptions." }, 401);
  try {
    const patient = await patientForNationalId(nationalId);
    if (!patient) return json({ message: "No patient was found for this national ID." }, 404);
    const record = await prisma.medicalRecords.findFirst({ where: { recordID: Number(recordId), patientID: patient.patientID }, select: { prescriptionObjectKey: true } });
    if (!record?.prescriptionObjectKey) return json({ message: "No prescription PDF is attached to this record." }, 404);
    const pdf = await downloadPrescriptionPdf(record.prescriptionObjectKey);
    return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="prescription-${recordId}.pdf"`, "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Prescription PDF read failed:", error);
    return json({ message: "Prescription PDF could not be downloaded from R2." }, 502);
  }
}
