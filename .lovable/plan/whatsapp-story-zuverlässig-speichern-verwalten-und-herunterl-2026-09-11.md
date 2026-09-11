# WhatsApp Story zuverlässig speichern, verwalten und herunterladen

## Ziel
Der komplette Ablauf wird stabilisiert: Ein Klick auf **Speichern** erzeugt genau einen vollständigen Entwurf, ein erneutes Speichern aktualisiert denselben Entwurf, und **Alle herunterladen** liefert garantiert sämtliche Story-Seiten einschließlich Bewertungs- und Google-Abschlussseite. Entwürfe erhalten eindeutige Namen mit Datum, Uhrzeit und Sekunden, können umbenannt und weiterhin mit Sicherheitsabfrage gelöscht werden.

Der Text unten auf jedem Story-Bild bekommt vollständige Gestaltungsmöglichkeiten mit den bereitgestellten Montserrat-Schriften: **Light, Regular, Medium, Bold und Italic**, freie Schriftgröße, Ausrichtung und echte Zeilenumbrüche.

## Bestätigte Schwachstellen
- Mehrere gleichzeitig gestartete Bild-Uploads können derzeit jeweils ein eigenes Projekt anlegen, weil die noch laufende Projekterstellung nicht gemeinsam abgewartet wird. Dadurch entstehen viele gleich benannte Entwürfe.
- Speichern kann abgeschlossen gemeldet werden, obwohl einzelne Bild-Uploads noch laufen oder fehlgeschlagen sind. Die sichtbare Konfiguration und die tatsächlich gespeicherten Bilder können dadurch auseinanderlaufen.
- Der Safari-Fallback startet viele automatische Einzel-Downloads direkt nacheinander. Safari blockiert diese häufig, sodass nur eine Datei – oft die letzte Abschlussseite – ankommt.
- Entwurfsnamen enthalten bisher nur das Datum; Uhrzeit, Sekunden und Umbenennen fehlen.
- Der untere Text ist aktuell einzeilig und sein Schriftschnitt ist fest vorgegeben.

## Umsetzung

### 1. Speichern als einen verlässlichen Vorgang
- Eine zentrale, gegen Doppelklick geschützte Speicher-Warteschlange verwenden: Pro Bearbeitung existiert immer nur ein Projekt und nur ein aktiver Speichervorgang.
- Beim Klick auf **Speichern** alle noch nicht übertragenen Originalbilder vollständig hochladen und deren echte Server-IDs übernehmen.
- Reihenfolge, Zuschnitt, Seitentyp, Partnerbild, Bewertung, Text und Textgestaltung anschließend den jeweiligen gespeicherten Bildern eindeutig zuordnen; nicht mehr nur über einen möglicherweise verschobenen Listenindex.
- Entfernte Bilder auch im gespeicherten Entwurf entfernen; bereits hochgeladene Bilder nicht bei jedem Speichern erneut hochladen.
- Erst nach erfolgreicher Prüfung aller Bild- und Konfigurationsschritte „gespeichert“ melden. Bei einem Fehler klar anzeigen, was nicht gespeichert wurde; keine falsche Erfolgsmeldung.
- Direkt nach dem Speichern den Entwurf erneut vom Pi laden beziehungsweise abgleichen, sodass Vollständigkeit und Bildanzahl bestätigt sind.
- Ein erneuter Klick aktualisiert denselben Entwurf. Ein ausdrücklich neuer Arbeitsstand erzeugt einen neuen Entwurf.

### 2. Entwürfe eindeutig verwalten
- Standardname mit Datum, Uhrzeit und Sekunden, zum Beispiel **Story 10.09.2026, 23:26:41**.
- In der Entwurfsliste zusätzlich Erstell- und letzte Änderungszeit einschließlich Sekunden anzeigen.
- Entwürfe direkt umbenennen und dauerhaft speichern.
- Löschen weiterhin nur nach einer eindeutigen Sicherheitsabfrage.
- Die Liste nach letzter Änderung sortieren und nach Speichern, Umbenennen oder Löschen sofort mit dem Pi abgleichen.
- Bereits vorhandene doppelte Entwürfe werden nicht automatisch gelöscht, damit keine Bilder verloren gehen; sie lassen sich anhand Uhrzeit und Bildanzahl sicher unterscheiden und gezielt löschen.

