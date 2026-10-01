# PDF-Editor und Rechnungslayout zuverlässig verbessern

## Ziel
Der PDF-Editor speichert Änderungen nur noch nach einem ausdrücklichen Klick auf „Speichern“. Ungespeicherte Änderungen werden beim Zurückgehen, bei anderer Navigation sowie beim Neuladen geschützt. Rechnungen zeigen wieder alle Kundendaten und zusätzlich die Kundennummer. Das PDF-Layout wird kompakter und typografisch an die bereitgestellte Referenz angenähert.

## Umsetzung

### PDF-Editor
- Das bisherige automatische Speichern vollständig entfernen; die Live-Vorschau bleibt weiterhin sofort sichtbar, schreibt aber nichts in die Datenbank.
- „Speichern“ speichert den aktuellen Entwurf; „Verwerfen“ stellt exakt den zuletzt gespeicherten Stand wieder her.
- Bei ungespeicherten Änderungen interne Navigation und Zurück-Schaltfläche blockieren und einen klaren Bestätigungsdialog anzeigen.
- Für Browser-Neuladen, Tab-Schließen und externe Navigation den nativen Browser-Schutz aktivieren.
- Den vorhandenen vollständigen Kundendatensatz weiterhin in Editor und Vorschau verwenden, damit Kundennummer und Kundenanschrift nicht leer erscheinen.

### PDF-Einstellung
- Unter „Einstellungen → Vorlagen“ einen gemeinsamen Schalter „Empfängerblock weiter oben“ für Rechnungen und Angebote ergänzen.
- Die Einstellung update-sicher im bestehenden generischen Einstellungs-Store speichern, ohne Datenbankmigration.
- Lokale Vorschau und PDF-Caches berücksichtigen die Einstellung ebenfalls.

### Rechnung und Angebot
- Browser-PDF und serverseitiges Pi-PDF synchron anpassen.
- Absenderzeile exakt an der Oberkante des rechten Informationskastens ausrichten.
- Im optionalen oberen Modus Absender- und Empfängerblock weiter oben links neben dem Logo positionieren, ohne Logo, Fußzeile oder Leistungstabelle zu verschieben.
- Den Rechnungskasten horizontal kompakter gestalten und darin Kundennummer, Rechnungsnummer sowie Rechnungsdatum vollständig anzeigen.
- Schriftbild näher an die Referenz bringen: Tabellenkopf normal statt fett, insbesondere „Leistung“; Gesamtbetrag bleibt deutlich hervorgehoben.
- Bestehende 0,8-pt-Linien und das 3-pt-Raster unverändert konsistent halten.

## Technische Details
- Die neue PDF-Einstellung erhält ein eigenes Schema und einen eigenen API-Bereich, um bestehende Erscheinungs-Einstellungen nicht inkompatibel zu verändern.
- Serverseitige PDFs laden dieselbe lokal vorhandene Roboto-Familie wie die Browser-PDFs; es werden keine externen Schrift- oder CDN-Abhängigkeiten eingeführt.
- Die Einstellung fließt in Browser-LRU-, React-Query- und Server-PDF-Cache-Signaturen ein.
- Kundennummer und Layoutmodus werden explizit an beide Renderer übergeben.

## Prüfung
- Tests für manuelles Speichern, Verwerfen und Dirty-State-Navigation ergänzen.
- PDF-Tests für Kundennummer, kompakte Meta-Box, normalen Tabellenkopf und beide Empfänger-Modi ergänzen.
- Normale und lange Kunden-/Firmendaten sowie Rechnung und Angebot visuell rendern und vergleichen.
- Tabellenlinien erneut vermessen; Browser- und Pi-Ausgabe auf gleiche Struktur prüfen.
- Frontend- und Backend-Typprüfung sowie bestehende relevante Tests ausführen; keine Migration und keine Änderung am Update-Ablauf.
