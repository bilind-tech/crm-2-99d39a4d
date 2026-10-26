# Fehler-Diagnose für PDF-Vorschau und Server-Verbindung

## Was das Bild zeigt
- Oben erscheint „Not found“. Diese Meldung kommt vom Pi selbst, wenn er eine Adresse **nicht kennt** — nicht von einer fehlenden Datenbank.
- Die Rechnung selbst (Beträge, Nummer DLS1026/01, Status) wird geladen. Die Datenbank ist also erreichbar.
- Wahrscheinlichste Ursache (noch unbestätigt): Auf dem Pi läuft nach dem Umbau eine **ältere Programmversion** als die App im Browser, oder Daten-/PDF-Ordner (Logo, Schriften, Vorlagen) fehlen auf der neuen Festplatte. Die Diagnose unten zeigt genau, was davon zutrifft.

## Was gebaut wird
1. **Klare Fehlermeldung statt „Not found“**
   - Schlägt eine PDF fehl, steht in der Vorschau: was versucht wurde, welche Antwort der Pi gab und eine verständliche Erklärung (z. B. „Pi-Version zu alt — bitte Update einspielen“ oder „Logo-Datei fehlt auf dem Pi“).
   - Button **„Fehler kopieren“**: kopiert einen fertigen Text-Bericht (Zeit, Seite, Adresse, Statuscode, Pi-Antwort, Pi-Version, App-Version) — direkt hier einfügbar.
2. **Neue Seite Einstellungen → Diagnose**
   - Ampel-Prüfungen: Pi erreichbar · Datenbank ok · Datenbank-Pfad und Datei vorhanden · Daten-Ordner beschreibbar · freier Speicher · Programmversion Pi vs. App (Warnung bei Abweichung) · PDF-Testerstellung · Logo/Schriften vorhanden · Google Drive verbunden.
   - Button **„Komplettbericht kopieren“** mit allen Ergebnissen.
   - Keine Passwörter, Schlüssel oder Tokens im Bericht.
3. **Fehlerprotokoll im Browser**: die letzten 50 fehlgeschlagenen Pi-Anfragen werden gemerkt und im Bericht mitgeliefert.

Nichts an bestehenden Funktionen, Daten oder Abläufen ändert sich; die Diagnose liest nur.

## Technische Details
- Backend: neue Route `GET /diagnose` (requireAuth, nur lesend): `config.dbPath`/`dataDir` existsSync + statSync, `SELECT 1`, Schema-Version, Schreibtest in temporärer Datei im tmp-Unterordner (sofort gelöscht, niemals in DB/Daten-Dateien), diskFree, Version, Prüfung der PDF-Assets, Probe-Render eines Mini-PDFs mit Fehler-Stack, Drive-Token vorhanden (ja/nein).
- Not-found-Handler ergänzt `method`, `url`, `version` in der 404-Antwort (Statuscode und Format bleiben gleich, kompatibel).
- Frontend: zentrale Fehlerklasse im API-Client merkt Status, URL, Antwort-Body; Ring-Puffer in sessionStorage; `PdfPreviewCard`/`PdfViewerDialog` zeigen Detail + Kopieren-Knopf; Toast „Not found“ wird zu lesbarem Text mit Endpunkt.
- Neue Komponente `DiagnoseTab` in Einstellungen; Versionsvergleich über `/version`.
- Tests: Bericht enthält keine geheimen Felder; 404-Antwort behält `error`/`statusCode`.
- Hinweis: Damit die Diagnose auf dem Pi wirkt, muss das Update einmal eingespielt werden — fehlt die Route (alte Version), meldet die Diagnoseseite genau das.
