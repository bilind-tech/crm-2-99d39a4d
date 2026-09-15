-- Migration 044: Geplanter E-Mail-Versand.
--
-- Rein additiv: eine NEUE Tabelle. Bestehende Tabellen (insbesondere
-- `email_versand`) werden NICHT angefasst — keine Spalten, keine CHECKs,
-- keine Daten. Damit kann die Migration bei jedem Update gefahrlos laufen.
--
-- Ablauf: Der User plant im Versand-Dialog eine Mail. Sie landet hier mit
-- Status 'geplant'. Ein Minuten-Scheduler holt fällige Zeilen, legt daraus
-- eine ganz normale `email_versand`-Zeile an (Quelle 'geplant') und schickt
-- sie über exakt denselben Sende-Pfad wie der manuelle Versand.
--
-- Zeiten werden in UTC gespeichert ('YYYY-MM-DD HH:MM:SS'), damit der
-- Vergleich mit datetime('now') stimmt.

CREATE TABLE IF NOT EXISTS email_geplant (
  id              TEXT PRIMARY KEY,
  geplant_fuer    TEXT NOT NULL,                       -- UTC 'YYYY-MM-DD HH:MM:SS'
  empfaenger_to   TEXT NOT NULL,
  empfaenger_cc   TEXT,
  empfaenger_bcc  TEXT,
  betreff         TEXT NOT NULL DEFAULT '',
  body_html       TEXT NOT NULL DEFAULT '',
  beleg_art       TEXT CHECK (beleg_art IN ('angebot','rechnung')),
  beleg_id        TEXT,
  vorlage_id      TEXT,
  signatur_id     TEXT,
  idempotenz_key  TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'geplant'
                  CHECK (status IN ('geplant','sending','gesendet','fehler','abgebrochen')),
  versuche        INTEGER NOT NULL DEFAULT 0,
  verspaetet      INTEGER NOT NULL DEFAULT 0,          -- 1 = ging später raus als geplant
  versand_id      TEXT,                                -- Verweis auf email_versand nach Versand
  versendet_am    TEXT,
  fehler_text     TEXT,
  angelegt_von    TEXT,
  erstellt_am     TEXT NOT NULL DEFAULT (datetime('now')),
  geaendert_am    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_email_geplant_faellig
  ON email_geplant(status, geplant_fuer);
CREATE INDEX IF NOT EXISTS ix_email_geplant_beleg
  ON email_geplant(beleg_art, beleg_id);
