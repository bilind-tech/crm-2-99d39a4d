// Linien-Raster für die Leistungstabelle (Rechnung + Angebot).
//
// Problem: Bildschirm-Vorschauen zeichnen eine 0,8-pt-Linie je nach ihrer
// genauen Lage mal kräftig (1 voller Bildpunkt), mal blass (auf 2 Bildpunkte
// verteilt). Dadurch wirken gleich dicke Linien unterschiedlich dick.
//
// Lösung: ALLE Tabellenlinien liegen auf demselben 4-pt-Raster (Mitte der
// Linie ≡ 3,4 mod 4 — exakt wie die linke Tabellenkante bei x = 55,4).
//  - Senkrecht: feste Spaltenbreiten (je Spalte ein Vielfaches von 4 pt).
//  - Waagerecht: Der Beleg wird einmal unkomprimiert probegesetzt, die echten
//    Linien werden direkt aus dem PDF gelesen, und jede Zeile bekommt einen
//    kleinen Zusatzabstand (max. 4 pt, je zur Hälfte oben und unten), damit
//    die nächste Linie genau auf dem Raster landet.
//
// Reine Rechenlogik ohne Abhängigkeiten. MUSS identisch mit
// src/lib/pdf/linienRaster.ts bleiben (Browser-Vorschau).

/** Stärke aller Linien der Leistungstabelle (pt). */
export const TABELLEN_LINIE = 0.8;
export const RASTER_PT = 4;
/** Linien-Oberkante ≡ 3 (mod 4) → Linien-Mitte ≡ 3,4 wie die senkrechten Linien. */
export const RASTER_PHASE = 3;
const EPS = 0.005;

/** Zusatz-Abstände je Tabellenzeile + Verschiebung der ganzen Tabelle. */
export interface RasterPlan {
  /** Zusätzlicher Abstand über der Tabelle (pt). */
  shift: number;
  /** Zusätzliche Zeilenhöhe je Zeile, Schlüssel `${tabelle}:${zeile}`. */
  extra: Record<string, number>;
}

export const LEERER_PLAN: RasterPlan = { shift: 0, extra: {} };

/** Optionen, die die Vorlage beim Bauen erhält. `zeilen` füllt die Vorlage aus. */
export interface RasterOptionen {
  plan: RasterPlan;
  zeilen?: { p: number; s: number };
}

export function rasterExtra(plan: RasterPlan, tabelle: "p" | "s", zeile: number): number {
  const v = plan.extra[`${tabelle}:${zeile}`];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}

function aufRaster(y: number): number {
  const k = Math.ceil((y - RASTER_PHASE - EPS) / RASTER_PT);
  return RASTER_PHASE + k * RASTER_PT;
}

function runde(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Liest aus einem UNKOMPRIMIERTEN pdfmake-PDF die Oberkanten aller
 * waagerechten Tabellenlinien (Stärke TABELLEN_LINIE) in Zeichenreihenfolge.
 * Liefert `null`, wenn die Tabelle über mehrere Seiten läuft oder nichts
 * Eindeutiges gefunden wurde — dann wird nicht ausgerichtet.
 */
export function waagerechteLinienAusPdf(pdfText: string): number[] | null {
  const re = /(?:^|\n)([\d.]+) w\n(?:[^\n]*\n){0,6}?(-?[\d.]+) (-?[\d.]+) m\n(-?[\d.]+) (-?[\d.]+) l\n/g;
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(pdfText))) {
    const w = Number(m[1]);
    if (Math.abs(w - TABELLEN_LINIE) > 1e-6) continue;
    const y1 = Number(m[3]);
    const y2 = Number(m[5]);
    if (!Number.isFinite(y1) || Math.abs(y1 - y2) > 1e-6) continue; // nur waagerecht
    const top = y1 - TABELLEN_LINIE / 2;
    const last = out[out.length - 1];
    if (last !== undefined && Math.abs(last - top) < 0.001) continue; // weiteres Teilstück
    if (last !== undefined && top < last) return null; // neue Seite → nicht anfassen
    out.push(top);
  }
  return out.length > 0 ? out : null;
}

function zeilenSchluessel(zeilen: { p: number; s: number }): string[] {
  const keys: string[] = [];
  for (let i = 0; i < zeilen.p; i++) keys.push(`p:${i}`);
  for (let i = 0; i < zeilen.s; i++) keys.push(`s:${i}`);
  return keys;
}

function passend(linien: number[] | null, zeilen: { p: number; s: number } | undefined): linien is number[] {
  if (!linien || !zeilen || zeilen.p <= 0 || zeilen.s <= 0) return false;
  return linien.length === zeilen.p + zeilen.s + 1;
}

/** true, wenn nichts (mehr) zu korrigieren ist. */
export function liegtImRaster(linien: number[] | null, zeilen: { p: number; s: number } | undefined): boolean {
  if (!passend(linien, zeilen)) return true;
  return linien.every((y) => Math.abs(aufRaster(y) - y) < 0.01);
}

/**
 * Berechnet aus den gemessenen Linien den verbesserten Plan.
 * `null` = Messung nicht eindeutig → PDF bleibt wie es ist.
 */
export function verbessereRasterPlan(
  linien: number[] | null,
  zeilen: { p: number; s: number } | undefined,
  bisher: RasterPlan,
): RasterPlan | null {
  if (!passend(linien, zeilen)) return null;
  const keys = zeilenSchluessel(zeilen!);
  const plan: RasterPlan = { shift: bisher.shift, extra: { ...bisher.extra } };
  const d0 = aufRaster(linien[0]) - linien[0];
  let verschiebung = 0;
  if (d0 > EPS) {
    plan.shift = runde(plan.shift + d0);
    verschiebung = d0;
  }
  for (let k = 1; k < linien.length; k++) {
    const pos = linien[k] + verschiebung;
    const e = aufRaster(pos) - pos;
    if (e > EPS) {
      const key = keys[k - 1];
      plan.extra[key] = runde((plan.extra[key] ?? 0) + e);
      verschiebung += e;
    }
  }
  return plan;
}
