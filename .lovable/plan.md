# Stand und letzte Absicherung der WhatsApp-Story

## Was ich gerade geprüft habe

- Bilder auswählen funktioniert jetzt im laufenden Programm — sowohl in MacBook-Breite als auch in Handy-Breite. Zwei Bilder wurden ausgewählt, als Miniaturbilder mit Nummer angezeigt und gezählt („2 Bilder hinzugefügt"), ohne Fehlermeldung.
- Eine fertige Story wurde erzeugt: modernes Google-Logo, fünf goldene Sterne aus deiner Vorlage, Name in Montserrat fett, Text in Montserrat normal. Die feste Kopfvorlage bleibt unangetastet.
- Am Update-Weg wurde nichts verändert: keine Änderung an Paketlisten, Sperrdateien oder am Update-Skript.

## Was noch offen ist

1. Der echte Betrieb auf dem Raspberry Pi ist noch nicht gegengeprüft. Getestet wurde bisher nur die Entwicklungsvorschau, nicht die fertig gebaute Fassung, die `mcc-update` installiert.
2. Die Schriftdateien und das Sternmotiv sind neu dazugekommen. Es ist noch nicht belegt, dass sie im gebauten Paket mit ausgeliefert und offline gefunden werden.
3. Bei iPhone-Fotos im Format HEIC gibt es noch keine verständliche Meldung, sondern nur den allgemeinen Hinweis auf JPG, PNG und WebP.
4. Die Fortschrittsliste behauptet bereits, alles sei geprüft. Das stimmt erst nach Punkt 1 bis 3.

## Umsetzung

### 1. Gebaute Fassung wie auf dem Pi prüfen

- Die Auslieferungsfassung erzeugen und daraus die Seite aufrufen, statt der Entwicklungsvorschau.
- Prüfen, dass Sternmotiv, Google-Logo und beide Schriftschnitte aus dem gebauten Paket geladen werden — ohne Internet.
- In dieser Fassung erneut Bild auswählen, Kamera-/Fotoschalter, dieselbe Datei zweimal wählen, Einfügen per Tastatur, Löschen und Story-Vorschau durchgehen, in MacBook- und Handybreite.

### 2. Verhalten bei nicht erreichbarem Pi

- Prüfen, dass ausgewählte Bilder auch dann sofort erscheinen und bearbeitbar bleiben, wenn das Speichern auf dem Pi scheitert.

### 3. Kleine Verbesserung beim Dateiformat

- HEIC/HEIF beim Namen nennen: „iPhone-Fotos im Format HEIC bitte als JPG teilen." statt der allgemeinen Meldung.

### 4. Ehrliche Fortschrittsliste

- `roadmap.md` erst nach bestandener Prüfung als erledigt markieren; sonst offen lassen und den Grund nennen.

### 5. Update-Sicherheit bestätigen

- Vor Abschluss ausdrücklich kontrollieren, dass an Paketlisten, Sperrdateien und Update-Skript nichts verändert wurde, damit `mcc-update` unverändert durchläuft.
- Typprüfung und die vorhandenen Tests laufen lassen und das Ergebnis benennen.

## Technische Details

- Prüfung über `npm run build:spa` plus statischer Auslieferung, damit Pfade wie `/whatsapp-story/review-star.svg` und `/fonts/montserrat-*.otf` real getestet werden.
- Browsertest scoped auf die Story-Seite, Desktop 1280 und Handy 390 Breite, inklusive Konsolenfehlern.
- Anpassung nur in `WhatsappStoryEditor.tsx` (HEIC-Meldung) und `roadmap.md`.
