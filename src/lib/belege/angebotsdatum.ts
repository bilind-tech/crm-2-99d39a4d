import type { Angebot } from "@/lib/api/types";

/** Angebotsdatum: manuell gesetztes Datum (optionen.angebotsdatum), sonst Erstellungstag. */
export function angebotsdatumVon(a: Pick<Angebot, "erstelltAm" | "optionen">): string {
  const d = a.optionen?.angebotsdatum;
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : a.erstelltAm;
}
