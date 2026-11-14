import PDFDocument from "pdfkit";

export function createPrescriptionPdf({ patient, doctorName, hospitalName, specialty, record, prescriptions }) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 48, info: { Title: "Medical visit and prescription", Author: doctorName } });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    const fullName = [patient.firstName, patient.lastName].filter(Boolean).join(" ") || "Patient";
    document.fillColor("#173967").fontSize(22).font("Helvetica-Bold").text("Medical visit & prescription", { align: "center" });
    document.moveDown(0.35).fontSize(10).font("Helvetica").fillColor("#64748b").text("Confidential patient document", { align: "center" });
    document.moveDown(1.4);
    document.fillColor("#173967").fontSize(13).font("Helvetica-Bold").text("Patient details");
    document.moveDown(0.4).fontSize(10).font("Helvetica").fillColor("#1e293b");
    document.text(`Name: ${fullName}`);
    document.text(`Hospital: ${hospitalName}`);
    document.text(`Doctor: ${doctorName}`);
    document.text(`Specialty: ${specialty}`);
    document.text(`Date: ${new Date().toLocaleDateString("en-GB")}`);
    document.moveDown(1);
    document.fillColor("#173967").fontSize(13).font("Helvetica-Bold").text("Visit notes");
    document.moveDown(0.4).fillColor("#1e293b").fontSize(10).font("Helvetica");
    document.text(`Chief complaint: ${record.chiefComplaint || "Not recorded"}`, { lineGap: 3 });
    document.moveDown(0.4).text(`Diagnosis: ${record.diagnosis || "Not recorded"}`, { lineGap: 3 });
    document.moveDown(0.4).text(`Clinical notes: ${record.notes || "Not recorded"}`, { lineGap: 3 });
    document.moveDown(1);
    document.fillColor("#173967").fontSize(13).font("Helvetica-Bold").text("Prescriptions");
    document.moveDown(0.4);
    if (!prescriptions.length) {
      document.fillColor("#64748b").fontSize(10).font("Helvetica-Oblique").text("No medication prescribed for this visit.");
    } else {
      prescriptions.forEach((item, index) => {
        document.fillColor("#1e293b").fontSize(10).font("Helvetica-Bold").text(`${index + 1}. ${item.name}${item.strength ? ` — ${item.strength}` : ""}`);
        document.font("Helvetica").fillColor("#475569").text([item.dosage, item.frequency, item.durationDays ? `${item.durationDays} days` : "", item.instructions].filter(Boolean).join(" · ") || "No directions provided", { indent: 14, lineGap: 2 });
        document.moveDown(0.5);
      });
    }
    if (record.followUpDate) {
      document.moveDown(0.4).fillColor("#173967").font("Helvetica-Bold").text(`Follow-up: ${record.followUpDate}`);
    }
    document.moveDown(2).font("Helvetica-Oblique").fontSize(9).fillColor("#64748b").text("This document was generated from the treating doctor's visit record.", { align: "center" });
    document.end();
  });
}
