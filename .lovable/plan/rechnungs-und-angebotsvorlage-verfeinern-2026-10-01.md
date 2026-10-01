# Rechnungs- und Angebotsvorlage verfeinern

Alle Änderungen gelten gleichermaßen für Rechnung und Angebot (gemeinsame Vorlage), in der Vorschau im Browser und im PDF, das der Pi erzeugt (Drive/E-Mail).

## 1. Absenderzeile fest auf einer Linie mit dem Infoblock
- Die unterstrichene Zeile „Firmenname – Straße – PLZ Ort" steht immer auf exakt derselben Höhe wie die erste Zeile des rechten Blocks (Rechnungsnummer, Datum, Zahlungsziel …).
- Darunter beginnt der Empfängerblock. Kommen Zeilen dazu (Objekt, Ansprechpartner, eigener Empfängertext), wächst nur der Empfängerblock nach unten – Absenderzeile und rechter Block bleiben fest stehen.

## 2. Leistungstabelle
- Rahmenlinien etwas kräftiger (ganz leicht dicker als jetzt).
- Alle Zellen (Leistung, Abrechnungsart/Pauschal, Stunden, Preis) werden waagerecht und senkrecht exakt mittig ausgerichtet, gleiche Abstände oben/unten – auch bei mehrzeiligen Leistungen und fettem Text.

## 3. Fußzeile
- „Bank" wird zu „Bankverbindung".
- Block Bankverbindung linksbündig.
- Kontaktblock (Telefon, Mobil, E-Mail) rechtsbündig.
- Übrige Fußzeile bleibt unverändert.

## Prüfung
- Test-PDFs für Rechnung und Angebot mit 0, 1 und 3 zusätzlichen Empfängerzeilen erzeugen und als Bilder vergleichen: Absenderzeile muss pixelgleich auf derselben Höhe wie der rechte Block bleiben.
- Tabellen mit kurzen, langen und mehrzeiligen Leistungen sowie Pauschal-/Stundenpositionen prüfen.
- Vorhandene PDF-Tests laufen lassen.

## Update-Sicherheit
- Nur Vorlagen-Code, keine Datenbankänderung, keine Änderung an Update-Dateien – mcc-update läuft normal.

## Technische Details
- Dateien: `src/lib/pdf/belegPdf.ts` (Browser) und `backend/src/pdf/layout.ts` (Pi) synchron halten.
- Absenderzeile aus dem Header lösen und als erste Zeile in einer gemeinsamen Zwei-Spalten-Struktur mit dem Infoblock rendern (gleiches Top-Margin), Empfänger als Stack darunter.
- Tabelle: `hLineWidth/vLineWidth` von ca. 0.5 auf 0.75; Zellen-Padding symmetrisch, `verticalAlignment: "middle"`, Höhenausgleich per Padding-Berechnung.
- Footer: `cell(["Bankverbindung", …], "left")`, Kontakt `"right"`.
