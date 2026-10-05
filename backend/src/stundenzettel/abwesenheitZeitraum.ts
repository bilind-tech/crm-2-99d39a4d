// Reine Zeitraum-Helfer für Abwesenheiten (ohne Datenbank).

import type { Abwesenheit, GenerierterTag } from "./types.js";

/** Findet die Abwesenheit, die ein Datum abdeckt (spätest erstellte gewinnt). */
export function abwesenheitAm(liste: Abwesenheit[], datum: string): Abwesenheit | undefined {
  let treffer: Abwesenheit | undefined;
  for (const a of liste) {
    if (a.von <= datum && datum <= a.bis) {
      if (!treffer || a.erstelltAm >= treffer.erstelltAm) treffer = a;
    }
  }
  return treffer;
}

/** Alle (jahr, monat)-Paare, die ein Zeitraum berührt. */
export function monateImZeitraum(von: string, bis: string): Array<{ jahr: number; monat: number }> {
  const out: Array<{ jahr: number; monat: number }> = [];
  let j = Number(von.slice(0, 4));
  let m = Number(von.slice(5, 7));
  const jEnd = Number(bis.slice(0, 4));
  const mEnd = Number(bis.slice(5, 7));
  while (j < jEnd || (j === jEnd && m <= mEnd)) {
    out.push({ jahr: j, monat: m });
    m++;
    if (m > 12) { m = 1; j++; }
    if (out.length > 30) break;
  }
  return out;
}

/**
 * Ersetzt in `vorhanden` nur die Tage, die in einem der Zeiträume liegen,
 * durch die frisch generierten Tage. Alle anderen (evtl. manuell
 * bearbeiteten) Tage bleiben unverändert.
 */
export function ersetzeTageImZeitraum(
  vorhanden: GenerierterTag[],
  frisch: GenerierterTag[],
  zeitraeume: Array<{ von: string; bis: string }>,
): GenerierterTag[] {
  const frischMap = new Map(frisch.map((t) => [t.datum, t]));
  return vorhanden.map((t) => {
    const betroffen = zeitraeume.some((z) => z.von <= t.datum && t.datum <= z.bis);
    if (!betroffen) return t;
    return frischMap.get(t.datum) ?? t;
  });
}
