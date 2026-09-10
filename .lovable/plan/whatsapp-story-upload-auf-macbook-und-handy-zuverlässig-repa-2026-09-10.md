# WhatsApp Story: Upload auf MacBook und Handy zuverlässig reparieren

## Bestätigte Ursache

Nach der Dateiauswahl erzeugt die Story-Seite für jedes Bild zuerst eine Kennung mit `crypto.randomUUID()`. Diese Browserfunktion ist auf einer lokalen Raspberry-Pi-Adresse über normales HTTP nicht zuverlässig verfügbar. Wenn sie fehlt oder blockiert wird, bricht die Verarbeitung vor Miniaturbild, Zähler und Meldung ab. Genau deshalb wirkt die Auswahl auf MacBook und Handy folgenlos.

Zusätzlich ist der versteckte Dateidialog derzeit indirekt per Klick geöffnet. Für iPhone/iPad und Safari ist die robustere, im Projekt bereits bewährte Lösung ein echtes Datei-Eingabefeld direkt über der sichtbaren Schaltfläche.

## Umsetzung

### 1. Dateiimport wirklich browserübergreifend machen

- Die unsichere Kennungserzeugung durch den vorhandenen kompatiblen Fallback ersetzen, der auch im lokalen HTTP-Netz des Pi funktioniert.
- „Auswählen“ als echtes, transparentes Datei-Eingabefeld direkt über der sichtbaren Schaltfläche bauen; dadurch bleibt die notwendige direkte Benutzeraktion auf Safari und mobilen Browsern erhalten.
- Zusätzlich einen eigenen Kamera-/Fotobutton für Handys anbieten und Mehrfachauswahl aus Fotos/Dateien weiterhin unterstützen.
- Nach jeder Auswahl den Dateidialog zurücksetzen, damit dasselbe Bild erneut ausgewählt werden kann.
- JPG, PNG und WebP anhand von Dateityp und Endung sicher erkennen; HEIC/HEIF mit einer verständlichen Meldung benennen.
- Datei- und Bildlesefehler sichtbar melden, statt still abzubrechen.
- Bilder sofort lokal anzeigen und erst danach unabhängig im Hintergrund auf dem Pi speichern. Ein nicht erreichbarer Pi darf die sichtbare Bearbeitung niemals verhindern.
- Einfügen per Cmd+V auf dem Mac und Strg+V auf anderen Geräten beibehalten; der sichtbare Einfügen-Knopf wird nur verwendet, wenn der Browser den Zugriff erlaubt.

### 2. Gelieferte Originalgestaltung verwenden

- Die von dir gelieferten Dateien `Montserrat-Bold.otf` und `Montserrat-Regular.otf` lokal/offline einbinden: Bewertungsname exakt Bold, Bewertungstext exakt Regular.
- Das gelieferte moderne Google-Logo verwenden, statt des bisherigen alten, selbst gezeichneten Logos.
- Das gelieferte Sternmotiv aus der SVG sauber extrahieren und fünf identische Sterne mit gleichmäßigem Abstand nebeneinander setzen, statt der bisherigen selbst gezeichneten Sterne.
- Bewertungskarte, Name, Textbreite, Zeilenabstand, Sternengröße und Abstände erneut gegen deine Beispielbilder ausrichten; lange Texte vergrößern die Karte ohne Abschneiden.
- Dieselben Originalelemente auf normalen Stories, der Bewertungs-Abschlussseite und der Google-Abschlussseite verwenden.

### 3. Verbindliche Prüfung

- Den Import nicht nur künstlich im Code auslösen, sondern den echten „Auswählen“-Dialog mit einer Datei durchspielen.
- MacBook-/Desktopbreite und Handybreite getrennt prüfen: Auswahl, Kamera/Fotos, erneute Auswahl derselben Datei, mehrere Bilder, Löschen und sichtbare Story-Vorschau.
- Cmd+V/Strg+V mit Bild sowie den Fall einer leeren Zwischenablage prüfen.
- Tests mit fehlendem Pi-Backend durchführen: Das Bild muss trotzdem sofort erscheinen und bearbeitbar bleiben.
- Eine Story mit Bewertung als 1080 × 1920 PNG erzeugen und visuell mit der Beispielvorlage vergleichen.
- Prüfen, dass die beiden gelieferten Montserrat-Schnitte tatsächlich geladen und beim Zeichnen verwendet werden.
- Abschließend Typprüfung und passende Backend-/Uploadtests ausführen.
- Keine Änderungen an `package.json`, Sperrdateien oder dem Update-Skript; vor Abschluss ausdrücklich kontrollieren, dass `mcc-update` dadurch nicht gefährdet wird.

## Technische Details

- `WhatsappStoryEditor`: kompatible Kennungen, stabile native Datei-/Kamera-Auswahl, Fehlerzustände, sofortige lokale Anzeige und entkoppelte Pi-Speicherung.
- `whatsappStory`-Renderer: gelieferte Google-/Stern-Grafiken und feste Montserrat Regular/Bold-Schriften laden, bevor Canvas Text zeichnet.
- Die Medien werden so eingebunden, dass sie im installierten Raspberry-Pi-Paket ohne Internet funktionieren.
