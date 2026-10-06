# Stundenzettel: Monat merken, zwei Arbeitsblöcke anzeigen, leere Tage dunkel

## 1. Gewählter Monat bleibt erhalten
- Der Monat, den du auf der Stundenzettel-Seite einstellst, wird gespeichert.
- Nach dem Neuladen oder wenn du zu Rechnungen gehst und zurückkommst, ist derselbe Monat wieder offen.
- Mit dem Knopf „Heute“ bzw. den Pfeilen wechselst du wie gewohnt.

## 2. Zwei Arbeitsblöcke pro Tag (z. B. morgens + abends) komplett sichtbar
- In der Tabelle und beim Bearbeiten stehen in derselben Zeile beide Zeiten untereinander:
  Beginn `08:00` / `17:00`, Ende `12:00` / `20:00`.
- Beim Bearbeiten sind beide Blöcke änderbar. Knöpfe: „+ 2. Block“ zum Hinzufügen und „x“ zum Entfernen.
- Zweite Blöcke werden beim Bearbeiten nicht mehr gelöscht.
- Die Stunden werden aus beiden Blöcken zusammengerechnet, wie bisher in halben Stunden abgerundet.
- Im PDF steht ebenfalls „08:00 / 17:00“ unter Beginn und „12:00 / 20:00“ unter Ende. Bisher wurde dort nur 08:00–20:00 mit Pause gezeigt.
- Monatsziel und Zielausgleich funktionieren auch mit zwei Blöcken: Angepasst wird immer der letzte Block.

## 3. Nur leere Tage dunkel
- Dunkel sind genau die Zeilen ohne eingetragene Zeiten und mit 0 Stunden. In Safari zeigen sie „12:30 – 12:30“; das sind z. B. Samstag, Sonntag oder freie Tage.
- Diese Zeilen sind immer dunkelgrau mit dem Hinweis „nicht gezählt“, auch ohne Änderung.
- Normale Arbeitstage sowie Urlaub/Krank mit Stunden bleiben hell.
- Bei „Zählt nicht“ bleibt die Zeile durchgestrichen und ebenfalls dunkel.

## Technische Details
- Monat: `jahr`/`monat` in `src/routes/stundenzettel.tsx` als Suchparameter (`?jahr=&monat=`, validateSearch) plus localStorage-Fallback. Gelesen wird erst nach dem Hydrieren.
- `StundenzettelTabelle.tsx`: Die Spalten Beginn/Ende rendern pro Zeile ein zweites `Input` für `beginn2`/`ende2`, wenn vorhanden oder hinzugefügt. Das Leeren von Block 2 in `setFeld` (Zeilen ca. 121–127 und 176) entfällt; `berechneStunden` nutzt beide Blöcke bereits.
- Nur-Ansicht (`ZettelBlock` in der Route): Block 2 wird mit angezeigt.
- `backend/src/pdf/stundenzettelPdf.ts`: Bei zwei Blöcken zweizeilige Zellen „b1 / b2“ und „e1 / e2“, Pause nur aus Block 1. Gleiche Darstellung in der Browser-Vorschau-PDF.
- Zielausgleich (`zielausgleich.ts` + `src/lib/stundenzettel/ziel.ts`): Bei vorhandenem `ende2` wird `ende2` verschoben; Grenzen wie bisher.
- Regel für dunkle Zeilen: `nichtGezaehlt = ausgeschlossen || (!beginn && !ende && stunden === 0) || (beginn && beginn === ende)`. Die bisherige helle Einfärbung `frei` wird für diese Zeilen ersetzt.
- Tests: Zielausgleich mit zwei Blöcken trifft das Ziel exakt; PDF enthält beide Zeiten.
