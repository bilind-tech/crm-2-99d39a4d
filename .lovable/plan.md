# Uhrzeiten in den Tabellenzeilen exakt mittig ausrichten

## Ziel
Die Uhrzeiten im Stundenzettel-PDF sitzen optisch vertikal mittig in jedem Tabellenkästchen. Das gilt sowohl für einzelne Zeiten als auch für zwei untereinander stehende Arbeitsblöcke.

## Umsetzung
- Die vertikalen Innenabstände der Datenzellen gezielt korrigieren, sodass der Text leicht nach oben rückt und oberhalb sowie unterhalb optisch gleich viel Platz bleibt.
- Einzeilige und zweizeilige Zellen getrennt abstimmen; Tag, Pause und Stunden bleiben auf derselben Höhe wie die zugehörigen Uhrzeiten.
- Zeilenhöhen, Spaltenbreiten und das bestehende Tabellenraster beibehalten, damit das PDF weiterhin exakt zwei A4-Seiten umfasst.

## Prüfung
- Ein echtes 31-Tage-PDF mit gemischten ein- und zweizeiligen Arbeitszeiten rendern und visuell kontrollieren.
- Prüfen, dass Tage 1–15 auf Seite 1 und 16–31 auf Seite 2 bleiben und keine Zeile umbricht.
- Den vorhandenen Stundenzettel-Test ausführen und um die neue Zellausrichtung absichern.
