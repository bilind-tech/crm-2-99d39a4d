-- Belegnummern: Zähler läuft pro (Kunde, Belegart) durchgehend weiter.
-- Kein monatlicher Reset mehr. Das Nummernformat bleibt unverändert
-- ({PREFIX}{MMYY}/{NN}) — MMYY beschreibt weiterhin den Belegmonat.
--
-- Reine Konsolidierung der Zählerstände. Belege, Kunden und alle anderen
-- Daten werden nicht angefasst. Idempotent: die Migration läuft genau einmal
-- (schema_version) und ist beim erneuten Anwenden auf bereits konsolidierte
-- Daten ein No-Op.

CREATE TABLE IF NOT EXISTS belegnummer_zaehler_v3 (
  kunde_id        TEXT NOT NULL,
  belegart        TEXT NOT NULL CHECK (belegart IN ('angebot','rechnung')),
  periode         TEXT NOT NULL,                    -- fest "ALL" (durchlaufend)
  naechster_start INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (kunde_id, belegart, periode)
);

-- Höchsten bisherigen Stand pro Kunde+Belegart übernehmen.
INSERT OR REPLACE INTO belegnummer_zaehler_v3 (kunde_id, belegart, periode, naechster_start)
SELECT kunde_id, belegart, 'ALL', MAX(naechster_start)
FROM belegnummer_zaehler
GROUP BY kunde_id, belegart;

DROP TABLE belegnummer_zaehler;
ALTER TABLE belegnummer_zaehler_v3 RENAME TO belegnummer_zaehler;
