## Ziel

Firmenlogo speichert & zeigt sich zuverlässig oben rechts auf **Angeboten, Rechnungen und Protokollen** — auf dem Pi (Backend-PDF) genauso wie in der Vorschau. Kein „Logo verschwindet beim Speichern" mehr, keine Zombie-Rückkehr beim Löschen. Nur Frontend + Backend-Quelltext (keine Änderungen an `package.json`/`package-lock.json`/Build-Skripten), damit `mcc-update` unverändert durchläuft.

## Diagnose (aus Codelese, nicht geraten)

1. **„Logo entfernen" + Speichern lässt das Logo wiederkommen.**
   `src/routes/einstellungen.tsx:364` setzt `logoUrl` auf `undefined`. Der Client schickt PATCH via `api.patch`, `JSON.stringify` strippt `undefined` → das Backend sieht das Feld nicht → `patchArea` merged mit dem alten Wert → Server-Antwort enthält weiterhin das alte Logo → `applyServer` schreibt es zurück ins Formular. Löschen funktioniert nie.

2. **Logo fehlt oben rechts auf Backend-PDF (Pi).**
   `backend/src/pdf/firma.ts:60` liefert nur dann eine Logo-Data-URL, wenn `firma.logoUrl` mit `data:` beginnt oder eine `branding/logo.png` existiert — sonst `null`, und `backend/src/pdf/layout.ts:94` rendert dann kein Bild. Das Frontend hat einen Fallback (`@/assets/logo.png` in `belegPdf.ts:648`), das Backend nicht. Sobald `firma.logoUrl` im DB-Wert leer/null ist (z. B. weil ein früheres Speichern es geleert hat oder weil die Größe die Schema-Grenze überschritten hat), fehlt es auf allen Pi-generierten PDFs.

3. **Größen-Falle.**
   `FirmaSchema.logoUrl` (`backend/src/settings/schemas.ts:34`) limitiert die Data-URL auf 750 000 Zeichen. Große PNGs (das gelieferte MyCleanCenter-Logo z. B.) sprengen das schnell — `patchArea` gibt dann 422 zurück und die alte Datei bleibt „irgendwie" hängen, ohne dass die UI sichtbar meckert.

## Änderungen

### 1. Löschen im Frontend eindeutig machen
`src/routes/einstellungen.tsx`
- Button „Logo entfernen" setzt `logoUrl` auf `null` statt `undefined`, damit der Wert im PATCH-Body landet.
- Beim Speichern: kurz vor `onSave` alle explizit gelöschten Felder (`logoUrl === undefined`) in `null` konvertieren, damit das Backend die Absicht sieht.

### 2. Backend akzeptiert null als „löschen"
`backend/src/settings/schemas.ts`
- `logoUrl` bleibt `nullable`, aber Max-Länge auf **3 000 000** anheben, damit übliche Marken-PNGs (bis ~2 MB Data-URL) sicher passen.

`backend/src/routes/einstellungen.ts` (`firmaFromWire` bzw. `patchArea`-Aufruf für „firma")
- Wenn `logoUrl === null` explizit im Body ankommt, wird der gespeicherte Wert wirklich auf `""` (leer) gesetzt, statt gemergt.

### 3. Backend-PDF bekommt einen zuverlässigen Logo-Weg
`backend/src/pdf/firma.ts`
- `loadLogoDataUrl()` bleibt bevorzugt bei `firma.logoUrl` (data-URL).
- Zusätzlicher Fallback: eingebettete Default-Datei `backend/src/pdf/assets/default-logo.png` (das vom Nutzer gelieferte MyCleanCenter-Logo) → so ist selbst bei leerem Setting **immer** ein Bild oben rechts sichtbar; wird durch jedes gespeicherte Firmen-Logo überschrieben.
- Logo-Datei kommt aus `/mnt/user-uploads/MYCLEANCENTER_GmbH-2.png` via `lovable-assets` (nicht binär ins Repo committen, sondern als `.asset.json`-Pointer + zur Buildzeit einmal eingelesen). Kein Einfluss auf `package.json`.

### 4. Client-Upload robuster
`src/routes/einstellungen.tsx`
- Datei-Limit von 500 KB auf **2 MB** anheben, mit klarer Fehlermeldung falls größer.
- Nach erfolgreichem Upload sofort einen Health-Check der Data-URL (`startsWith("data:image/")`), sonst Toast + Reset.

### 5. Sicherstellen, dass das PDF neu gerendert wird
- Frontend-Signatur `pdfDependencySignature` bleibt (nutzt `logoUrl.length`).
- Backend `computeHash` (`backend/src/pdf/cache.ts`) nutzt bereits `logoFingerprint(logoDataUrl)` — bleibt unverändert, greift dank Fallback jetzt auch bei leerem Setting korrekt.

### 6. Deployment-Sicherheit
- **Keine** Änderungen an `package.json`, `package-lock.json`, `bun.lock`, `vite.config.ts`, `scripts/*` oder `backend/deploy/update.sh`.
- Nur `.ts`-/`.tsx`-Dateien + eine einzige neue Asset-Pointer-Datei (`src/assets/default-logo.png.asset.json` bzw. `backend/src/pdf/assets/default-logo.png.asset.json`).
- Das nächste `mcc-update` zieht nur den geänderten Quelltext; `npm ci` läuft unverändert.

## Testschritte nach dem Update

1. Einstellungen → Firmendaten → Logo hochladen (mitgeliefertes MyCleanCenter-PNG) → Speichern → neue Rechnung anlegen → Logo oben rechts sichtbar.
2. Einstellungen → „Logo entfernen" → Speichern → Rechnungs-PDF zeigt das eingebaute Default-Logo (kein weißer Fleck), Einstellungen zeigen „kein Logo".
3. Erneut Logo hochladen → Speichern → Logo wieder oben rechts.

## Betroffene Dateien

- `src/routes/einstellungen.tsx`
- `src/hooks/useApi.ts` (nur falls `null`-Serialisierung im PATCH-Body Anpassung braucht)
- `backend/src/settings/schemas.ts`
- `backend/src/routes/einstellungen.ts`
- `backend/src/pdf/firma.ts`
- neu: `backend/src/pdf/assets/default-logo.png.asset.json` (Asset-Pointer)
