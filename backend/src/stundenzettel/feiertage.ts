// NRW-Feiertage: gesetzliche werden pro Jahr deterministisch berechnet
// (Gauß'sche Osterformel). Custom-Feiertage überlagern per Datum.
// Kein Datum-Parsing über `Date.toISOString()` — sonst Zeitzone-Bugs.

import type { Wochentag } from "./types.js";
import { JS_DAY_TO_WOCHENTAG } from "./types.js";

export interface FeiertagEintrag {
  datum: string; // YYYY-MM-DD
  name: string;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function iso(jahr: number, monat: number, tag: number): string {
  return `${jahr}-${pad2(monat)}-${pad2(tag)}`;
}

/** Ostersonntag nach Gauß, liefert {monat, tag}. */
function ostersonntag(jahr: number): { monat: number; tag: number } {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return { monat, tag };
}

/** Datum n Tage nach Ostersonntag als YYYY-MM-DD. */
function osterPlus(jahr: number, offset: number): string {
  const o = ostersonntag(jahr);
  // Rechne über JS-Date (UTC-normal, keine DST-Fallen bei Kalendertagen).
  const base = new Date(Date.UTC(jahr, o.monat - 1, o.tag));
  base.setUTCDate(base.getUTCDate() + offset);
  return `${base.getUTCFullYear()}-${pad2(base.getUTCMonth() + 1)}-${pad2(base.getUTCDate())}`;
}

/** Gesetzliche NRW-Feiertage für ein Jahr. */
export function getFeiertageFuerJahr(jahr: number): FeiertagEintrag[] {
  return [
    { datum: iso(jahr, 1, 1),   name: "Neujahr" },
    { datum: osterPlus(jahr, -2), name: "Karfreitag" },
    { datum: osterPlus(jahr, 1),  name: "Ostermontag" },
    { datum: iso(jahr, 5, 1),   name: "Tag der Arbeit" },
    { datum: osterPlus(jahr, 39), name: "Christi Himmelfahrt" },
    { datum: osterPlus(jahr, 50), name: "Pfingstmontag" },
    { datum: osterPlus(jahr, 60), name: "Fronleichnam" },
    { datum: iso(jahr, 10, 3),  name: "Tag der Deutschen Einheit" },
    { datum: iso(jahr, 11, 1),  name: "Allerheiligen" },
    { datum: iso(jahr, 12, 25), name: "1. Weihnachtstag" },
    { datum: iso(jahr, 12, 26), name: "2. Weihnachtstag" },
  ];
}

/** Baut die Feiertagskarte (Datum → Name) inkl. Custom-Overrides. */
export function baueFeiertagsKarte(
  jahr: number,
  custom: FeiertagEintrag[],
): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of getFeiertageFuerJahr(jahr)) m.set(f.datum, f.name);
  for (const f of custom) m.set(f.datum, f.name); // custom überschreibt
  return m;
}

export function istWochenende(datum: string): boolean {
  const [y, mo, d] = datum.split("-").map(Number);
  const wt = JS_DAY_TO_WOCHENTAG[new Date(y, mo - 1, d).getDay()];
  return wt === "samstag" || wt === "sonntag";
}

export function wochentagVon(datum: string): Wochentag {
  const [y, mo, d] = datum.split("-").map(Number);
  return JS_DAY_TO_WOCHENTAG[new Date(y, mo - 1, d).getDay()];
}

/** Tage im Monat (1-basiert). */
export function tageImMonat(jahr: number, monat: number): number {
  return new Date(jahr, monat, 0).getDate();
}