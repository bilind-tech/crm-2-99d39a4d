# PDF-Editor und Belegvorlage zuverlässig überarbeiten

## Zielbild
- Der PDF-Editor speichert Änderungen ausschließlich nach einem Klick auf „Speichern“; die laufende PDF-Vorschau bleibt weiterhin sofort sichtbar.
- Beim Zurückgehen, Wechseln der Seite, Neuladen oder Schließen mit ungespeicherten Änderungen erscheint eine Warnung. Der Nutzer kann im Editor bleiben oder die Änderungen bewusst verwerfen.
- Der rechte Rechnungskasten zeigt zusätzlich die Kundennummer und wird insgesamt schmaler, ohne dass Nummern oder Datumswerte abgeschnitten werden.
- Die unterstrichene Absenderzeile beginnt exakt auf derselben Höhe wie die Oberkante des rechten Kastens.
- In den Einstellungen gibt es einen gemeinsamen Modus für Rechnungen und Angebote, der Absenderzeile und Empfängerblock weiter oben links neben dem Logo anordnet. Ausgeschaltet bleibt die normale Anordnung erhalten.
- Die gesamte Schriftwirkung der PDFs wird an die hochgeladene Referenz angeglichen: schlichte Standardschrift, passende Größen und Gewichte; insbesondere steht „Leistung“ nicht mehr fett. Tabellenlinien und bestehendes Raster bleiben unverändert.

## Umsetzung
1. **Kundendaten im Editor absichern**
   - Die im Editor geladene vollständige Kundenakte konsistent für Empfängerblock und PDF-Vorschau verwenden.
   - Fehlende oder noch ladende Kundendaten eindeutig behandeln, damit kein leerer Empfängerblock durch einen Zwischenstand entsteht.
   - Die Kundennummer im rechten Rechnungskasten als eigene Zeile ergänzen.

2. **Manuelles Speichern und Verlassenswarnung**
   - Den derzeit bestätigten 1,5-Sekunden-Autosave entfernen; „Speichern“ bleibt die einzige dauerhafte Übernahme.
   - Nach erfolgreichem Speichern den neuen Ausgangsstand setzen; „Verwerfen“ setzt exakt auf den zuletzt gespeicherten Stand zurück.
   - Den Zurück-Button und alle internen Seitenwechsel bei ungespeicherten Änderungen mit einem schlichten Bestätigungsdialog abfangen.
   - Zusätzlich die Browser-Warnung für Neuladen, Tab-Schließen und externe Navigation aktivieren; nach Speichern oder Verwerfen erscheint keine Warnung.

3. **Einstellbarer hoher Empfängerblock**
   - Unter „Einstellungen → Vorlagen“ einen klar beschrifteten Ein/Aus-Schalter für die höhere Anordnung ergänzen.
   - Die Einstellung dauerhaft in den vorhandenen Einstellungen speichern, ohne neue Datenbanktabelle oder Migration.
   - Browser-Vorschau und endgültige Pi-PDF-Ausgabe lesen denselben Wert und setzen Rechnung sowie Angebot identisch um.

4. **PDF-Layout nach Referenz**
   - Die verfügbare Breite neu aufteilen: schmalerer rechter Rechnungskasten, ausreichend Abstand dazwischen und mehr Platz links.
   - Absenderzeile und Kastenoberkante exakt ausrichten; im hohen Modus Absender und Empfänger nach oben links neben das Logo setzen, ohne Logo-Überlagerung.
   - Kundennummer, Rechnungsnummer und Rechnungsdatum kompakt, vollständig lesbar und sauber ausgerichtet darstellen.
   - Schriftfamilie, Grundschrift, Überschrift, Anrede, Fließtext, Tabelle und Summenbereich an die Referenz angleichen. Tabellenkopf regulär statt fett; der Gesamtbetrag bleibt zur Hervorhebung fett.
   - Das bestehende 0,8-pt-/3-pt-Linienraster sowie die identischen Browser-/Pi-Spaltenbreiten beibehalten.

## Technische Absicherung
- Browser-PDF und Pi-PDF gemeinsam ändern und mit denselben Layoutkonstanten beziehungsweise gleichen Werten synchron halten.
- Den globalen Vorlagenwert in PDF-Cache-Schlüssel beziehungsweise Cache-Invalidierung einbeziehen, damit ein Moduswechsel sofort eine neue PDF erzeugt.
- Keine Update-, Installations-, Backup- oder Nutzdatenpfade verändern; bestehende Installationen erhalten automatisch den bisherigen Modus als Standard.
- Die bestehende PDF-Editor-Struktur und gespeicherten Belege bleiben kompatibel.

## Prüfung
- Editor-Fluss für Rechnung und Angebot testen: ändern, Vorschau prüfen, zurückgehen/Seite wechseln/neu laden, abbrechen, verwerfen und speichern.
- Prüfen, dass ohne Klick auf „Speichern“ keine Änderung dauerhaft übernommen wird und gespeicherte Änderungen nach erneutem Öffnen vorhanden sind.
- PDFs mit kurzer und langer Kundennummer, kurzen und langen Firmendaten sowie mehrzeiligem Empfänger rendern.
- Beide Modi für Rechnung und Angebot in Browser-Vorschau und endgültiger Pi-PDF-Ausgabe bildlich vergleichen.
- Kontrollieren, dass Logo, Empfänger, Kasten, Überschrift, Tabelle, Summen, Footer und Seitenumbrüche weder kollidieren noch abgeschnitten werden.
- Tabellenlinien erneut vermessen und die vorhandenen PDF-/Rastertests um Kundennummer, Kastenbreite, Ausrichtung, Schrift und Modus ergänzen.
- Relevante Editor-Tests, PDF-Tests, Typprüfungen und aktuellen Build-Status prüfen; erst danach fertig melden.
