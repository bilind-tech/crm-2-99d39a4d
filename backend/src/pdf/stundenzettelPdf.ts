// Stundenzettel-PDF (Phase 4).
// A4 Hochformat, Logo zentriert oben, Infozeilen, Tagestabelle.
// Tage 1–15 auf Seite 1, ab Tag 16 auf Seite 2 (wie in der Referenz),
// Summenzeile + Unterschriftenblock am Ende, Seitenzahl unten rechts.

import { createHash } from "node:crypto";
import { DEFAULT_FONT } from "./printer.js";
import { renderPdf } from "./render.js";
import { loadFirmaForPdf, loadLogoDataUrl } from "./firma.js";
import { getMitarbeiter, getZettel } from "../stundenzettel/repo.js";
import type { GenerierterStundenzettel, GenerierterTag } from "../stundenzettel/types.js";

const COLOR_TEXT = "#000000";
const COLOR_LINE = "#9e9e9e";
const HEADER_FILL = "#e8e8e8";

const MONATE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const WOCHENTAG_KURZ: Record<string, string> = {
  montag: "Mo", dienstag: "Di", mittwoch: "Mi", donnerstag: "Do",
  freitag: "Fr", samstag: "Sa", sonntag: "So",
};

function toMin(hhmm?: string | null): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
function toHhmm(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Pausenfenster für die Spalten „Pause von“ / „Pause bis“.
 * - Zwei Blöcke: die Lücke zwischen Block 1 und Block 2.
 * - Ein Block mit Pausenminuten: mittig im Arbeitszeitfenster (deterministisch).
 */
function pauseFenster(t: GenerierterTag): { von: string; bis: string } | null {
  const ende1 = toMin(t.ende);
  const beginn2 = toMin(t.beginn2);
  if (ende1 != null && beginn2 != null && beginn2 > ende1) {
    return { von: toHhmm(ende1), bis: toHhmm(beginn2) };
  }
  const beginn = toMin(t.beginn);
  const pause = t.pause ?? 0;
  if (beginn == null || ende1 == null || pause <= 0) return null;
  const mitte = Math.round((beginn + ende1) / 2);
  return { von: toHhmm(mitte - Math.floor(pause / 2)), bis: toHhmm(mitte + Math.ceil(pause / 2)) };
}

function stundenText(n: number): string {
  if (!n) return "";
  return Number.isInteger(n) ? String(n) : n.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

function tagLabel(t: GenerierterTag): string {
  const tagNr = Number(t.datum.slice(8, 10));
  const kurz = WOCHENTAG_KURZ[t.wochentag] ?? "";
  return `${kurz} ${String(tagNr).padStart(2, "0")}.`;
}

interface Zelle {
  tag: string;
  beginn: string;
  ende: string;
  pauseVon: string;
  pauseBis: string;
  stunden: string;
}

function zeile(t: GenerierterTag): Zelle {
  const hatZeit = Boolean(t.beginn && t.ende);
  const bem = (t.bemerkung ?? "").trim();
  if (!hatZeit) {
    // Feiertag / Krank / Urlaub: Text steht in der Beginn-Spalte, keine Uhrzeiten.
    return {
      tag: tagLabel(t),
      beginn: bem,
      ende: "",
      pauseVon: "",
      pauseBis: "",
      stunden: stundenText(t.stunden),
    };
  }
  const p = pauseFenster(t);
  const beginn = t.beginn ?? "";
  const ende = t.beginn2 && t.ende2 ? t.ende2 : (t.ende ?? "");
  return {
    tag: tagLabel(t),
    beginn,
    ende,
    pauseVon: p?.von ?? "",
    pauseBis: p?.bis ?? "",
    stunden: stundenText(t.stunden),
  };
}

const LEER: Zelle = { tag: "", beginn: "", ende: "", pauseVon: "", pauseBis: "", stunden: "" };

function tabelle(zeilen: Zelle[], summe: number | null) {
  const th = (text: string) => ({
    text,
    bold: true,
    fontSize: 9,
    alignment: "center" as const,
    fillColor: HEADER_FILL,
    margin: [0, 4, 0, 4] as [number, number, number, number],
  });
  const td = (text: string, opts: { bold?: boolean; align?: "left" | "center" } = {}) => ({
    text,
    fontSize: 9,
    bold: opts.bold ?? false,
    alignment: opts.align ?? ("center" as const),
    margin: [2, 3.5, 2, 3.5] as [number, number, number, number],
  });

  const body: unknown[][] = [
    [
      th("Tag"),
      th("Arbeitsbeginn"),
      th("Arbeitsende"),
      th("Pause von"),
      th("Pause bis"),
      th("Arbeitsstunden"),
    ],
    ...zeilen.map((z) => [
      td(z.tag, { bold: true, align: "left" }),
      td(z.beginn),
      td(z.ende),
      td(z.pauseVon),
      td(z.pauseBis),
      td(z.stunden),
    ]),
  ];

  if (summe != null) {
    body.push([
      {
        text: "Summe Arbeitsstunden:",
        colSpan: 5,
        bold: true,
        fontSize: 9.5,
        alignment: "right",
        fillColor: HEADER_FILL,
        margin: [4, 5, 6, 5],
      },
      {}, {}, {}, {},
      {
        text: stundenText(summe) || "0",
        bold: true,
        fontSize: 9.5,
        alignment: "center",
        fillColor: HEADER_FILL,
        margin: [2, 5, 2, 5],
      },
    ]);
  }

  return {
    table: {
      headerRows: 1,
      widths: [58, "*", "*", "*", "*", 80],
      body,
    },
    layout: {
      hLineWidth: () => 0.6,
      vLineWidth: () => 0.6,
      hLineColor: () => COLOR_LINE,
      vLineColor: () => COLOR_LINE,
      paddingLeft: () => 2,
      paddingRight: () => 2,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  };
}

function unterschriften() {
  const feld = (label: string) => ({
    width: "*",
    stack: [
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 190, y2: 0, lineWidth: 0.6, lineColor: COLOR_TEXT }] },
      { text: label, fontSize: 8.5, margin: [0, 4, 0, 0] },
    ],
  });
  return {
    margin: [0, 55, 0, 0] as [number, number, number, number],
    columns: [feld("Unterschrift Arbeitsnehmer"), { width: 40, text: "" }, feld("Unterschrift Arbeitsgeber")],
  };
}

