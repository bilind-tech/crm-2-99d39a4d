# Stundenzettel übersichtlicher bearbeiten und halbe Stunden korrekt rechnen

## Zielbild

- Beim Bearbeiten verschwinden die Spalten **„Beginn 2“** und **„Ende 2“**; die Tabelle wird dadurch schmaler und übersichtlicher.
- Eine Zeit wie **15:30–17:00** ergibt automatisch **1,5 Std.** statt bisher 1 Std.
- Halbe Stunden zählen vollständig in die Tagessumme, Monatssumme und Zielstunden-Prüfung hinein.
- Jede geänderte Tageszeile erhält sofort einen klar erkennbaren dunkleren Hintergrund. Nach erfolgreichem Speichern gilt sie wieder als unverändert und die Markierung verschwindet.

## Umsetzung

1. **Bearbeitung vereinfachen**
   - „Beginn 2“ und „Ende 2“ aus der Bearbeitungstabelle entfernen.
   - Die verbleibenden Spalten sinnvoll breiter verteilen und unnötiges horizontales Scrollen reduzieren.
   - Bereits vorhandene zweite Zeitblöcke in alten Stundenzetteln nicht löschen oder überschreiben; sie bleiben in den gespeicherten Daten und in der PDF erhalten.

2. **Änderungen sichtbar machen**
   - Jeden Tag mit seinem ursprünglich geladenen Stand vergleichen.
   - Sobald Beginn, Ende, Pause, Status oder Bemerkung geändert wurde, wird ausschließlich diese Zeile dunkler hinterlegt.
   - Zurückgesetzte Werte entfernen die Markierung wieder; nach erfolgreichem Speichern wird der neue Stand zur Ausgangsbasis.

3. **Halbstunden exakt berechnen**
   - Arbeitszeiten auf 30-Minuten-Schritte statt auf volle Stunden abrunden: 90 Minuten werden zu 1,5 Stunden, 120 Minuten zu 2 Stunden.
   - Browser-Vorschau und Raspberry-Pi-Berechnung identisch anpassen.
   - Den automatischen Zielausgleich ebenfalls in 0,5-Stunden-Schritten arbeiten lassen, damit Monatssummen mit halben Stunden das Ziel exakt erreichen können.
   - Deutsche Darstellung mit Komma verwenden, beispielsweise „1,5 Std.“.

4. **Sicher prüfen**
   - Tests für 15:30–17:00 = 1,5 Stunden, Pausen, Monatssummen und Zielausgleich ergänzen.
   - Prüfen, dass ausgeblendete zweite Zeitblöcke beim Bearbeiten und Speichern unverändert erhalten bleiben.
   - Im Browser kontrollieren: kompaktere Tabelle, Markierung einzelner geänderter Zeilen, Rücksetzen der Markierung und korrekte Summe nach dem Speichern.
   - PDF-Ausgabe und vorhandene Stundenzettel auf korrekte Dezimaldarstellung prüfen; keine Datenbankänderung und keine Beeinträchtigung des normalen Updates.

## Technische Details

- Die halbstündige Berechnung wird in den gemeinsamen Frontend-/Backend-Spiegeln konsistent umgesetzt.
- Gespeicherte Stundenwerte unterstützen bereits Dezimalzahlen; deshalb ist keine Migration nötig.
- Bestehende Daten bleiben erhalten. Nur neu berechnete oder manuell geänderte Zeiträume verwenden anschließend die korrigierte 30-Minuten-Regel.