// PDF-Generator für Angebote und Rechnungen.
// Layout 1:1 nach My-Clean-Center-Vorlage: schwarz/weiß, dünne graue Linien,
// Logo rechts oben, kompakter 4-spaltiger Footer.

import { angebotsdatumVon } from "@/lib/belege/angebotsdatum";
import type {
  Angebot,
  Rechnung,
  Position,
  Kunde,
  Firmendaten,
  Ansprechpartner,
  Objekt,
} from "@/lib/api/types";
import logoUrl from "@/assets/logo.png";
import { getBackendUrl } from "@/lib/api/backendUrl";
import { A4, createHotspotTracker, type RuntimeHotspot } from "./hotspotTracker";
import { descriptionLines, inlineText, plainText } from "./inlineFormat";
import {
  LEERER_PLAN,
  TABELLEN_LINIE,
  liegtImRaster,
  rasterExtra,
  rasterExtraUnten,
  verbessereRasterPlan,
  waagerechteLinienAusPdf,
  type RasterOptionen,
  type RasterPlan,
} from "./linienRaster";

// ───────── Mock-LRU-Cache (nur Lovable-Preview) ────────────────────────────
// Im Pi-Backend übernimmt der Disk-Cache (`backend/src/pdf/cache.ts`) diese
// Aufgabe. Hier vermeidet der LRU rein clientseitig wiederholtes pdfmake-
// Rendern, wenn dieselbe Beleg-Version mehrfach geöffnet wird.
const PDF_LRU_MAX = 50;
const PDF_RENDER_VERSION = "2026-10-01-document-layout-v6";
const pdfLru = new Map<string, { blob: Blob; hotspots: RuntimeHotspot[] }>();

const VOLATILE_PDF_KEYS = new Set([
  "aktualisiertAm",
  "updatedAt",
  "erstelltAm",
  "createdAt",
  "geaendertAm",
]);
function semanticPdfKey(parts: unknown[]): string {
  return `${PDF_RENDER_VERSION}:${JSON.stringify(parts, (k, v) => (VOLATILE_PDF_KEYS.has(k) ? undefined : v))}`;
}
function lruGet(key: string): { blob: Blob; hotspots: RuntimeHotspot[] } | null {
  const v = pdfLru.get(key);
  if (!v) return null;
  pdfLru.delete(key);
  pdfLru.set(key, v); // refresh recency
  return v;
}
function lruSet(key: string, value: { blob: Blob; hotspots: RuntimeHotspot[] }): void {
  // Alte Einträge derselben Beleg-ID (anderer semantischer Hash) verwerfen,
  // damit pro ID stets nur die aktuelle PDF-Version im Cache liegt — analog
  // zum Disk-Cache des Backends, der alte Hash-Dateien atomar löscht.
  const idPrefix = key.slice(0, key.indexOf(":", 2) + 1); // "a:<id>:" / "r:<id>:"
  if (idPrefix.length > 2) {
    for (const k of pdfLru.keys()) {
      if (k !== key && k.startsWith(idPrefix)) pdfLru.delete(k);
    }
  }
  pdfLru.set(key, value);
  while (pdfLru.size > PDF_LRU_MAX) {
    const firstKey = pdfLru.keys().next().value;
    if (firstKey === undefined) break;
    pdfLru.delete(firstKey);
  }
}

export interface PdfBuildResult {
  blob: Blob;
  hotspots: RuntimeHotspot[];
}

// pdfmake-Typen sind unvollständig — wir nutzen any-Cast für Doc-Definitionen.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPdfMake = any;
let pdfMakeInstance: AnyPdfMake = null;

