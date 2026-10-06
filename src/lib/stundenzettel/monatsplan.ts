// Browser-Kopie von backend/src/stundenzettel/monatsplanLogik.ts — identisch halten.

import type { GenerierterTag } from "./types";

export interface FesterTag {
  datum: string; // YYYY-MM-DD
  stunden: number; // halbe Stunden
  bemerkung?: string | null;
}

export interface Monatsplan {
  mitarbeiterId: string;
  jahr: number;
  monat: number;
  /** null = Standardziel des Mitarbeiters gilt. */
  zielStunden: number | null;
  festeTage: FesterTag[];
  aktualisiertAm?: string | null;
}

function plusMinuten(hhmm: string, min: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = Math.min(23 * 60 + 59, h * 60 + m + min);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export function effektivesZiel(standard: number | null | undefined, plan: Monatsplan | null | undefined): number | null {
  const z = plan?.zielStunden ?? standard ?? null;
  return z != null && z > 0 ? z : null;
}

/** Setzt feste Tage als manuelle Zeilen (werden vom Zielausgleich nie verändert). */
export function wendeFesteTageAn(tage: GenerierterTag[], feste: FesterTag[] | null | undefined): void {
  if (!feste?.length) return;
  const map = new Map(feste.map((f) => [f.datum, f]));
  for (const t of tage) {
    const f = map.get(t.datum);
    if (!f) continue;
    const beginn = t.beginn ?? "08:00";
    t.beginn = beginn;
    t.ende = plusMinuten(beginn, Math.round(f.stunden * 60));
    t.beginn2 = undefined;
    t.ende2 = undefined;
    t.pause = 0;
    t.stunden = f.stunden;
    t.quelle = "manuell";
    t.ausgeschlossen = undefined;
    const b = (f.bemerkung ?? "").trim();
    t.bemerkung = b ? b.slice(0, 60) : undefined;
  }
}
