# Zwei Arbeitsblöcke im Stundenzettel sauber untereinander

## Darstellung
- Bei Tagen mit zwei Arbeitsblöcken steht in **Arbeitsbeginn** die frühere Startzeit oben und die Startzeit des zweiten Blocks direkt darunter.
- In **Arbeitsende** steht passend dazu das Ende des ersten Blocks oben und das Ende des zweiten Blocks direkt darunter.
- Beginn und Ende jedes Blocks liegen exakt auf derselben Höhe; es gibt keine Darstellung mehr mit Schrägstrich nebeneinander.
- Tage mit nur einem Arbeitsblock bleiben unverändert und kompakt.

## Bearbeiten
- Die vier Zeitfelder bleiben in derselben Tageszeile, werden aber als zwei klar ausgerichtete Ebenen dargestellt: erster Block oben, zweiter Block darunter.
- Hinzufügen und Entfernen des zweiten Blocks verschiebt die zugehörigen Beginn-/Ende-Felder nicht gegeneinander.
- Änderungen an Beginn oder Ende des zweiten Blocks werden zuverlässig als Änderung erkannt, berechnet und gespeichert.

## PDF
- Im Stundenzettel-PDF werden beide Arbeitsblöcke in den vorhandenen Spalten zweizeilig ausgegeben, nicht mit „/“ nebeneinander.
- Die Zeilenhöhe und Innenabstände werden so angepasst, dass beide Uhrzeiten vollständig lesbar bleiben und die bestehende zweiseitige Aufteilung des Monats erhalten bleibt.

## Prüfung
- Automatischer Test für einen Tag mit zwei Blöcken: beide Beginnzeiten und beide Endzeiten stehen in der richtigen Reihenfolge und jeweils auf getrennten Zeilen.
- Berechnungstest stellt sicher, dass weiterhin beide Blöcke zusammengezählt und auf halbe Stunden abgerundet werden.
- Sichtprüfung der Bearbeitung und eines erzeugten PDFs mit einem Zwei-Block-Mitarbeiter; zusätzlich Prüfung eines normalen Ein-Block-Tages.
