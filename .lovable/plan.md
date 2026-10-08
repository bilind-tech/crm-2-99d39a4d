# Zweizeilige Uhrzeiten im Stundenzettel-PDF wirklich mittig

## Problem
Bei Tagen mit zwei Arbeitsblöcken sitzen die beiden Uhrzeiten zu tief im Tabellenfeld: oben ist viel Luft, die untere Uhrzeit (z. B. 15:00 / 17:00) berührt fast die untere Linie. Einzeilige Zeiten sind bereits mittig.

Ursache: Die zweizeiligen Zellen nutzen eine stark verkleinerte Zeilenhöhe. Die Schrift ragt dadurch unten über den berechneten Textbereich hinaus, sodass der sichtbare Text tiefer liegt, als die Abstände vermuten lassen.

## Umsetzung
- Die beiden Uhrzeiten einer Zelle werden nicht mehr als ein gestauchter Textblock gesetzt, sondern als zwei einzelne, sauber übereinander gestapelte Zeilen mit normaler Schrifthöhe und festem, kleinem Abstand dazwischen.
- Der obere und untere Innenabstand wird so abgestimmt, dass der sichtbare Abstand von der oberen Linie zur ersten Uhrzeit genau so groß ist wie von der zweiten Uhrzeit zur unteren Linie.
- Beginn und Ende bleiben je Block exakt auf gleicher Höhe (erster Block oben, zweiter Block darunter).
- Tag, Pausenzeiten und Stunden in Zwei-Block-Zeilen werden ebenfalls vertikal mittig in der Zeile ausgerichtet.
- Die Zeilenhöhe bleibt gleich, damit das PDF weiterhin exakt zwei A4-Seiten hat (Tage 1–15 / 16–31, Summe und Unterschriften auf Seite 2).
- Einzeilige Zeilen bleiben unverändert.

## Prüfung (messbar, nicht nur per Auge)
- Echtes 31-Tage-PDF mit gemischten Ein- und Zwei-Block-Tagen rendern und als Bild ausgeben.
- In den gerenderten Bildern für mehrere Zwei-Block-Zellen automatisch den freien Abstand oberhalb der ersten und unterhalb der zweiten Uhrzeit messen; Unterschied höchstens ca. 0,5 pt.
- Dieselbe Messung für einzeilige Zellen, damit diese mittig bleiben.
- Seitenzahl (genau 2), Tag 15 am Ende von Seite 1, Tag 16–31 plus Summe und Unterschriften auf Seite 2 kontrollieren.
- Bestehenden Stundenzettel-Test ausführen und an die neue Zellstruktur anpassen.

## Technische Details
- Datei: `backend/src/pdf/stundenzettelPdf.ts`, Funktion `td()` in `tabelle()`.
- Zweizeilige Zellen: `stack` aus zwei Textknoten (lineHeight 1) statt `text` mit `\n` und `lineHeight: 0.8`; Margins per Pixelmessung (pdftoppm, Glyphen-Bounding-Box je Zelle) kalibriert.
- Andere Spalten in Zwei-Block-Zeilen erhalten einen oberen Margin, der sie auf die Zeilenmitte setzt.
- Test in `backend/test/stundenzettel-ziel.spec.ts` prüft die neue Struktur (zwei gestapelte Zeilen, Reihenfolge, Margins).
