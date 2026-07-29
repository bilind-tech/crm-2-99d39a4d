// pdfmake serverseitig: einmaliger PdfPrinter mit Standard-PDF-Schriften (Helvetica).
// PDFKit liefert die 14 Standard-PDF-Fonts intern; kein VFS nötig.
//
// Hinweis: Im Frontend wird "Roboto" verwendet, im Backend "Helvetica".
// Strukturelles Layout ist identisch — minimale Glyphen-Unterschiede sind akzeptabel.

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// pdfmake hat keine sauberen TS-Typen für Server-Use — daher hier dezent any.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrinter = any;

/**
 * Sucht die mitgelieferte Madani-Schrift. Sie liegt im Repo unter
 * `src/pdf/fonts/` und wird beim Build nach `dist/pdf/fonts/` kopiert.
 */
function findMadani(): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const file = "Madani-Thin.ttf";
  const candidates = [
    path.join(here, "fonts", file),
    path.join(here, "..", "..", "src", "pdf", "fonts", file),
    path.join(process.cwd(), "src", "pdf", "fonts", file),
    path.join(process.cwd(), "dist", "pdf", "fonts", file),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

const MADANI_PATH = findMadani();

/** Schriftfamilie für den Stundenzettel — fällt auf Helvetica zurück. */
export const STUNDENZETTEL_FONT = MADANI_PATH ? "Madani" : "Helvetica";

const FONTS: Record<string, Record<string, string>> = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

if (MADANI_PATH) {
  // Die DEMO-Schrift hat nur einen Schnitt — bold/italic zeigen auf dieselbe Datei.
  FONTS.Madani = {
    normal: MADANI_PATH,
    bold: MADANI_PATH,
    italics: MADANI_PATH,
    bolditalics: MADANI_PATH,
  };
}

let printerSingleton: AnyPrinter | null = null;

export function getPrinter(): AnyPrinter {
  if (printerSingleton) return printerSingleton;
  // pdfmake hat keine ESM-Exports — via createRequire CommonJS laden.
  const requireCjs = createRequire(import.meta.url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PdfPrinter: any = requireCjs("pdfmake/src/printer.js");
  printerSingleton = new PdfPrinter(FONTS);
  return printerSingleton;
}

export const DEFAULT_FONT = "Helvetica";
