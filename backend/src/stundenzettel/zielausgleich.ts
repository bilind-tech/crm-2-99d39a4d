// Zielstunden-Ausgleich in ganzen Stunden.
//
// Ziel: die Monatssumme trifft EXAKT die konfigurierten Zielstunden.
// Vorgehen: Differenz in 1-Stunden-Schritte zerlegen und auf pseudo-zufällig
// gemischte normale Arbeitstage verteilen (mehrere Durchläufe erlaubt, ein Tag
// kann also auch 2h abweichen, wenn nötig).
//
// Der Zufall ist über einen Seed (Mitarbeiter-ID + Jahr + Monat) reproduzierbar:
// erneutes Generieren desselben Monats ergibt denselben Zettel.
//
// Unangetastet bleiben: Feiertage, Krank/Urlaub, Wochenenden, leere Tage.
// Grenzen: jeder Block 1..12h, Block 1 wächst nie in Block 2 hinein,
// Endzeit nie nach 24:00.

import { fromMin, toMin } from "./berechnung.js";
import type { GenerierterTag } from "./types.js";

/** Deterministischer 32-Bit-PRNG (mulberry32) aus einem String-Seed. */
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
  // Bemerkung ohne Zeiten (Feiertag/Krank/Urlaub/Wochenende) → nicht anpassen.
  if (t.bemerkung && !t.beginn) return false;
  return !!t.beginn && !!t.ende;
}

/** Versucht `deltaMin` (+60 oder −60) auf den Tag anzuwenden. true = angewendet. */
function passeTagAn(t: GenerierterTag, deltaMin: number): boolean {
  const hatZwei = !!t.beginn2 && !!t.ende2;
  const reihenfolge: Array<1 | 2> = hatZwei ? [2, 1] : [1];

  for (const blockNr of reihenfolge) {
    if (blockNr === 2) {
      const start2 = toMin(t.beginn2!);
      const neu = toMin(t.ende2!) + deltaMin;
      const laenge = neu - start2;
      if (laenge < 60 || laenge > 12 * 60) continue;
      if (neu > 24 * 60) continue;
      t.ende2 = fromMin(neu);
      t.stunden += deltaMin / 60;
      return true;
    }
    const start1 = toMin(t.beginn!);
    const pause = t.pause ?? 0;
    const neu = toMin(t.ende!) + deltaMin;
    const laengeNet = neu - start1 - pause;
    if (laengeNet < 60 || laengeNet > 12 * 60) continue;
    if (neu > 24 * 60) continue;
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

/** Gegenrechnung: stimmt die Summe der Tagesstunden mit dem Ziel überein? */
export function pruefeZiel(tage: GenerierterTag[], ziel: number | null | undefined): ZielPruefung {
  const ist = summeStunden(tage);
  if (ziel == null || ziel <= 0) {
    return { ziel: null, ist, abweichung: 0, erfuellt: true };
  }
  const abweichung = Math.round((ist - ziel) * 100) / 100;
  return { ziel, ist, abweichung, erfuellt: Math.abs(abweichung) < 0.01 };
}

/**
 * Verteilt die Differenz zum Ziel als ±1 volle Stunde auf zufällige
 * Arbeitstage. Mutiert `tage` in-place und gibt die neue Summe zurück.
 */
export function wendeZielausgleichAn(
  tage: GenerierterTag[],
  ziel: number,
  seed = "stundenzettel",
): number {
  const rnd = mulberry32(seedZahl(seed));
  const kandidaten = mische(tage.filter(istNormalerArbeitstag), rnd);
  if (kandidaten.length === 0) return summeStunden(tage);

  // Anzahl der nötigen 1h-Schritte; Sicherheitslimit gegen Endlosschleifen.
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
    // Keine Bewegung mehr möglich → Grenzen ausgereizt, Rest bleibt offen
    // (das Frontend zeigt dafür eine rote Warnung an).
    if (angepasst === 0 || schritte > maxSchritte) break;
  }

  return summeStunden(tage);
}
