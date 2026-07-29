// Stundenzettel-PDF (Phase 4).
// A4 Hochformat, Logo zentriert oben, Infozeilen, Tagestabelle.
// Tage 1–15 auf Seite 1, ab Tag 16 auf Seite 2 (wie in der Referenz),
// Summenzeile + Unterschriftenblock am Ende, Seitenzahl unten rechts.

import { createHash } from "node:crypto";
import { STUNDENZETTEL_FONT } from "./printer.js";
import { renderPdf } from "./render.js";
import { loadFirmaForPdf, loadLogoDataUrl } from "./firma.js";
import { getMitarbeiter, getZettel } from "../stundenzettel/repo.js";
import type { GenerierterStundenzettel, GenerierterTag } from "../stundenzettel/types.js";

const COLOR_TEXT = "#000000";
const COLOR_LINE = "#1a1a1a";
const HEADER_FILL = "#e6e6e6";

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
  // Vorlage zeigt ausschließlich die Tageszahl.
  void WOCHENTAG_KURZ;
  return String(Number(t.datum.slice(8, 10)));
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

function tabelle(zeilen: Zelle[], summe: number | null, rowPad: number) {
  const th = (
    text: string,
    extra: Record<string, unknown> = {},
  ) => ({
    text,
    fontSize: 10,
    alignment: "center" as const,
    fillColor: HEADER_FILL,
    margin: [0, 3, 0, 3] as [number, number, number, number],
    ...extra,
  });
  const td = (text: string) => ({
    text,
    fontSize: 10,
    alignment: "center" as const,
    margin: [2, rowPad, 2, rowPad] as [number, number, number, number],
  });

  const body: unknown[][] = [
    [
      th("Tag", { rowSpan: 2, margin: [0, 13, 0, 3] }),
      th("Arbeitsbeginn", { rowSpan: 2, margin: [0, 13, 0, 3] }),
      th("Arbeitsende", { rowSpan: 2, margin: [0, 13, 0, 3] }),
      th("Pausenzeiten", { colSpan: 2 }),
      {},
      th("Arbeitszeit\nin Stunden", { rowSpan: 2, margin: [0, 8, 0, 3], lineHeight: 1.15 }),
    ],
    [{}, {}, {}, th("von"), th("bis"), {}],
    ...zeilen.map((z) => [
      td(z.tag),
      td(z.beginn),
      td(z.ende),
      td(z.pauseVon),
      td(z.pauseBis),
      td(z.stunden),
    ]),
  ];

  if (summe != null) {
    body.push([
      { text: "", margin: [0, rowPad, 0, rowPad] },
      {
        text: "Summe Arbeitsstunden:",
        colSpan: 4,
        fontSize: 10,
        alignment: "left",
        margin: [4, rowPad, 6, rowPad],
      },
      {}, {}, {},
      {
        text: stundenText(summe) || "0",
        fontSize: 10,
        alignment: "center",
        margin: [2, rowPad, 2, rowPad],
      },
    ]);
  }

  return {
    table: {
      headerRows: 2,
      widths: [42, 108, 94, 75, 77, 85],
      body,
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
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
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: COLOR_TEXT }] },
      { text: label, fontSize: 10, margin: [0, 6, 0, 0] },
    ],
  });
  return {
    margin: [0, 26, 0, 0] as [number, number, number, number],
    columns: [feld("Unterschrift Arbeitsnehmer"), { width: 60, text: "" }, feld("Unterschrift Arbeitsgeber")],
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
    { text: `Stundenzettel von: ${mitarbeiterName}`, fontSize: 13, margin: [0, 0, 0, 5] as [number, number, number, number] },
    { text: `Monat: ${MONATE[zettel.monat - 1]} ${zettel.jahr}`, fontSize: 13, margin: [0, 0, 0, 14] as [number, number, number, number] },
  ];

  return {
    pageSize: "A4",
    pageMargins: [57, 142, 57, 45] as [number, number, number, number],
    defaultStyle: { font: STUNDENZETTEL_FONT, fontSize: 10, color: COLOR_TEXT },
    info: { title: `Stundenzettel ${mitarbeiterName} ${MONATE[zettel.monat - 1]} ${zettel.jahr}` },
    header: () =>
      logoDataUrl
        ? {
            image: logoDataUrl,
            fit: [320, 72] as [number, number],
            alignment: "center" as const,
            margin: [0, 40, 0, 0] as [number, number, number, number],
          }
        : { text: "" },
    content: [
      ...kopf,
      tabelle(seite1, null, 6.8),
      { text: "", pageBreak: "before" as const },
      tabelle(seite2, zettel.gesamtStunden, 5.5),
      unterschriften(),
    ],
    footer: (current: number, total: number) => ({
      margin: [50, 0, 50, 16] as [number, number, number, number],
      text: `Seite ${current}${total ? "" : ""}`,
      alignment: "right" as const,
      fontSize: 9,
      color: "#8a8a8a",
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
