-- WhatsApp-Story-Entwürfe, Bilder und eigene Google-Bewertungen.
CREATE TABLE IF NOT EXISTS whatsapp_story_projekt (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'entwurf' CHECK (status IN ('entwurf','fertig')),
  konfiguration_json TEXT NOT NULL DEFAULT '{}',
  erstellt_am TEXT NOT NULL DEFAULT (datetime('now')),
  aktualisiert_am TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS whatsapp_story_bild (
  id TEXT PRIMARY KEY,
  projekt_id TEXT NOT NULL REFERENCES whatsapp_story_projekt(id) ON DELETE CASCADE,
  dateiname TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  groesse_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  sortierung INTEGER NOT NULL DEFAULT 0,
  konfiguration_json TEXT NOT NULL DEFAULT '{}',
  erstellt_am TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_whatsapp_story_bild_projekt ON whatsapp_story_bild(projekt_id, sortierung);
CREATE INDEX IF NOT EXISTS ix_whatsapp_story_bild_sha ON whatsapp_story_bild(sha256);

CREATE TABLE IF NOT EXISTS whatsapp_story_bewertung (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  sterne INTEGER NOT NULL DEFAULT 5 CHECK (sterne BETWEEN 1 AND 5),
  quelle TEXT NOT NULL DEFAULT 'manuell',
  erstellt_am TEXT NOT NULL DEFAULT (datetime('now')),
  aktualisiert_am TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_whatsapp_story_bewertung_name ON whatsapp_story_bewertung(name COLLATE NOCASE);
