import jsPDF from "jspdf";
import { FileRecord } from "./files-api";
import { nepaliMonthsEnglish } from "./nepali-date";

function buildPDF(file: FileRecord): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, w, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Wedding Tales Nepal", w / 2, 22, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("File Backup Confirmation Receipt", w / 2, 32, { align: "center" });

  doc.setFillColor(249, 115, 22);
  doc.rect(20, 48, w - 40, 1.5, "F");

  let y = 60;
  doc.setTextColor(30, 30, 30);

  const addRow = (label: string, value: string) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(label, 25, y);
    doc.setFont("helvetica", "normal");
    doc.text(value || "-", 80, y);
    y += 8;
  };

  const nepaliDate = (() => {
    if (file.event_year && file.event_month && file.event_day) {
      const mIdx = parseInt(String(file.event_month));
      const monthName = mIdx >= 1 && mIdx <= 12 ? nepaliMonthsEnglish[mIdx - 1] : String(file.event_month);
      return `${monthName} ${file.event_day}, ${file.event_year}`;
    }
    return file.registered_date_bs || "-";
  })();

  addRow("Client Name", file.client_name || "-");
  addRow("Event Name", file.event_name || "-");
  addRow("Date (BS)", nepaliDate);
  addRow("Date (AD)", file.event_date_ad || "-");
  addRow("Freelancer", file.freelancer_name || "-");
  addRow("Role", file.freelancer_type || "-");
  addRow("Side", file.side || "-");
  addRow("Card", file.card_label || "-");
  addRow("Format", file.format_type || "-");
  addRow("Size", file.size_gb ? `${file.size_gb} GB` : "-");

  y += 4;
  doc.setFillColor(226, 232, 240);
  doc.rect(25, y, w - 50, 0.5, "F");
  y += 10;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("1st Backup Details", 25, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  addRow("Device", file.backup_1_device_name || "-");
  addRow("Path", file.final_generated_path || "-");
  addRow("Backed Up At", file.backup_1_recorded_at
    ? new Date(file.backup_1_recorded_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "-"
  );
  addRow("Who Copied", file.who_copied || "-");

  y += 10;
  doc.setFillColor(249, 115, 22);
  doc.rect(20, y, w - 40, 0.5, "F");
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated on ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}`, w / 2, y, { align: "center" });
  y += 5;
  doc.text("Wedding Tales Nepal • File Management System", w / 2, y, { align: "center" });

  return doc;
}

export function generateConfirmationPDF(file: FileRecord): string {
  const doc = buildPDF(file);
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}

export function downloadConfirmationPDF(file: FileRecord) {
  const doc = buildPDF(file);
  const fileName = `WTN_Confirmation_${(file.client_name || "").replace(/\s+/g, "_")}_${file.freelancer_name || ""}.pdf`;
  doc.save(fileName);
}

export function getConfirmationPDFFile(file: FileRecord): File {
  const doc = buildPDF(file);
  const blob = doc.output("blob");
  const fileName = `WTN_Confirmation_${(file.client_name || "").replace(/\s+/g, "_")}_${(file.freelancer_name || "").replace(/\s+/g, "_")}.pdf`;
  return new File([blob], fileName, { type: "application/pdf" });
}
