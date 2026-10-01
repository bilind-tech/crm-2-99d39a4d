# Rechnungsrahmen und Leistungstabelle exakt vereinheitlichen

## Rechnungs-Infokasten
- Oberhalb von „Bei Zahlung bitte …“ den Innenabstand zum Außenrahmen sichtbar vergrößern.
- Nur den oberen Abstand verändern und die übrigen Innenabstände so ausgleichen, dass Breite, Gesamthöhe und Position des Kastens gleich bleiben.
- Außenrahmen, Schrift, Rechnungsnummer und Rechnungsdatum bleiben unverändert; es kommen weiterhin keine inneren Linien hinzu.

## Leistungstabelle der Rechnung
- Alle waagerechten und senkrechten Linien auf exakt dieselbe, mittlere Linienstärke wie in der Referenztabelle bringen.
- Die aktuell getrennten Bereiche für Leistungen und Summen an ihrer Berührung so zeichnen, dass keine Linie doppelt übereinanderliegt. Dadurch wird die Linie über „Zzgl. gesetzlicher Mehrwertsteuer“ nicht mehr dicker als die übrigen Linien.
- Linken und rechten Außenrand sowie sämtliche Spaltentrenner mit derselben festen Linienstärke zeichnen.
- Die Summenzeilen niedriger und ruhiger gestalten wie in der Referenz: gleichmäßiger vertikaler Innenabstand, „Zzgl. gesetzlicher Mehrwertsteuer 19%“ normal links ausgerichtet und „Gesamtbetrag inkl. MwSt.“ fett sowie links und vertikal mittig.
- Beträge bleiben in der rechten Preisspalte sauber mittig ausgerichtet.

## Begrenzung
- Änderungen ausschließlich an der PDF-Darstellung von Rechnung und der gemeinsam genutzten Leistungstabelle.
- Browser-Vorschau und PDF auf dem Raspberry Pi werden identisch angepasst.
- Logo, Absender, Empfänger, Überschrift, Texte nach der Tabelle, Fußzeile, Seitenränder und Spaltenbreiten dürfen sich nicht verschieben.
- Angebotsdarstellung wird gegengeprüft; ihr Netto-Summenblock darf nicht beschädigt werden.
- Keine Datenbank-, Update-, Installations-, Paket- oder Sperrdateien ändern.

## Prüfung
- Mehrere echte Test-PDFs rendern: Rechnung mit Stunden, Rechnung ohne Stunden, lange Leistungsbeschreibung, mehrere Positionen und lange Rechnungsnummer sowie ein Angebot.
- Jede PDF-Seite als Bild prüfen und mit den beiden Referenzbildern vergleichen: gleicher oberer Abstand im Infokasten, kein Innenstrich, keine doppelte Linie, überall identische Tabellenstärke und kompakte Summenzeilen.
- Die gerenderten Linien pixelnah an mehreren Stellen messen, damit links, rechts, innen und über der Mehrwertsteuerzeile tatsächlich gleich dick sind.
- Vorher-/Nachher-Vergleich der ganzen Seite durchführen, damit außerhalb der beiden gewünschten Bereiche nichts verrutscht.
- PDF-Tests um eine Prüfung der Tabellenstruktur ergänzen, anschließend bestehende PDF-Tests, beide Typprüfungen und den aktuellen Build-Status kontrollieren.
- Erst fertig melden, wenn die vollständige Sichtprüfung keine Abweichung mehr zeigt und die Update-Dateien unverändert sind.
