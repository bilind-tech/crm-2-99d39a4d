import type { GenerierterTag } from "../stundenzettel/types.js";

function toMin(hhmm?: string): number | null {
  if (!hhmm) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Hält Beginn und Ende jedes Arbeitsblocks auf derselben PDF-Textzeile. */
export function stundenzettelZeitzeilen(t: GenerierterTag): { beginn: string; ende: string } {
  const bloecke = [
    t.beginn && t.ende ? { beginn: t.beginn, ende: t.ende } : null,
    t.beginn2 && t.ende2 ? { beginn: t.beginn2, ende: t.ende2 } : null,
  ]
    .filter((block): block is { beginn: string; ende: string } => block !== null)
    .sort((a, b) => (toMin(a.beginn) ?? 0) - (toMin(b.beginn) ?? 0));

  return {
    beginn: bloecke.map((block) => block.beginn).join("\n"),
    ende: bloecke.map((block) => block.ende).join("\n"),
  };
}