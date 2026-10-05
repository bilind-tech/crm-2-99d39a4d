# Abwesenheiten (Urlaub, Krank) für Mitarbeiter

## Was du bekommst
- Auf der Stundenzettel-Seite gibt es einen neuen Bereich **„Abwesenheiten"**: Mitarbeiter auswählen, Art wählen (Urlaub, Krank, Sonstiges), Zeitraum von–bis eingeben, optional eine Notiz. Der Zeitraum darf über mehrere Monate gehen (z. B. 28.09.–10.10.).
- Liste aller eingetragenen Abwesenheiten mit Filter nach Mitarbeiter; Bearbeiten und Löschen möglich.
- **Urlaub und Krank zählen als normale Arbeitszeit**: Ein Urlaubs-/Kranktag bekommt die üblichen Tagesstunden des Mitarbeiters (wie ein Feiertag). Sie stehen in der Spalte „Std." ganz rechts und zählen in der Monatssumme mit.
- Das **Monatsziel bleibt erhalten**: Die Monatssumme landet weiterhin genau auf dem Stundenziel des Mitarbeiters. Ausgeglichen wird nur auf normalen Arbeitstagen, Urlaubs-/Kranktage behalten ihre Stunden.
- Im **PDF** stehen an diesen Tagen keine Uhrzeiten, aber die Stunden und in der Bemerkung „Urlaub" bzw. „Krank".
- Nach dem Speichern einer Abwesenheit werden die betroffenen Monate erneut berechnet. Von Hand geänderte Tage bleiben dabei unangetastet: Es werden nur die Tage im Abwesenheits-Zeitraum geändert. Wochenenden und Feiertage im Zeitraum werden übersprungen.
- Setzt man in der Tabelle von Hand „Urlaub"/„Krank", bekommt der Tag ebenfalls die normalen Tagesstunden (statt wie bisher 0).

## Technische Details
- Migration `045_stz_abwesenheit.sql`: Tabelle `stz_abwesenheit` (id, mitarbeiter_id FK CASCADE, art CHECK in urlaub/krank/sonstiges, von, bis, notiz, Zeitstempel), Index (mitarbeiter_id, von, bis). Rein additiv, Daten bleiben bei Updates erhalten.
- Backend: Repo und Zod-Schema (von ≤ bis, max. 366 Tage), Routen `GET/POST/PUT/DELETE /stundenzettel/abwesenheiten`. `generieren.ts` liest die Abwesenheiten: Ein aktiver Arbeitstag im Zeitraum bekommt `stunden = berechneNormalenTag(...)`, `bemerkung = Urlaub|Krank` und keine Zeiten. Zielausgleich wie bisher nur auf Tagen mit Zeiten, deshalb erreicht die Summe exakt das Ziel. Nach einer Änderung an einer Abwesenheit: Bei vorhandenen Zetteln der betroffenen Monate werden nur die Tage im Zeitraum (alt und neu) ersetzt, danach Summe und Zielausgleich neu berechnet und das PDF-Archiv aktualisiert. Halbstunden-Regel bleibt identisch.
- Frontend: Hooks in `useStundenzettel.ts`, neue Komponente `AbwesenheitenPanel.tsx` (Mitarbeiter-Auswahl, Art, Datumsbereich), eingebunden in `/stundenzettel`. `setStatus` in `StundenzettelTabelle.tsx` setzt für Urlaub/Krank die normalen Tagesstunden. Für die Vorschau gibt es eine gleiche Kopie in `localPreviewStundenzettel.ts` und `ziel.ts`.
- Tests: Ein Zeitraum über zwei Monate erzeugt beide Monate korrekt. Summe = Ziel trotz Urlaub. Urlaub am Wochenende/Feiertag wird übersprungen. Manuelle Tage außerhalb des Zeitraums bleiben erhalten. Echte PDF-Seitenbilder werden geprüft.
