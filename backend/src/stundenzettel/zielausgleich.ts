// Deterministischer Zielstunden-Ausgleich in ganzen Stunden.
// Wochentag-Priorität: Fr → Do → Mi → Di → Mo → Sa → So.
// Nur normale Arbeitstage (keine Feiertage) werden angepasst.
// Max. 2 Runden je Richtung. Pro Tag ±1h pro Runde.
// Bei Zwei-Block-Tagen wird erst Block 2 angepasst, dann Block 1.
// Grenzen: jeder Block 1..12h, Block 1 wächst nicht in Block 2 hinein,
// Endzeit ≤ 24:00.

import { fromMin, toMin } from "./berechnung.js";
import type { GenerierterTag, Wochentag } from "./types.js";

const PRIORITAET: Wochentag[] = [
  "freitag",
  "donnerstag",
  "mittwoch",
  "dienstag",
  "montag",
  "samstag",
  "sonntag",
];

function istNormalerArbeitstag(t: GenerierterTag): boolean {
  // Bemerkung = Feiertag/Krank/Urlaub/Samstag/Sonntag ohne Zeit → nicht anpassen.
  if (t.bemerkung && !t.beginn) return false;
  return !!t.beginn && !!t.ende;
}

function blockMinuten(beginn?: string, ende?: string): number {
  if (!beginn || !ende) return 0;
  return Math.max(0, toMin(ende) - toMin(beginn));
}

/** Versucht `deltaMin` (+60 oder −60) auf den Tag anzuwenden. Gibt true zurück, wenn es passte. */
function passeTagAn(t: GenerierterTag, deltaMin: number): boolean {
  const hatZwei = !!t.beginn2 && !!t.ende2;
  // Reihenfolge: Zwei-Block-Tag → erst Block 2, sonst Block 1.
  const reihenfolge: Array<1 | 2> = hatZwei ? [2, 1] : [1];

  for (const blockNr of reihenfolge) {
    if (blockNr === 2) {
      const start2 = toMin(t.beginn2!);
      const alt = toMin(t.ende2!);
      const neu = alt + deltaMin;
      const laenge = neu - start2;
      if (laenge < 60 || laenge > 12 * 60) continue;
      if (neu > 24 * 60) continue;
      t.ende2 = fromMin(neu);
      t.stunden += deltaMin / 60;
      return true;
    }
    // Block 1
    const start1 = toMin(t.beginn!);
    const alt = toMin(t.ende!);
    const pause = t.pause ?? 0;
    const neu = alt + deltaMin;
    const laengeNet = neu - start1 - pause;
    if (laengeNet < 60 || laengeNet > 12 * 60) continue;
    if (neu > 24 * 60) continue;
    if (t.beginn2 && neu > toMin(t.beginn2)) continue; // darf nicht in Block 2 hineinwachsen
    t.ende = fromMin(neu);
    t.stunden += deltaMin / 60;
    return true;
  }
  return false;
}

/**
 * Trimmt die Tages-Stunden so, dass die Monatssumme exakt `ziel` ergibt
 * (soweit die Blockgrenzen es zulassen). Mutiert `tage` in-place und
 * gibt die neue Summe zurück.
 */
export function wendeZielausgleichAn(
  tage: GenerierterTag[],
  ziel: number,
): number {
  const kandidaten = tage.filter(istNormalerArbeitstag);
  const summe = () => tage.reduce((s, t) => s + t.stunden, 0);

  for (let runde = 0; runde < 2; runde++) {
    const diff = ziel - summe();
    if (Math.abs(diff) < 0.5) break;
    const richtung = diff > 0 ? +60 : -60;
    const brauchen = Math.round(Math.abs(diff));

    // Sortiere Kandidaten in Prio-Reihenfolge (stabil pro Wochentag).
    const sortiert = [...kandidaten].sort(
      (a, b) => PRIORITAET.indexOf(a.wochentag) - PRIORITAET.indexOf(b.wochentag),
    );

    let angepasstDieseRunde = 0;
    for (const tag of sortiert) {
      if (angepasstDieseRunde >= brauchen) break;
      if (passeTagAn(tag, richtung)) angepasstDieseRunde++;
    }
    if (angepasstDieseRunde === 0) break; // keine Bewegung mehr möglich
  }

  return summe();
}