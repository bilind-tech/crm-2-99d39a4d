// Zielstunden-Ausgleich & Gegenprüfung — Frontend-Spiegel der Backend-Logik
// (backend/src/stundenzettel/zielausgleich.ts). Wird von der Preview-Mock-API
// und für die Anzeige der roten Abweichungs-Warnung genutzt.

import type { ArbeitsZeitConfig, GenerierterTag, Wochentag } from "./types";
import { WOCHENTAGE } from "./types";

function toMin(t: string): number {
  const [h, m] = t.split(":").map((v) => Number.parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

function fromMin(min: number): string {
  const c = Math.max(0, Math.min(24 * 60, Math.round(min)));
  const h = Math.floor(c / 60);
  const m = c % 60;
  return `${h < 10 ? "0" : ""}${h}:${m < 10 ? "0" : ""}${m}`;
}

function seedZahl(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mische<T>(arr: T[], rnd: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function istNormalerArbeitstag(t: GenerierterTag): boolean {
  if (t.bemerkung && !t.beginn) return false;
  return !!t.beginn && !!t.ende;
}

function passeTagAn(t: GenerierterTag, deltaMin: number): boolean {
  const hatZwei = !!t.beginn2 && !!t.ende2;
  const reihenfolge: Array<1 | 2> = hatZwei ? [2, 1] : [1];
  for (const blockNr of reihenfolge) {
    if (blockNr === 2) {
      const start2 = toMin(t.beginn2!);
      const neu = toMin(t.ende2!) + deltaMin;
      const laenge = neu - start2;
      if (laenge < 60 || laenge > 12 * 60 || neu > 24 * 60) continue;
      t.ende2 = fromMin(neu);
      t.stunden += deltaMin / 60;
      return true;
    }
    const start1 = toMin(t.beginn!);
    const pause = t.pause ?? 0;
    const neu = toMin(t.ende!) + deltaMin;
    const laengeNet = neu - start1 - pause;
    if (laengeNet < 60 || laengeNet > 12 * 60 || neu > 24 * 60) continue;
    if (t.beginn2 && neu > toMin(t.beginn2)) continue;
    t.ende = fromMin(neu);
    t.stunden += deltaMin / 60;
    return true;
  }
  return false;
}

export function summeStunden(tage: GenerierterTag[]): number {
  return Math.round(tage.reduce((s, t) => s + (t.stunden || 0), 0) * 100) / 100;
}

export interface ZielPruefung {
  ziel: number | null;
  ist: number;
  abweichung: number;
  erfuellt: boolean;
}

/** Gegenrechnung: Summe aller Tagesstunden vs. Zielstunden. */
export function pruefeZiel(
  tage: GenerierterTag[],
  ziel: number | null | undefined,
): ZielPruefung {
  const ist = summeStunden(tage);
  if (ziel == null || ziel <= 0) return { ziel: null, ist, abweichung: 0, erfuellt: true };
  const abweichung = Math.round((ist - ziel) * 100) / 100;
  return { ziel, ist, abweichung, erfuellt: Math.abs(abweichung) < 0.01 };
}

export function wendeZielausgleichAn(
  tage: GenerierterTag[],
  ziel: number,
  seed = "stundenzettel",
): number {
  const rnd = mulberry32(seedZahl(seed));
  const kandidaten = mische(tage.filter(istNormalerArbeitstag), rnd);
  if (kandidaten.length === 0) return summeStunden(tage);

  const maxSchritte = kandidaten.length * 12 + 24;
  let schritte = 0;
  for (;;) {
    const diff = Math.round(ziel - summeStunden(tage));
    if (diff === 0) break;
    const richtung = diff > 0 ? 60 : -60;
    const brauchen = Math.abs(diff);
    let angepasst = 0;
    for (const tag of kandidaten) {
      if (angepasst >= brauchen) break;
      if (schritte++ > maxSchritte) break;
      if (passeTagAn(tag, richtung)) angepasst++;
    }
    if (angepasst === 0 || schritte > maxSchritte) break;
  }
  return summeStunden(tage);
}

/**
 * Grobe Schätzung, wie viele Stunden ein Monat mit dieser Konfiguration
 * typischerweise ergibt (min/max über 4–5 Wochen). Nur für den
 * Plausibilitäts-Hinweis im Mitarbeiter-Dialog.
 */
export function schaetzeMonatsspanne(cfg: ArbeitsZeitConfig): { min: number; max: number } {
  const stundenFuer = (w: Wochentag): number => {
    if (cfg.wpiMuster === "gleich") {
      if (!cfg.arbeitstage.includes(w)) return 0;
      const s = cfg.standardZeiten;
      const brutto = toMin(s.arbeitsende) - toMin(s.arbeitsbeginn);
      const pause = brutto > s.pauseAbStunden * 60 ? s.pauseDauer : 0;
      return Math.max(0, Math.floor((brutto - pause) / 60));
    }
    const z = cfg.wochentagZeiten[w];
    if (!z?.aktiv) return 0;
    if ((w === "samstag" || w === "sonntag") && !cfg.arbeitetAmWochenende) return 0;
    const brutto = toMin(z.ende) - toMin(z.beginn);
    const pause = brutto > cfg.standardZeiten.pauseAbStunden * 60 ? z.pause : 0;
    let h = Math.max(0, Math.floor((brutto - pause) / 60));
    if (z.block2?.beginn && z.block2?.ende) {
      h += Math.max(0, Math.floor((toMin(z.block2.ende) - toMin(z.block2.beginn)) / 60));
    }
    return h;
  };

  const proWoche = WOCHENTAGE.reduce((s, w) => s + stundenFuer(w), 0);
  return {
    min: Math.round(proWoche * 4),
    max: Math.round(proWoche * 4.5),
  };
}
