# WhatsApp-Story-Werkzeug

## Ziel
Unter **Werkzeuge** entsteht eine neue Seite **WhatsApp Story**. Sie erzeugt aus hochgeladenen Bildern einheitliche Story-Seiten im Format **1080 × 1920 Pixel**, speichert Entwürfe und Bewertungen dauerhaft auf dem Raspberry Pi und lädt fertige Seiten als einzeln nummerierte PNG-Dateien herunter.

Die von dir noch hochgeladene **leere Vorlage** wird unverändert als feste Grundlage verwendet. Sie enthält nur Logo, Trennlinie und „20 Jahre Erfahrung“. Text, Bewertung und Arbeitsbilder werden ausschließlich in die dafür vorgesehenen Bereiche gesetzt.

## Bedienablauf
1. **Bilder hinzufügen**
   - Mehrfachauswahl, Drag-and-drop und Einfügen per `Strg+V`.
   - Vorschau aller Bilder mit verständlichen Hinweisen bei ungeeigneten Dateien.
2. **Reihenfolge festlegen**
   - Bilder per Ziehen sortieren und nummerieren.
   - Einzelne Seiten als normales Bild, Querformat-Doppelseite oder Vorher/Nachher kennzeichnen.
   - Bei Vorher/Nachher werden die beiden Bilder eindeutig zugeordnet und können getauscht werden.
3. **Story zusammenstellen**
   - Google-Bewertungen ein-/ausschalten.
   - Optionale vorletzte Bewertungsübersicht und letzte Google-Bewertungsseite einzeln aktivieren/deaktivieren.
   - Alle Seiten werden auf einmal erzeugt.
4. **Seiten bearbeiten**
   - Große, maßstabsgetreue Vorschau.
   - Bild innerhalb der festen Fläche verschieben und zoomen; transparenter Zuschnitt-Modus nach dem gezeigten Canva-Prinzip.
   - Optionaler eigener Titel, zum Beispiel „Grundreinigung“.
   - Bewertung austauschen, Position oben/unten und links/rechts wählen sowie vertikal fein verschieben.
5. **Herunterladen**
   - Alle Seiten werden einzeln als `01.png`, `02.png`, `03.png` usw. heruntergeladen.
   - Zusätzlich kann jede Seite einzeln erneut geladen werden.

## Layout-Regeln
- Jede Seite verwendet exakt dieselbe 1080×1920-Grundfläche und dieselben festen Bildpositionen.
- Hochformatbilder erhalten eine große, identische Bildfläche.
- Querformatbilder werden in einer passenden Zwei-Bild-Anordnung dargestellt.
- Vorher/Nachher bekommt klar getrennte, gleich große Bereiche und frei änderbare Beschriftungen.
- Bewertungspositionen wechseln standardmäßig links/rechts; manuelle Änderungen bleiben möglich.
- Vorschau und exportierte PNG-Datei werden von derselben Zeichenlogik erzeugt, damit nichts verrutscht.
- Die Oberfläche bleibt auch am Handy bedienbar; die genaue Feinarbeit ist am Computer komfortabler.

## Google-Bewertungen
- Die lesbaren Bewertungen aus den bereitgestellten Beispielen werden als erste Sammlung übernommen.
- Ein eigener Verwaltungsbereich erlaubt neue Bewertungen mit Name, Text und Sternen sowie Änderungen und Löschen.
- Bewertungen werden pro Story zufällig und ohne Wiederholung verteilt.
- Bereits verwendete Bewertungen zeigen die betroffene Seitennummer.
- Wird eine verwendete Bewertung einer anderen Seite zugewiesen, werden die beiden Zuordnungen getauscht statt dupliziert.
- In der Auswahl wird die Textlänge sichtbar, damit kurze oder lange Bewertungen passend gewählt werden können.

## Dauerhafte Speicherung und Sicherheit
- Neue lokale Datensätze speichern Entwürfe, Seitenreihenfolge, Zuschnitt, Texte, Bewertungssammlung und fertige Story-Sätze.
- Originalbilder und erzeugte PNGs liegen im bestehenden Upload-Bereich des Raspberry Pi und sind dadurch in der normalen Datensicherung enthalten.
- Alle Zugriffe bleiben durch die bestehende Passwortsperre geschützt.
- Löschen entfernt Dateien nur, wenn sie von keinem anderen Entwurf mehr verwendet werden.

## Technische Umsetzung
- Neuer Eintrag in der bestehenden Werkzeug-Liste und neue Route `/werkzeuge/whatsapp-story` mit eigener Seiten-Metadatenbeschreibung.
- Kleine, getrennte Bausteine für Import, Sortierung, Seiteneinstellungen, Zuschnitt, Bewertungsauswahl, Vorschau und Export.
- Bildbearbeitung und PNG-Erzeugung erfolgen mit der vorhandenen Browser-Canvas-Technik; keine neue Bildbibliothek und keine nativen Raspberry-Pi-Abhängigkeiten.
- Eine additive SQLite-Migration und geschützte Fastify-Endpunkte speichern Metadaten und Dateien unter dem vorhandenen Datenverzeichnis.
- Keine Änderung an Paketversionen oder Lockdateien. Der bestehende `mcc-update`-Ablauf und die strikte Trennung von Code und Daten bleiben erhalten.

## Umsetzung in Etappen
1. Leere Vorlage einbinden, Werkzeug-Seite und dauerhafte Datenstruktur anlegen.
2. Upload, Einfügen, Drag-and-drop, Sortierung und Seitentypen umsetzen.
3. Präzisen Zuschnitt mit Verschieben/Zoom sowie einheitliche Story-Darstellung bauen.
4. Bewertungen importieren, verwalten, zufällig ohne Duplikate verteilen und manuell positionieren.
5. Abschlussseiten, PNG-Erzeugung, Einzel- und Gesamtdownload ergänzen.
6. Desktop- und Handyablauf vollständig prüfen.

## Prüfung
- Automatische Tests für Speichern/Laden, Reihenfolge, Tauschlogik und duplikatfreie Bewertungsverteilung.
- Sichtprüfung mehrerer Story-Sätze mit Hochformat-, Querformat- und Vorher/Nachher-Bildern.
- Vergleich jeder Vorschau mit der exportierten 1080×1920-PNG-Datei.
- Prüfung von Einfügen, Drag-and-drop, Mehrfachauswahl, Zoom/Verschieben und nummeriertem Gesamtdownload.
- Prüfung auf Desktop und Handy sowie Neustart-Persistenz auf dem lokalen Backend.
- Frontend- und Backend-Prüfungen ohne Änderung der Paket- oder Lockdateien; abschließende Kontrolle des Update-Pfads.

## Noch benötigt
- Die angekündigte leere 1080×1920-Vorlage als PNG oder JPG.
- Falls einzelne Bewertungen in den Beispielbildern nicht vollständig lesbar sind, werden nur eindeutig erkennbare Texte übernommen; weitere können direkt im Werkzeug ergänzt werden.
