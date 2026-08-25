# Leistungs-Zeilenumbrüche im Volleditor zuverlässig machen

## Ziel
Egal ob beim Erstellen einer Rechnung/eines Angebots oder im PDF-Editor (Volleditor): Jede Enter-Taste, Leerzeile und Aufzählung im Leistungsfeld erscheint exakt so auch in der PDF-Tabelle — untereinander, in derselben Reihenfolge, ohne dass Eingaben „verschluckt" werden.

## Befund (aktueller Stand)
- Die PDF-Renderer (`beschreibungBlock` in `src/lib/pdf/belegPdf.ts` und `backend/src/pdf/layout.ts`) erhalten die Zeilen bereits über `descriptionLines()` in Originalreihenfolge — dort ist der Aufbau korrekt.
- Schwachstelle ist der Editor `LeistungsBeschreibung.tsx` (contentEditable): Die Enter-Taste wird nicht abgefangen, der Browser baut beim Drücken von Enter eigene `<div>`/`<br>`-Strukturen, und die Rückwandlung nach Markdown (`htmlToMarkdown`) ist dafür anfällig — genau hier gehen Zeilenumbrüche verloren oder springen.
- Derselbe Editor wird in `PositionenEditor` und `HotspotInlineEditor` (Volleditor) genutzt — ein Fix wirkt überall.

## Umsetzung

1. **Reproduktion zuerst**
   - Mit Playwright live im Preview: Rechnung öffnen → PDF bearbeiten → im Leistungsfeld mehrfach Enter und Bullet-Zeilen tippen → gespeicherten Text und erzeugte PDF prüfen. Damit ist der exakte Fehlerpunkt belegt, bevor geändert wird.

2. **Enter und Zeilenstruktur deterministisch machen** (`src/components/forms/LeistungsBeschreibung.tsx`)
   - `Enter` per `keydown` abfangen und kontrolliert als Zeilenumbruch einfügen (statt Browser-`<div>`-Chaos); `Shift+Enter` identisch.
   - Beim Setzen des Anfangswerts jede Zeile als eigenen Block rendern, damit Browser-Struktur und Serializer symmetrisch sind.
   - `htmlToMarkdown` robust gegen alle Browser-Varianten machen: `<div>`, `<br>`, leere Blöcke, verschachtelte Formatierungs-Tags — jede sichtbare Zeile erzeugt genau ein `\n`, Leerzeilen bleiben erhalten, keine doppelten/fehlenden Umbrüche.
   - Cursor bleibt nach Autosave/Server-Echo stabil (bestehender Fokus-Schutz bleibt, wird ggf. verstärkt).

3. **Roundtrip sichern**
   - Editor → gespeicherter Markdown-Text → `descriptionLines()` → PDF: für typische Eingaben testen (Überschrift, mehrere Bullets, Leerzeile, Adresse, Datum — exakt das Screenshot-Szenario).
   - Bestehende Backend-Tests (`backend/test/inline-format.spec.ts`) um diese Fälle erweitern; Frontend-/Backend-Parität prüfen.

4. **Visuelle PDF-Prüfung**
   - Testrechnung mit mehrzeiliger Liste erzeugen, PDF in Bilder rendern und Zeilenreihenfolge/Abstände kritisch kontrollieren; Fehler iterativ korrigieren.

5. **mcc-update-Sicherheit**
   - Keine neuen Abhängigkeiten; `package.json`/`package-lock.json` bleiben unverändert, damit beim Update keine Lockfile-Fehler entstehen.

## Technische Leitplanken
- Markdown-Speicherformat (`**fett**`, `*kursiv*`, `__unterstrichen__`, `• Listen`) bleibt abwärtskompatibel — alte gespeicherte Belege rendern unverändert.
- Nur Editor-, Renderer- und Testdateien werden angefasst; keine Änderungen an Daten, Backend-Routen oder Deployment.
