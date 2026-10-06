# Monatsziele & feste Arbeitstage pro Mitarbeiter

## Was du bekommst

**1. Neuer Bereich „Monatsplanung" auf der Stundenzettel-Seite**
- Für den oben gewählten Monat stehen alle aktiven Mitarbeiter untereinander, jeweils eingeklappt.
- Eingeklappt sieht man: Name, Stundenziel des Monats (mit Hinweis „Standard" oder „für diesen Monat angepasst") und wie viele feste Tage eingetragen sind.
- Aufgeklappt:
  - **Stundenziel für diesen Monat**: Feld mit dem Standardwert des Mitarbeiters als Vorschlag. Leer lassen = Standard gilt. Knopf „Auf Standard zurücksetzen".
  - **Feste Arbeitstage**: Datum + Stunden (halbe Stunden erlaubt, z. B. 1,5) + optionale Bemerkung. Mehrere Zeilen, hinzufügen/löschen.
  - Live-Anzeige: „Ziel 160 h · davon fest eingetragen 12 h · Rest wird auf die übrigen Arbeitstage verteilt". Warnung, wenn die festen Stunden schon über dem Ziel liegen.
- Speichern pro Mitarbeiter; danach wird der Stundenzettel des Monats auf Wunsch direkt neu erstellt.

**2. Standard-Stundenziel bleibt beim Mitarbeiter**
- Im Mitarbeiter-Dialog heißt das Feld klar „Standard-Stundenziel pro Monat"; es gilt immer, wenn für den Monat nichts anderes eingetragen ist.

**3. Berechnung beim Erstellen des Stundenzettels**
- Ziel = Monatswert, sonst Standardwert.
- Feste Tage erscheinen genau mit den eingetragenen Stunden (als „manuell", werden nie verändert).
- Urlaub/Krank/Feiertage wie bisher.
- Die restlichen automatischen Tage werden in halben Stunden so angepasst, dass die Summe exakt das Ziel trifft (gleiche Regel im Browser und auf dem Pi).

**4. Nicht gezählte Tage dunkel**
- Beim Bearbeiten wird jede Zeile, die nicht zählt (z. B. 12:30–12:30, 0 Std. oder „Zählt nicht"), immer deutlich dunkel/grau hinterlegt, mit kleinem Hinweis „nicht gezählt". Gilt auch, wenn die Zeile nicht geändert wurde.

## Technische Details
- Migration `047_stz_monatsplan.sql`: Tabelle `stz_monatsplan` (mitarbeiter_id, jahr, monat, ziel_stunden NULL, feste_tage_json, aktualisiert_am; UNIQUE mitarbeiter+jahr+monat, ON DELETE CASCADE). Nur additive Änderung, Daten bleiben unberührt.
- Backend: Repo + Routen `GET /stundenzettel/monatsplan?jahr&monat`, `PUT /stundenzettel/monatsplan/:mitarbeiterId` mit Validierung (Datum im Monat, Stunden 0–24 in 0,5-Schritten, keine doppelten Daten).
- `generiereStundenzettel` bekommt optionalen Monatsplan: Ziel-Override, feste Tage mit `quelle: "manuell"` (Zeiten leer bzw. Beginn ab Standardbeginn), danach `wendeZielausgleichAn` (überspringt manuelle Tage schon).
- Gleiche Logik in `localPreviewStundenzettel.ts` und `src/lib/stundenzettel/ziel.ts`; Bearbeiten-Speichersperre nutzt das Monatsziel.
- Frontend: `MonatsplanPanel.tsx` (Collapsible-Liste), Hooks in `useStundenzettel.ts`.
- `StundenzettelTabelle.tsx`: Zeile „nicht gezählt" wenn `ausgeschlossen` oder Beginn == Ende oder Stunden 0 an einem Arbeitstag → `bg-muted` dunkler + Textmarke, via Design-Tokens.
- Tests: Generierung mit Monatsziel + festen Tagen trifft Ziel exakt; feste Tage unverändert; Standardziel greift ohne Eintrag. Danach Playwright-Durchklick in der Vorschau.