async function getPdfMake(): Promise<AnyPdfMake> {
  if (pdfMakeInstance) return pdfMakeInstance;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pmMod: any = await import("pdfmake/build/pdfmake");
  const pm: AnyPdfMake = pmMod?.default ?? pmMod;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vfsMod: any = await import("pdfmake/build/vfs_fonts");
  const vfsData =
    vfsMod?.default?.vfs ??
    vfsMod?.vfs ??
    vfsMod?.pdfMake?.vfs ??
    vfsMod?.default?.pdfMake?.vfs ??
    (vfsMod?.default && typeof vfsMod.default === "object" ? vfsMod.default : null) ??
    (typeof vfsMod === "object" && !("default" in vfsMod) ? vfsMod : null);
  if (vfsData) {
    if (typeof pm.addVirtualFileSystem === "function") pm.addVirtualFileSystem(vfsData);
    else pm.vfs = vfsData;
  }
  pdfMakeInstance = pm;
  return pm;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function logoSourceToDataUrl(source: string): Promise<string | null> {
  const trimmed = source.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image/")) return trimmed;
  const base = getBackendUrl().replace(/\/$/, "");
  const url = trimmed.startsWith("/") ? `${base}${trimmed}` : trimmed;
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Logo konnte nicht geladen werden: HTTP ${res.status} (${url})`);
  }
  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error(`Logo-Antwort ist kein Bild: ${blob.type || "unbekannt"}`);
  }
  return await blobToDataUrl(blob);
}

async function logoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

// ───────── Helpers ─────────────────────────────────────────────────────────

const COLOR_TEXT = "#000000";
const COLOR_MUTED = "#555555";
const COLOR_LINE = "#bdbdbd";

function eur(n: number) {
  return n.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}
function dt(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function summe(p: Position) {
  const rabatt = p.rabatt ?? 0;
  if (p.modus === "pauschal") return (p.pauschalpreisNetto ?? 0) * (1 - rabatt / 100);
  return (p.menge ?? 0) * (p.einzelpreisNetto ?? 0) * (1 - rabatt / 100);
}
function totals(positionen: Position[], rabattGesamt: number, steuersatz: number) {
  const safePos = positionen ?? [];
  const safeRabatt = rabattGesamt ?? 0;
  const safeSteuer = steuersatz ?? 0;
  const nettoRoh = safePos.reduce((s, p) => s + summe(p), 0);
  const netto = nettoRoh * (1 - safeRabatt / 100);
  const steuer = netto * (safeSteuer / 100);
  return { netto, steuer, brutto: netto + steuer };
}

function beschreibungBlock(text: string): unknown {
  const items = descriptionLines(text).map((line) => {
    if (line.kind === "blank") return { text: " ", fontSize: 5, lineHeight: 1 };
    if (line.kind === "bullet") {
      return { ul: [{ text: inlineText(line.text), fontSize: 10 }], margin: [0, 0, 0, 0] };
    }
    return {
      text: inlineText(line.text),
      fontSize: 10,
      margin: [0, 0, 0, line.first ? 2 : 0],
    };
  });
  return { stack: items };
}

function kundeAdresse(
  k: Kunde,
  ap?: Ansprechpartner,
  o?: Objekt | null,
  zeigeObjektname = true,
  zeigeAnsprechpartner = true,
) {
  const lines: string[] = [];
  if (k.firmenname) lines.push(k.firmenname);
  const apPerson = ap && zeigeAnsprechpartner
    ? [ap.vorname, ap.nachname].filter(Boolean).join(" ").trim()
    : "";
  const person = apPerson || [k.vorname, k.nachname].filter(Boolean).join(" ");
  if (person && (zeigeAnsprechpartner || !k.firmenname)) lines.push(person);
  if (o?.name && zeigeObjektname) lines.push(o.name);
  // Wenn ein Objekt ausgewählt ist, ist dessen Einsatzadresse maßgeblich.
  // Falls dort nichts gepflegt ist, fällt die PDF auf die Kundenadresse zurück.
  const strasse = o?.strasse || k.strasse || "";
  const plz = o?.plz || k.plz || "";
  const ort = o?.ort || k.ort || "";
  if (strasse) lines.push(strasse);
  const plzOrt = [plz, ort].filter(Boolean).join(" ");
  if (plzOrt) lines.push(plzOrt);
  const land = o?.land || k.land;
  if (land && land !== "Deutschland") lines.push(land);
  return lines;
}

function absenderzeile(f: Firmendaten) {
  const teile = [f.firmenname, f.strasse, `${f.plz ?? ""} ${f.ort ?? ""}`.trim()].filter(Boolean);
  return teile.join(" – ");
}

const ABSENDER_BREITE = 230;
const ABSENDER_SCHRIFT_MAX = 8;
const ABSENDER_SCHRIFT_MIN = 3;

/**
 * Hält die Absenderzeile sicher innerhalb der linken Spalte. Die konservative
 * Breitenmessung deckt die im Browser verwendete Roboto-Schrift ebenso wie die
 * Helvetica-Ausgabe auf dem Pi ab; nur überlange Zeilen werden verkleinert.
 */
function absenderSchriftgroesse(text: string): number {
  let einheiten = 0;
  for (const zeichen of text) {
    if (/[MWÄÖÜ@%&]/.test(zeichen)) einheiten += 0.82;
    else if (/[ilI1.,:;!'|]/.test(zeichen)) einheiten += 0.28;
    else if (/\s/.test(zeichen)) einheiten += 0.3;
    else if (/[A-Z0-9]/.test(zeichen)) einheiten += 0.62;
    else einheiten += 0.52;
  }
  if (einheiten <= 0) return ABSENDER_SCHRIFT_MAX;
  const passend = ABSENDER_BREITE / einheiten;
  return Math.max(ABSENDER_SCHRIFT_MIN, Math.min(ABSENDER_SCHRIFT_MAX, Math.floor(passend * 10) / 10));
}

function anrede(k: Kunde, ap?: Ansprechpartner, eigene?: string) {
  if (eigene && eigene.trim()) return eigene.trim();
  if (ap) {
    const name = ap.nachname?.trim() || "";
    if (ap.anrede === "herr") return `Sehr geehrter Herr ${name},`;
    if (ap.anrede === "frau") return `Sehr geehrte Frau ${name},`;
    if (ap.vorname || ap.nachname)
      return `Hallo ${[ap.vorname, ap.nachname].filter(Boolean).join(" ")},`;
  }
  if (k.anrede === "herr") return `Sehr geehrter Herr ${k.nachname ?? ""},`;
  if (k.anrede === "frau") return `Sehr geehrte Frau ${k.nachname ?? ""},`;
  return "Sehr geehrte Damen und Herren,";
}

// ───────── Header / Footer ─────────────────────────────────────────────────

function header(firma: Firmendaten, logo: string | null) {
  const logoNode = logo
    ? {
        image: logo,
        fit: [260, 110],
        absolutePosition: { x: 335, y: 22 },
      }
    : null;
  return {
    margin: [55, 30, 55, 0] as [number, number, number, number],
    stack: [
      ...(logoNode ? [logoNode] : []),
    ],
  };
}

function footer(firma: Firmendaten) {
  return function () {
    const cell = (
      lines: (string | null | undefined)[],
      alignment: "left" | "center" | "right" = "left",
    ) => ({
      stack: lines
        .filter(Boolean)
        .map((l) => ({ text: l as string, fontSize: 9, color: COLOR_TEXT, alignment })),
    });
    return {
      margin: [55, 15, 55, 0] as [number, number, number, number],
      stack: [
        {
          canvas: [
            { type: "line", x1: 0, y1: 0, x2: 485, y2: 0, lineWidth: 0.5, lineColor: COLOR_LINE },
          ],
        },
        {
          margin: [0, 8, 0, 0] as [number, number, number, number],
          columns: [
            cell([
              firma.firmenname,
              firma.strasse,
              [firma.plz, firma.ort].filter(Boolean).join(" ") || null,
            ]),
            cell(["Bankverbindung", firma.bankName, firma.iban], "left"),
            cell([firma.telefon, firma.mobil, firma.email], "left"),
            cell(
              [
                firma.handelsregister,
                firma.ustId ? `USt-ID: ${firma.ustId}` : null,
                firma.webseite,
                firma.geschaeftsfuehrer ? `Geschäftsführer: ${firma.geschaeftsfuehrer}` : null,
              ],
              "left",
            ),
          ],
          columnGap: 12,
        },
      ],
    };
  };
}

// ───────── Tabelle (4 Spalten, voller Rahmen — exakt nach Vorlage) ────────

function hasStundenPositionen(positionen: Position[]): boolean {
  return positionen.some((p) => p.modus === "stunden");
}

function stundenText(p: Position): string {
  if (p.modus !== "stunden") return "";
  const menge = p.menge.toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${menge} Std.`;
}
function abrechnungsartText(p: Position): string {
  const custom = typeof p.abrechnungsartLabel === "string" ? p.abrechnungsartLabel.trim() : "";
  if (custom) return custom;
  if (p.modus === "stunden") return "Stundensatz";
  if (p.modus === "einzel") return "Einzelposition";
  return "Pauschal";
}

function beschreibungZeilen(text: string): string[] {
  return beschreibungZeilenIntern(text);
}

/**
 * Schätzt die Zeilenanzahl der Leistungs-Spalte, damit die rechten Spalten
 * (Stunden / Abrechnungsart / Preis) optisch vertikal mittig stehen.
 * pdfmake kennt keine echte vertikale Zentrierung in Tabellenzellen.
 */
export function geschaetzteZeilen(text: string, charsPerLine: number): number {
  const zeilen = plainText(text || "").split("\n").map((z) => z.trim()).filter(Boolean);
  if (zeilen.length === 0) return 1;
  let sum = 0;
  for (const z of zeilen) sum += Math.max(1, Math.ceil(z.length / Math.max(10, charsPerLine)));
  return Math.max(1, sum);
}

export function vertikalMittigMargin(
  text: string,
  charsPerLine: number,
): [number, number, number, number] {
  const zeilen = geschaetzteZeilen(text, charsPerLine);
  return [0, Math.max(0, Math.round(((zeilen - 1) * 12.5) / 2)), 0, 0];
}

function beschreibungZeilenIntern(text: string): string[] {
  const lines = plainText(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const source = lines.length > 0 ? lines : [plainText(text || "") || "Pauschal"];
  const chunks: string[] = [];
  const maxChars = 135;
  for (const raw of source) {
    const prefixMatch = raw.match(/^([•\-*]\s+)(.*)$/);
    const prefix = prefixMatch?.[1] ?? "";
    const body = prefixMatch?.[2] ?? raw;
    let current = "";
    for (const word of body.split(/\s+/).filter(Boolean)) {
      if (word.length > maxChars) {
        if (current) chunks.push(prefix + current);
        current = "";
        for (let i = 0; i < word.length; i += maxChars) chunks.push(prefix + word.slice(i, i + maxChars));
        continue;
      }
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        chunks.push(prefix + current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) chunks.push(prefix + current);
  }
  return chunks.length > 0 ? chunks : ["Pauschal"];
}

function leistungstabelle(
  positionen: Position[],
  totalsT: { netto: number; steuer: number; brutto: number },
  steuersatz: number,
  nurNetto = false,
  raster?: RasterOptionen,
  istAngebot = false,
) {
  const positionsInnenabstand = 5;
  const kopfUndSummenInnenabstand = 7.5;
  const plan = raster?.plan ?? LEERER_PLAN;
  const showStunden = hasStundenPositionen(positionen);
  const colCount = showStunden ? 4 : 3;

  const headerRow: unknown[] = [
    { text: "Leistung", fontSize: 10, color: COLOR_TEXT },
  ];
  if (showStunden) {
    headerRow.push({
      text: "Stunden",
      fontSize: 10,
      color: COLOR_TEXT,
      alignment: "center",
    });
  }
  headerRow.push(
    {
      text: istAngebot ? "Ausführungen" : "Abrechnungsart",
      fontSize: 10,
      color: COLOR_TEXT,
      alignment: "center",
    },
    {
      text: "Preis (netto)",
      fontSize: 10,
      color: COLOR_TEXT,
      alignment: "center",
    },
  );

  const body: unknown[][] = [headerRow];
  positionen.forEach((p) => {
    const fallback = p.modus === "pauschal" ? "Pauschal" : "";
    const beschreibung = p.beschreibung || fallback;
    const mittig = vertikalMittigMargin(beschreibung, showStunden ? 40 : 48);
    const row: unknown[] = [{ stack: [beschreibungBlock(beschreibung)], id: `pos:${p.id}` }];
    if (showStunden)
      row.push({ text: stundenText(p), fontSize: 10, alignment: "center", margin: mittig });
    row.push(
      { text: abrechnungsartText(p), fontSize: 10, alignment: "center", margin: mittig },
      { text: eur(summe(p)), fontSize: 10, alignment: "center", margin: mittig },
    );
    body.push(row);
  });

  const spanCols = colCount - 1;
  const spanFiller = Array.from({ length: spanCols - 1 }, () => ({}));
  if (nurNetto) {
    // Angebot: keine Umsatzsteuer ausweisen — nur Netto-Gesamtbetrag.
    body.push([
      { text: "Gesamtbetrag (netto)", colSpan: spanCols, fontSize: 10, bold: true },
      ...spanFiller,
      { text: eur(totalsT.netto), fontSize: 10, alignment: "center", bold: true },
    ]);
  } else {
    body.push([
      { text: `Zzgl. gesetzlicher Mehrwertsteuer ${steuersatz}%`, colSpan: spanCols, fontSize: 10 },
      ...spanFiller,
      { text: eur(totalsT.steuer), fontSize: 10, alignment: "center" },
    ]);
    body.push([
      { text: "Gesamtbetrag inkl. MwSt.", colSpan: spanCols, fontSize: 10, bold: true },
      ...spanFiller,
      { text: eur(totalsT.brutto), fontSize: 10, alignment: "center", bold: true },
    ]);
  }

  const widths = showStunden
    ? [...TABLE_COL_WIDTHS_STUNDEN]
    : [...TABLE_COL_WIDTHS_STANDARD];

  // Positionszeilen — werden vor den Summen abgetrennt. Lange
  // Pauschal-Beschreibungen dürfen über Seiten umbrechen (dontBreakRows:false),
  // sonst „verschluckt" pdfmake die ganze Tabelle auf Seite 1.
  // Body OHNE die Summenzeilen.
  const summenZeilen = nurNetto ? 1 : 2;
  const positionsBody = body.slice(0, body.length - summenZeilen);
  const summenBody = body.slice(body.length - summenZeilen);

  if (raster) raster.zeilen = { p: positionsBody.length, s: summenBody.length };

  const tableLayout = {
    hLineWidth: () => TABELLEN_LINIE,
    vLineWidth: () => TABELLEN_LINIE,
    hLineColor: () => COLOR_TEXT,
    vLineColor: () => COLOR_TEXT,
    // Zusatzabstand je Zeile (Linien-Raster, siehe linienRaster.ts), je zur Hälfte oben/unten.
    paddingTop: (i: number) =>
      (i === 0 ? kopfUndSummenInnenabstand : positionsInnenabstand) + rasterExtra(plan, "p", i) / 2,
    paddingBottom: (i: number) =>
      (i === 0 ? kopfUndSummenInnenabstand : positionsInnenabstand) +
      rasterExtra(plan, "p", i) / 2 +
      rasterExtraUnten(plan, "p", i),
    paddingLeft: () => 8,
    paddingRight: () => 8,
  };

  const positionsTabelle = {
    table: {
      headerRows: 1,
      widths,
      body: positionsBody,
    },
    layout: {
      ...tableLayout,
      // Der Summenblock zeichnet die gemeinsame Kante. So liegt an dieser
      // Stelle nicht die Abschlusslinie der Leistungstabelle doppelt darüber.
      hLineWidth: (i: number, node: { table: { body: unknown[][] } }) =>
        i === node.table.body.length ? 0 : TABELLEN_LINIE,
    },
  };
  const summenTabelle = {
    table: {
      dontBreakRows: true,
      widths,
      body: summenBody,
    },
    layout: {
      ...tableLayout,
      paddingTop: (i: number) => kopfUndSummenInnenabstand + rasterExtra(plan, "s", i) / 2,
      paddingBottom: (i: number) => kopfUndSummenInnenabstand + rasterExtra(plan, "s", i) / 2,
    },
  };

  return {
    id: "tabelle",
    margin: [0, plan.shift, 0, 0],
    stack: [positionsTabelle, summenTabelle],
  };
}

/** Spaltenbreiten der Leistungstabelle in pdfmake-Punkten.
 *  Feste Breiten statt "*": Jede Spalte belegt inkl. Innenabstand (2×8) und
 *  Linie (0,8) genau ein Vielfaches von 3 pt (Linien-Raster, siehe linienRaster.ts).
 *  Dadurch liegen ALLE senkrechten Linien im selben Raster und werden gleich
 *  dick gezeichnet. Gesamtbreite 483,8 pt (passt in die 485,28 pt Inhaltsbreite).
 *  MUSS identisch mit backend/src/pdf/layout.ts bleiben. */
export const TABLE_COL_WIDTHS_STANDARD = [226.2, 109.2, 97.2] as const;
export const TABLE_COL_WIDTHS_STUNDEN = [181.2, 61.2, 91.2, 82.2] as const;

// ───────── Meta-Box ────────────────────────────────────────────────────────

/** Zusätzliche Luft über „Bei Zahlung bitte“ (pt). MUSS in beiden Vorlagen gleich sein. */
const META_LUFT_OBEN = 5;
const RECHNUNG_META_BREITE = 190;

function metaWertSchriftgroesse(wert: string): number {
  if (wert.length <= 16) return 9.5;
  return Math.max(5, Math.floor((9.5 * 16 / wert.length) * 10) / 10);
}

function metaBox(
  meta: { label: string; wert: string }[],
  variant: "box" | "plain",
  headerNote?: string,
) {
  if (variant === "plain") {
    return {
      id: "meta",
      width: 210,
      stack: meta.map((m) => ({
        text: `${m.label}: ${m.wert}`,
        fontSize: 10,
        alignment: "right",
        margin: [0, 0, 0, 2],
      })),
    };
  }
  const body: unknown[][] = [];
  if (headerNote) {
    const noteLines = headerNote.split("\n");
    noteLines.forEach((line, idx) => {
      const isLast = idx === noteLines.length - 1;
      body.push([
        {
          text: line,
          fontSize: 9.5,
          bold: true,
          colSpan: 2,
          margin: [0, 0, 0, isLast ? 2 : 0],
          lineHeight: 1.15,
        },
        {},
      ]);
    });
  }
  meta.forEach((m) => {
    body.push([
      {
        text: m.label,
        fontSize: 9.5,
        margin: [0, 1, 8, 1],
        lineHeight: 1.2,
      },
      {
        text: m.wert,
        fontSize: metaWertSchriftgroesse(m.wert),
        alignment: "right",
        margin: [0, 1, 0, 1],
        lineHeight: 1.2,
        noWrap: true,
      },
    ]);
  });
  return {
    id: "meta",
    width: RECHNUNG_META_BREITE,
    // Rahmen-Oberkante rückt um META_LUFT_OBEN nach oben, der Text bleibt exakt
    // an seiner Stelle und die Gesamthöhe im Fluss ist unverändert.
    margin: [0, -META_LUFT_OBEN, 0, 0],
    table: {
      widths: ["auto", "*"],
      body,
    },
    layout: {
      hLineWidth: (i: number, node: { table: { body: unknown[][] } }) => {
        if (i === 0 || i === node.table.body.length) return 0.6;
        return 0;
      },
      vLineWidth: (i: number, node: { table: { widths: unknown[] } }) =>
        i === 0 || i === node.table.widths.length ? 0.6 : 0,
      hLineColor: () => COLOR_TEXT,
      vLineColor: () => COLOR_TEXT,
       // Mehr Luft über dem Zahlungshinweis, bei identischer Gesamthöhe des Blocks.
      paddingTop: (i: number, node: { table: { body: unknown[][] } }) => {
        const last = node.table.body.length - 1;
         if (i === 0) return 6 + META_LUFT_OBEN;
         if (i === 1) return 0;
         if (i === last) return 1;
        return 2;
      },
      paddingBottom: (i: number, node: { table: { body: unknown[][] } }) => {
        const last = node.table.body.length - 1;
        if (i === last) return 4;
         if (i === 0) return 0;
         if (i === last - 1) return 1;
        return 2;
      },
      paddingLeft: () => 8,
      paddingRight: () => 8,
    },
  };
}

// ───────── Doc-Bauer ───────────────────────────────────────────────────────

interface BuildOptions {
  intro?: string;
  outro?: string;
  materialBereitgestellt?: boolean;
}

export interface PdfLayoutOptions {
  empfaengerOben?: boolean;
}

export function defaultIntroAngebot(a: Angebot, opts: BuildOptions = {}) {
  if (opts.intro) return opts.intro;
  const einsatz = formatEinsatzClient(a.einsatzVon, a.einsatzBis);
  const suffix = einsatz ? ` für die Reinigung ${einsatz}` : "";
  return `gerne unterbreiten wir Ihnen ein Angebot für „${a.titel}"${suffix} und folgende Leistungen:`;
}
export function defaultOutroAngebot(a: Angebot, opts: BuildOptions = {}) {
  if (opts.outro) return opts.outro;
  const teile = [
    opts.materialBereitgestellt
      ? "Zugunsten der Reinigung werden Reinigungswerkzeuge und Reinigungsmittel von uns zur Verfügung gestellt."
      : null,
    a.gueltigBis ? `Dieses Angebot ist gültig bis ${dt(a.gueltigBis)}.` : null,
    "Sofern Sie Interesse an dem Angebot haben, bestätigen Sie uns dies.",
    "Über eine Rückmeldung Ihrerseits würden wir uns freuen. Sollten Sie zu diesem Angebot noch Fragen haben, sind wir für Sie jederzeit telefonisch oder auch per E-Mail zu erreichen.",
  ].filter(Boolean);
  return teile.join("\n\n");
}
export function defaultIntroRechnung(_r: Rechnung, opts: BuildOptions = {}) {
  if (opts.intro) return opts.intro;
  const monat = monatFromRechnung(_r);
  // Identisch zu backend/src/pdf/layout.ts → defaultIntroRechnung.
  if (_r.dauerauftragId || _r.optionen?.wiederkehrend === true) {
    return monat
      ? `hiermit übersenden wir Ihnen laut Vertrag die Rechnung v. ${monat} für folgende Leistungen:`
      : `hiermit übersenden wir Ihnen laut Vertrag die Rechnung für folgende Leistungen:`;
  }
  const vertrag = _r.vertrag;
  if (vertrag && vertrag.startDatum) {
    const bez = vertrag.bezeichnung?.trim();
    const kern = bez ? `gemäß unserem Vertrag »${bez}«` : `gemäß unserem Vertrag`;
    if (monat) return `${kern} berechnen wir Ihnen für ${monat} folgende Leistungen:`;
    return `${kern} berechnen wir Ihnen folgende Leistungen:`;
  }
  if (monat) {
    return `hiermit übersenden wir Ihnen die Rechnung v. ${monat} für folgende Leistungen:`;
  }
  return `hiermit übersenden wir Ihnen die Rechnung für folgende Leistungen:`;
}

function monatFromRechnung(r: Rechnung): string {
  if (r.leistungsmonat) {
    const m = /^(\d{4})-(\d{2})$/.exec(r.leistungsmonat);
    if (m) {
      const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
      }
    }
  }
  if (r.rechnungsdatum) {
    const d = new Date(r.rechnungsdatum.includes("T") ? r.rechnungsdatum : r.rechnungsdatum + "T00:00:00Z");
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
    }
  }
  return "";
}

function formatEinsatzClient(von?: string, bis?: string): string {
  if (!von) return "";
  const vonStr = dt(von);
  if (!vonStr) return "";
  if (bis && bis !== von) {
    const bisStr = dt(bis);
    if (bisStr) return `vom ${vonStr} bis ${bisStr}`;
  }
  return `am ${vonStr}`;
}
export function defaultOutroRechnung(_r: Rechnung, opts: BuildOptions = {}) {
  if (opts.outro) return opts.outro;
  return "Vielen Dank für Ihren Auftrag.";
}

interface PdfContext {
  firma: Firmendaten;
  kunde: Kunde;
  ansprechpartner?: Ansprechpartner;
  objekt?: Objekt | null;
  zeigeObjektname?: boolean;
  zeigeAnsprechpartner?: boolean;
  eigeneAnrede?: string;
  /** Manuell geschriebener Empfängerblock — ersetzt den automatischen Aufbau. */
  empfaengerZeilen?: string[];
}

function mergeFirma(firma: Firmendaten, override?: Partial<Firmendaten>): Firmendaten {
  if (!override) return firma;
  const merged: Firmendaten = { ...firma };
  for (const k of Object.keys(override) as (keyof Firmendaten)[]) {
    const v = override[k];
    if (v !== undefined && v !== null && v !== "") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (merged as any)[k] = v;
    }
  }
  return merged;
}

