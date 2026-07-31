## Ziel

Beim Generieren eines Stundenzettels soll die Monatssumme **exakt** die im Mitarbeiter hinterlegten Zielstunden treffen. Abweichungen werden durch ±1 volle Stunde an einzelnen, pseudo-zufällig gewählten Arbeitstagen ausgeglichen. Danach wird gegengerechnet — stimmt es nicht, erscheint eine rote Warnung.

## Was heute schon da ist (geprüft)

- Der Mitarbeiter-Dialog ist bereits kompakt: Muster „immer gleich" oder „pro Wochentag", je Wochentag von/bis + Pause, Wochenend-Schalter, Feld „Zielstunden pro Monat". **Keine** Tabelle mit allen Monatstagen. Hier wird nur nachgeschärft, nicht neu gebaut.
- Es gibt bereits einen Zielausgleich (`backend/src/stundenzettel/zielausgleich.ts`), aber er ist bewusst schwach: maximal 2 Runden, feste Wochentag-Reihenfolge Fr→Mo, kein Zufall, kein Nachweis. Dadurch bleibt bei größeren Differenzen ein Rest übrig.

## Neue Ausgleichs-Logik (Backend)

`zielausgleich.ts` wird ersetzt durch einen Algorithmus, der:

1. Alle normalen Arbeitstage des Monats als Kandidaten sammelt (Feiertage, Krank/Urlaub, leere Tage bleiben unangetastet).
2. Die Differenz `Ziel − Summe` in ganze Stunden zerlegt.
3. Die Kandidaten **pseudo-zufällig** mischt — mit einem Seed aus Mitarbeiter-ID + Jahr + Monat. Dadurch sieht die Verteilung zufällig/natürlich aus, ist aber reproduzierbar: dasselbe Neu-Generieren ergibt denselben Zettel.
4. Reihum je 1 Stunde an einem Tag addiert bzw. abzieht, bis die Differenz 0 ist. Mehrere Durchläufe sind erlaubt (ein Tag kann also auch 2h abweichen, wenn nötig), bis alle Kandidaten ausgereizt sind.
5. Grenzen bleiben hart: jeder Block mindestens 1h und höchstens 12h, Block 1 wächst nie in Block 2 hinein, Ende nie nach 24:00. Bei Zwei-Block-Tagen wird zuerst Block 2 verschoben.
6. Die Endzeit wird passend zurückgerechnet, die Pause bleibt korrekt berücksichtigt.

## Gegenprüfung

- Nach dem Ausgleich summiert das Backend alle Tagesstunden neu und vergleicht mit dem Ziel. Das Ergebnis wird am Stundenzettel mitgeführt: Zielstunden, Ist-Summe, Abweichung.
- Diese Felder werden bei jeder Änderung (auch bei manuellen Edits in der Tabelle) neu berechnet, nicht nur beim Generieren.

## Anzeige (Frontend)

- Im Stundenzettel-Workspace und in der Mitarbeiterliste: kleine Statuszeile „Ziel 40 h · Ist 40 h ✓" in dezenter Form.
- Bei Abweichung: **rote** Hinweiszeile „Zielstunden nicht erreicht: Ist 39 h, Ziel 40 h (−1 h)" — direkt über der PDF-Vorschau bzw. der Tabelle, damit es nicht übersehen wird.
- Ohne gesetztes Ziel bleibt alles wie bisher, keine Warnung.

## Mitarbeiter-Dialog

- Feld „Zielstunden pro Monat" wird prominenter mit Erklärtext: „Das System verteilt die Differenz automatisch als ±1 Stunde auf einzelne Arbeitstage."
- Plausibilitäts-Hinweis direkt im Dialog: aus Wochentagen + Zeiten wird die typische Monatsspanne (min/max Stunden) geschätzt. Liegt das Ziel außerhalb, erscheint ein gelber Hinweis „Ziel ist mit diesen Arbeitszeiten kaum erreichbar" — blockiert das Speichern aber nicht.
- Die Wochentag-Eingabe bleibt kompakt wie bisher (eine Zeile je Wochentag).

## Technisches

- Betroffene Dateien: `backend/src/stundenzettel/zielausgleich.ts` (neu geschrieben), `generieren.ts`, `repo.ts`/`types.ts` (Zielabgleich-Felder), `routes/stundenzettel.ts` (auch beim manuellen Patch neu prüfen), `src/lib/stundenzettel/types.ts`, `src/components/stundenzettel/StundenzettelWorkspace.tsx`, `MitarbeiterDialog.tsx`, `src/lib/api/localPreviewStundenzettel.ts` (Mock-Layer gleichziehen).
- **Keine Datenbank-Migration nötig** — die Abgleich-Werte werden aus den vorhandenen Tagesdaten berechnet, nicht zusätzlich gespeichert. Damit bleibt `mcc-update` ein reines Code-Update ohne Datenrisiko.
- Backend-Tests für den Ausgleich: Ziel exakt getroffen bei Über- und Unterdeckung, keine Änderung an Feiertagen/Krank/Urlaub, Reproduzierbarkeit beim zweiten Generieren.
