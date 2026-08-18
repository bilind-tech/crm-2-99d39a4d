// Werkzeug-PDFs (Übergabe-/Abnahmeprotokoll, Schlüsselübergabe).
// Layout 1:1 angelehnt an belegPdf.ts (Angebot/Rechnung): selber Header mit
// Logo rechts, Absenderzeile links, dezente Linien, 4-Spalten-Footer aus
// Firmendaten. Damit fühlen sich die Protokolle wie ein Beleg an.

import logoFallback from "@/assets/logo.png";
import { api } from "@/lib/api/client";
import { getBackendUrl } from "@/lib/api/backendUrl";
import type { Firmendaten, Kunde, Objekt, ProtokollOptionen } from "@/lib/api/types";
import { A4, createHotspotTracker, type RuntimeHotspot } from "./hotspotTracker";

export interface PdfBuildResult {
  blob: Blob;
  hotspots: RuntimeHotspot[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyPdfMake = any;
let pdfMakeInstance: AnyPdfMake = null;

async function getPdfMake(): Promise<AnyPdfMake> {
  if (pdfMakeInstance) return pdfMakeInstance;
  const pmMod: any = await import("pdfmake/build/pdfmake");
  const pm: AnyPdfMake = pmMod?.default ?? pmMod;
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
  if (!res.ok) throw new Error(`Logo konnte nicht geladen werden: HTTP ${res.status} (${url})`);
  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) throw new Error(`Logo-Antwort ist kein Bild: ${blob.type || "unbekannt"}`);
  return await blobToDataUrl(blob);
}

async function fetchBundledLogo(): Promise<string | null> {
  try {
    const res = await fetch(logoFallback);
    if (!res.ok) throw new Error(`logo fetch ${res.status}`);
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

async function fetchSettingsLogo(): Promise<string | null> {
  const firma = await api.get<Firmendaten>("/einstellungen/firma");
  const logo = firma.logoUrl?.trim();
  if (logo) return await logoSourceToDataUrl(logo);
  if (firma.hasLogo) {
    return await logoSourceToDataUrl(`/einstellungen/firma/logo?v=${encodeURIComponent(firma.logoUpdatedAt ?? String(Date.now()))}`);
  }
  return null;
}

// Wie in belegPdf.ts: eingestellte Logo-URLs werden vor pdfmake in echte
// data:-URLs umgewandelt. Nur wenn nichts gesetzt ist, nutzen wir das Asset.
async function resolveLogo(firma?: Firmendaten): Promise<string | null> {
  const providedLogo = firma?.logoUrl?.trim();
  if (providedLogo) {
    const dataUrl = await logoSourceToDataUrl(providedLogo);
    if (dataUrl) return dataUrl;
  }
  if (firma?.hasLogo) {
    const directLogo = await logoSourceToDataUrl(`/einstellungen/firma/logo?v=${encodeURIComponent(firma.logoUpdatedAt ?? String(Date.now()))}`);
    if (directLogo) return directLogo;
    throw new Error("Firmenlogo ist gespeichert, konnte aber für das Protokoll-PDF nicht geladen werden. Bitte Einstellungen → Firmendaten → Logo-Debug kopieren.");
  }
  const settingsLogo = await fetchSettingsLogo();
  if (settingsLogo) return settingsLogo;
  return await fetchBundledLogo();
}

// ───────── Konstanten / Helpers (synchron zu belegPdf.ts) ────────────────

const COLOR_TEXT = "#000000";
const COLOR_MUTED = "#555555";
const COLOR_LINE = "#bdbdbd";

export function kundeName(k?: Kunde): string {
  if (!k) return "—";
  if (k.typ === "firma" && k.firmenname) return k.firmenname;
  return [k.vorname, k.nachname].filter(Boolean).join(" ") || k.nummer;
}

function kundeAdresse(k: Kunde, o?: Objekt): string[] {
  const lines: string[] = [];
  if (k.firmenname) lines.push(k.firmenname);
  const person = [k.vorname, k.nachname].filter(Boolean).join(" ");
  if (person) lines.push(person);
  if (o) {
    if (o.name) lines.push(`Objekt: ${o.name}`);
    if (o.strasse) lines.push(o.strasse);
    const plzOrt = [o.plz, o.ort].filter(Boolean).join(" ");
    if (plzOrt) lines.push(plzOrt);
  } else {
    if (k.strasse) lines.push(k.strasse);
    const plzOrt = [k.plz, k.ort].filter(Boolean).join(" ");
    if (plzOrt) lines.push(plzOrt);
  }
  return lines;
}

function absenderzeile(f?: Firmendaten): string {
  if (!f) return "";
  const teile = [f.firmenname, f.strasse, `${f.plz ?? ""} ${f.ort ?? ""}`.trim()].filter(Boolean);
  return teile.join(" – ");
}

function header(firma: Firmendaten | undefined, logo: string | null, logoSichtbar = true) {
  const logoNode = logo && logoSichtbar
    ? {
        image: logo,
        fit: [230, 96],
        absolutePosition: { x: 360, y: 22 },
      }
    : null;
  const absender = absenderzeile(firma);
  // Absenderzeile muss immer einzeilig bleiben: bei langen Firmendaten kleiner setzen.
  const absenderFs = absender.length > 78 ? 6.5 : absender.length > 64 ? 7 : absender.length > 54 ? 7.5 : 8;
  return {
    margin: [55, 30, 55, 0] as [number, number, number, number],
    stack: [
      ...(logoNode ? [logoNode] : []),
      {
        columns: [
          {
            width: "*",
            stack: [
              {
                text: absender,
                fontSize: absenderFs,
                noWrap: true,
                color: COLOR_TEXT,
                decoration: "underline",
                margin: [0, 70, 0, 0],
              },
            ],
          },
          { width: 125, text: "" },
        ],
      },
    ],
  };
}

function footer(firma?: Firmendaten) {
  return function () {
    const f = firma ?? ({} as Firmendaten);
    const cell = (
      lines: (string | null | undefined)[],
      alignment: "left" | "center" | "right" = "left",
    ) => ({
      stack: lines
        .filter(Boolean)
        .map((l) => ({ text: l as string, fontSize: 7, color: COLOR_TEXT, alignment })),
    });
    return {
      margin: [55, 0, 55, 12] as [number, number, number, number],
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
              f.firmenname,
              f.strasse,
              [f.plz, f.ort].filter(Boolean).join(" ") || null,
            ]),
            cell(["Bank", f.bankName, f.iban]),
            cell([f.telefon, f.mobil, f.email]),
            cell(
              [
                f.handelsregister,
                f.ustId ? `USt-ID: ${f.ustId}` : null,
                f.webseite,
                f.geschaeftsfuehrer ? `Geschäftsführer: ${f.geschaeftsfuehrer}` : null,
              ],
              "right",
            ),
          ],
          columnGap: 12,
        },
      ],
    };
  };
}

