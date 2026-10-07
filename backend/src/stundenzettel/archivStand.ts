// Pure Helfer: Inhalts-Fingerabdruck eines Stundenzettels (ohne DB-Import).
// Browser-Kopie in src/lib/stundenzettel/archivStand.ts identisch halten.
import type { GenerierterTag } from "./types.js";

export type ArchivStatus = "nicht" | "veraltet" | "gespeichert";

/** Normierter Inhalt — gleiche Generierung ergibt denselben String. */
export function zettelInhalt(tage: GenerierterTag[], gesamtStunden: number, name = ""): string {
  return JSON.stringify({
    n: name,
    g: gesamtStunden,
    t: tage.map((t) => [
      t.datum,
      t.beginn ?? "",
      t.ende ?? "",
      t.beginn2 ?? "",
      t.ende2 ?? "",
      t.pause ?? 0,
      t.stunden,
      t.bemerkung ?? "",
      t.ausgeschlossen ? 1 : 0,
    ]),
  });
}
