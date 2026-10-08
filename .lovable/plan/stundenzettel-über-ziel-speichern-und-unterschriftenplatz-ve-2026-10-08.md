# Stundenzettel über Ziel speichern und Unterschriftenplatz vergrößern

## Umsetzung
- Beim Bearbeiten bleibt der normale „Speichern“-Button nur aktiv, wenn das Monatsziel exakt erreicht ist.
- Liegt die Summe über dem Ziel, erscheint zusätzlich ein klarer Button „Trotzdem speichern“. Dieser speichert die Änderungen bewusst trotz Überschreitung.
- Liegt die Summe unter dem Ziel, bleibt Speichern weiterhin gesperrt; die vorhandene Anzeige nennt die noch fehlenden Stunden.
- Der Pi prüft den bewussten Ausnahme-Wert selbst. Ohne diesen Wert bleibt die bestehende Ablehnung erhalten, sodass die Zielprüfung nicht versehentlich umgangen werden kann.
- Browser-Vorschau und Pi-Verhalten erhalten denselben Speicherweg; ausgeschlossene Tage, zwei Arbeitsblöcke, Herkunft und Bemerkungen werden unverändert vollständig übertragen.
- Auf Seite 2 des PDFs entsteht mehr freie Fläche zwischen Tabelle und den beiden Unterschriftslinien. Die Beschriftungen unter den Linien bleiben an ihrem Platz relativ zur Linie.

## Prüfung
- Tests für drei Speicherfälle: Ziel exakt erreicht, Ziel überschritten mit bewusstem Speichern, Zielabweichung ohne Ausnahme weiterhin abgelehnt.
- Bearbeitungsansicht prüfen: Der neue Button erscheint nur bei Überschreitung und speichert den geänderten Stundenzettel.
- Echtes 31-Tage-PDF mit zwei Arbeitsblöcken rendern und visuell prüfen: größerer Unterschriftenraum, beide Linien und Beschriftungen vollständig sichtbar.
- Sicherstellen, dass das PDF weiterhin exakt zwei A4-Seiten hat: Tage 1–15 auf Seite 1, Tage 16–31, Summe und Unterschriften auf Seite 2.
- Bestehende Stundenzettel-Tests und aktuellen Vorschau-Build prüfen.

## Technische Details
- Der Änderungsaufruf erhält ein explizites Feld für die bewusste Zielüberschreitung; Validierung und Route akzeptieren es nur für diesen einzelnen Speichervorgang.
- Die Zielprüfung erlaubt die Ausnahme ausschließlich bei `Ist > Ziel`, nicht bei fehlenden Stunden.
- Der obere Abstand des Unterschriftenblocks wird erhöht und innerhalb des verfügbaren Seitenbereichs gegen Überlauf geprüft.