function metaBox(meta: { label: string; wert: string }[]) {
  const body: unknown[][] = meta.map((m) => [
    {
      text: m.label,
      fontSize: 9.5,
      border: [false, false, false, false],
      margin: [0, 1, 8, 1],
      lineHeight: 1.2,
    },
    {
      text: m.wert,
      fontSize: 9.5,
      alignment: "right",
      border: [false, false, false, false],
      margin: [0, 1, 0, 1],
      lineHeight: 1.2,
    },
  ]);
  return {
    id: "meta",
    width: 235,
    table: { widths: ["auto", "*"], body },
    layout: {
      hLineWidth: (i: number, node: { table: { body: unknown[][] } }) =>
        i === 0 || i === node.table.body.length ? 0.6 : 0,
      vLineWidth: (i: number, node: { table: { widths: unknown[] } }) =>
        i === 0 || i === node.table.widths.length ? 0.6 : 0,
      hLineColor: () => COLOR_TEXT,
      vLineColor: () => COLOR_TEXT,
      paddingTop: () => 2,
      paddingBottom: () => 2,
      paddingLeft: () => 8,
      paddingRight: () => 8,
    },
  };
}

function sectionTitle(text: string) {
  return {
    text: text.toUpperCase(),
    fontSize: 10,
    bold: true,
    color: COLOR_TEXT,
    characterSpacing: 0.6,
    margin: [0, 16, 0, 4] as [number, number, number, number],
  };
}

