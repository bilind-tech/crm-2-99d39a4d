/** Angebotsdatum: optionen.angebotsdatum (YYYY-MM-DD), sonst Erstellungstag. Keine Migration nötig. */
export function angebotsdatumVon(a: { erstelltAm: string; optionen?: unknown }): string {
  const o = a.optionen as { angebotsdatum?: unknown } | null | undefined;
  const d = o && typeof o.angebotsdatum === "string" ? o.angebotsdatum : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : a.erstelltAm;
}
