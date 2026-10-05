# Dauerauftrag „laut Vertrag“, Stundenzettel-PDF auf derselben Seite, Datum tippen bei Urlaub & Krank

## 1. Dauerauftrag-Rechnungen: „laut Vertrag“ über der Tabelle
- Nur Rechnungen, die zu einem Dauerauftrag gehören, bekommen einen neuen Einleitungssatz direkt über der Tabelle:
  „hiermit übersenden wir Ihnen laut Vertrag die Rechnung v. Oktober 2026 für folgende Leistungen:“
  Ist kein Monat hinterlegt, entfällt „v. {Monat}“.
- Als Dauerauftrag zählt eine Rechnung, wenn sie einem Dauerauftrag zugeordnet ist oder als „Dauerauftrag“ markiert ist. Das gilt für automatisch erzeugte und für von Hand angelegte Rechnungen.
- Alle anderen Rechnungen und alle Angebote behalten ihren bisherigen Text. Ein selbst geschriebener Einleitungstext hat immer Vorrang.
- PDF-Editor-Vorschau, Browser-PDF, Pi-PDF, Google Drive und E-Mail-Anhang zeigen exakt denselben Satz.

## 2. Stundenzettel: „PDF ansehen“ ohne Weiterleitung
- „PDF ansehen“ öffnet kein neues Fenster bzw. keinen neuen Tab mehr. Stattdessen erscheint ein großes Vorschaufenster auf derselben Seite mit der vorhandenen PDF-Anzeige.
- Im Fenster gibt es Drucken, Herunterladen und Schließen. Das funktioniert in der Übersicht und im Arbeitsbereich, auch auf dem Handy.

## 3. Urlaub & Krank: Datum direkt eintippen
- „Von“ und „Bis“ nutzen das Datumsfeld, das es schon bei den Rechnungen gibt. Ein getipptes Datum wird damit sofort übernommen, man muss es nicht mehr im Kalender anklicken.
- Zusätzlich wird der Feldwert beim Klick auf „Eintragen“ direkt aus dem Feld gelesen. So geht nichts verloren, auch wenn Safari das Datum beim Tippen noch nicht gemeldet hat.
- Fehlt etwas, steht weiter in Rot darunter, was es ist.

## Technische Details
- `defaultIntroRechnung` in `src/lib/pdf/belegPdf.ts` und `backend/src/pdf/layout.ts` werden angeglichen. Neue Bedingung: `istDauerauftrag = !!r.dauerauftragId || r.optionen?.wiederkehrend`. Der bisherige Vertrags-Satz im Pi-Renderer wird im Browser identisch gespiegelt, damit beide Ausgaben gleich sind. Bei Dauerauftrag gewinnt der „laut Vertrag“-Satz. Sind keine Felder vorhanden, gibt es einen sicheren Ersatz. Der PDF-Cache-Schlüssel ändert sich durch den neuen Inhalt automatisch.
- Neuer `StundenzettelPdfDialog` (Dialog + `PdfCanvasViewer`, Blob aus `fetchStundenzettelPdf`), in `StundenzettelPdfAktionen` statt `window.open`.
- `AbwesenheitenPanel`: Refs auf beide Datumsfelder. `absenden()` liest `ref.value`, prüft den Wert und schreibt ihn in den State. Die Felder reagieren auf `onInput` und `onChange`.
- Prüfung: Echte Rechnungs-PDFs (Dauerauftrag mit/ohne Monat, normale Rechnung, eigener Text) in Browser- und Pi-Ausgabe erzeugen und vergleichen. Playwright: Datum tippen und „Eintragen“ klicken, „PDF ansehen“ öffnet das Fenster ohne neuen Tab. Tests und Build grün. Keine Datenbank-Änderung.