function thinLine() {
  return {
    canvas: [{ type: "line", x1: 0, y1: 0, x2: 485, y2: 0, lineWidth: 0.4, lineColor: COLOR_LINE }],
  };
}

function unterschriftenBlock(
  linksLabel: string,
  linksName: string,
  rechtsLabel: string,
  rechtsName: string,
) {
  return {
    margin: [0, 30, 0, 0] as [number, number, number, number],
    columns: [
      {
        width: "*",
        stack: [
          { text: linksName || " ", fontSize: 10, margin: [0, 0, 0, 28] },
          {
            canvas: [
              { type: "line", x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 0.5, lineColor: COLOR_TEXT },
            ],
          },
          { text: linksLabel, fontSize: 8, color: COLOR_MUTED, margin: [0, 3, 0, 0] },
        ],
      },
      {
        width: "*",
        stack: [
          { text: rechtsName || " ", fontSize: 10, margin: [0, 0, 0, 28] },
          {
            canvas: [
              { type: "line", x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 0.5, lineColor: COLOR_TEXT },
            ],
          },
          { text: rechtsLabel, fontSize: 8, color: COLOR_MUTED, margin: [0, 3, 0, 0] },
        ],
      },
    ],
    columnGap: 24,
  };
}

// ───────── Protokoll-Nummer (Frontend-Mock) ───────────────────────────────
// Format analog Belegnummern: PR{MM}{YY}/{NN} bzw. SU{MM}{YY}/{NN}
// Zähler pro Monat in localStorage. Pi-Backend übernimmt das später.

export type ProtokollKuerzel = "PR" | "SU";