async function resolveLogo(firma: Firmendaten, override: string | null): Promise<string | null> {
  if (override) return await logoSourceToDataUrl(override);
  if (firma.logoUrl && firma.logoUrl.trim()) {
    const fromFirma = await logoSourceToDataUrl(firma.logoUrl);
    if (fromFirma) return fromFirma;
  }
  if (firma.hasLogo) {
    const directUrl = `/einstellungen/firma/logo?v=${encodeURIComponent(firma.logoUpdatedAt ?? String(Date.now()))}`;
    const directLogo = await logoSourceToDataUrl(directUrl);
    if (directLogo) return directLogo;
    throw new Error("Firmenlogo ist gespeichert, konnte aber für die PDF nicht geladen werden. Bitte Einstellungen → Firmendaten → Logo-Debug kopieren.");
  }
  return await logoDataUrl();
}

async function buildDoc(
  ctx: PdfContext,
  titel: string,
  meta: { label: string; wert: string }[],
  metaVariant: "box" | "plain",
  metaNote: string | undefined,
  beleg: { positionen: Position[]; rabattGesamt: number; steuersatz: number; nurNetto?: boolean },
  intro: string,
  outro: string,
  signatur: string[],
  logoOverride: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pageBreakBefore?: (currentNode: any) => boolean,
  raster?: RasterOptionen,
  /** Bereits geladenes Logo (spart erneutes Laden bei mehreren Durchläufen). */
  vorgeladenesLogo?: string | null,
  layoutOptionen: PdfLayoutOptions = {},
) {
  const logo =
    vorgeladenesLogo !== undefined ? vorgeladenesLogo : await resolveLogo(ctx.firma, logoOverride);
  const t = totals(beleg.positionen, beleg.rabattGesamt, beleg.steuersatz);
  const absender = absenderzeile(ctx.firma);
  const istRechnung = titel === "Rechnung";
  const kundeColumn = {
    id: "kunde",
    // Feste Breite verhindert, dass `noWrap` bei langen Absenderdaten die
    // rechte Meta-Box aus ihrer unveränderlichen Position drückt.
    width: ABSENDER_BREITE,
    // Nur die Empfängerseite wandert im oberen Modus nach oben. Logo und
    // Rechnungsdaten bleiben rechts in ihrer eigenen, festen Anordnung.
    margin: [0, layoutOptionen.empfaengerOben ? -40 : 0, 0, 0],
    stack: [
      // Absenderzeile: feste Position, gleiche Höhe wie die erste Zeile der
      // Meta-Box rechts. Empfängerzeilen wachsen nur darunter nach unten.
      {
        text: absender,
        fontSize: absenderSchriftgroesse(absender),
        color: COLOR_TEXT,
        decoration: "underline",
        margin: [0, 0, 0, 8],
        noWrap: true,
      },
      ...(ctx.empfaengerZeilen
        ? ctx.empfaengerZeilen
        : kundeAdresse(
            ctx.kunde,
            ctx.ansprechpartner,
            ctx.objekt ?? null,
            ctx.zeigeObjektname ?? true,
            ctx.zeigeAnsprechpartner ?? true,
          )
      ).map((l) => ({
        text: l && l.trim() ? l : " ",
        fontSize: 10,
      })),
    ],
  };
  return {
    pageSize: "A4" as const,
    pageMargins: [55, 155, 55, 105] as [number, number, number, number],
    defaultStyle: { font: "Roboto", fontSize: 10, color: COLOR_TEXT, lineHeight: 1.25 },
    header: header(ctx.firma, logo),
    footer: footer(ctx.firma),
    pageBreakBefore,
    content: [
      {
        columns: [
          kundeColumn,
          metaBox(meta, metaVariant, metaNote),
        ],
        columnGap: metaVariant === "box" ? 65 : 20,
      },
      {
        id: "titel",
        text: titel,
        fontSize: istRechnung ? 17 : 20,
        bold: true,
        color: COLOR_TEXT,
        // Die kleinere Rechnungsüberschrift verändert die nachfolgenden
        // Positionen nicht: ihre geringere Zeilenhöhe wird unten ausgeglichen.
        margin: [0, istRechnung ? 45 : 30, 0, istRechnung ? 20.25 : 16.5],
      },
      {
        stack: [
          {
            id: "anrede",
            text: anrede(ctx.kunde, ctx.ansprechpartner, ctx.eigeneAnrede),
            fontSize: 11.5,
            margin: [0, 0, 0, 8],
          },
          { id: "intro", text: inlineText(intro), fontSize: 11.5, margin: [0, 0, 0, 14] },
        ],
      },
      leistungstabelle(beleg.positionen, t, beleg.steuersatz, beleg.nurNetto === true, raster, !istRechnung),
      {
        id: "outro",
        stack: [
          { text: inlineText(outro), fontSize: 11.5, margin: [0, 16, 0, 0] },
          { text: "Mit freundlichen Grüßen", fontSize: 11.5, margin: [0, 18, 0, 0] },
          ...signatur.map((s) => ({ text: s, margin: [0, 0, 0, 0], color: COLOR_TEXT })),
        ],
        unbreakable: true,
      },
    ],
  };
}

