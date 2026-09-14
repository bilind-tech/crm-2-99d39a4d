// Hilfen rund um geplante E-Mails: Zeitumrechnung (Backend speichert UTC)
// und gut lesbare Klartext-Zeilen wie „morgen um 08:00 Uhr".

import type { EmailGeplant } from "@/lib/api/types";

/** UTC-Stempel "YYYY-MM-DD HH:MM:SS" aus dem Backend -> lokales Date. */
export function parseGeplantFuer(utc: string): Date {
  return new Date(utc.replace(" ", "T") + "Z");
}

/** Lokales Date -> ISO-String für das Backend. */
export function toBackendZeit(d: Date): string {
  return d.toISOString();
}

const WOCHENTAGE = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

const zwei = (n: number) => String(n).padStart(2, "0");

/** "Dienstag, 15.09.2026 um 08:00 Uhr" — mit „heute"/„morgen" wenn passend. */
export function geplantKlartext(d: Date, jetzt: Date = new Date()): string {
  const uhr = `${zwei(d.getHours())}:${zwei(d.getMinutes())} Uhr`;
  const tagDiff = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate()).getTime()) /
      86_400_000,
  );
  if (tagDiff === 0) return `heute um ${uhr}`;
  if (tagDiff === 1) return `morgen um ${uhr}`;
  const datum = `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.${d.getFullYear()}`;
  if (tagDiff > 1 && tagDiff < 7) return `${WOCHENTAGE[d.getDay()]}, ${datum} um ${uhr}`;
  return `${datum} um ${uhr}`;
}

/** Kurzform fürs Abzeichen: „morgen 08:00". */
export function geplantKurz(d: Date, jetzt: Date = new Date()): string {
  return geplantKlartext(d, jetzt).replace(" um ", " ").replace(" Uhr", "");
}

/** Datum + Uhrzeit für die beiden Eingabefelder (lokale Zeit). */
export function splitDatumZeit(d: Date): { datum: string; zeit: string } {
  return {
    datum: `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`,
    zeit: `${zwei(d.getHours())}:${zwei(d.getMinutes())}`,
  };
}

export function ausDatumZeit(datum: string, zeit: string): Date | null {
  if (!datum || !zeit) return null;
  const [y, m, t] = datum.split("-").map(Number);
  const [hh, mm] = zeit.split(":").map(Number);
  if (!y || !m || !t || Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const d = new Date(y, m - 1, t, hh, mm, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface Schnellwahl {
  label: string;
  date: () => Date;
}

function at(base: Date, stunde: number, minute = 0): Date {
  const d = new Date(base);
  d.setHours(stunde, minute, 0, 0);
  return d;
}

/** Schnellwahl-Vorschläge — nur Zeitpunkte in der Zukunft. */
export function schnellwahlen(jetzt: Date = new Date()): Schnellwahl[] {
  const morgen = new Date(jetzt);
  morgen.setDate(morgen.getDate() + 1);
  const montag = new Date(jetzt);
  const bisMontag = (8 - montag.getDay()) % 7 || 7;
  montag.setDate(montag.getDate() + bisMontag);

  const alle: Schnellwahl[] = [
    { label: "Heute 18:00", date: () => at(jetzt, 18) },
    { label: "Morgen 08:00", date: () => at(morgen, 8) },
    { label: "Morgen 12:00", date: () => at(morgen, 12) },
    { label: "Montag 08:00", date: () => at(montag, 8) },
  ];
  return alle.filter((s) => s.date().getTime() > jetzt.getTime() + 60_000);
}

/** Offene Planung zu einem Beleg finden (für das orange Abzeichen). */
export function offeneFuerBeleg(
  liste: EmailGeplant[],
  belegArt: "angebot" | "rechnung",
  belegId: string,
): EmailGeplant | undefined {
  return liste.find(
    (g) =>
      g.belegId === belegId &&
      g.belegArt === belegArt &&
      (g.status === "geplant" || g.status === "sending"),
  );
}
