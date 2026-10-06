// SQLite-Persistenz der Monatsplanung.

import { getDatabase } from "../db/index.js";
import type { FesterTag, Monatsplan } from "./monatsplanLogik.js";

interface Row {
  mitarbeiter_id: string;
  jahr: number;
  monat: number;
  ziel_stunden: number | null;
  feste_tage_json: string;
  aktualisiert_am: string;
}

function map(r: Row): Monatsplan {
  let festeTage: FesterTag[] = [];
  try {
    festeTage = JSON.parse(r.feste_tage_json);
  } catch {
    festeTage = [];
  }
  return {
    mitarbeiterId: r.mitarbeiter_id,
    jahr: r.jahr,
    monat: r.monat,
    zielStunden: r.ziel_stunden ?? null,
    festeTage,
    aktualisiertAm: r.aktualisiert_am,
  };
}

export function getMonatsplan(mitarbeiterId: string, jahr: number, monat: number): Monatsplan | null {
  const row = getDatabase()
    .prepare("SELECT * FROM stz_monatsplan WHERE mitarbeiter_id = ? AND jahr = ? AND monat = ?")
    .get(mitarbeiterId, jahr, monat) as Row | undefined;
  return row ? map(row) : null;
}

export function listMonatsplaene(jahr: number, monat: number): Monatsplan[] {
  const rows = getDatabase()
    .prepare("SELECT * FROM stz_monatsplan WHERE jahr = ? AND monat = ?")
    .all(jahr, monat) as Row[];
  return rows.map(map);
}

export function speichereMonatsplan(p: Monatsplan): Monatsplan {
  const db = getDatabase();
  const feste = [...p.festeTage].sort((a, b) => a.datum.localeCompare(b.datum));
  if (p.zielStunden == null && feste.length === 0) {
    db.prepare("DELETE FROM stz_monatsplan WHERE mitarbeiter_id = ? AND jahr = ? AND monat = ?").run(
      p.mitarbeiterId,
      p.jahr,
      p.monat,
    );
    return { ...p, festeTage: [], aktualisiertAm: null };
  }
  db.prepare(
    `INSERT INTO stz_monatsplan (mitarbeiter_id, jahr, monat, ziel_stunden, feste_tage_json)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(mitarbeiter_id, jahr, monat) DO UPDATE SET
       ziel_stunden = excluded.ziel_stunden,
       feste_tage_json = excluded.feste_tage_json,
       aktualisiert_am = datetime('now')`,
  ).run(p.mitarbeiterId, p.jahr, p.monat, p.zielStunden, JSON.stringify(feste));
  return getMonatsplan(p.mitarbeiterId, p.jahr, p.monat)!;
}
