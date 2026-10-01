# Rechnung und Angebot sichtbar korrigieren

## Zielbild

- Die Tabellenkopfzeile wird deutlich kompakter als jetzt.
- „Leistung“ bleibt linksbündig, sitzt aber vertikal exakt mittig im Feld.
- „Abrechnungsart“ beziehungsweise „Ausführungen“ und „Preis (netto)“ sitzen horizontal und vertikal exakt mittig.
- Die Zeilen „Zzgl. gesetzlicher Mehrwertsteuer …“ und „Gesamtbetrag …“ erhalten exakt dieselbe kompakte Höhe wie die Kopfzeile.
- Der Footer sitzt optisch am unteren Seitenrand, seine vier Blöcke bleiben jeweils linksbündig und die Schrift wird nochmals etwas größer.
- Anrede, Einleitung, Abschlusstext und „Mit freundlichen Grüßen“ werden nochmals maßvoll vergrößert, ohne Umbrüche oder Überlappungen zu erzeugen.

## Umsetzung

1. **Tabellenhöhe wirklich verkleinern**
   - Die derzeitige Mindesthöhe von 30 pt und die Innenabstände von je 8 pt erzeugen zusammen die zu hohe Darstellung.
   - Kopf- und Summenzeilen bekommen ein gemeinsames, kompakteres Höhenmaß mit kleineren symmetrischen Innenabständen.
   - Die 0,8-pt-Linien und das bestehende 3-pt-Raster bleiben erhalten.

2. **Vertikale Zentrierung fest absichern**
   - Alle Texte der Kopf- und Summenzeilen erhalten symmetrische obere und untere Abstände statt der bisherigen Standardposition am oberen Zellrand.
   - Linksbündigkeit und vertikale Zentrierung werden getrennt behandelt: „Leistung“ bleibt links, aber mittig in der Höhe.
   - Angebots- und Rechnungstabellen sowie Varianten mit und ohne Stundenspalte werden gleich behandelt.

3. **Footer und Fließtext korrigieren**
   - Die tatsächliche Position des Footers in gerenderten A4-PDFs wird gemessen und so nach unten gesetzt, dass er wie ein echter Seitenfooter wirkt und dennoch nicht abgeschnitten wird.
   - Footer-Schrift und Fließtext werden jeweils in einem kleinen Schritt erhöht.
   - Seitenreserve und Umbruchverhalten werden passend nachgeführt, damit längere Rechnungen den Footer nicht überdecken.

## Prüfung

- Browser-Vorschau und Raspberry-Pi-Ausgabe werden identisch geändert.
- Echte Rechnungs- und Angebots-PDFs werden gerendert und als Seitenbilder kontrolliert, nicht nur anhand von Codewerten.
- Geprüft werden: kurze und lange Leistungstexte, Rechnung und Angebot, mit und ohne Stundenspalte, einseitige und mehrseitige Belege.
- Zusätzlich werden die realen Zell- und Footer-Koordinaten gemessen: gleiche kompakte Zeilenhöhen, vertikal mittige Beschriftungen, Footer nahe am unteren Rand.
- Bestehende PDF-, Linienraster- und Cache-Tests werden angepasst und vollständig ausgeführt; Typprüfung und Build müssen fehlerfrei sein.
- Keine Datenbankänderung und keine Änderung am Update-Ablauf.
