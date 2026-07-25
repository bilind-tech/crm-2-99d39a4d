## Ziel
Das Firmenlogo soll oben rechts in Rechnungen/Angeboten/Protokollen zuverlässig erscheinen. Zusätzlich soll der Debug-Button auch dann etwas liefern, wenn die Zwischenablage im Browser blockiert.

## Was ich ändern werde
1. **Debug-Button reparieren**
   - Wenn `navigator.clipboard.writeText()` fehlschlägt, wird ein Dialog/Textfeld geöffnet, aus dem du den Debug-Text manuell kopieren kannst.
   - Der Button zeigt außerdem klar an, ob der Debug-Endpunkt erreichbar war oder nicht.

2. **Logo-Fehler sichtbar machen statt still verschlucken**
   - Aktuell kann die PDF-Erstellung bei fehlgeschlagenem Logo-Laden trotzdem eine PDF ohne Logo anzeigen.
   - Ich ändere das so, dass bei erwartetem Logo ein klarer Fehler/Debug-Hinweis entsteht, statt einfach leer weiterzurendern.

3. **PDF-Logo-Pfad härten**
   - Backend-Logo-URL wird überall sauber ohne Doppel-Slashes gebaut.
   - Wenn `firma.hasLogo === true`, wird die gespeicherte Logo-Datei explizit geladen und als Data-URL in pdfmake eingebettet.
   - Falls der Backend-PDF-Renderer eine PDF ohne Logo liefern würde, wird der Cache-Bust/Logo-Zeitstempel stärker genutzt, damit keine alte logo-lose PDF weiter angezeigt wird.

4. **Serverseitige Logo-Prüfung ergänzen**
   - `loadLogoDataUrl()` validiert PNG/JPG-Dateien vor dem Einbetten.
   - Der Debug-Endpunkt meldet dann konkret: Datei vorhanden, MIME erkannt, Data-URL erzeugbar, PDF-Cache-Anzahl, oder welcher Schritt fehlschlägt.

5. **Tests absichern**
   - Relevante Logo/PDF-Tests erweitern: Upload/Datei vorhanden, Debug liefert `ok: true`, PDF-Hash ändert sich bei Logo-Wechsel, ungültige Logo-Datei wird diagnostiziert.

## Ergebnis nach Umsetzung
- Du kannst in Einstellungen auf **„Logo-Debug kopieren“** klicken; wenn automatisches Kopieren blockiert ist, bekommst du den Text sichtbar zum manuellen Kopieren.
- Wenn das Logo weiterhin nicht in der Rechnung erscheint, haben wir eine konkrete Fehlermeldung statt Rätselraten.
- Alte PDF-Caches sollen nicht mehr eine Rechnung ohne Logo weiter anzeigen.