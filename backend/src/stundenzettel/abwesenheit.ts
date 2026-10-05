// Abwesenheiten (Urlaub/Krank/Sonstiges) — Persistenz + Nachberechnung
// betroffener, bereits vorhandener Monats-Stundenzettel.

import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/index.js";
import type { Abwesenheit, AbwesenheitInput, GenerierterTag } from "./types.js";

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

/** Findet die Abwesenheit, die ein Datum abdeckt (spätest erstellte gewinnt). */
export function abwesenheitAm(liste: Abwesenheit[], datum: string): Abwesenheit | undefined {
  let treffer: Abwesenheit | undefined;
  for (const a of liste) {
    if (a.von <= datum && datum <= a.bis) {
      if (!treffer || a.erstelltAm >= treffer.erstelltAm) treffer = a;
    }
  }
  return treffer;
}

/** Alle (jahr, monat)-Paare, die ein Zeitraum berührt. */
export function monateImZeitraum(von: string, bis: string): Array<{ jahr: number; monat: number }> {
  const out: Array<{ jahr: number; monat: number }> = [];
  let j = Number(von.slice(0, 4));
  let m = Number(von.slice(5, 7));
  const jEnd = Number(bis.slice(0, 4));
  const mEnd = Number(bis.slice(5, 7));
  while (j < jEnd || (j === jEnd && m <= mEnd)) {
    out.push({ jahr: j, monat: m });
    m++;
    if (m > 12) { m = 1; j++; }
    if (out.length > 30) break;
  }
  return out;
}

/**
 * Ersetzt in `vorhanden` nur die Tage, die in einem der Zeiträume liegen,
 * durch die frisch generierten Tage. Alle anderen (evtl. manuell
 * bearbeiteten) Tage bleiben unverändert.
 */
export function ersetzeTageImZeitraum(
  vorhanden: GenerierterTag[],
  frisch: GenerierterTag[],
  zeitraeume: Array<{ von: string; bis: string }>,
): GenerierterTag[] {
  const frischMap = new Map(frisch.map((t) => [t.datum, t]));
  return vorhanden.map((t) => {
    const betroffen = zeitraeume.some((z) => z.von <= t.datum && t.datum <= z.bis);
    if (!betroffen) return t;
    return frischMap.get(t.datum) ?? t;
  });
}