type RasterBuild = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pageBreakBefore: ((currentNode: any) => boolean) | undefined,
  raster: RasterOptionen,
) => Promise<unknown>;

/**
 * Setzt den Beleg so, dass alle Linien der Leistungstabelle auf dem
 * Linien-Raster liegen (gleich dicke Linien in jeder Vorschau, siehe
 * linienRaster.ts). Messdurchläufe sind unkomprimiert, das gelieferte PDF ist
 * normal komprimiert. Jeder Fehler bei der Feinausrichtung führt einfach zum
 * normalen PDF — niemals zu einem Abbruch.
 */
async function renderMitRaster(build: RasterBuild): Promise<PdfBuildResult> {
  let plan: RasterPlan = LEERER_PLAN;
  try {
    for (let runde = 0; runde < 3; runde++) {
      const raster: RasterOptionen = { plan };
      const probe = (await build(undefined, raster)) as Record<string, unknown>;
      probe.compress = false;
      // Kopf (Logo) und Fuß liegen fest im Seitenrand und beeinflussen das
      // Layout nicht — beim Messen weglassen, das spart viel Zeit.
      delete probe.header;
      delete probe.footer;
      const { blob } = await renderPdf(probe, []);
      const text = new TextDecoder("latin1").decode(await blob.arrayBuffer());
      const linien = waagerechteLinienAusPdf(text);
      if (liegtImRaster(linien, raster.zeilen)) break;
      const naechster = verbessereRasterPlan(linien, raster.zeilen, plan);
      if (!naechster) break;
      plan = naechster;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[belegPdf] Linien-Feinausrichtung übersprungen", err);
    plan = LEERER_PLAN;
  }
  const tracker = createHotspotTracker(A4);
  const doc = await build(tracker.pageBreakBefore, { plan });
  const result = await renderPdf(doc, []);
  return { blob: result.blob, hotspots: tracker.build() };
}

async function renderPdf(doc: unknown, hotspots: RuntimeHotspot[]): Promise<PdfBuildResult> {
  const pdfMake = await getPdfMake();
  const pdfDoc = pdfMake.createPdf(doc);
  const result: Blob | unknown = await new Promise<Blob>((resolve, reject) => {
    try {
      const ret = pdfDoc.getBlob((b: Blob) => resolve(b));
      if (ret && typeof (ret as Promise<Blob>).then === "function") {
        (ret as Promise<Blob>).then(resolve, reject);
      }
    } catch (err) {
      reject(err);
    }
  });
  const blob = result as Blob;
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error("PDF konnte nicht erzeugt werden (leerer Blob).");
  }
  return { blob, hotspots };
}

