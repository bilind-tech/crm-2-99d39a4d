// Linien-Raster für die Leistungstabelle (Rechnung + Angebot).
//
// Problem: Bildschirm-Vorschauen zeichnen eine 0,8-pt-Linie je nach ihrer
// genauen Lage mal kräftig (1 voller Bildpunkt), mal blass (auf 2 Bildpunkte
// verteilt). Dadurch wirken gleich dicke Linien unterschiedlich dick.
//
// Lösung: ALLE Tabellenlinien liegen auf demselben 3-pt-Raster (Mitte der
// Linie ≡ 1,4 mod 3 — exakt wie die linke Tabellenkante bei x = 55,4).
// 3 pt = genau 4 Bildschirmpixel bei 100 % Zoom (und ganze Pixel bei 125 %,
// 150 %, 175 %, 200 % sowie auf Retina-/Handy-Bildschirmen) → dort sind alle
// Linien pixelgleich.
//  - Senkrecht: feste Spaltenbreiten (je Spalte ein Vielfaches von 3 pt).
//  - Waagerecht: Der Beleg wird einmal unkomprimiert probegesetzt, die echten
//    Linien werden direkt aus dem PDF gelesen, und jede Zeile wird um höchstens
//    1,5 pt höher oder niedriger (je zur Hälfte oben und unten), damit die
//    nächste Linie genau auf dem Raster landet.
//
// Reine Rechenlogik ohne Abhängigkeiten. MUSS identisch mit
// backend/src/pdf/linienRaster.ts bleiben (PDF auf dem Pi).

/** Stärke aller Linien der Leistungstabelle (pt). */
export const TABELLEN_LINIE = 0.8;
export const RASTER_PT = 3;
/** Linien-Oberkante ≡ 1 (mod 3) → Linien-Mitte ≡ 1,4 wie die senkrechten Linien. */
export const RASTER_PHASE = 1;
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
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return Math.max(-MAX_SCHRUMPFEN, Math.min(RASTER_PT, v));
}

/** Zusatz NUR unten (zweiter Teil einer über den Seitenwechsel geteilten Zeile). */
export function rasterExtraUnten(plan: RasterPlan, tabelle: "p" | "s", zeile: number): number {
  const v = plan.extra[`${tabelle}:${zeile}:u`];
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return Math.max(-MAX_SCHRUMPFEN / 2, Math.min(RASTER_PT, v));
}

// `o` = Raster-Versatz der Seite. Seite 1: 0. Folgeseiten beginnen mit der
// wiederholten Kopfzeile an fester Stelle (oberer Seitenrand, nicht
// verschiebbar) — dort richtet sich die ganze Seite nach dieser ersten Linie,
// damit innerhalb jeder Seite alle Linien exakt gleich liegen.
function aufRaster(y: number, o = 0): number {
  const k = Math.ceil((y - o - RASTER_PHASE - EPS) / RASTER_PT);
  return o + RASTER_PHASE + k * RASTER_PT;
}

/** Nächstgelegener Rasterpunkt (max. 1,5 pt entfernt). */
function naechsterRaster(y: number, o = 0): number {
  const k = Math.round((y - o - RASTER_PHASE) / RASTER_PT);
  return o + RASTER_PHASE + k * RASTER_PT;
}

/** Raster-Versatz je Seite (siehe oben). */
function seitenVersatz(seiten: number[][]): number[] {
  return seiten.map((l, si) => (si === 0 || l.length === 0 ? 0 : l[0] - naechsterRaster(l[0])));
}

/** Zeilen dürfen höchstens so viel schrumpfen (Innenabstand bleibt ≥ 4 pt je Seite). */
export const MAX_SCHRUMPFEN = 4;

