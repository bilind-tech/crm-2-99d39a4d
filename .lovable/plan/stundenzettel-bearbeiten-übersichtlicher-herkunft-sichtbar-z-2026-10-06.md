# Stundenzettel bearbeiten: übersichtlicher, Herkunft sichtbar, Ziel muss erreicht sein

## Was du danach siehst

- **Jede Zeile hat eine Farbe für ihre Art:**
  - Vom System eingetragen (automatisch erzeugt): neutral mit kleinem Kennzeichen „Auto“.
  - Von dir eingetragen oder geändert: blau markiert mit Kennzeichen „Manuell“.
  - Urlaub / Krank: eigene ruhige Farbe (grün bzw. orange).
  - Feiertag / Wochenende / Frei: grau.
  - Herausgenommene Zeile: durchgestrichen und blass.
  - Ungespeicherte Änderungen bleiben zusätzlich dunkler hinterlegt.
- **Leere Tage selbst füllen:** Bei Tagen ohne Zeiten (z. B. Wochenende) kannst du Beginn/Ende/Pause direkt eintragen; die Stunden werden sofort mit der 30-Minuten-Regel gerechnet.
- **Ein Klick zum Herausnehmen:** Pro Zeile ein Schalter „Zählt / Zählt nicht“. Ausgeschaltete Zeilen behalten ihre Zeiten sichtbar, zählen aber nicht in die Monatssumme und erscheinen im PDF ohne Stunden. Erneut klicken nimmt sie wieder auf.
- **Zielstunden-Leiste oben:** Ziel · Ist · Differenz, live. Grün bei genau erreicht, rot mit „noch 2,5 Std. fehlen“ bzw. „1 Std. zu viel“.
- **Speichern gesperrt, wenn das Ziel nicht genau erreicht ist.** Der Button zeigt den Grund. Mitarbeiter ohne Zielstunden können wie bisher frei speichern.
- **Übersichtlicher:** kompaktere Zeilen, fester Tabellenkopf beim Scrollen, kleine Legende über der Tabelle, Filter „Alle / Nur manuelle / Nur geänderte“.

## Umsetzung

1. Pro Tag zwei optionale Angaben ergänzen: Herkunft (automatisch/manuell) und „zählt nicht“. Bestehende Zettel ohne diese Angaben gelten als „automatisch“ und „zählt“ — nichts geht verloren, keine Datenbankänderung.
2. Generierung markiert erzeugte Tage als automatisch; jede Änderung von dir setzt die Zeile auf manuell.
3. Summe, Zielprüfung und PDF ignorieren herausgenommene Zeilen — identisch in Browser-Vorschau und Raspberry Pi.
4. Speichern wird im Browser gesperrt und zusätzlich auf dem Pi geprüft (abgelehnt mit klarer Meldung, falls das Ziel nicht stimmt).
5. Neue Zeilenfarben über die bestehenden Design-Farben, auch im Dunkelmodus lesbar.

## Prüfung

- Tests: herausgenommene Zeile zählt nicht, Ziel-Sperre, alte Zettel ohne neue Angaben unverändert, manuelle Kennzeichnung.
- Browser-Test: Zeile herausnehmen → Summe sinkt → Speichern gesperrt → andere Zeile ändern bis Ziel → Speichern geht → Markierungen korrekt.
- PDF-Seitenbild prüfen: herausgenommene Tage ohne Stunden, Summe korrekt.

## Technische Details

- `GenerierterTag` erhält `quelle?: "auto" | "manuell"` und `ausgeschlossen?: boolean` (Frontend- und Backend-Types, Validation).
- `berechnung.ts`/`ziel.ts`/`pruefeZiel` und Summen in Repo + `stundenzettelPdf.ts` überspringen `ausgeschlossen`.
- PATCH-Route lehnt mit 422 ab, wenn Ziel gesetzt und Summe ≠ Ziel; Zielausgleich beim Generieren fasst manuelle/ausgeschlossene Tage nicht an.
- Erweiterung nur in `tage_json`, daher keine Migration; Update-Ablauf unberührt.
