import type { jsPDF as JsPDF } from "jspdf";
import type { RwProgress, RwWeeklySummary } from "@/lib/rw-progress";

const GREEN: [number, number, number] = [20, 116, 82];
const INK: [number, number, number] = [25, 45, 52];
const MUTED: [number, number, number] = [92, 108, 112];
const PALE: [number, number, number] = [235, 247, 240];

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function header(pdf: JsPDF, title: string, subtitle: string) {
  pdf.setFillColor(...GREEN);
  pdf.rect(0, 0, 210, 35, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("OPENDOORSCLASS · READING WORKSHOP", 15, 13);
  pdf.setFontSize(20);
  pdf.text(title, 15, 25);
  pdf.setTextColor(...MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(subtitle, 15, 43);
}

function footer(pdf: JsPDF) {
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(220, 230, 224);
    pdf.line(15, 282, 195, 282);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED);
    pdf.text("OpenDoorsClass · Rapport généré depuis l'espace Reading Workshop", 15, 288);
    pdf.text(`${page} / ${pages}`, 195, 288, { align: "right" });
  }
}

function ensureSpace(pdf: JsPDF, y: number, needed = 20): number {
  if (y + needed <= 274) return y;
  pdf.addPage();
  return 18;
}

function statGrid(pdf: JsPDF, y: number, stats: [string, string][]) {
  const width = 42;
  stats.slice(0, 4).forEach(([label, value], index) => {
    const x = 15 + index * 45;
    pdf.setFillColor(...PALE);
    pdf.roundedRect(x, y, width, 23, 2, 2, "F");
    pdf.setTextColor(...MUTED);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(label.toUpperCase(), x + 3, y + 7);
    pdf.setTextColor(...INK);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(value, x + 3, y + 17);
  });
}

export type RwIndividualPdfInput = {
  name: string;
  level: string;
  coach: string;
  progress: RwProgress;
  weekly: RwWeeklySummary;
  series: RwWeeklySummary[];
  comprehension: number | null;
};

export async function createRwIndividualPdf(input: RwIndividualPdfInput): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  header(pdf, "Bilan individuel", `${input.name} · Niveau ${input.level} · ${input.weekly.window.label}`);
  let y = 52;
  statGrid(pdf, y, [
    ["Programme", `${input.progress.percent} %`],
    ["Validées", `${input.progress.validated} / 120`],
    ["Cette semaine", `${input.weekly.validated} / 6`],
    ["Moyenne", input.weekly.averageScore === null ? "Aucune" : `${input.weekly.averageScore}/20`],
  ]);
  y += 33;
  pdf.setTextColor(...INK);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Compétences", 15, y);
  y += 8;
  const skills: [string, number | null][] = [
    ["Compréhension", input.comprehension],
    ["Lecture orale", input.progress.skills.reading],
    ["Prononciation", input.progress.skills.pronunciation],
    ["Fluidité", input.progress.skills.fluency],
  ];
  for (const [label, value] of skills) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...INK);
    pdf.text(label, 15, y);
    pdf.setFillColor(230, 236, 232);
    pdf.roundedRect(70, y - 4, 90, 5, 2, 2, "F");
    if (value !== null) {
      pdf.setFillColor(...GREEN);
      pdf.roundedRect(70, y - 4, Math.max(2, (90 * value) / 20), 5, 2, 2, "F");
    }
    pdf.setFont("helvetica", "bold");
    pdf.text(value === null ? "Pas de note" : `${value}/20`, 195, y, { align: "right" });
    y += 10;
  }
  y += 6;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Évolution sur six semaines", 15, y);
  y += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  for (const week of input.series) {
    y = ensureSpace(pdf, y, 10);
    pdf.setTextColor(...MUTED);
    pdf.text(week.window.label, 15, y);
    pdf.setTextColor(...INK);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${week.validated} validée${week.validated > 1 ? "s" : ""}`, 92, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(week.averageScore === null ? "Pas de moyenne" : `Moyenne ${week.averageScore}/20`, 195, y, { align: "right" });
    y += 8;
  }
  y += 5;
  y = ensureSpace(pdf, y, 35);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(...INK);
  pdf.text("Recommandations", 15, y);
  y += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  for (const recommendation of input.progress.recommendations.slice(0, 4)) {
    const lines = pdf.splitTextToSize(`· ${recommendation}`, 175);
    pdf.text(lines, 18, y);
    y += lines.length * 6 + 2;
    y = ensureSpace(pdf, y, 12);
  }
  y += 4;
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text(`Coach : ${input.coach || "Non attribué"}`, 15, ensureSpace(pdf, y, 8));
  footer(pdf);
  return pdf.output("blob");
}

export type RwGroupPdfRow = {
  name: string;
  level: string;
  coach: string;
  progress: RwProgress;
  weekly: RwWeeklySummary;
};

export async function createRwGroupPdf(rows: RwGroupPdfRow[], period: string): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  header(pdf, "Rapport hebdomadaire", `${period} · ${rows.length} apprenant${rows.length > 1 ? "s" : ""}`);
  let y = 53;
  const totalValidated = rows.reduce((sum, row) => sum + row.weekly.validated, 0);
  const needingAttention = rows.filter((row) => row.progress.behind > 0 || row.progress.redo > 0).length;
  statGrid(pdf, y, [
    ["Apprenants", String(rows.length)],
    ["Validations", String(totalValidated)],
    ["À accompagner", String(needingAttention)],
    ["Objectif", "6 / semaine"],
  ]);
  y += 36;
  for (const row of rows) {
    y = ensureSpace(pdf, y, 32);
    pdf.setFillColor(...PALE);
    pdf.roundedRect(15, y - 5, 180, 28, 2, 2, "F");
    pdf.setTextColor(...INK);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(row.name, 20, y + 2);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED);
    pdf.text(`Niveau ${row.level} · Coach : ${row.coach || "Non attribué"}`, 20, y + 8);
    pdf.setTextColor(...INK);
    pdf.setFontSize(9);
    pdf.text(`${row.weekly.validated}/6 cette semaine · ${row.progress.validated}/120 au total`, 20, y + 16);
    pdf.text(`Progression ${row.progress.percent} % · ${row.progress.behind} de retard · ${row.progress.redo} reprise${row.progress.redo > 1 ? "s" : ""}`, 20, y + 22);
    y += 34;
  }
  footer(pdf);
  return pdf.output("blob");
}

export async function downloadRwIndividualPdf(input: RwIndividualPdfInput, filename: string) {
  downloadBlob(await createRwIndividualPdf(input), filename);
}

export async function downloadRwGroupPdf(rows: RwGroupPdfRow[], period: string, filename: string) {
  downloadBlob(await createRwGroupPdf(rows, period), filename);
}