export function nextProtokollNummer(kuerzel: ProtokollKuerzel): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const key = `mcc:protokollNr:${kuerzel}:${yy}${mm}`;
  let n = 1;
  try {
    const raw = localStorage.getItem(key);
    n = raw ? Number(raw) + 1 : 1;
    localStorage.setItem(key, String(n));
  } catch {
    /* SSR / no storage */
  }
  return `${kuerzel}${mm}${yy}/${String(n).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Übergabe-/Abnahmeprotokoll
// ─────────────────────────────────────────────────────────────────────────────

export type ProtokollArt = "uebergabe" | "abnahme" | "beides";

export interface UebergabeprotokollData {
  art: ProtokollArt;
  nummer?: string;
  datum: string; // YYYY-MM-DD
  vertreterAuftraggeber: string;
  vertreterAuftragnehmer: string;
  auftragsAdresse?: string;
  leistungsumfang: string;
  bemerkungen: string;
  maengelVorhanden?: boolean;
  maengelText?: string;
  abnahmeAnrede?: "frau" | "herr";
  abnahmeName?: string;
  ohneVorbehalt: boolean;
  kunde?: Kunde;
  objekt?: Objekt;
  firma?: Firmendaten;
  optionen?: ProtokollOptionen;
}

const PROTOKOLL_ART_LABEL: Record<ProtokollArt, string> = {
  uebergabe: "Übergabeprotokoll",
  abnahme: "Abnahmeprotokoll",
  beides: "Übergabe- und Abnahmeprotokoll",
};

export const DEFAULT_DIENSTLEISTER_SATZ = "im Augenschein genommen.";
export const DEFAULT_ABNAHME_SATZ =
  "Die Leistung wird mit den oben genannten Vorbehalten abgenommen.";

/** Adresszeilen aus Kunde/Objekt für das Feld „Auftragsadresse". */
export function auftragsAdresseAusStamm(k?: Kunde, o?: Objekt): string {
  if (!k && !o) return "";
  const lines: string[] = [];
  if (o) {
    if (o.name) lines.push(o.name);
    if (o.strasse) lines.push(o.strasse);
    const plzOrt = [o.plz, o.ort].filter(Boolean).join(" ");
    if (plzOrt) lines.push(plzOrt);
  } else if (k) {
    if (k.firmenname) lines.push(k.firmenname);
    const person = [k.vorname, k.nachname].filter(Boolean).join(" ");
    if (person) lines.push(person);
    if (k.strasse) lines.push(k.strasse);
    const plzOrt = [k.plz, k.ort].filter(Boolean).join(" ");
    if (plzOrt) lines.push(plzOrt);
  }
  return lines.join("\n");
}

/**
 * Gezeichnetes Ankreuzkästchen (kein Sonderzeichen — Roboto hat ☐/☒ nicht und
 * zeigt sonst Platzhalter). Immer leer: angekreuzt wird handschriftlich.
 */
function checkboxCanvas(size = 9) {
  const c: unknown[] = [
    {
      type: "rect",
      x: 0,
      y: 0,
      w: size,
      h: size,
      lineWidth: 0.7,
      lineColor: COLOR_TEXT,
    },
  ];
  return { width: size + 2, canvas: c, margin: [0, 2, 0, 0] as [number, number, number, number] };
}

/** Kästchen + Beschriftung als Spaltenzeile. */
function checkboxZeile(label: string, fs: number, marginTop = 0) {
  return {
    margin: [0, marginTop, 0, 0] as [number, number, number, number],
    columns: [
      checkboxCanvas(),
      { width: "*", text: label, fontSize: fs },
    ],
    columnGap: 6,
  };
}

/** Leere Schreiblinie. */
function schreiblinie(breite = 485, marginTop = 10) {
  return {
    margin: [0, marginTop, 0, 0] as [number, number, number, number],
    canvas: [
      { type: "line", x1: 0, y1: 0, x2: breite, y2: 0, lineWidth: 0.5, lineColor: COLOR_TEXT },
    ],
  };
}

/** Label links, Wert rechts auf einer Schreiblinie (wie im Referenzblatt). */
function kompakteUnterschriften(
  linksLabel: string,
  linksName: string,
  rechtsLabel: string,
  rechtsName: string,
  fs: number,
  gap: number,
) {
  const spalte = (label: string, name: string) => ({
    width: "*",
    stack: [
      { text: name || " ", fontSize: fs, margin: [0, 0, 0, 20] as [number, number, number, number] },
      {
        canvas: [
          { type: "line", x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: COLOR_TEXT },
        ],
      },
      { text: label, fontSize: fs - 1.5, color: COLOR_MUTED, margin: [0, 3, 0, 0] as [number, number, number, number] },
    ],
  });
  return {
    margin: [0, gap + 14, 0, 0] as [number, number, number, number],
    columns: [spalte(linksLabel, linksName), spalte(rechtsLabel, rechtsName)],
    columnGap: 24,
  };
}

/** Label links, Wert rechts auf einer Schreiblinie (wie im Referenzblatt). */
function feldZeile(label: string, wert: string, fs: number, labelBreite = 150) {
  const linienBreite = 485 - labelBreite - 10;
  return {
    margin: [0, 0, 0, 12] as [number, number, number, number],
    columns: [
      { width: labelBreite, text: label, fontSize: fs },
      {
        width: "*",
        stack: [
          { text: wert || " ", fontSize: fs, margin: [2, 0, 0, 1] as [number, number, number, number] },
          {
            canvas: [
              { type: "line", x1: 0, y1: 0, x2: linienBreite, y2: 0, lineWidth: 0.5, lineColor: COLOR_TEXT },
            ],
          },
        ],
      },
    ],
    columnGap: 10,
  };
}

export async function generateUebergabeprotokollPdf(
  data: UebergabeprotokollData,
): Promise<PdfBuildResult> {
  const opt = data.optionen ?? {};
  const titel = (opt.titelOverride && opt.titelOverride.trim()) || PROTOKOLL_ART_LABEL[data.art];
  const logo = await resolveLogo(data.firma);
  const tracker = createHotspotTracker(A4);
  const sektTitel = (
    key: "adresse" | "leistung" | "bemerkungen" | "dienstleister" | "ergebnis",
    fb: string,
  ) =>
    (opt.sektionsTitel?.[key] && opt.sektionsTitel[key]!.trim()) || fb;

  const adresse = data.kunde ? kundeAdresse(data.kunde, data.objekt) : ["—"];
  const auftragsAdresse =
    (data.auftragsAdresse && data.auftragsAdresse.trim()) ||
    auftragsAdresseAusStamm(data.kunde, data.objekt) ||
    "—";
  const maengel = data.maengelVorhanden === true;
  const dlSatz =
    (opt.dienstleisterSatz && opt.dienstleisterSatz.trim()) || DEFAULT_DIENSTLEISTER_SATZ;
  const abSatz = (opt.abnahmeSatz && opt.abnahmeSatz.trim()) || DEFAULT_ABNAHME_SATZ;

  // Einseitigkeit absichern: bei viel Text etwas kleiner setzen.
  const textMenge =
    (data.leistungsumfang?.length ?? 0) +
    (data.bemerkungen?.length ?? 0) +
    (maengel ? (data.maengelText?.length ?? 0) : 0) +
    auftragsAdresse.length;
  const fs = textMenge > 700 ? 8.5 : textMenge > 380 ? 9 : 10;
  const gap = textMenge > 700 ? 12 : textMenge > 380 ? 16 : 24;
  const auftragnehmer = data.firma?.firmenname?.trim() || "My Clean Center GmbH";
  const auftraggeber = adresse.filter((l) => l !== "—").join(", ");

  const doc = {
    pageSize: "A4" as const,
    pageMargins: [55, 150, 55, 95] as [number, number, number, number],
    defaultStyle: { font: "Roboto", fontSize: fs, color: COLOR_TEXT, lineHeight: 1.2 },
    header: header(data.firma, logo, opt.logoSichtbar !== false),
    footer: opt.footerSichtbar === false ? undefined : footer(data.firma),
    pageBreakBefore: tracker.pageBreakBefore,
    content: [
      {
        id: "titel",
        stack: [
          {
            text: titel.toUpperCase(),
            fontSize: fs + 6,
            bold: true,
            alignment: "center",
            color: COLOR_TEXT,
            margin: [0, 18, 0, 0],
          },
          ...(opt.untertitel && opt.untertitel.trim()
            ? [{ text: opt.untertitel, fontSize: fs, color: COLOR_MUTED, alignment: "center", margin: [0, 4, 0, 0] }]
            : []),
          { text: "", margin: [0, 0, 0, gap] },
        ],
      },
      {
        id: "kunde",
        stack: [
          { text: `Auftragnehmer: ${auftragnehmer}`, fontSize: fs, margin: [0, 0, 0, gap] },
          feldZeile("Auftraggeber:", auftraggeber, fs),
        ],
      },
      {
        id: "adresse",
        stack: [feldZeile(`${sektTitel("adresse", "Auftrag Adresse")}:`, auftragsAdresse.replace(/\n/g, ", "), fs)],
      },
      {
        id: "leistungsumfang",
        stack: [feldZeile(`${sektTitel("leistung", "Leistung")}:`, data.leistungsumfang || "", fs)],
      },
      {
        id: "datum",
        stack: [
          feldZeile("Tag und Datum (Ende Ausführung der Leistung):", formatDatum(data.datum), fs, 230),
        ],
      },
      {
        id: "bemerkungen",
        stack: [
          { text: sektTitel("bemerkungen", "Bemerkungen"), fontSize: fs, bold: true, margin: [0, gap - 6, 0, 6] },
          ...(data.bemerkungen && data.bemerkungen.trim()
            ? [{ text: data.bemerkungen, fontSize: fs, margin: [0, 0, 0, 6] as [number, number, number, number] }]
            : []),
          checkboxZeile("Die Leistung wurde wie vereinbart durchgeführt — es liegen keine Mängel vor.", fs),
          checkboxZeile("Es liegen folgende Mängel vor:", fs, 5),
          schreiblinie(470, 14),
        ],
      },
      {
        id: "dienstleister",
        stack: [
          {
            margin: [0, gap, 0, 0] as [number, number, number, number],
            columns: [
              { width: "auto", text: "Die Leistung des Dienstleisters wurde gemeinsam mit", fontSize: fs },
              checkboxCanvas(),
              { width: "auto", text: "Frau", fontSize: fs },
              checkboxCanvas(),
              { width: "auto", text: "Herr", fontSize: fs },
              {
                width: "*",
                stack: [
                  { text: data.abnahmeName || " ", fontSize: fs, margin: [2, 0, 0, 1] },
                  {
                    canvas: [
                      { type: "line", x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: COLOR_TEXT },
                    ],
                  },
                ],
              },
            ],
            columnGap: 6,
          },
          { text: dlSatz, fontSize: fs, margin: [0, 4, 0, 0] },
          { text: abSatz, fontSize: fs, margin: [0, 8, 0, 0] },
        ],
      },
      ...(opt.zusatzKlausel && opt.zusatzKlausel.trim()
        ? [
            {
              id: "klausel",
              stack: [{ text: opt.zusatzKlausel, fontSize: fs, margin: [0, 8, 0, 0] }],
            },
          ]
        : []),
      {
        id: "unterschriften",
        stack: [
          kompakteUnterschriften(
            "Unterschrift Auftraggeber",
            data.vertreterAuftraggeber,
            "Unterschrift Auftragnehmer",
            data.vertreterAuftragnehmer || auftragnehmer,
            fs,
            gap,
          ),
        ],
      },
    ],
  };

  const blob = await renderToBlob(doc);
  return { blob, hotspots: tracker.build() };
}

// ─────────────────────────────────────────────────────────────────────────────
// Schlüsselübergabe
// ─────────────────────────────────────────────────────────────────────────────

export type SchluesselRichtung = "ausgabe" | "ruecknahme";

export interface SchluesselZeile {
  bezeichnung: string;
  anzahl: number;
  schluesselNr: string;
  bemerkung: string;
}

export interface SchluesseluebergabeData {
  richtung: SchluesselRichtung;
  nummer?: string;
  datum: string;
  uhrzeit: string;
  schluessel: SchluesselZeile[];
  pfandEur?: number;
  vertreterAuftraggeber: string;
  vertreterAuftragnehmer: string;
  bestaetigt: boolean;
  kunde?: Kunde;
  objekt?: Objekt;
  firma?: Firmendaten;
  optionen?: ProtokollOptionen;
}

export async function generateSchluesseluebergabePdf(
  data: SchluesseluebergabeData,
): Promise<PdfBuildResult> {
  const opt = data.optionen ?? {};
  const titel =
    (opt.titelOverride && opt.titelOverride.trim()) ||
    (data.richtung === "ausgabe"
      ? "Schlüsselübergabe — Ausgabe"
      : "Schlüsselübergabe — Rücknahme");
  const logo = await resolveLogo(data.firma);
  const tracker = createHotspotTracker(A4);
  const lineWidth = opt.druckfreundlich ? 0.3 : 0.6;
  const sektTitel = (key: "schluessel" | "bestaetigung", fb: string) =>
    (opt.sektionsTitel?.[key] && opt.sektionsTitel[key]!.trim()) || fb;

  const meta: { label: string; wert: string }[] = [];
  if (data.nummer) meta.push({ label: "Beleg-Nr.", wert: data.nummer });
  meta.push({ label: "Datum", wert: formatDatum(data.datum) });
  meta.push({ label: "Uhrzeit", wert: data.uhrzeit });
  if (data.kunde?.nummer) meta.push({ label: "Kunden-Nr.", wert: data.kunde.nummer });

  const adresse = data.kunde ? kundeAdresse(data.kunde, data.objekt) : ["—"];

  const zeilen =
    data.schluessel.length > 0
      ? data.schluessel
      : [{ bezeichnung: "—", anzahl: 0, schluesselNr: "", bemerkung: "" } as SchluesselZeile];

  const tabelle = {
    id: "schluessel.tabelle",
    table: {
      headerRows: 1,
      widths: ["*", 50, 90, "*"],
      body: [
        [
          { text: "Bezeichnung", bold: true, fontSize: 10, margin: [0, 4, 0, 4] },
          { text: "Anzahl", bold: true, fontSize: 10, alignment: "center", margin: [0, 4, 0, 4] },
          { text: "Schlüssel-Nr.", bold: true, fontSize: 10, margin: [0, 4, 0, 4] },
          { text: "Bemerkung", bold: true, fontSize: 10, margin: [0, 4, 0, 4] },
        ],
        ...zeilen.map((z) => [
          { text: z.bezeichnung || "—", fontSize: 10 },
          { text: String(z.anzahl ?? 0), fontSize: 10, alignment: "center" },
          { text: z.schluesselNr || "—", fontSize: 10 },
          { text: z.bemerkung || "", fontSize: 10 },
        ]),
      ],
    },
    layout: {
      hLineWidth: () => lineWidth,
      vLineWidth: () => lineWidth,
      hLineColor: () => COLOR_TEXT,
      vLineColor: () => COLOR_TEXT,
      paddingTop: () => 6,
      paddingBottom: () => 6,
      paddingLeft: () => 8,
      paddingRight: () => 8,
    },
    margin: [0, 6, 0, 0] as [number, number, number, number],
  };

  const doc = {
    pageSize: "A4" as const,
    pageMargins: [55, 155, 55, 100] as [number, number, number, number],
    defaultStyle: { font: "Roboto", fontSize: 10, color: COLOR_TEXT, lineHeight: 1.25 },
    header: header(data.firma, logo, opt.logoSichtbar !== false),
    footer: opt.footerSichtbar === false ? undefined : footer(data.firma),
    pageBreakBefore: tracker.pageBreakBefore,
    content: [
      {
        columns: [
          {
            id: "kunde",
            width: "*",
            stack: adresse.map((l) => ({ text: l, fontSize: 10 })),
          },
          metaBox(meta),
        ],
        columnGap: 20,
      },
      {
        id: "titel",
        stack: [
          { text: titel, fontSize: 22, bold: true, color: COLOR_TEXT, margin: [0, 30, 0, 0] },
          ...(opt.untertitel && opt.untertitel.trim()
            ? [{ text: opt.untertitel, fontSize: 11, color: COLOR_MUTED, margin: [0, 4, 0, 0] }]
            : []),
          { text: "", margin: [0, 0, 0, 14] },
        ],
      },
      sectionTitle(sektTitel("schluessel", "Übergebene Schlüssel")),
      tabelle,
      {
        id: "pfand",
        text:
          data.pfandEur && data.pfandEur > 0
            ? `Hinterlegtes Pfand: ${data.pfandEur.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR`
            : "Kein Pfand hinterlegt.",
        fontSize: 10,
        color: data.pfandEur && data.pfandEur > 0 ? COLOR_TEXT : COLOR_MUTED,
        margin: [0, 8, 0, 0],
      },
      {
        id: "bestaetigung",
        stack: [
          sectionTitle(sektTitel("bestaetigung", "Bestätigung")),
          thinLine(),
          {
            text: data.bestaetigt
              ? data.richtung === "ausgabe"
                ? "Der Auftraggeber bestätigt den Erhalt der oben genannten Schlüssel."
                : "Der Auftragnehmer bestätigt die Rückgabe der oben genannten Schlüssel."
              : "Empfang/Rückgabe noch nicht bestätigt.",
            fontSize: 10,
            margin: [0, 6, 0, 0],
          },
        ],
      },
      ...(opt.zusatzKlausel && opt.zusatzKlausel.trim()
        ? [
            {
              id: "klausel",
              stack: [
                sectionTitle("Zusatzklausel"),
                thinLine(),
                { text: opt.zusatzKlausel, fontSize: 10, margin: [0, 6, 0, 0] },
              ],
            },
          ]
        : []),
      {
        id: "unterschriften",
        stack: [
          unterschriftenBlock(
            "Unterschrift Auftraggeber",
            data.vertreterAuftraggeber,
            "Unterschrift Auftragnehmer",
            data.vertreterAuftragnehmer,
          ),
        ],
      },
    ],
  };

  const blob = await renderToBlob(doc);
  return { blob, hotspots: tracker.build() };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function renderToBlob(doc: any): Promise<Blob> {
  const pm = await getPdfMake();
  const pdfDoc = pm.createPdf(doc);
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
  return blob;
}

function formatDatum(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(s: string): string {
  return s
    .replace(/[ä]/gi, "ae")
    .replace(/[ö]/gi, "oe")
    .replace(/[ü]/gi, "ue")
    .replace(/[ß]/gi, "ss")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

// ─── Adapter: Generierung direkt aus Protokoll-Datensätzen ─────────────────
import type {
  Protokoll,
  UebergabeProtokoll,
  SchluesselProtokoll,
  Kunde as KundeT,
  Objekt as ObjektT,
  Firmendaten as FirmaT,
} from "@/lib/api/types";

export async function generateProtokollPdf(
  p: Protokoll,
  kunde: KundeT | undefined,
  objekt: ObjektT | undefined,
  firma: FirmaT | undefined,
): Promise<PdfBuildResult> {
  if (p.kind === "schluessel") {
    const s = p as SchluesselProtokoll;
    return generateSchluesseluebergabePdf({
      richtung: s.richtung,
      nummer: s.nummer,
      datum: s.datum,
      uhrzeit: s.uhrzeit,
      schluessel: (s.schluessel ?? []).filter((z) => z.bezeichnung.trim() !== ""),
      pfandEur: s.pfandEur,
      vertreterAuftraggeber: s.vertreterAuftraggeber,
      vertreterAuftragnehmer: s.vertreterAuftragnehmer,
      bestaetigt: s.bestaetigt,
      kunde,
      objekt,
      firma,
      optionen: s.optionen,
    });
  }
  const u = p as UebergabeProtokoll;
  return generateUebergabeprotokollPdf({
    art: u.art,
    nummer: u.nummer,
    datum: u.datum,
    vertreterAuftraggeber: u.vertreterAuftraggeber,
    vertreterAuftragnehmer: u.vertreterAuftragnehmer,
    auftragsAdresse:
      u.adresseVomKunden === false && u.auftragsAdresse !== undefined
        ? u.auftragsAdresse
        : auftragsAdresseAusStamm(kunde, objekt),
    leistungsumfang: u.leistungsumfang,
    bemerkungen: u.bemerkungen,
    maengelVorhanden: u.maengelVorhanden ?? false,
    maengelText: u.maengelText ?? "",
    abnahmeAnrede: u.abnahmeAnrede,
    abnahmeName: u.abnahmeName ?? "",
    ohneVorbehalt: u.ohneVorbehalt,
    kunde,
    objekt,
    firma,
    optionen: u.optionen,
  });
}

export function protokollDateiname(p: Protokoll, kunde?: KundeT, objekt?: ObjektT): string {
  const kn = safeFilename(
    kunde
      ? kunde.firmenname ||
          [kunde.vorname, kunde.nachname].filter(Boolean).join(" ") ||
          kunde.nummer
      : "Kunde",
  );
  const obj = objekt?.name ? safeFilename(objekt.name) : "";
  const d = p.datum ? new Date(p.datum) : new Date();
  const ddmmyyyy = isNaN(d.getTime())
    ? ""
    : `${String(d.getUTCDate()).padStart(2, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${d.getUTCFullYear()}`;
  const prefix =
    p.kind === "schluessel"
      ? "Schluesseluebergabe"
      : p.art === "abnahme"
        ? "Abnahmeprotokoll"
        : p.art === "beides"
          ? "Protokoll"
          : "Uebergabeprotokoll";
  const teile = [`${prefix} ${p.nummer.replace("/", "-")}`, kn];
  if (obj) teile.push(`– ${obj}`);
  if (ddmmyyyy) teile.push(`(${ddmmyyyy})`);
  return `${teile.join(" ")}.pdf`.replace(/\s+/g, " ");
}

export function protokollTitel(p: Protokoll): string {
  if (p.kind === "schluessel") {
    return p.richtung === "ausgabe"
      ? "Schlüsselübergabe — Ausgabe"
      : "Schlüsselübergabe — Rücknahme";
  }
  return p.art === "abnahme"
    ? "Abnahmeprotokoll"
    : p.art === "beides"
      ? "Übergabe- und Abnahmeprotokoll"
      : "Übergabeprotokoll";
}
