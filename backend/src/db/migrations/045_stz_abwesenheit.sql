-- Abwesenheiten (Urlaub, Krank, Sonstiges) pro Mitarbeiter, auch über
-- Monatsgrenzen hinweg. Rein additiv — bestehende Daten bleiben unberührt.

CREATE TABLE IF NOT EXISTS stz_abwesenheit (
  id              TEXT PRIMARY KEY,
  mitarbeiter_id  TEXT NOT NULL REFERENCES stz_mitarbeiter(id) ON DELETE CASCADE,
  art             TEXT NOT NULL CHECK (art IN ('urlaub','krank','sonstiges')),
  von             TEXT NOT NULL, -- YYYY-MM-DD
  bis             TEXT NOT NULL, -- YYYY-MM-DD (inklusive)
  notiz           TEXT,
  erstellt_am     TEXT NOT NULL DEFAULT (datetime('now')),
  aktualisiert_am TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_stz_abwesenheit_ma ON stz_abwesenheit(mitarbeiter_id, von, bis);
