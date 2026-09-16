// Gemeinsame Regeln für das Kunden-Kürzel (Frontend).
// Erlaubt: A-Z, 0-9 sowie Ä, Ö, Ü und ß.
// Wichtig: ß darf beim Großschreiben NICHT zu "SS" werden.

const SS_PLATZHALTER = "\u0000";

export function kuerzelUpper(s: string): string {
  return s
    .replace(/ß/g, SS_PLATZHALTER)
    .toUpperCase()
    .replace(new RegExp(SS_PLATZHALTER, "g"), "ß");
}

export function sanitizeKuerzel(v: string): string {
  return kuerzelUpper(v).replace(/[^A-Z0-9ÄÖÜß]/g, "");
}

export function isKuerzelFormatOk(k: string): boolean {
  return /^[A-Z0-9ÄÖÜß]+$/.test(k);
}
