import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { defectItemLabel } from "@/lib/labels";

type DefectRow = {
  itemLabel: string;
  quantity: number;
  reasons: string[];
  note: string | null;
  createdAt: Date;
  createdBy: string | null;
};

type Labels = {
  title: string;
  createdOn: (date: string) => string;
  entryHeading: (index: number, itemLabel: string, quantity: number) => string;
  date: string;
  reportedBy: string;
  defectType: string;
  note: string;
  total: (quantity: number, count: number) => string;
  locale: string;
};

const PAGE_WIDTH = 595.28; // A4 in pt
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const ENTRY_LINE_HEIGHT = 16;

// Feste Übersetzung der vorbereiteten Defekt-Arten. Frei getippte
// (individuelle) Arten oder Notizen werden nicht automatisch übersetzt und
// bleiben auf Deutsch stehen.
const REASON_PT: Record<string, string> = {
  "Naht geplatzt": "Costura rebentada",
  "Loch": "Buraco",
  "Fleck": "Mancha",
  "Verfärbung": "Descoloração",
  "Falsche Grösse": "Tamanho errado",
  "Elastikband defekt": "Elástico defeituoso",
  "Fehlerhafter Druck": "Impressão defeituosa",
  "Defekte Naht": "Costura defeituosa",
};

function translateReason(label: string): string {
  return REASON_PT[label] ?? label;
}

// Übersetzt das (schon fertig formatierte) itemLabel eines Eintrags
// ("Grösse S", "Verpackung 3er", "Versandkarton") für die PT-Seite.
function translateItemLabel(label: string): string {
  if (label.startsWith("Grösse ")) return `Tamanho ${label.slice("Grösse ".length)}`;
  if (label.startsWith("Verpackung ")) return `Embalagem ${label.slice("Verpackung ".length)}`;
  if (label === "Versandkarton") return "Caixa de envio";
  return label;
}

const LABELS_DE: Labels = {
  title: "Defekt-Protokoll — fraire",
  createdOn: (d: string) => `Erstellt am ${d}`,
  entryHeading: (i, itemLabel, qty) => `${i}. ${itemLabel} — ${qty} Stück defekt`,
  date: "Datum",
  reportedBy: "Erfasst von",
  defectType: "Defekt-Art",
  note: "Notiz",
  total: (qty, count) => `Total: ${qty} Stück defekt (${count} Einträge)`,
  locale: "de-CH",
};

const LABELS_PT: Labels = {
  title: "Relatório de Defeitos — fraire",
  createdOn: (d: string) => `Criado em ${d}`,
  entryHeading: (i, itemLabel, qty) => `${i}. ${itemLabel} — ${qty} peças com defeito`,
  date: "Data",
  reportedBy: "Registado por",
  defectType: "Tipo de defeito",
  note: "Nota",
  total: (qty, count) => `Total: ${qty} peças com defeito (${count} registos)`,
  locale: "pt-PT",
};