export function stundenzettelDocDef(args: {
  mitarbeiterName: string;
  zettel: GenerierterStundenzettel;
  logoDataUrl: string | null;
}) {
  const { mitarbeiterName, zettel, logoDataUrl } = args;
  const tage = [...zettel.tage].sort((a, b) => a.datum.localeCompare(b.datum));
  const zeilen = tage.map(zeile);
  const seite1 = zeilen.slice(0, 15);
  const seite2 = zeilen.slice(15);
  while (seite1.length < 15) seite1.push({ ...LEER });
  while (seite2.length < 16) seite2.push({ ...LEER });

  const kopf = [
    ...(logoDataUrl
      ? [{ image: logoDataUrl, fit: [210, 85] as [number, number], alignment: "center" as const, margin: [0, 0, 0, 14] as [number, number, number, number] }]
      : [{ text: "", margin: [0, 0, 0, 6] as [number, number, number, number] }]),
    { text: `Stundenzettel von: ${mitarbeiterName}`, fontSize: 12, bold: true, margin: [0, 0, 0, 2] as [number, number, number, number] },
    { text: `Monat: ${MONATE[zettel.monat - 1]} ${zettel.jahr}`, fontSize: 12, margin: [0, 0, 0, 12] as [number, number, number, number] },
  ];

  return {
    pageSize: "A4",
    pageMargins: [42, 42, 42, 46] as [number, number, number, number],
    defaultStyle: { font: DEFAULT_FONT, fontSize: 9.5, color: COLOR_TEXT },
    info: { title: `Stundenzettel ${mitarbeiterName} ${MONATE[zettel.monat - 1]} ${zettel.jahr}` },
    content: [
      ...kopf,
      tabelle(seite1, null),
      { text: "", pageBreak: "before" as const },
      tabelle(seite2, zettel.gesamtStunden),
      unterschriften(),
    ],
    footer: (current: number, total: number) => ({
      margin: [42, 0, 42, 12] as [number, number, number, number],
      text: `Seite ${current} von ${total}`,
      alignment: "right" as const,
      fontSize: 7.5,
      color: "#666666",
    }),
  };
}

export interface StundenzettelPdfResult {
  buffer: Buffer;
  hash: string;
  dateiname: string;
}

function safe(s: string): string {
  return s.replace(/[^\p{L}\p{N}\- _]/gu, "").replace(/\s+/g, "_").trim() || "Mitarbeiter";
}

/** Rendert den Stundenzettel mit der übergebenen ID. `null` = nicht gefunden. */
export async function renderStundenzettelPdf(zettelId: string): Promise<StundenzettelPdfResult | null> {
  const z = getZettel(zettelId);
  if (!z) return null;
  const m = getMitarbeiter(z.mitarbeiterId);
  const name = m?.name ?? "Unbekannt";
  const firma = loadFirmaForPdf();
  const logoDataUrl = loadLogoDataUrl();
  const docDef = stundenzettelDocDef({ mitarbeiterName: name, zettel: z, logoDataUrl });
  const buffer = await renderPdf(docDef);
  const hash = createHash("sha256")
    .update(JSON.stringify({ z, name, firma: firma.firmenname, logo: logoDataUrl ? logoDataUrl.length : 0 }))
    .digest("hex")
    .slice(0, 32);
  const dateiname = `Stundenzettel_${safe(name)}_${MONATE[z.monat - 1]}_${z.jahr}.pdf`;
  return { buffer, hash, dateiname };
}
