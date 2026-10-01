# Tabellenzeilen nach Referenz ausbalancieren

## Zielbild

- Die Kopfzeile mit „Leistung“, „Stunden“, „Abrechnungsart“ beziehungsweise „Ausführungen“ und Preis erhält wieder sichtbar mehr Luft oben und unten.
- Die Mehrwertsteuerzeile und die Gesamtbetragzeile erhalten dieselbe angenehm luftige Wirkung wie im Referenzbild.
- Die Zeilen werden weder so eng wie aktuell noch wieder übermäßig hoch; Schriftgröße, Spaltenaufteilung und Inhalte bleiben unverändert.
- Die Texte bleiben innerhalb ihrer Felder vertikal mittig: „Leistung“ linksbündig, die übrigen Überschriften wie bisher ausgerichtet.

## Umsetzung

1. **Referenzmaß übertragen**
   - Die Innenabstände der drei angesprochenen Zeilentypen werden gemeinsam erhöht.
   - Kopf-, Mehrwertsteuer- und Gesamtbetragzeile erhalten ein einheitliches festes Zielmaß, das den Proportionen des Screenshots entspricht.
   - Normale Leistungszeilen werden nicht künstlich vergrößert; ihre Höhe richtet sich weiterhin nach dem tatsächlichen Inhalt.

2. **Beide PDF-Ausgaben identisch halten**
   - Browser-Vorschau und Raspberry-Pi-PDF erhalten exakt dieselben Maße.
   - Die 0,8-pt-Linien und das bestehende 3-pt-Raster bleiben unverändert, damit keine unterschiedlich dicken Linien zurückkehren.

3. **Sichtprüfung statt bloßer Zahlenprüfung**
   - Rechnung und Angebot werden als echte A4-PDFs mit und ohne Stundenspalte gerendert.
   - Die drei Zeilenhöhen werden gemessen und die vertikale Textposition wird anhand der gerenderten Seiten kontrolliert.
   - Zusätzlich werden lange und mehrseitige Belege geprüft, damit die zusätzliche Luft keine Überlappungen oder fehlerhaften Seitenumbrüche erzeugt.
   - PDF-, Raster- und Update-Sicherheitstests müssen vollständig bestehen.

## Umfang

- Geändert wird ausschließlich die Höhe und Innenluft der genannten Tabellenzeilen.
- Footer, Fließtext, Spaltenbreiten, Bezeichnungen, Berechnungen und Daten bleiben unverändert.
- Keine Datenbankänderung und keine Änderung am Update-Ablauf.
