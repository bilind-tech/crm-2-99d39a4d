# Übergabe-/Abnahmeprotokoll: einseitig, saubere Kästchen

## Probleme
1. Die Ankreuzkästchen erscheinen als leere Platzhalter-Striche — die Zeichen ☐/☒ fehlen in der PDF-Schrift (Roboto).
2. Das Protokoll läuft auf zwei Seiten und wirkt vollgestopft.
3. Bei "Mängel vorhanden" entstehen zwei leere Schreiblinien-Zeilen, obwohl Text da ist bzw. nicht nötig.

## Lösung

### 1. Echte Kästchen statt Sonderzeichen
Kästchen werden gezeichnet (kleines Quadrat, bei "angekreuzt" zwei Diagonalstriche als X) statt als Textglyphe gesetzt. Damit sind sie in jedem PDF-Viewer korrekt sichtbar — auch auf dem Pi und in Google Drive. Gilt für: keine Mängel / Mängel vorhanden und Frau/Herr.

### 2. Garantiert einseitig
- Kompakteres Raster: Schrift 10pt bleibt, aber Zeilenhöhe und Blockabstände werden auf ein festes, ausgewogenes Maß gesetzt.
- Struktur wird an das mitgeschickte Referenzblatt angelehnt: Titel mittig und unterstrichen, darunter kompakte Beschriftungszeilen (Auftragnehmer, Auftraggeber, Auftrag Adresse, Leistung, Tag und Datum) statt großer Abschnittsblöcke mit Trennlinien.
- Die Meta-Box mit Protokoll-Nr./Datum entfällt oben rechts (Datum steht in der Zeile "Tag und Datum"), das spart Platz.
- Feste Höhen für Mängel-Schreiblinien: statt zwei voller Leerzeilen genau eine Schreiblinie unter "Es liegen folgende Mängel vor:", die bei eingetragenem Text durch den Text ersetzt wird.
- Unterschriftenblock kompakt, "Ort, Datum ______ (Kundenunterschrift)" plus Auftragnehmer-Unterschrift auf einer Ebene.
- Absicherung: der Inhalt wird so bemessen, dass er auch mit langem Leistungstext auf einer Seite bleibt (Leistungsumfang und Bemerkungen bekommen eine Zeilenbegrenzung mit automatisch etwas kleinerer Schrift bei sehr langem Text).

### 3. Firmenname
"My Clean Center" wird im Auftragnehmer-Feld als "My Clean Center GmbH" ausgegeben (aus den Firmendaten, mit GmbH-Zusatz wie in den Einstellungen hinterlegt).

### 4. Alles weiterhin editierbar
Auftragsadresse, Leistungsumfang, Bemerkungen, Mängel-Auswahl, Anrede/Name und alle Standardsätze bleiben im Erstellen-Dialog, im Editor-Panel und per Klick in der PDF-Vorschau änderbar. Die Klickflächen werden an das neue Layout angepasst.

## Technische Umsetzung
- `src/lib/pdf/werkzeugePdf.ts`: `generateUebergabeprotokollPdf` neu aufbauen — Canvas-Checkbox-Helper (`checkboxCanvas`), Label-Wert-Zeilen mit Unterstrich statt Sektionsblöcken, reduzierte `pageMargins`, entfernte Meta-Box, dynamische Schriftgröße bei langem Text, eine Schreiblinie für Mängel.
- Hotspot-IDs (`adresse`, `leistungsumfang`, `bemerkungen`, `dienstleister`, `unterschriften`) bleiben erhalten, damit `fieldMap.ts`, `ProtokollHotspotEditor.tsx` und `UebergabePanel.tsx` unverändert weiterfunktionieren.
- Keine Datenmodell-Änderung, keine SQL-Migration, keine Backend-Änderung (Protokoll-PDFs werden nur im Frontend erzeugt).
- Lockfiles bleiben unangetastet und synchron, damit `mcc-update` fehlerfrei durchläuft.

## Prüfung
Test-PDF im Browser erzeugen, als Bild rendern und prüfen: genau eine Seite, sichtbare Kästchen, keine Platzhalter-Zeichen, ausgewogene Abstände. Zusätzlich Typecheck und bestehende Tests.
