# WhatsApp Story: Vorschau bleibt leer

## Was passiert

Auf deinem Pi (`mycleancenter-pi.local`) ist der Vorschau-Bereich rechts leer, obwohl das Bild hochgeladen wurde.

Ursache: Die feste Story-Vorlage (der dunkle Hintergrund mit Logo, Slogan und Trennlinie) wird nicht mit deinem Programm ausgeliefert, sondern von einer externen Internet-Adresse geladen. Auf dem Pi gibt es diese Adresse nicht — das Laden schlägt fehl, und weil die Vorlage der erste Schritt beim Zeichnen ist, bricht die ganze Vorschau ab. Deshalb siehst du nur eine leere helle Fläche. Logo, Sterne und Schriften liegen bereits lokal bei, nur die Vorlage nicht.

## Was ich ändere

1. **Vorlage lokal mitliefern** — die Vorlagen-Datei kommt fest zu den anderen Story-Dateien ins Programm, genau wie Google-Logo und Sterne. Damit funktioniert die Vorschau auch ohne Internet.
2. **Vorschau bricht nie mehr komplett ab** — falls eine einzelne Grafik fehlt, wird trotzdem alles Übrige gezeichnet (Hintergrundfarbe, Foto, Text, Bewertung) statt eine leere Fläche zu zeigen.
3. **Klare Meldung statt Stille** — schlägt etwas fehl, erscheint ein kurzer verständlicher Hinweis, damit du nicht raten musst.
4. **Wiederholversuch** — ein einmal fehlgeschlagener Ladeversuch wird nicht dauerhaft gemerkt; beim nächsten Anzeigen wird erneut versucht.

## Test

- Im Vorschau-Browser: Bild hochladen, Vorschau prüfen (Vorlage, Foto, Bewertungskarte, Text) — am Schreibtisch und in Handybreite.
- Zusätzlich mit blockiertem Internet-Zugriff testen, damit belegt ist, dass die Vorschau rein lokal funktioniert (das entspricht der Lage auf dem Pi).
- Gebautes Paket prüfen: Vorlage liegt mit im Paket und wird ausgeliefert.

## Update-Sicherheit

Keine Änderungen an Paketlisten, Sperrdateien oder am Update-Skript. `mcc-update` läuft unverändert; es kommt nur eine zusätzliche Bilddatei plus zwei angepasste Programmdateien dazu.

## Technische Details

- `src/assets/whatsapp-story-template.png.asset.json` (CDN-Pointer) wird nicht mehr im Story-Code verwendet; stattdessen `public/whatsapp-story/template.png` (Original-PNG 1080×1920, unverändert).
- Neue Konstante `STORY_TEMPLATE_URL` in `src/lib/werkzeuge/whatsappStory.ts`; `renderStory`, `renderReviewEnding`, `renderGoogleEnding` nehmen die Vorlage intern, Aufrufer in `StoryCanvas.tsx` und `WhatsappStoryEditor.tsx` (`createBlobs`) angepasst.
- `loadImage`: fehlgeschlagene Promises aus dem Cache entfernen; Zeichenschritte in try/catch, Fallback-Füllung `#0b1f33` statt Abbruch.
- `StoryCanvas`: Renderfehler abfangen und einmalig als Hinweis melden.