function runde(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Liest aus einem UNKOMPRIMIERTEN pdfmake-PDF die Oberkanten aller
 * waagerechten Tabellenlinien (Stärke TABELLEN_LINIE), getrennt nach Seiten
 * (eine neue Seite erkennt man daran, dass die Linien wieder oben beginnen).
 */
export function waagerechteLinienAusPdf(pdfText: string): number[][] | null {
  const re = /(?:^|\n)([\d.]+) w\n(?:[^\n]*\n){0,6}?(-?[\d.]+) (-?[\d.]+) m\n(-?[\d.]+) (-?[\d.]+) l\n/g;
  const seiten: number[][] = [];
  let aktuell: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(pdfText))) {
    const w = Number(m[1]);
    if (Math.abs(w - TABELLEN_LINIE) > 1e-6) continue;
    const y1 = Number(m[3]);
    const y2 = Number(m[5]);
    if (!Number.isFinite(y1) || Math.abs(y1 - y2) > 1e-6) continue; // nur waagerecht
    const top = y1 - TABELLEN_LINIE / 2;
    const last = aktuell[aktuell.length - 1];
    if (last !== undefined && Math.abs(last - top) < 0.001) continue; // weiteres Teilstück
    if (last !== undefined && top < last) {
      seiten.push(aktuell);
      aktuell = [];
    }
    aktuell.push(top);
  }
  if (aktuell.length > 0) seiten.push(aktuell);
  return seiten.length > 0 ? seiten : null;
}

interface Abstand {
  /** Zeile, deren Höhe diesen Abstand bestimmt. */
  key: string;
  von: number;
  bis: number;
  /**
   * normal: ganze Zeile auf einer Seite.
   * geteiltOben: erster Teil einer über den Seitenwechsel geteilten Zeile —
   *   endet am festen Seitenende (nicht verschiebbar).
   * fortsetzung: zweiter Teil dieser Zeile auf der Folgeseite — wird nur über
   *   den unteren Innenabstand der Zeile ausgerichtet (Schlüssel `${key}:u`).
   */
  art: "normal" | "geteiltOben" | "fortsetzung";
}

interface Zuordnung {
  start: number;
  seiten: Abstand[][];
}

/**
 * Ordnet die gemessenen Linien den Tabellenzeilen zu. Auf Folgeseiten
 * wiederholt pdfmake die Kopfzeile (p:0); die letzte Linie einer Seite ist die
 * Unterkante der letzten Zeile dort. Erst wird „keine Zeile geteilt"
 * angenommen, sonst „an jedem Seitenwechsel ist eine Zeile geteilt". Passt
 * beides nicht exakt, wird nichts zugeordnet (PDF bleibt unverändert).
 */
function zuordnen(
  seiten: number[][] | null,
  zeilen: { p: number; s: number } | undefined,
): Zuordnung | null {
  if (!seiten || !zeilen || zeilen.p <= 0 || zeilen.s <= 0) return null;
  const keys: string[] = [];
  for (let i = 0; i < zeilen.p; i++) keys.push(`p:${i}`);
  for (let i = 0; i < zeilen.s; i++) keys.push(`s:${i}`);
  return zuordnenMit(seiten, keys, false) ?? (seiten.length > 1 ? zuordnenMit(seiten, keys, true) : null);
}

function zuordnenMit(seiten: number[][], keys: string[], geteilt: boolean): Zuordnung | null {
  let naechste = 0;
  let offen: string | null = null; // geteilte Zeile von der Vorseite
  const out: Abstand[][] = [];
  for (let si = 0; si < seiten.length; si++) {
    const linien = seiten[si];
    if (linien.length < 2) return null;
    const letzteSeite = si === seiten.length - 1;
    const abst: Abstand[] = [];
    for (let k = 0; k < linien.length - 1; k++) {
      const von = linien[k];
      const bis = linien[k + 1];
      if (si > 0 && k === 0) {
        abst.push({ key: "p:0", von, bis, art: "normal" }); // wiederholte Kopfzeile
        continue;
      }
      if (offen !== null) {
        abst.push({ key: offen, von, bis, art: "fortsetzung" });
        offen = null;
        continue;
      }
      if (naechste >= keys.length) return null;
      const key = keys[naechste++];
      const istGeteilt = geteilt && !letzteSeite && k === linien.length - 2;
      if (istGeteilt) {
        if (!key.startsWith("p:") || key === "p:0") return null; // nur Positionszeilen
        offen = key;
        abst.push({ key, von, bis, art: "geteiltOben" });
      } else {
        abst.push({ key, von, bis, art: "normal" });
      }
    }
    out.push(abst);
  }
  if (offen !== null || naechste !== keys.length) return null;
  return { start: seiten[0][0], seiten: out };
}

