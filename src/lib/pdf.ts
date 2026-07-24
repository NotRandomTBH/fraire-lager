import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type DefectRow = {
  sizeLabel: string;
  quantity: number;
  reasons: string[];
  note: string | null;
  createdAt: Date;
  createdBy: string | null;
};

const PAGE_WIDTH = 595.28; // A4 in pt
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const ENTRY_LINE_HEIGHT = 16;

function formatDate(d: Date) {
  return d.toLocaleDateString("de-CH");
}

export async function buildDefectReportsPdf(rows: DefectRow[]): Promise<Uint8Array> {
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

  function drawText(text: string, options: { size?: number; bold?: boolean; color?: [number, number, number] } = {}) {
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

  drawText("Defekt-Protokoll — fraire", { size: 18, bold: true });
  drawText(`Erstellt am ${formatDate(new Date())}`, { size: 10, color: [0.4, 0.4, 0.4] });
  y -= 10;

  let totalQuantity = 0;

  rows.forEach((row, index) => {
    newPageIfNeeded(90);

    totalQuantity += row.quantity;

    drawText(`${index + 1}. Grösse ${row.sizeLabel} — ${row.quantity} Stück defekt`, {
      size: 12,
      bold: true,
    });
    drawText(`Datum: ${formatDate(row.createdAt)}${row.createdBy ? `   ·   Erfasst von: ${row.createdBy}` : ""}`, {
      color: [0.35, 0.35, 0.35],
    });

    if (row.reasons.length > 0) {
      drawText(`Defekt-Art: ${row.reasons.join(", ")}`);
    }

    if (row.note) {
      const wrapped = wrapText(`Notiz: ${row.note}`, 95);
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
  drawText(`Total: ${totalQuantity} Stück defekt (${rows.length} Einträge)`, { size: 11, bold: true });

  return doc.save();
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
