# Stundenzettel-PDF wieder exakt auf zwei Seiten

## Ergebnis
- Der Monats-Stundenzettel besteht wieder immer aus genau **zwei A4-Seiten**.
- Seite 1 enthält vollständig die Tage **1–15**.
- Seite 2 enthält vollständig die Tage **16–31**, anschließend Summe und beide Unterschriftenfelder.
- Es entstehen keine zusätzlichen Seiten mehr, auf denen nur einzelne Tage wie 14/15 oder 31 stehen.

## Zwei Arbeitsblöcke beibehalten
- Die korrekte Darstellung bleibt erhalten: erster Block oben, zweiter Block direkt darunter.
- Beginn und Ende jedes Blocks bleiben exakt auf gleicher Höhe.
- Tage mit einem Block bleiben einzeilig; Tage mit zwei Blöcken erhalten eine kompakte, aber vollständig lesbare zweizeilige Darstellung.

## PDF-Aufteilung stabilisieren
- Tabellenzeilen, Schriftabstand und Innenabstände werden auf die verfügbare A4-Höhe abgestimmt, statt die Tabelle automatisch auf weitere Seiten überlaufen zu lassen.
- Jede Tageszeile bleibt untrennbar; ein Tag kann nicht zwischen Seiten aufgeteilt werden.
- Tabellenkopf, Logo, Seitenzahl, Summe und Unterschriften bleiben an ihren vorgesehenen Positionen.
- Die bestehende Stundenberechnung und die gespeicherten Zeiten werden nicht verändert.

## Prüfung
- Ein 31-Tage-Monat mit vielen Zwei-Block-Tagen wird als echtes PDF gerendert und auf exakt zwei Seiten geprüft.
- Kontrolliert wird: Seite 1 endet mit Tag 15, Seite 2 beginnt mit Tag 16 und endet mit Tag 31 plus Summe und Unterschriften.
- Zusätzlich werden ein Ein-Block-Tag und ein Zwei-Block-Tag geprüft, damit keine Uhrzeit fehlt oder abgeschnitten wird.
- Beide PDF-Seiten werden als Bilder gerendert und vollständig auf Überläufe, abgeschnittene Inhalte, falsche Seitenumbrüche und unleserliche Zeilen kontrolliert.
