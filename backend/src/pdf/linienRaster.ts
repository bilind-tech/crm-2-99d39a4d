// Linien-Raster für die Leistungstabelle (Rechnung + Angebot).
//
// Problem: Bildschirm-Vorschauen zeichnen eine 0,8-pt-Linie je nach ihrer
// genauen Lage mal kräftig (1 voller Bildpunkt), mal blass (auf 2 Bildpunkte
// verteilt). Dadurch wirken gleich dicke Linien unterschiedlich dick.
//
// Lösung: ALLE Tabellenlinien liegen auf demselben 4-pt-Raster
// (Koordinate ≡ 3 mod 4, exakt wie die linke Tabellenkante bei x = 55).
//  - Senkrecht: feste Spaltenbreiten (je Spalte ein Vielfaches von 4 pt).
//  - Waagerecht: Die Tabelle wird einmal probeweise gesetzt, die echten
//    Linienpositionen werden gemessen, und dann bekommt jede Zeile ein paar
//    Zehntel bis max. 4 pt zusätzlichen Innenabstand (je zur Hälfte oben und
//    unten), damit die nächste Linie genau auf dem Raster landet.
//
// Reine Rechenlogik ohne Abhängigkeiten. MUSS identisch mit
// src/lib/pdf/linienRaster.ts bleiben (Browser-Vorschau).

export const RASTER_PT = 4;
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

export function rasterExtra(plan: RasterPlan, tabelle: "p" | "s", zeile: number): number {
  return plan.extra[`${tabelle}:${zeile}`] ?? 0;
}

/** Messpunkt-ID für eine Tabellenzeile bzw. das Tabellenende. */
export function markerId(tabelle: "p" | "s", zeile: number): string {
  return `__ln:${tabelle}:${zeile}`;
}
export const MARKER_ENDE = "__ln:ende";

/**
 * Sammelt während des Setzens (pdfmake `pageBreakBefore`) die Positionen der
 * Messpunkte. `offsets[id]` = Abstand von der Linien-Oberkante bis zum
 * Messpunkt; wird beim Bauen der Tabelle eingetragen.
 */
export function createLinienMesser() {
  const offsets: Record<string, number> = {};
  const hits = new Map<string, { page: number; top: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageBreakBefore = (node: any): boolean => {
    try {
      const id: unknown = node?.id;
      if (typeof id !== "string" || !id.startsWith("__ln:") || hits.has(id)) return false;
      const sp = node?.startPosition;
      if (!sp || typeof sp.top !== "number" || typeof sp.pageNumber !== "number") return false;
      hits.set(id, { page: sp.pageNumber, top: sp.top });
    } catch {
      /* Messung ist optional — niemals das Setzen stören */
    }
    return false;
  };
  return { offsets, hits, pageBreakBefore };
}
export type LinienMesser = ReturnType<typeof createLinienMesser>;

function aufRaster(y: number): number {
  const k = Math.ceil((y - RASTER_PHASE - EPS) / RASTER_PT);
  return RASTER_PHASE + k * RASTER_PT;
}

interface Linie {
  /** Zeile, deren Höhe den Abstand ZU dieser Linie bestimmt (vorherige Zeile). */
  vorZeile: string | null;
  page: number;
  y: number;
}

function linienAusMessung(m: LinienMesser, zeilenP: number, zeilenS: number): Linie[] | null {
  const ids: { id: string; key: string }[] = [];
  for (let i = 0; i < zeilenP; i++) ids.push({ id: markerId("p", i), key: `p:${i}` });
  for (let i = 0; i < zeilenS; i++) ids.push({ id: markerId("s", i), key: `s:${i}` });
  ids.push({ id: MARKER_ENDE, key: "ende" });
  const out: Linie[] = [];
  for (let k = 0; k < ids.length; k++) {
    const hit = m.hits.get(ids[k].id);
    const off = m.offsets[ids[k].id];
    if (!hit || typeof off !== "number" || !Number.isFinite(off)) return null;
    out.push({ vorZeile: k === 0 ? null : ids[k - 1].key, page: hit.page, y: hit.top - off });
  }
  return out;
}

/** true, wenn alle gemessenen Linien exakt auf dem Raster liegen. */
export function liegtImRaster(m: LinienMesser, zeilenP: number, zeilenS: number): boolean {
  const linien = linienAusMessung(m, zeilenP, zeilenS);
  if (!linien) return true; // nichts messbar → nichts zu korrigieren
  return linien.every((l) => Math.abs(aufRaster(l.y) - l.y) < 0.01);
}

/**
 * Berechnet aus einer Messung den verbesserten Plan. Liefert `null`, wenn die
 * Messung unvollständig ist (dann bleibt das PDF unverändert).
 */
export function verbessereRasterPlan(
  m: LinienMesser,
  zeilenP: number,
  zeilenS: number,
  bisher: RasterPlan,
): RasterPlan | null {
  const linien = linienAusMessung(m, zeilenP, zeilenS);
  if (!linien || linien.length === 0) return null;
  const plan: RasterPlan = { shift: bisher.shift, extra: { ...bisher.extra } };
  let verschiebung = 0;
  for (let k = 0; k < linien.length; k++) {
    const l = linien[k];
    if (k === 0) {
      const d = aufRaster(l.y) - l.y;
      if (d > EPS) plan.shift = runde(plan.shift + d);
      verschiebung = d > EPS ? d : 0;
      continue;
    }
    if (l.page !== linien[k - 1].page) {
      // Neue Seite: Die Zeile beginnt am Seitenanfang (liegt bereits im Raster).
      verschiebung = 0;
      continue;
    }
    const pos = l.y + verschiebung;
    const e = aufRaster(pos) - pos;
    if (e > EPS && l.vorZeile) {
      plan.extra[l.vorZeile] = runde((plan.extra[l.vorZeile] ?? 0) + e);
      verschiebung += e;
    }
  }
  return plan;
}

function runde(n: number): number {
  return Math.round(n * 10000) / 10000;
}
