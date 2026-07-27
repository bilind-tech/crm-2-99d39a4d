// SQLite-Persistenz für Mitarbeiter, Custom-Feiertage und generierte Zettel.

import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/index.js";
import type {
  ArbeitsZeitConfig,
  CustomFeiertag,
  GenerierterStundenzettel,
  GenerierterTag,
  Mitarbeiter,
  MitarbeiterInput,
} from "./types.js";
import { DEFAULT_ARBEITSZEIT } from "./types.js";

// ---------- Mitarbeiter ----------

interface MitarbeiterRow {
  id: string;
  name: string;
  aktiv: number;
  arbeitszeiten_json: string;
  erstellt_am: string;
  aktualisiert_am: string;
}

function rowToMitarbeiter(r: MitarbeiterRow): Mitarbeiter {
  let cfg: ArbeitsZeitConfig;
  try {
    cfg = { ...DEFAULT_ARBEITSZEIT, ...JSON.parse(r.arbeitszeiten_json) };
  } catch {
    cfg = DEFAULT_ARBEITSZEIT;
  }
  return {
    id: r.id,
    name: r.name,
    aktiv: r.aktiv === 1,
    arbeitszeiten: cfg,
    erstelltAm: r.erstellt_am,
    aktualisiertAm: r.aktualisiert_am,
  };
}

export function listMitarbeiter(): Mitarbeiter[] {
  const db = getDatabase();
  const rows = db
    .prepare("SELECT * FROM stz_mitarbeiter ORDER BY aktiv DESC, name COLLATE NOCASE ASC")
    .all() as MitarbeiterRow[];
  return rows.map(rowToMitarbeiter);
}

export function getMitarbeiter(id: string): Mitarbeiter | null {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM stz_mitarbeiter WHERE id = ?").get(id) as
    | MitarbeiterRow
    | undefined;
  return row ? rowToMitarbeiter(row) : null;
}

