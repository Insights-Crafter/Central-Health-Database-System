import PDFDocument from "pdfkit";

export function createLabReportPdf({ reportId, patientName, testName, testMethod, parameters, sampleQuality, technicalObservations, note, staffName, department, requestedAt }) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margin: 52,
      info: { Title: `${testName} report`, Author: staffName || "Laboratory staff" },
    });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.fillColor("#075b50").font("Helvetica-Bold").fontSize(22).text("Laboratory test report", { align: "center" });
    document.moveDown(0.3).fillColor("#64748b").font("Helvetica").fontSize(10).text("Confidential clinical document", { align: "center" });
    document.moveDown(1.5).fillColor("#123b38").font("Helvetica-Bold").fontSize(13).text("Report details");
    document.moveDown(0.5).fillColor("#1e293b").font("Helvetica").fontSize(10);
    document.text(`Patient: ${patientName || "Patient details unavailable"}`);
    document.text(`Report ID: ${reportId}`);
    document.text(`Test: ${testName}`);
    if (testMethod) document.text(`Test method: ${testMethod}`);
    document.text(`Requested: ${new Date(requestedAt).toLocaleString("en-GB")}`);
    document.text(`Reported: ${new Date().toLocaleString("en-GB")}`);
    document.text(`Prepared by: ${staffName || "Laboratory staff"}${department ? ` · ${department}` : ""}`);

    document.moveDown(1).fillColor("#075b50").font("Helvetica-Bold").fontSize(13).text("Test results");
    const columns = [
      { key: "parameter", label: "Parameter", width: 88 },
      { key: "result", label: "Result", width: 68 },
      { key: "unit", label: "Unit", width: 48 },
      { key: "referenceRange", label: "Reference range", width: 94 },
      { key: "flag", label: "Flag", width: 64 },
      { key: "remarks", label: "Remarks", width: 129 },
    ];
    const tableX = document.page.margins.left;
    const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
    const drawTableHeader = () => {
      let x = tableX;
      const y = document.y;
      document.font("Helvetica-Bold").fontSize(8).fillColor("#334155");
      for (const column of columns) {
        document.rect(x, y, column.width, 23).fillAndStroke("#f1f5f9", "#cbd5e1");
        document.text(column.label, x + 4, y + 7, { width: column.width - 8, height: 12, lineBreak: false });
        x += column.width;
      }
      document.y = y + 23;
    };
    document.font("Helvetica").fontSize(8);
    drawTableHeader();
    for (const parameter of parameters) {
      const values = columns.map((column) => String(parameter[column.key] || "—"));
      document.font("Helvetica").fontSize(8);
      const rowHeight = Math.max(27, ...values.map((value, index) => document.heightOfString(value, { width: columns[index].width - 8 }) + 10));
      if (document.y + rowHeight > document.page.height - document.page.margins.bottom) {
        document.addPage();
        drawTableHeader();
      }
      let x = tableX;
      const y = document.y;
      for (let index = 0; index < columns.length; index += 1) {
        const column = columns[index];
        document.rect(x, y, column.width, rowHeight).stroke("#e2e8f0");
        document.fillColor(index === 4 && values[index] !== "Normal" && values[index] !== "Not assessed" ? "#b45309" : "#1e293b")
          .font("Helvetica").fontSize(8).text(values[index], x + 4, y + 6, { width: column.width - 8, height: rowHeight - 10 });
        x += column.width;
      }
      document.y = y + rowHeight;
    }
    if (sampleQuality || technicalObservations) {
      document.moveDown(1).fillColor("#075b50").font("Helvetica-Bold").fontSize(13).text("Technician observations");
      document.moveDown(0.4).fillColor("#1e293b").font("Helvetica").fontSize(11);
      if (sampleQuality) document.text(`Sample quality: ${sampleQuality}`, { lineGap: 4 });
      if (technicalObservations) document.moveDown(0.3).text(technicalObservations, { lineGap: 4 });
    }
    if (note) {
      document.moveDown(1).fillColor("#075b50").font("Helvetica-Bold").fontSize(13).text("Note for the care team");
      document.moveDown(0.4).fillColor("#1e293b").font("Helvetica").fontSize(11).text(note, { lineGap: 4 });
    }
    document.moveDown(2).fillColor("#64748b").font("Helvetica-Oblique").fontSize(9).text("This report was prepared by the laboratory team and filed to the patient record.", { align: "center" });
    document.end();
  });
}
