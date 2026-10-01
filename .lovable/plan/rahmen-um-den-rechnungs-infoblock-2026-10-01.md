# Rahmen um den Rechnungs-Infoblock

## Änderung
- Nur bei Rechnungen erhält der bestehende rechte Infoblock einen vollständigen, schwarzen rechteckigen Außenrahmen wie im Beispielbild.
- Der Rahmen umfasst unverändert den Hinweis „Bei Zahlung bitte …“, die Rechnungsnummer und das Rechnungsdatum sowie bereits vorhandene weitere Angaben im selben Block.
- Keine inneren Kästchen oder senkrechten Trennlinien; nur der Außenrahmen und die bereits vorhandene waagerechte Trennlinie unter dem Hinweis bleiben sichtbar.
- Größe, Position, Schrift, Innenabstände und Inhalt des Blocks bleiben exakt unverändert.
- Empfängerblock, Absenderzeile, Leistungstabelle, Summen und Fußzeile bleiben unberührt.
- Angebote bleiben unverändert, da das Beispiel ausdrücklich den Rechnungsblock betrifft.

## Umsetzung
- Den aktuell durch Zell-Einstellungen unterdrückten Außenrahmen gezielt sichtbar machen.
- Browser-Vorschau und Pi-PDF-Vorlage synchron anpassen, damit Download, Drive und E-Mail dieselbe Rechnung zeigen.
- Keine Datenbank-, Update- oder Installationsdateien ändern.

## Prüfung
- Eine Rechnung vor und nach der Änderung als PDF-Bild vergleichen: identische Blockgröße und Position, zusätzlich nur der geschlossene Rahmen.
- Rahmen an allen vier Seiten sowie die vorhandene Trennlinie kontrollieren; keine unerwünschten inneren Linien.
- Eine Rechnung mit längerer Rechnungsnummer prüfen, damit nichts verrutscht oder abgeschnitten wird.
- Ein Angebot gegenprüfen, damit es unverändert bleibt.
- Bestehende PDF-Tests und Typprüfung ausführen; anschließend den aktuellen Build-Status prüfen.
