# Rechnungs-Infoblock exakt auf Außenrahmen reduzieren

## Änderung
- Im rechten Rechnungsblock bleibt ausschließlich ein geschlossener rechteckiger Außenrahmen sichtbar.
- Die waagerechte Linie zwischen „Bei Zahlung bitte …“ und Rechnungsnummer wird vollständig entfernt.
- Es gibt keine inneren Linien und keine senkrechte Trennlinie zwischen Beschriftung und Wert.
- Der Innenabstand zum Außenrahmen wird vorsichtig vergrößert, damit kein Text zu nah an einer Linie steht und der Block wie im Referenzbild ruhig und übersichtlich wirkt.
- Schrift, Texte, Ausrichtung und Breite des Blocks bleiben unverändert.
- Die Gesamthöhe wird so abgestimmt, dass der Block weiterhin sauber an derselben Stelle sitzt.

## Begrenzung
- Nur der Rechnungs-Infoblock wird geändert.
- Logo, Absender- und Empfängerblock, Überschrift, Leistungstabelle, Summen, Fußzeile und Seitenaufteilung dürfen sich nicht verschieben.
- Angebote bleiben unverändert.
- Keine Datenbank-, Update-, Installations- oder Paketdateien werden geändert.

## Technische Umsetzung
- In Browser-Vorschau und Pi-PDF-Vorlage dieselbe Rahmenlogik verwenden: Linienbreite nur am oberen, unteren, linken und rechten Tabellenrand; alle Zeilengrenzen innerhalb des Blocks erhalten Breite 0.
- Die Innenabstände in beiden Vorlagen identisch anpassen, ohne die feste Blockbreite zu verändern.

## Prüfung
- Mehrfach als echte Rechnung rendern und jede Version als Bild kontrollieren: nur Außenrahmen, keine Innenlinie, gleichmäßiger Abstand zum Text.
- Pixelnah gegen das Referenzbild prüfen und Abstände iterativ nachstellen.
- Normale und lange Rechnungsnummer testen; kein Umbruch, Abschneiden oder Berühren des Rahmens.
- Vorher-/Nachher-Vergleich der gesamten Seite durchführen, damit Logo und alle umliegenden Bereiche unverändert positioniert bleiben.
- Ein Angebot gegenprüfen, damit es unverändert bleibt.
- PDF-Tests, Typprüfung und aktuellen Build-Status prüfen; erst danach als fertig melden.