function signaturFromFirma(f: Firmendaten): string[] {
  const lines: string[] = [];
  if (f.geschaeftsfuehrer) {
    lines.push(f.geschaeftsfuehrer);
    lines.push("Geschäftsführer");
  }
  return lines;
}

export async function generateAngebotPdf(
  angebot: Angebot,
  kunde: Kunde,
  firma: Firmendaten,
  ansprechpartner?: Ansprechpartner,
  objekt?: Objekt | null,
  layoutOptionen: PdfLayoutOptions = {},
): Promise<PdfBuildResult> {
  const cacheKey =
    "a:" + angebot.id + ":" + semanticPdfKey([angebot, kunde, firma, ansprechpartner ?? null, objekt ?? null, layoutOptionen]);
  const cached = lruGet(cacheKey);
  if (cached) return cached;
  const meta = [
    { label: "Angebot-Nr.", wert: angebot.nummer },
    { label: "Angebotsdatum", wert: dt(angebotsdatumVon(angebot)) },
    angebot.gueltigBis ? { label: "Gültig bis", wert: dt(angebot.gueltigBis) } : null,
  ].filter(Boolean) as { label: string; wert: string }[];
  const opts: BuildOptions = {
    intro: angebot.optionen?.eigenesIntro || angebot.introText,
    outro: angebot.optionen?.eigenesOutro || angebot.outroText,
    materialBereitgestellt: angebot.optionen?.materialBereitgestellt ?? true,
  };
  const effFirma = mergeFirma(firma, angebot.optionen?.firmaOverride);
  const logo = await resolveLogo(effFirma, angebot.optionen?.logoOverride ?? null);
  const out = await renderMitRaster((pageBreakBefore, raster) => buildDoc(
    {
      firma: effFirma,
      kunde,
      ansprechpartner,
      objekt: objekt ?? null,
      zeigeObjektname: angebot.optionen?.objektnameImEmpfaenger ?? true,
      zeigeAnsprechpartner: angebot.optionen?.ansprechpartnerImEmpfaenger ?? true,
      eigeneAnrede: angebot.optionen?.eigeneAnrede,
      empfaengerZeilen: angebot.optionen?.empfaengerZeilen,
    },
    `Angebot ${angebot.titel || ""}`.trim(),
    meta,
    "plain",
    undefined,
    {
      positionen: angebot.positionen,
      rabattGesamt: angebot.rabattGesamt,
      steuersatz: angebot.steuersatz,
      nurNetto: true,
    },
    defaultIntroAngebot(angebot, opts),
    defaultOutroAngebot(angebot, opts),
    signaturFromFirma(effFirma),
    angebot.optionen?.logoOverride ?? null,
    pageBreakBefore,
    raster,
    logo,
    layoutOptionen,
  ));
  lruSet(cacheKey, out);
  return out;
}