/** Linien, die am festen Seitenende liegen (Ende eines geteilten Zeilenteils). */
function festeLinien(z: Zuordnung): Set<string> {
  const fest = new Set<string>();
  z.seiten.forEach((abst, si) => {
    abst.forEach((a, k) => {
      if (a.art === "geteiltOben") fest.add(`${si}:${k + 1}`);
    });
  });
  return fest;
}

/** true, wenn nichts (mehr) zu korrigieren ist. */
export function liegtImRaster(
  seiten: number[][] | null,
  zeilen: { p: number; s: number } | undefined,
): boolean {
  const z = zuordnen(seiten, zeilen);
  if (!z) return true;
  const fest = festeLinien(z);
  const versatz = seitenVersatz(seiten!);
  return seiten!.every((l, si) =>
    l.every((y, k) => fest.has(`${si}:${k}`) || Math.abs(naechsterRaster(y, versatz[si]) - y) < 0.01),
  );
}

/**
 * Berechnet aus den gemessenen Linien den verbesserten Plan.
 * `null` = Messung nicht eindeutig → PDF bleibt wie es ist.
 */
export function verbessereRasterPlan(
  seiten: number[][] | null,
  zeilen: { p: number; s: number } | undefined,
  bisher: RasterPlan,
): RasterPlan | null {
  const z = zuordnen(seiten, zeilen);
  if (!z) return null;
  const plan: RasterPlan = { shift: bisher.shift, extra: { ...bisher.extra } };
  const erledigt = new Set<string>();
  const versatz = seitenVersatz(seiten!);
  z.seiten.forEach((abst, si) => {
    const o = versatz[si];
    let verschiebung = 0;
    if (si === 0) {
      const d0 = naechsterRaster(z.start) - z.start;
      if (Math.abs(d0) > EPS) {
        plan.shift = runde(plan.shift + d0);
        verschiebung = d0;
      }
    }
    for (const a of abst) {
      if (a.art === "geteiltOben") {
        // Endet am festen Seitenende — hier gibt es nichts zu verschieben.
        verschiebung = 0;
        continue;
      }
      const planKey = a.art === "fortsetzung" ? `${a.key}:u` : a.key;
      if (erledigt.has(planKey)) {
        // Wiederholte Kopfzeile: gleiche Höhe wie auf Seite 1 (schon korrigiert).
        verschiebung += (plan.extra[planKey] ?? 0) - (bisher.extra[planKey] ?? 0);
        continue;
      }
      erledigt.add(planKey);
      const pos = a.bis + verschiebung;
      const alt = plan.extra[planKey] ?? 0;
      // Nächster Rasterpunkt (Zeile wird max. 1,5 pt höher ODER niedriger);
      // nur wenn die Zeile dafür zu stark schrumpfen müsste: nach unten runden.
      // Fortsetzungen (nur unterer Innenabstand) schrumpfen höchstens halb so viel.
      const minimum = a.art === "fortsetzung" ? -MAX_SCHRUMPFEN / 2 : -MAX_SCHRUMPFEN;
      let e = naechsterRaster(pos, o) - pos;
      if (alt + e < minimum || alt + e > RASTER_PT) e = aufRaster(pos, o) - pos;
      if (Math.abs(e) > EPS && alt + e <= RASTER_PT + EPS) {
        plan.extra[planKey] = runde(alt + e);
        verschiebung += e;
      }
    }
  });
  return plan;
}
