# WhatsApp Story: Bilder-Upload reparieren und Bewertungen exakt wie die Vorlage

## Was ich geprüft habe

Ich habe die Seite im Browser getestet und ein Bild hochgeladen. Technisch kommt das Bild an — aber auf dem Bildschirm passiert im Schritt „1 Bilder" **nichts Sichtbares**: es gibt keine Miniaturbilder, keinen Zähler und keinen Wechsel zum nächsten Schritt. Die Vorschau steht nur in der rechten Spalte, die auf schmalen Fenstern (dein Fenster ist 673 px breit) komplett ausgeblendet ist. Zusätzlich erscheint sofort die verunsichernde Meldung „Die Pi-Speicherung ist gerade nicht erreichbar". Für dich sieht das aus, als würde gar nichts funktionieren.

Die Bewertungskarte wird aktuell mit Systemschrift, Text-Sternchen und ohne Google-Logo gezeichnet — weit weg von deinen Beispielbildern.

## Teil 1 – Upload sichtbar und zuverlässig machen

- Direkt nach dem Auswählen/Einfügen/Ablegen erscheint eine **Miniaturbild-Galerie** im ersten Schritt, mit Anzahl der Bilder und Lösch-Knopf pro Bild.
- Nach dem ersten Import springt die Seite automatisch weiter zur Reihenfolge, damit sofort sichtbar ist, dass etwas passiert ist.
- Auf schmalen Fenstern und dem Handy wird die Story-Vorschau immer angezeigt (nicht nur ab großer Bildschirmbreite).
- Einfügen mit Strg+V / Cmd+V funktioniert auch, wenn die Zwischenablage das Bild nur als Bildinhalt (nicht als Datei) liefert; zusätzlich Rückmeldung, wenn nichts Verwertbares in der Zwischenablage liegt.
- Nicht unterstützte Dateien werden einzeln benannt statt pauschal abgelehnt; HEIC/andere Formate bekommen eine klare Meldung.
- Die Pi-Speicherung läuft still im Hintergrund. Statt der Fehlermeldung gibt es nur einen kleinen, dezenten Hinweis „nur auf diesem Gerät gespeichert", wenn der Pi nicht erreichbar ist.
- Das Nachladen gespeicherter Entwürfe holt die Bilder künftig über denselben Weg wie der restliche Datenverkehr zum Pi (aktuell ein fest verdrahteter Pfad, der auf dem Pi ins Leere läuft).

## Teil 2 – Bewertungen exakt wie in deinen Beispielen

Vorlage ist die Karte aus deinen Beispielbildern: helle, fast weiße Karte mit weichen Ecken und Schatten, oben links das **echte, mehrfarbige Google-„G"** als Vektor gezeichnet, daneben **fünf große goldene Sterne**, darunter der Name in Großbuchstaben und fett, darunter der vollständige Bewertungstext.

- **Montserrat** wird lokal mitgeliefert (Regular/SemiBold/Bold als Schriftdateien im Projekt), damit sie auch offline auf dem Raspberry Pi funktioniert, und vor dem Zeichnen geladen.
- Das Google-„G" wird als saubere Vektorform gezeichnet (blau/rot/gelb/grün), nicht als Text oder Bild aus dem Netz.
- Sterne werden als echte Stern-Polygone gezeichnet, deutlich größer und im Goldton der Vorlage.
- Kartenbreite, Innenabstände, Schriftgrößen und Zeilenabstände werden an den Maßen der Beispielbilder ausgerichtet; die Karte wächst in der Höhe mit dem Text, damit **kein Text mehr abgeschnitten** wird.
- Auch die Abschlussseite „Das sagen unsere Kunden" und die Google-Abschlussseite nutzen dieselbe Karte und Schrift.

## Prüfung

- Ich lade Testbilder hoch, erzeuge Stories und vergleiche die gerenderten Bilder Seite an Seite mit deinen Beispielbildern (Kartenbreite, Sternengröße, Schrift, Position).
- Ich prüfe schmales Fenster (Handybreite) und großes Fenster.
- Keine Änderungen an Paketen oder Sperrdateien, damit `mcc-update` fehlerfrei bleibt. Abschließend Typprüfung und Backend-Tests.

## Technische Details

- `src/components/whatsapp-story/WhatsappStoryEditor.tsx`: Miniaturgalerie, Schritt-Automatik, Vorschau ohne `lg:`-Beschränkung, robustere Paste-/Datei-Erkennung, stiller Pi-Upload, `loadDraft` über `piApi` statt `fetch(location.origin…)`.
- `src/lib/werkzeuge/whatsappStory.ts`: neue `drawReviewCard()` mit Vektor-Google-G, Stern-Polygonen, Montserrat, dynamischer Kartenhöhe; gemeinsame Nutzung in `renderStory`, `renderReviewEnding`, `renderGoogleEnding`; `document.fonts.load` vor dem Zeichnen.
- `public/fonts/montserrat-*.woff2` + `@font-face` in `src/styles.css` (Selbst-Hosting, offlinefähig).
- Keine Änderungen an `package.json`, `package-lock.json`, `backend/package*.json`.