export async function generateRechnungPdf(
  rechnung: Rechnung,
  kunde: Kunde,
  firma: Firmendaten,
  ansprechpartner?: Ansprechpartner,
  objekt?: Objekt | null,
  layoutOptionen: PdfLayoutOptions = {},
): Promise<PdfBuildResult> {
  const cacheKey =
    "r:" + rechnung.id + ":" + semanticPdfKey([rechnung, kunde, firma, ansprechpartner ?? null, objekt ?? null, layoutOptionen]);
  const cached = lruGet(cacheKey);
  if (cached) return cached;
  const meta = [
    { label: "Rechnung-Nr.:", wert: rechnung.nummer },
    { label: "Rechnungsdatum:", wert: dt(rechnung.rechnungsdatum) },
  ];
  const opts: BuildOptions = {
    intro: rechnung.optionen?.eigenesIntro || rechnung.introText,
    outro: rechnung.optionen?.eigenesOutro || rechnung.outroText,
    materialBereitgestellt: rechnung.optionen?.materialBereitgestellt ?? true,
  };
  const effFirma = mergeFirma(firma, rechnung.optionen?.firmaOverride);
  const t = totals(rechnung.positionen, rechnung.rabattGesamt, rechnung.steuersatz);
  // Tage zwischen Rechnungsdatum und Fälligkeit
  let tage = 14;
  if (rechnung.rechnungsdatum && rechnung.faelligkeitsdatum) {
    const d1 = new Date(rechnung.rechnungsdatum).getTime();
    const d2 = new Date(rechnung.faelligkeitsdatum).getTime();
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    if (diff > 0) tage = diff;
  }
  const zahlungsSatz = `Wir möchten Sie bitten, den Rechnungsbetrag in Höhe von ${eur(t.brutto)} innerhalb von ${tage} Tagen nach Rechnungszustellung auf unser unten genanntes Bankkonto zu überweisen.`;
  // Rechnung: kein Material-Standardsatz (nur im Angebot).
  const fullOutro = opts.outro ? opts.outro : zahlungsSatz;
  const headerNote = "Bei Zahlung bitte\ndie Rechnungs-Nr. angeben";
  const logo = await resolveLogo(effFirma, rechnung.optionen?.logoOverride ?? null);
  const out = await renderMitRaster((pageBreakBefore, raster) => buildDoc(
    {
      firma: effFirma,
      kunde,
      ansprechpartner,
      objekt: objekt ?? null,
      zeigeObjektname: rechnung.optionen?.objektnameImEmpfaenger ?? true,
      zeigeAnsprechpartner: rechnung.optionen?.ansprechpartnerImEmpfaenger ?? true,
      eigeneAnrede: rechnung.optionen?.eigeneAnrede,
      empfaengerZeilen: rechnung.optionen?.empfaengerZeilen,
    },
    "Rechnung",
    meta,
    "box",
    headerNote,
    {
      positionen: rechnung.positionen,
      rabattGesamt: rechnung.rabattGesamt,
      steuersatz: rechnung.steuersatz,
    },
    defaultIntroRechnung(rechnung, opts),
    fullOutro,
    signaturFromFirma(effFirma),
    rechnung.optionen?.logoOverride ?? null,
    pageBreakBefore,
    raster,
    logo,
    layoutOptionen,
  ));
  lruSet(cacheKey, out);
  return out;
}
