-- Monatsplanung pro Mitarbeiter: optionales Monats-Stundenziel und feste
-- Arbeitstage (Datum + Stunden). Rein additiv — bestehende Daten bleiben unberührt.

CREATE TABLE IF NOT EXISTS stz_monatsplan (
  mitarbeiter_id  TEXT NOT NULL REFERENCES stz_mitarbeiter(id) ON DELETE CASCADE,
  jahr            INTEGER NOT NULL,
  monat           INTEGER NOT NULL,
  ziel_stunden    REAL,
  feste_tage_json TEXT NOT NULL DEFAULT '[]',
  aktualisiert_am TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (mitarbeiter_id, jahr, monat)
);
