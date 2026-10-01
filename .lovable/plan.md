# Rechnung: mehr Luft über „Bei Zahlung bitte" und wirklich überall gleich dicke Tabellenlinien

## Was du danach siehst
1. **Infokasten oben rechts:** Über „Bei Zahlung bitte" ist deutlich mehr Abstand zur oberen Rahmenlinie, ungefähr doppelt so viel wie jetzt. Der Text, die Absenderzeile links, das Logo, die Überschrift „Rechnung" und alles darunter bleiben genau an ihrer Stelle. Nur die obere Rahmenlinie rückt ein Stück nach oben (unter dem Logo ist dafür genug Platz).
2. **Leistungstabelle:** Jede Linie sieht gleich dick aus: links außen, rechts außen, alle Trennlinien zwischen den Spalten (auch zwischen „Leistung" und „Abrechnungsart"), die Linie über der Mehrwertsteuer und alle waagerechten Linien. Das gilt für Rechnungen mit und ohne Stunden-Spalte. Die Dicke bleibt so, wie sie dir jetzt gefällt.
3. Angebote haben dieselbe Tabelle und bekommen deshalb ebenfalls gleichmäßige Linien. Sonst ändert sich an Angeboten nichts.

## Warum manche Linien dünner wirken
Im Code haben alle Tabellenlinien schon dieselbe Stärke (0,8). Die Breite der Spalte „Leistung" wird aber automatisch berechnet, und die Seitenbreite ist eine krumme Zahl. Dadurch liegen manche Linien „zwischen zwei Bildschirmpunkten“. Die Vorschau zeichnet solche Linien dann heller und dünner (links außen und die Trennlinie hinter „Leistung"), andere dagegen kräftig. Genau diese Stellen hast du eingekreist.

## Lösung
- Alle Spaltenbreiten bekommen feste, glatte Werte, und die Tabelle beginnt auf einer glatten Position. So liegt jede Linie an einer gleichwertigen Stelle und wird überall gleich gezeichnet.
- Die Vorschau in der App zeichnet PDF-Seiten mindestens in doppelter Schärfe. Dadurch werden Linien auch auf normalen Bildschirmen nicht mehr unterschiedlich dünn angezeigt.

## Prüfung (erst dann fertig)
- Testrechnungen (Standard, mit Stunden-Spalte, lange Leistungstexte) und ein Angebot werden als Bilder in mehreren Zoomstufen erzeugt (72, 96, 110, 150 und 200 dpi). Dabei wird jede einzelne Tabellenlinie per Pixelmessung auf gleiche Breite und Schwärze geprüft. Wenn eine Linie abweicht, wird nachgebessert.
- Infokasten: Ich messe den Abstand über „Bei Zahlung bitte“ und prüfe, ob alles drumherum gleich geblieben ist (Absenderzeile, Logo, Titel, Tabelle an identischer Position). Dafür vergleiche ich die Bilder vorher und nachher.
- Alle PDF-Tests, beide Typprüfungen und Build grün. Es gibt keine Änderung an Datenbank oder Update-Dateien, das Update läuft normal durch.

## Technische Details
- `backend/src/pdf/layout.ts` und `src/lib/pdf/belegPdf.ts` synchron:
  - `metaBox`: paddingTop Zeile 0 von 6 auf ca. 11, dazu eine negative obere Margin am Kasten in gleicher Höhe (ca. -5), sodass Textpositionen und Gesamthöhe im Fluss unverändert bleiben. Die Logo-Unterkante liegt bei max. y=132, die Kastenoberkante danach bei ca. 150.
  - Leistungs- und Summentabelle: `"*"` wird durch feste ganzzahlige Breiten ersetzt (Inhaltsbreite 485 pt, z. B. Standard `[280, 110, 95]`, Stunden `[250, 60, 90, 85]`), damit alle vertikalen Linien auf ganzzahligen Koordinaten liegen. Die Linienstärke bleibt einheitlich 0,8 (falls die Messung bei 0,8 weiter schwankt: 1,0 einheitlich). Die gemeinsame Kante wird weiterhin nur einmal gezeichnet.
- `src/components/pdf/PdfCanvasViewerImpl.tsx` (und ggf. `LivePdfPreview.tsx`): an react-pdf `<Page>` `devicePixelRatio={Math.max(window.devicePixelRatio || 1, 2)}` übergeben.
- `backend/test/pdf.spec.ts`: Test ergänzen, der prüft, dass die Spaltenbreiten ganzzahlig sind und alle Linienstärken identisch.
