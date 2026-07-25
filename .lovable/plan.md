## Ziel
Das Firmenlogo soll auf Rechnungen und Angeboten zuverlässig oben rechts erscheinen. Zusätzlich bauen wir eine klare Debug-Anzeige ein, damit du direkt sehen/kopieren kannst, wo es hängt: Upload, gespeicherte Datei, PDF-Renderer oder Cache.

## Plan
1. **Debug-Endpunkt im Backend ergänzen**
   - Neuer geschützter Endpunkt z. B. `GET /einstellungen/firma/logo/debug`.
   - Liefert kopierbare Diagnose-Daten:
     - ob Logo-Datei existiert
     - Pfad/Dateiname im Datenverzeichnis, MIME, Bytes, Änderungszeit
     - ob `loadLogoDataUrl()` wirklich eine PDF-taugliche Data-URL findet
     - Hash/Fingerprint fürs PDF
     - Anzahl alter PDF-Cache-Dateien
     - aktuelle `logoUpdatedAt`/`hasLogo`-Werte aus den Firmendaten

2. **Debug-Button in Einstellungen → Firmendaten → Logo einbauen**
   - Kleiner Button „Logo-Debug kopieren“ neben Upload/Entfernen.
   - Kopiert die Diagnose als JSON in die Zwischenablage.
   - So kannst du mir beim nächsten Mal exakt schicken, warum es nicht angezeigt wird.

3. **PDF-Logo-Rendering härten**
   - Backend-Renderer validiert vor dem Rendern, ob das Logo lesbar und als PNG/JPG für pdfmake verwendbar ist.
   - Wenn eine Logo-Datei existiert, wird sie eindeutig in den PDF-Hash aufgenommen und alte PDF-Caches werden beim Upload/Löschen entfernt.
   - Falls das Logo nicht eingebettet werden kann, soll der Debug-Endpunkt den Fehler sichtbar machen statt stillschweigend ohne Logo zu rendern.

4. **Wahrscheinlichen aktuellen Fehler abfangen**
   - Die Preview kann aktuell auf ein altes/fallback-PDF zurückfallen, wenn Backend-PDF oder Logo-Laden scheitert. Ich werde das so ändern, dass der Grund sichtbar wird und nicht unbemerkt eine PDF ohne Logo angezeigt wird.
   - Für Beleg-PDFs wird kein generisches Asset-Logo als Ersatz verwendet, wenn eigentlich ein hochgeladenes Firmenlogo erwartet wird. Dadurch sieht man sofort, ob die gespeicherte Datei wirklich genutzt wird.

5. **Tests erweitern**
   - Test: Logo-Upload speichert Datei und Debug meldet `hasFile: true`.
   - Test: gerenderte Rechnung mit Logo hat einen anderen Hash als ohne Logo.
   - Test: Regenerieren/Upload invalidiert den PDF-Cache.
   - Keine neuen npm-Pakete, keine Lockfile-Änderung, keine riskanten Update-Script-Änderungen.

## Ergebnis für dich
Nach dem Update kannst du:
1. Logo hochladen.
2. Rechnung öffnen.
3. Wenn es immer noch fehlt: in Einstellungen den Debug-Button drücken und mir die kopierten Daten schicken.

Damit wissen wir dann nicht mehr „vielleicht“, sondern exakt, ob das Problem beim Speichern, Laden, Rendern oder Cache liegt.