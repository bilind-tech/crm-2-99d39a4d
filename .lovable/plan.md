# Stundenzettel: „Zählt nicht“ sauber, Speichern nur per Klick, Druck im CRM

## 1. „Zählt nicht“-Zeilen nach dem Bearbeiten leer
- Wenn du eine Zeile auf „Zählt nicht“ stellst und das Bearbeiten beendest, sind in der Ansicht des Stundenzettels und im PDF bei diesem Tag Beginn, Ende, Pause und Stunden leer.
- Beim erneuten Bearbeiten sind die alten Zeiten weiter da. Stellst du die Zeile zurück auf „Zählt“, kommen die Zeiten wieder.

## 2. Nie automatisch in Dokumente oder Google Drive
- Erstellen, Neu-Erstellen, Bearbeiten, Urlaub/Krank und Monatsplanung legen kein PDF mehr automatisch in Dokumente oder Drive ab.
- Nur ein Klick auf den Speichern-Button legt das PDF in Dokumente → Stundenzettel/{Jahr}/{Monat} ab. Von dort wird es wie gewohnt mit Google Drive synchronisiert.

## 3. Button zeigt den Speicherstand
- **Grau „In Dokumente speichern“** (mit Hinweis „nicht gespeichert“): Der Zettel ist noch nie abgelegt worden.
- **Orange „Aktualisieren & speichern“**: Der Zettel wurde gespeichert, danach aber geändert, z. B. bearbeitet oder anders neu erstellt.
- **Grün „Gespeichert“** (mit Drive-Hinweis): Das abgelegte PDF entspricht genau dem aktuellen Stand.
- Wenn du später neu erstellst und das Ergebnis gleich ist, steht wieder grün „Gespeichert“.
- Der Stand ist auch in der Übersicht und in der Liste der Mitarbeiter zu sehen. Die Sammelaktion „Alle in Dokumente ablegen“ bleibt als bewusster Klick erhalten.

## 4. Drucken: nur einmal, im CRM bleiben
- Der Druckdialog öffnet sich direkt im CRM, ohne neuen Tab. Das gilt auch in Safari, auf allen Seiten, die drucken (Stundenzettel, Rechnungen, Angebote, Werkzeuge).
- Pro Klick erscheint der Druckdialog genau einmal. Bisher hat Safari ihn zweimal geöffnet.

## Technische Details
- Anzeige: `ZettelBlock`/Tabelle (Nur-Ansicht) und `backend/src/pdf/stundenzettelPdf.ts` zeigen bei `ausgeschlossen` leere Zeit- und Stundenzellen; die Daten bleiben gespeichert.
- Auto-Archivierung entfernen: In `backend/src/routes/stundenzettel.ts` entfallen die Aufrufe von `archiviereStundenzettel` in `nachberechnen`, `generieren` und `PUT /stundenzettel/:id`. Übrig bleibt nur `POST /stundenzettel/:id/archivieren`.
- Speicherstand: Migration `048_stz_archiv_stand.sql` fügt `archiv_hash` und `archiv_dokument_id` zu `stz_stundenzettel` hinzu. Der Hash ist sha256 über die normierten `tage` plus `gesamtStunden` und den Mitarbeiternamen. Das Archivieren setzt ihn, die API liefert `archivStatus: "nicht" | "veraltet" | "gespeichert"`. Ein Dokument, das gelöscht wurde, gilt als „nicht“. Die Browser-Vorschau bildet das nach.
- Drive: Der Status kommt von der bestehenden Dokument-Pipeline und wird im grünen Zustand klein angezeigt.
- Druck: `printBlob.ts` druckt in Safari auf demselben Weg wie in Chrome, also über ein verstecktes iframe mit gerenderten PDF-Seiten als Bilder und `@page A4`; der `window.open`-Pfad entfällt. Das doppelte `setTimeout(print)` (800/1800 ms) war die Ursache für den zweiten Druckdialog und wird entfernt. Ein Schutz vor erneutem Auslösen verhindert parallele Drucke.
- Tests: Hash-Stand (gleiche Generierung → „gespeichert“, Änderung → „veraltet“). Generieren und Bearbeiten erzeugen kein Dokument. Playwright: Button-Zustände, Druck ohne neuen Tab, `print()` wird genau einmal aufgerufen.
