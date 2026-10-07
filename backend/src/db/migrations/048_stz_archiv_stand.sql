-- Speicherstand je Stundenzettel: Hash des zuletzt in Dokumente abgelegten Inhalts.
-- Rein additiv — bestehende Daten bleiben unberührt.
ALTER TABLE stz_stundenzettel ADD COLUMN archiv_hash TEXT;
ALTER TABLE stz_stundenzettel ADD COLUMN archiv_dokument_id TEXT;
