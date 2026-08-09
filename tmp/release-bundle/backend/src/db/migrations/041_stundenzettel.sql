-- Phase 1 Stundenzettel-Modul: Mitarbeiter, benutzerdefinierte Feiertage
-- (überlagern NRW-Automatik) und generierte Monats-Stundenzettel.
-- NRW-Feiertage werden nicht gespeichert, sondern deterministisch berechnet.

CREATE TABLE IF NOT EXISTS stz_mitarbeiter (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  aktiv               INTEGER NOT NULL DEFAULT 1 CHECK (aktiv IN (0,1)),
  arbeitszeiten_json  TEXT NOT NULL,
  erstellt_am         TEXT NOT NULL DEFAULT (datetime('now')),
  aktualisiert_am     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_stz_mitarbeiter_aktiv ON stz_mitarbeiter(aktiv, name);

CREATE TABLE IF NOT EXISTS stz_feiertag_custom (
  id           TEXT PRIMARY KEY,
  datum        TEXT NOT NULL, -- YYYY-MM-DD
  name         TEXT NOT NULL,
  erstellt_am  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(datum, name)
);
CREATE INDEX IF NOT EXISTS ix_stz_feiertag_datum ON stz_feiertag_custom(datum);

CREATE TABLE IF NOT EXISTS stz_stundenzettel (
  id              TEXT PRIMARY KEY,
  mitarbeiter_id  TEXT NOT NULL REFERENCES stz_mitarbeiter(id) ON DELETE CASCADE,
  jahr            INTEGER NOT NULL,
  monat           INTEGER NOT NULL CHECK (monat BETWEEN 1 AND 12),
  tage_json       TEXT NOT NULL,
  gesamt_stunden  REAL NOT NULL DEFAULT 0,
  erstellt_am     TEXT NOT NULL DEFAULT (datetime('now')),
  aktualisiert_am TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(mitarbeiter_id, jahr, monat)
);
CREATE INDEX IF NOT EXISTS ix_stz_zettel_zeitraum ON stz_stundenzettel(jahr, monat);

-- Alt-Setting "stundenzettel" (externe iframe-URL) abräumen — wird in Phase 1
-- durch das native Modul ersetzt. Verpackt in ein IIFE, damit fehlende Zeilen
-- keine Fehler werfen.
DELETE FROM setting WHERE key = 'stundenzettel';