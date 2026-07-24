## Ziel

Das Firmenlogo erscheint zuverlässig oben rechts auf Rechnungen, Angeboten und Protokollen — auch nach Löschen/Neu-Hochladen, bei großen PNGs und ohne Cache-Probleme. `mcc-update` bleibt unverändert (nur Code, keine Migration, keine Lockfile-Änderung, keine neuen Pakete).

## Ursache

Das Logo wird aktuell als riesige Base64-Data-URL innerhalb der Firma-Settings-Row (JSON in SQLite) gespeichert. Das ist an mehreren Stellen fragil:
- Zod-`.max(3_000_000)` auf ein `z.string().trim()` — bei jedem Firma-PATCH läuft `trim()` über die komplette Data-URL. Ein einzelnes ungültiges Zeichen (z. B. Zeilenumbruch mancher Reader) macht die ganze Firma-Persistenz zu einem 422 → gesamter Save schlägt fehl, ohne dass in der UI etwas Sichtbares passiert.
- Jedes andere Firma-Feld-Save (Telefon, Bank …) muss die komplette Base64 mit-serialisieren.
- `firma.logoUrl` in DB fällt beim Backup-Restore/Update leichter aus dem Sync als eine echte Datei.

Der Backend-Renderer bevorzugt bereits eine echte Datei im `branding/`-Ordner (`loadLogoDataUrl` Zweig 2). Genau darauf schwenken wir um.

## Plan

**1) Backend: eigenständiger Logo-Endpoint (Datei-basiert)**
- Neue Routen in `backend/src/routes/einstellungen.ts` (alle `requireAuth`):
  - `GET /einstellungen/firma/logo` → liefert `image/png` bzw. `image/jpeg` mit `Cache-Control: no-store`. 404, wenn nicht vorhanden.
  - `PUT /einstellungen/firma/logo` → nimmt rohen Body (`Content-Type: image/png|jpeg|webp`, bodyLimit 10 MB reicht bereits), validiert Magic Bytes (PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP `RIFF…WEBP`), schreibt atomar nach `${dataDir}/branding/logo.<ext>` (alte Datei löschen).
  - `DELETE /einstellungen/firma/logo` → entfernt Datei.
- Beim Schreiben/Löschen: `firma.logoUpdatedAt = new Date().toISOString()` in Settings persistieren (kleiner ISO-String, kein Base64).
- `FirmaSchema.logoUrl` bleibt bestehen (Rückwärtskompatibilität für Bestandsdaten), wird aber vom neuen UI-Flow nicht mehr befüllt. Beim ersten PUT wird ein vorhandenes altes `logoUrl` in eine Datei extrahiert und der String im Setting geleert.

**2) Backend: PDF-Renderer + Cache**
- `loadLogoDataUrl()` bleibt wie es ist (Datei-Fallback ist schon da) — funktioniert unverändert.
- `logoFingerprint()` bleibt (SHA-256 über Data-URL). Damit invalidiert der bestehende PDF-Cache automatisch, sobald sich die Logo-Datei ändert. Kein separater Invalidierungspfad nötig.

**3) Frontend: Upload-Flow umbauen (`src/routes/einstellungen.tsx`)**
- `handleLogo`: statt `FileReader` → direkt `PUT /einstellungen/firma/logo` mit `body: file`, `Content-Type: file.type`. Bei 2xx → lokalen `logoUrl`-State auf `` `/einstellungen/firma/logo?v=${Date.now()}` `` setzen (bricht Browser-Cache).
- „Logo entfernen": `DELETE /einstellungen/firma/logo`, `logoUrl` auf `null`.
- Preview-`<img>` zeigt entweder den frischen URL-mit-Timestamp oder — beim ersten Laden — `/einstellungen/firma/logo?v={logoUpdatedAt}` aus dem Firma-GET. Kein Base64 im DOM/State mehr.
- Wichtige Konsequenz: Der „Speichern"-Button für Firmendaten trägt das Logo NICHT mehr im Body — Save/Delete des Logos passieren sofort beim Klick auf Upload/Entfernen. UI-Text („wird gespeichert") entsprechend anpassen.
- Fehler (unsupported type / zu groß) landen als `toast.error` mit Server-Message.

**4) Typen (`src/lib/api/types.ts`)**
- `Firmendaten.logoUrl` bleibt `string | null | undefined` — enthält jetzt eine relative URL statt Base64. Keine Breaking Change für Konsumenten (PDF-Editor-Panels lesen weiterhin `firma.logoUrl`).
- Zusätzlich `logoUpdatedAt?: string | null` für Cache-Busting.

**5) PDF-Editor Panels**
- `LogoFirmaPanel` und `StammdatenPanel` nutzen `firma.logoUrl` weiterhin als `<img src=...>` — funktioniert 1:1, weil der neue Wert eine gültige URL ist.
- `logoOverride` (Beleg-lokal) bleibt Base64/Data-URL, weil es kurzlebig pro-Beleg ist und den globalen Endpoint nicht braucht.

**6) Update-/Deploy-Safety**
- Keine neuen Dependencies, kein `package.json`/`package-lock.json`/Migration-Change → `mcc-update` läuft ohne `npm ci`-Kollision.
- Der `branding/`-Ordner wird zur Not `mkdir -p` beim ersten PUT angelegt (600er Rechte, konsistent mit Backups).
- Bestehende Installationen mit Base64-in-JSON: erster PUT migriert die Bytes in eine Datei; alte Base64 wird beim gleichen PATCH geleert. Kein manueller Migrationsschritt für den Nutzer.

**7) Verifikation nach Deploy**
- Auf dem Pi: `curl -sI https://mycleancenter-pi.local/einstellungen/firma/logo` (mit Cookie) → erwartet `image/png` + `200`.
- Rechnung öffnen → PDF wird neu gerendert (Fingerprint hat sich geändert), Logo steht oben rechts.
- Backend-Log grepen auf `settings.firma.logo` (Audit-Events der neuen Routen).

## Betroffene Dateien

- `backend/src/routes/einstellungen.ts` — 3 neue Routen, Migration alter Base64 → Datei.
- `backend/src/settings/schemas.ts` — `FirmaSchema.logoUpdatedAt` ergänzen, `logoUrl` bleibt.
- `backend/src/pdf/firma.ts` — unverändert (Datei-Fallback greift).
- `src/routes/einstellungen.tsx` — Upload/Delete direkt gegen neuen Endpoint, State entkoppelt vom Base64.
- `src/lib/api/types.ts` — optionales `logoUpdatedAt`.

Explizit **nicht** angefasst: `package.json`, `package-lock.json`, `backend/deploy/update.sh`, Migrationsverzeichnis, PDF-Cache-Logik.
