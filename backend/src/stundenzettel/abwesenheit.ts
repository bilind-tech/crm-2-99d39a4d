// Abwesenheiten (Urlaub/Krank/Sonstiges) — Persistenz + Nachberechnung
// betroffener, bereits vorhandener Monats-Stundenzettel.

import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/index.js";
import type { Abwesenheit, AbwesenheitInput } from "./types.js";

interface Row {
  id: string;
  mitarbeiter_id: string;
  art: Abwesenheit["art"];
  von: string;
  bis: string;
  notiz: string | null;
  erstellt_am: string;
  aktualisiert_am: string;
}

function map(r: Row): Abwesenheit {
  return {
    id: r.id,
    mitarbeiterId: r.mitarbeiter_id,
    art: r.art,
    von: r.von,
    bis: r.bis,
    notiz: r.notiz,
    erstelltAm: r.erstellt_am,
    aktualisiertAm: r.aktualisiert_am,
  };
}

export function listAbwesenheiten(mitarbeiterId?: string): Abwesenheit[] {
  const db = getDatabase();
  const rows = mitarbeiterId
    ? (db.prepare("SELECT * FROM stz_abwesenheit WHERE mitarbeiter_id = ? ORDER BY von DESC").all(mitarbeiterId) as Row[])
    : (db.prepare("SELECT * FROM stz_abwesenheit ORDER BY von DESC").all() as Row[]);
  return rows.map(map);
}

export function getAbwesenheit(id: string): Abwesenheit | null {
  const r = getDatabase().prepare("SELECT * FROM stz_abwesenheit WHERE id = ?").get(id) as Row | undefined;
  return r ? map(r) : null;
}

export function createAbwesenheit(input: AbwesenheitInput): Abwesenheit {
  const id = randomUUID();
  getDatabase()
    .prepare("INSERT INTO stz_abwesenheit (id, mitarbeiter_id, art, von, bis, notiz) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, input.mitarbeiterId, input.art, input.von, input.bis, input.notiz?.trim() || null);
  return getAbwesenheit(id)!;
}

export function updateAbwesenheit(id: string, input: AbwesenheitInput): Abwesenheit | null {
  const r = getDatabase()
    .prepare(
      `UPDATE stz_abwesenheit SET mitarbeiter_id = ?, art = ?, von = ?, bis = ?, notiz = ?,
       aktualisiert_am = datetime('now') WHERE id = ?`,
    )
    .run(input.mitarbeiterId, input.art, input.von, input.bis, input.notiz?.trim() || null, id);
  return r.changes > 0 ? getAbwesenheit(id) : null;
}

export function deleteAbwesenheit(id: string): boolean {
  return getDatabase().prepare("DELETE FROM stz_abwesenheit WHERE id = ?").run(id).changes > 0;
}

export { abwesenheitAm, monateImZeitraum, ersetzeTageImZeitraum } from "./abwesenheitZeitraum.js";
