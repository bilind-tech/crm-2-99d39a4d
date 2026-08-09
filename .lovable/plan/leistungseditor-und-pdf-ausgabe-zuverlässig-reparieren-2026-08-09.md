# Leistungseditor und PDF-Ausgabe zuverlässig reparieren

## Ziel
Leistungsbeschreibungen sollen beim Erstellen und späteren Bearbeiten von Angeboten/Rechnungen exakt in derselben Reihenfolge, mit denselben Zeilenumbrüchen und Formatierungen in Vorschau, gespeicherter PDF und erneut geöffnetem Editor erscheinen. Eingaben dürfen weder springen noch umsortiert werden.

## Umsetzung

1. **Leistungseditor stabilisieren**
   - Den Rich-Text-Editor so überarbeiten, dass React-/Autosave-Aktualisierungen während des Tippens das DOM und damit Cursor oder Auswahl nicht neu aufbauen.
   - `Enter`, Leerzeilen, Einfügen aus der Zwischenablage sowie Fett, Kursiv und Unterstrichen deterministisch zwischen Editor-Darstellung und gespeichertem Text umwandeln.
   - Toolbar-Aktionen auf die aktuelle Auswahl anwenden und den Fokus zuverlässig im Textfeld behalten.
   - Im PDF-Hotspot-Editor denselben Leistungseditor verwenden, damit Erstellen und Bearbeiten nicht zwei unterschiedliche Eingabeverhalten haben.

2. **PDF-Zeilenreihenfolge korrigieren**
   - Die aktuelle Gruppierung nach „Titel / normale Zeilen / Aufzählungen“ entfernen; sie verschiebt im Screenshot Adresse und Datum vor die Bulletpoints.
   - Jede Eingabezeile in Originalreihenfolge rendern: normale Zeile, Aufzählung und Leerzeile bleiben an ihrer eingegebenen Position.
   - Formatierungen innerhalb jeder Zeile in echte PDF-Formatierung übersetzen, ohne sichtbare Stern- oder Unterstrichmarker.
   - Den identischen Algorithmus im Live-Renderer und im Raspberry-Pi-Backend verwenden, einschließlich sauberer Umbrüche über mehrere PDF-Seiten.

3. **Datenfluss und Autosave absichern**
   - Positionen im PDF-Editor mit stabilen IDs weiterreichen, damit Vorschau-Neuberechnung und Server-Echos keine Texte überschreiben oder an den Anfang setzen.
   - Speichern, Autosave, Verwerfen und erneutes Öffnen mit mehrzeiligen und formatierten Beschreibungen prüfen.
   - Alte bereits gespeicherte Beschreibungen mit Markern weiterhin korrekt anzeigen und rendern.

4. **Gezielte Regressionstests ergänzen**
   - Tests für exakt die Screenshot-Reihenfolge: Überschrift → vier Bulletpoints → Adresse → Datum.
   - Roundtrip-Tests für `Enter`, Leerzeilen, Fett/Kursiv/Unterstrichen, gemischte Aufzählungen und kopierten Text.
   - Frontend- und Backend-PDF-Parität sowie lange mehrseitige Leistungsbeschreibungen testen.
   - Den Ablauf sowohl beim erstmaligen Erstellen als auch im PDF-Editor auf Desktop und Mobil prüfen.

5. **PDF visuell prüfen**
   - Eine Testrechnung mit dem Inhalt aus dem Screenshot erzeugen, PDF-Seiten in Bilder rendern und kritisch auf Reihenfolge, Formatierung, Abstände, Tabellenumbruch und abgeschnittene Inhalte prüfen.
   - Gefundene Darstellungsfehler iterativ korrigieren und die betroffenen Seiten erneut kontrollieren.

6. **`mcc-update` absichern**
   - Root-`package-lock.json` an den aktuell deklarierten Paketstand synchronisieren; derzeit steht `package.json` auf `@lovable.dev/vite-tanstack-config` 2.9.1, die Lockfile noch auf 2.8.4.
   - Frontend- und Backend-Installations-/Buildtests sowie relevante PDF-Tests ausführen.
   - Den selbstheilenden temporären Lockfile-Abgleich in `backend/deploy/update.sh` beibehalten und einen Update-/Release-Smoke-Test durchführen, ohne `/var/lib/mycleancenter` anzufassen.

## Technische Leitplanken
- Bestehendes Markdown-kompatibles Speicherformat bleibt abwärtskompatibel; sichtbare Marker erscheinen weder im Editor noch in PDFs.
- Frontend- und Backend-Renderer bleiben funktional identisch.
- Keine Änderung an Kundendaten, Belegen oder dem Datenverzeichnis; geändert werden nur Editor-, PDF-, Test- und Builddateien.