function formatDate(d: Date, locale: string) {
  return d.toLocaleDateString(locale);
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawSection(
  doc: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  rows: DefectRow[],
  labels: Labels,
  translateReasons: boolean,
) {
  let page: PDFPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function newPageIfNeeded(neededHeight: number) {
    if (y - neededHeight < MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  }

  function drawText(
    text: string,
    options: { size?: number; bold?: boolean; color?: [number, number, number] } = {},
  ) {
    const size = options.size ?? 10;
    page.drawText(text, {
      x: MARGIN,
      y,
      size,
      font: options.bold ? bold : font,
      color: rgb(...(options.color ?? [0.1, 0.1, 0.1])),
    });
    y -= ENTRY_LINE_HEIGHT;
  }

  drawText(labels.title, { size: 18, bold: true });
  drawText(labels.createdOn(formatDate(new Date(), labels.locale)), {
    size: 10,
    color: [0.4, 0.4, 0.4],
  });
  y -= 10;

  let totalQuantity = 0;

  rows.forEach((row, index) => {
    newPageIfNeeded(90);
    totalQuantity += row.quantity;

    const itemLabel = translateReasons ? translateItemLabel(row.itemLabel) : row.itemLabel;
    drawText(labels.entryHeading(index + 1, itemLabel, row.quantity), {
      size: 12,
      bold: true,
    });
    drawText(
      `${labels.date}: ${formatDate(row.createdAt, labels.locale)}${
        row.createdBy ? `   ·   ${labels.reportedBy}: ${row.createdBy}` : ""
      }`,
      { color: [0.35, 0.35, 0.35] },
    );

    if (row.reasons.length > 0) {
      const reasons = translateReasons ? row.reasons.map(translateReason) : row.reasons;
      drawText(`${labels.defectType}: ${reasons.join(", ")}`);
    }

    if (row.note) {
      const wrapped = wrapText(`${labels.note}: ${row.note}`, 95);
      for (const line of wrapped) {
        newPageIfNeeded(ENTRY_LINE_HEIGHT);
        drawText(line);
      }
    }

    y -= 8;
    newPageIfNeeded(2);
    page.drawLine({
      start: { x: MARGIN, y: y + 4 },
      end: { x: PAGE_WIDTH - MARGIN, y: y + 4 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 10;
  });

  newPageIfNeeded(30);
  y -= 6;
  drawText(labels.total(totalQuantity, rows.length), { size: 11, bold: true });
}

export async function buildDefectReportsPdf(rows: DefectRow[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  drawSection(doc, font, bold, rows, LABELS_DE, false);
  drawSection(doc, font, bold, rows, LABELS_PT, true);

  return doc.save();
}

type StockExitRow = {
  itemType: string; // "UNTERHOSE" | "VERPACKUNGSMATERIAL" | "KARTON"
  sizeLabel: string | null;
  packSize: number | null;
  quantity: number;
  reason: string;
  recipient: string | null;
  date: Date;
  createdBy: string | null;
};

function stockExitHeading(row: StockExitRow): string {
  if (row.itemType === "VERPACKUNGSMATERIAL") {
    return `Verpackungsmaterial ${row.packSize}er — ${row.quantity} Stück`;
  }
  if (row.itemType === "KARTON") {
    return `Versandkarton — ${row.quantity} Stück`;
  }
  const packLabel = row.packSize
    ? `${row.quantity} × ${row.packSize}er-Packung`
    : `${row.quantity} Stück (lose)`;
  return `Grösse ${row.sizeLabel ?? "?"} — ${packLabel}`;
}

export async function buildStockExitsPdf(rows: StockExitRow[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function newPageIfNeeded(neededHeight: number) {
    if (y - neededHeight < MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  }

  function drawText(
    text: string,
    options: { size?: number; bold?: boolean; color?: [number, number, number] } = {},
  ) {
    const size = options.size ?? 10;
    page.drawText(text, {
      x: MARGIN,
      y,
      size,
      font: options.bold ? bold : font,
      color: rgb(...(options.color ?? [0.1, 0.1, 0.1])),
    });
    y -= ENTRY_LINE_HEIGHT;
  }

  drawText("Austrags-Protokoll — fraire", { size: 18, bold: true });
  drawText(`Erstellt am ${formatDate(new Date(), "de-CH")}`, { size: 10, color: [0.4, 0.4, 0.4] });
  y -= 10;

  let totalUnits = 0;

  rows.forEach((row, index) => {
    newPageIfNeeded(90);

    const units = row.itemType === "UNTERHOSE" && row.packSize ? row.quantity * row.packSize : row.quantity;
    totalUnits += units;

    drawText(`${index + 1}. ${stockExitHeading(row)}`, { size: 12, bold: true });
    drawText(
      `Datum: ${formatDate(row.date, "de-CH")}${row.createdBy ? `   ·   Ausgetragen von: ${row.createdBy}` : ""}`,
      { color: [0.35, 0.35, 0.35] },
    );
    drawText(`Begründung: ${row.reason}`);
    if (row.recipient) {
      drawText(`Empfänger: ${row.recipient}`);
    }

    y -= 8;
    newPageIfNeeded(2);
    page.drawLine({
      start: { x: MARGIN, y: y + 4 },
      end: { x: PAGE_WIDTH - MARGIN, y: y + 4 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 10;
  });

  newPageIfNeeded(30);
  y -= 6;
  drawText(`Total: ${rows.length} Positionen, ${totalUnits} Stück gesamt`, { size: 11, bold: true });

  return doc.save();
}
