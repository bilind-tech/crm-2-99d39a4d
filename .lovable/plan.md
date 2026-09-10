# WhatsApp Story: Bewertungskarte ausrichten, Titelschrift dünner, Entwürfe löschen

## 1. Bewertungskarte sauber ausrichten

Auf deinem Bild sitzt der Text links und unten zu dicht am Rand der weißen Karte. Der Innenabstand ist oben/rechts größer als links/unten.

- Gleicher, größerer Innenabstand rundum (links, rechts, oben, unten identisch).
- Der Abstand unter der letzten Textzeile wird an die Zeilenhöhe gekoppelt, damit er bei kurzen und langen Texten immer gleich aussieht.
- Google-Logo, Sterne, Name und Text starten alle exakt an derselben linken Kante.
- Abstände zwischen Logo/Sternen, Name und Text werden vereinheitlicht, damit die Karte optisch mittig wirkt.
- Gilt automatisch auch für die Abschlussseite „Das sagen unsere Kunden“, da dieselbe Karte verwendet wird.

## 2. Titeltext unten in Regular

Der selbst geschriebene Text unten mittig in der Story wird derzeit halbfett gezeichnet. Er wird auf Montserrat **Regular** umgestellt — dieselbe gelieferte Schriftdatei, nur der normale Schnitt. Der fette Schnitt bleibt nur für den Bewertungsnamen und die Vorher/Nachher-Beschriftung.

## 3. Entwürfe löschen mit Rückfrage

Im Fenster „Gespeicherte Entwürfe“ bekommt jeder Eintrag einen Papierkorb-Knopf.

- Klick öffnet eine Sicherheitsabfrage mit dem Namen des Entwurfs („Wirklich löschen?“ / Abbrechen).
- Erst nach Bestätigung wird der Entwurf samt Bildern auf dem Raspberry Pi gelöscht und verschwindet aus der Liste.
- Ist gerade der gelöschte Entwurf geöffnet, wird die Verbindung dazu gelöst, die Bearbeitung bleibt aber erhalten.
- Bei nicht erreichbarem Pi gibt es eine verständliche Meldung statt eines stillen Fehlers.

## Prüfung

- Story mit Bewertung erzeugen und die Karte gegen deine Vorlage vergleichen (gleicher Abstand links/rechts/oben/unten).
- Kurze und lange Bewertungstexte prüfen — kein Abschneiden, gleicher Bodenabstand.
- Titeltext prüfen: sichtbar dünner, gleiche Schriftfamilie.
- Entwurf anlegen, löschen abbrechen, dann löschen und Liste prüfen.
- Keine Änderungen an `package.json`, Sperrdateien oder `update.sh`, damit `mcc-update` sicher bleibt.

## Technische Details

- `src/lib/werkzeuge/whatsappStory.ts`: `CARD`-Maße (einheitliches `pad`, an `lineHeight` gekoppelter Bodenabstand, konsistente Baselines), Titel von `font(600,48)` auf Regular.
- `src/components/whatsapp-story/WhatsappStoryEditor.tsx`: Löschknopf pro Entwurf, Bestätigung über vorhandenes `useConfirm`, `piApi.delete("/whatsapp-story/projekte/:id")` (Route existiert bereits im Backend), Listen-Refresh.