export function createMitarbeiter(input: MitarbeiterInput): Mitarbeiter {
  const db = getDatabase();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO stz_mitarbeiter (id, name, aktiv, arbeitszeiten_json)
     VALUES (?, ?, ?, ?)`,
  ).run(id, input.name.trim(), input.aktiv ? 1 : 0, JSON.stringify(input.arbeitszeiten));
  return getMitarbeiter(id)!;
}

export function updateMitarbeiter(
  id: string,
  patch: Partial<MitarbeiterInput>,
): Mitarbeiter | null {
  const existing = getMitarbeiter(id);
  if (!existing) return null;
  const db = getDatabase();
  const next: MitarbeiterInput = {
    name: patch.name?.trim() ?? existing.name,
    aktiv: patch.aktiv ?? existing.aktiv,
    arbeitszeiten: patch.arbeitszeiten ?? existing.arbeitszeiten,
  };
  db.prepare(
    `UPDATE stz_mitarbeiter
     SET name = ?, aktiv = ?, arbeitszeiten_json = ?, aktualisiert_am = datetime('now')
     WHERE id = ?`,
  ).run(next.name, next.aktiv ? 1 : 0, JSON.stringify(next.arbeitszeiten), id);
  return getMitarbeiter(id);
}

export function deleteMitarbeiter(id: string): boolean {
  const db = getDatabase();
  const r = db.prepare("DELETE FROM stz_mitarbeiter WHERE id = ?").run(id);
  return r.changes > 0;
}

// ---------- Custom-Feiertage ----------

interface FeiertagRow {
  id: string;
  datum: string;
  name: string;
  erstellt_am: string;
}

export function listCustomFeiertage(jahr?: number): CustomFeiertag[] {
  const db = getDatabase();
  const rows =
    typeof jahr === "number"
      ? (db
          .prepare(
            "SELECT * FROM stz_feiertag_custom WHERE substr(datum,1,4) = ? ORDER BY datum ASC",
          )
          .all(String(jahr)) as FeiertagRow[])
      : (db
          .prepare("SELECT * FROM stz_feiertag_custom ORDER BY datum ASC")
          .all() as FeiertagRow[]);
  return rows.map((r) => ({
    id: r.id,
    datum: r.datum,
    name: r.name,
    erstelltAm: r.erstellt_am,
  }));
}

export function createCustomFeiertag(datum: string, name: string): CustomFeiertag {
  const db = getDatabase();
  const id = randomUUID();
  db.prepare("INSERT INTO stz_feiertag_custom (id, datum, name) VALUES (?, ?, ?)").run(
    id,
    datum,
    name.trim(),
  );
  const row = db
    .prepare("SELECT * FROM stz_feiertag_custom WHERE id = ?")
    .get(id) as FeiertagRow;
  return { id: row.id, datum: row.datum, name: row.name, erstelltAm: row.erstellt_am };
}

export function deleteCustomFeiertag(id: string): boolean {
  const db = getDatabase();
  const r = db.prepare("DELETE FROM stz_feiertag_custom WHERE id = ?").run(id);
  return r.changes > 0;
}

// ---------- Generierte Zettel ----------

interface ZettelRow {
  id: string;
  mitarbeiter_id: string;
  jahr: number;
  monat: number;
  tage_json: string;
  gesamt_stunden: number;
  erstellt_am: string;
  aktualisiert_am: string;
}

function rowToZettel(r: ZettelRow): GenerierterStundenzettel {
  let tage: GenerierterTag[] = [];
  try {
    tage = JSON.parse(r.tage_json);
  } catch {
    tage = [];
  }
  return {
    id: r.id,
    mitarbeiterId: r.mitarbeiter_id,
    jahr: r.jahr,
    monat: r.monat,
    tage,
    gesamtStunden: r.gesamt_stunden,
    aktualisiertAm: r.aktualisiert_am,
  };
}

export function findZettel(
  mitarbeiterId: string,
  jahr: number,
  monat: number,
): GenerierterStundenzettel | null {
  const db = getDatabase();
  const row = db
    .prepare(
      "SELECT * FROM stz_stundenzettel WHERE mitarbeiter_id = ? AND jahr = ? AND monat = ?",
    )
    .get(mitarbeiterId, jahr, monat) as ZettelRow | undefined;
  return row ? rowToZettel(row) : null;
}

export function getZettel(id: string): GenerierterStundenzettel | null {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM stz_stundenzettel WHERE id = ?").get(id) as
    | ZettelRow
    | undefined;
  return row ? rowToZettel(row) : null;
}

export function listZettelFuerMonat(
  jahr: number,
  monat: number,
): GenerierterStundenzettel[] {
  const db = getDatabase();
  const rows = db
    .prepare("SELECT * FROM stz_stundenzettel WHERE jahr = ? AND monat = ?")
    .all(jahr, monat) as ZettelRow[];
  return rows.map(rowToZettel);
}

/** Upsert eines Zettels für (mitarbeiter, jahr, monat). Gibt den gespeicherten Zettel zurück. */
export function upsertZettel(
  z: Omit<GenerierterStundenzettel, "id" | "aktualisiertAm"> & { id?: string | null },
): GenerierterStundenzettel {
  const db = getDatabase();
  const existing = findZettel(z.mitarbeiterId, z.jahr, z.monat);
  const id = existing?.id ?? z.id ?? randomUUID();
  const tageJson = JSON.stringify(z.tage);
  if (existing) {
    db.prepare(
      `UPDATE stz_stundenzettel
       SET tage_json = ?, gesamt_stunden = ?, aktualisiert_am = datetime('now')
       WHERE id = ?`,
    ).run(tageJson, z.gesamtStunden, id);
  } else {
    db.prepare(
      `INSERT INTO stz_stundenzettel (id, mitarbeiter_id, jahr, monat, tage_json, gesamt_stunden)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, z.mitarbeiterId, z.jahr, z.monat, tageJson, z.gesamtStunden);
  }
  return getZettel(id)!;
}

export function deleteZettel(id: string): boolean {
  const db = getDatabase();
  const r = db.prepare("DELETE FROM stz_stundenzettel WHERE id = ?").run(id);
  return r.changes > 0;
}