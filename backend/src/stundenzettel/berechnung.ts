// Deterministische Tages-Berechnung in Minuten (Integer).
// Ganze-Stunden-Regel: `Math.floor` je Block, Endzeit wird passend
// zurückgerechnet. Pause zählt nur für Block 1 und nur, wenn Block 1
// länger als die konfigurierte Schwelle ist.

import type { StandardZeit, WochentagZeit } from "./types.js";

export function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function fromMin(min: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h < 10 ? "0" : ""}${h}:${m < 10 ? "0" : ""}${m}`;
}

export interface BerechneterTag {
  beginn: string;
  ende: string;
  beginn2?: string;
  ende2?: string;
  pause?: number;
  stunden: number; // ganze Stunden
}

/**
 * Ermittelt Zeiten und Stunden für einen normalen Arbeitstag.
 * Wendet sofort die Ganze-Stunden-Regel an (Floor je Block).
 */
export function berechneNormalenTag(
  zeit: WochentagZeit,
  standard: StandardZeit,
): BerechneterTag {
  const start1 = toMin(zeit.beginn);
  const end1Roh = toMin(zeit.ende);
  const block1Gross = Math.max(0, end1Roh - start1);

  const schwelle = standard.pauseAbStunden * 60;
  const pauseAngewendet = block1Gross > schwelle ? Math.max(0, Math.round(zeit.pause)) : 0;
  const block1Net = Math.max(0, block1Gross - pauseAngewendet);
  const block1Floor = Math.floor(block1Net / 60) * 60;
  const end1Final = start1 + block1Floor + pauseAngewendet;

  let block2Floor = 0;
  let beginn2: string | undefined;
  let ende2: string | undefined;
  if (zeit.block2 && zeit.block2.beginn && zeit.block2.ende) {
    const start2 = toMin(zeit.block2.beginn);
    const end2Roh = toMin(zeit.block2.ende);
    const block2Gross = Math.max(0, end2Roh - start2);
    block2Floor = Math.floor(block2Gross / 60) * 60;
    beginn2 = fromMin(start2);
    ende2 = fromMin(start2 + block2Floor);
  }

  const stunden = (block1Floor + block2Floor) / 60;
  return {
    beginn: fromMin(start1),
    ende: fromMin(end1Final),
    beginn2,
    ende2,
    pause: pauseAngewendet > 0 ? pauseAngewendet : undefined,
    stunden,
  };
}

/**
 * Stunden, die ein Wochentag "eigentlich" bringen würde (für bezahlte
 * Feiertage an Arbeitstagen). Nutzt dieselbe Ganze-Stunden-Regel.
 */
export function normStundenFuerWochentag(
  zeit: WochentagZeit,
  standard: StandardZeit,
): number {
  return berechneNormalenTag(zeit, standard).stunden;
}