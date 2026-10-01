# Rechnungsüberschrift verkleinern und Absenderzeile sicher einzeilig halten

## Änderung
- Die große Überschrift „Rechnung“ wird etwas kleiner gesetzt; Angebote und alle übrigen Texte bleiben unverändert.
- Die unterstrichene Absenderzeile links oben bleibt unter allen Umständen genau eine Zeile.
- Passt ein langer Firmenname oder eine lange Anschrift nicht in den verfügbaren linken Bereich, wird nur diese Absenderzeile stufenweise kleiner dargestellt, bis sie hineinpasst.
- Die Absenderzeile darf weder umbrechen noch in den rechten Kasten „Bei Zahlung bitte …“ hineinragen.
- Position und Größe des rechten Rechnungskastens, Empfängeranschrift, Logo, Leistungstabelle und restliches Seitenlayout bleiben unverändert.

## Technische Umsetzung
- Die Rechnungsüberschrift in Browser-Vorschau und Pi-PDF auf dieselbe kleinere Schriftgröße setzen, ohne die vertikalen Abstände zu verändern.
- Für die Absenderzeile in beiden PDF-Vorlagen dieselbe begrenzte Breite und dieselbe Einzeilen-Regel verwenden.
- Die passende Schriftgröße anhand der tatsächlich verfügbaren linken Spaltenbreite bestimmen; normale Anschriften behalten die bisherige Größe, nur zu lange Zeilen werden verkleinert.
- Keine Datenbank-, Update-, Installations- oder Paketdateien ändern.

## Prüfung
- Rechnung mit normaler sowie bewusst sehr langer Firma, Straße und Ortsangabe rendern.
- Kontrollieren, dass die Absenderzeile immer einzeilig bleibt, vollständig lesbar ist und den rechten Kasten nie berührt oder überlagert.
- Browser-Vorschau und Pi-PDF bildlich vergleichen.
- Gegenprüfen, dass Logo, Empfängerblock, Rechnungskasten, Tabelle und Seitenpositionen unverändert bleiben.
- Ein Angebot gegenprüfen, damit dessen Überschrift unverändert bleibt.
- PDF-Tests und aktuellen Build-Status prüfen; erst danach fertig melden.