### 3. „Alle herunterladen“ als garantiert vollständige Datei
- Alle Story-Bilder zuerst vollständig und in fester Reihenfolge erzeugen; Fehler einer einzelnen Seite nennen und den Download nicht fälschlich als erfolgreich melden.
- Auf unterstützten Browsern bleibt die Ordnerauswahl verfügbar und jede nummerierte PNG-Datei wird vollständig geschrieben.
- Für Safari, iPhone und andere Browser ohne Ordnerzugriff wird statt vieler blockierbarer Downloads **eine ZIP-Datei** erzeugt. Sie enthält `01-…png`, `02-…png` usw. sowie die aktivierten Abschlussseiten.
- Die ZIP-Erzeugung wird ohne neue Pakete umgesetzt, damit keine Paket- oder Sperrdatei geändert werden muss.
- Nach Abschluss die tatsächlich erzeugte und geschriebene Dateianzahl anzeigen; optionaler Einzel-Download pro Story-Seite bleibt als zusätzliche Absicherung verfügbar.

### 4. Vollständige Textgestaltung unten
- Ein mehrzeiliges Textfeld ersetzt die einzeilige Eingabe; Enter erzeugt echte Zeilenumbrüche in Vorschau und PNG.
- Pro Bild auswählbar: **Montserrat Light, Regular, Medium, Bold oder Italic**.
- Die hochgeladenen Dateien `Montserrat-Light.otf`, `Montserrat-Medium.ttf` und `Montserrat-Italic.ttf` werden gemeinsam mit den vorhandenen Regular- und Bold-Dateien lokal und offline im Update-Paket ausgeliefert.
- Schriftgröße über einen begrenzten Regler und Ausrichtung über Links/Mitte/Rechts festlegen.
- Lange Zeilen werden innerhalb des sicheren Bereichs umgebrochen; mehrere Zeilen bleiben oberhalb des unteren Randes und überdecken keine anderen Inhalte.
- Vorschau, gespeicherter Entwurf und heruntergeladene PNGs nutzen exakt dieselben Werte.

## Technische Details
- Das bestehende SQLite-Schema wird nur additiv erweitert, falls eine dauerhafte eindeutige Bildzuordnung oder zusätzliche Textwerte nicht vollständig im vorhandenen Konfigurationsfeld abbildbar sind; vorhandene Entwürfe bleiben lesbar.
- Frontend und Pi-Backend erhalten einen synchronisierten Speichervorgang mit Upload-Status, Fehlerweitergabe und Abgleich der gespeicherten Bildanzahl.
- Für den ZIP-Fallback wird ein kleiner browserseitiger ZIP-Writer mit unkomprimierten Einträgen und CRC-Prüfsummen verwendet; keine neue Laufzeitabhängigkeit.
- Binäre Schriftdateien werden in den bestehenden lokalen Asset-/Release-Ablauf aufgenommen und nicht aus dem Internet geladen.
- Keine Änderung an `package.json`, Lockdateien oder dem Update-Skript.

## Prüfung
- Automatischer Backend-Test: zehn Bilder in einem einzigen Entwurf speichern, erneut speichern, neu laden, umbenennen und löschen.
- Parallel-/Doppelklick-Test: mehrere schnell ausgewählte Bildgruppen und doppelter Speicherklick erzeugen weiterhin genau einen Entwurf.
- Fehlerfalltest: ein absichtlich fehlgeschlagener Upload darf keine Erfolgsmeldung und keinen scheinbar vollständigen Entwurf erzeugen.
- Browser-Test auf Desktop und Handy: zehn Bilder plus Bewertungs- und Google-Seite ergeben zwölf korrekt nummerierte PNGs.
- Safari-kompatibler Test: ZIP enthält alle zwölf Dateien und jede Datei ist eine gültige 1080×1920-PNG.
- Texttest für alle fünf Schriftschnitte, verschiedene Größen, Links/Mitte/Rechts und mehrere Zeilen; Vorschau und Export werden visuell verglichen.
- Speichern, Neuladen und erneutes Bearbeiten müssen sämtliche Texteinstellungen exakt erhalten.
- SPA-Paket prüfen: alle fünf Montserrat-Dateien und Story-Grafiken sind lokal enthalten; Frontend- und Backend-Prüfungen laufen ohne Paket-, Lockdatei- oder Update-Skriptänderung.
- Abschließend bleibt nur die reale Kontrolle nach `mcc-update` auf dem Raspberry Pi; alle dafür automatisierbaren Prüfungen werden vorher durchgeführt.
