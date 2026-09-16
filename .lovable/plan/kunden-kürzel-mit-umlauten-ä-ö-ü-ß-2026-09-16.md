# Kunden-Kürzel mit Umlauten (Ä, Ö, Ü, ß)

Heute lässt das Kürzel nur A–Z und 0–9 zu: Tippt man "Ö", verschwindet der Buchstabe sofort im Formular, und auch der Server würde ihn ablehnen. Künftig sind deutsche Umlaute und ß erlaubt — überall gleich: beim Anlegen, beim Bearbeiten, in der Belegnummer, im PDF und im Drive-Dateinamen.

## Was sich für dich ändert

- Im Feld "Kürzel" kannst du Ä, Ö, Ü und ß eingeben (klein getippt wird automatisch groß).
- Das ß bleibt ein ß (wird nicht zu "SS"), damit die Belegnummer so aussieht wie gewollt.
- Die Prüfung "Kürzel schon vergeben?" arbeitet weiter live und blockiert Doppelvergaben — jetzt auch bei Umlauten.
- Belegnummern wie `GRÖ0926/01` erscheinen identisch in der Vorschau, auf dem PDF und im Drive-Dateinamen.
- Alles Bestehende bleibt unverändert; keine Datenbank-Änderung, das Update auf dem Pi läuft normal durch.

## Vorgehen

1. Gemeinsame Regel definieren: erlaubte Zeichen sind A–Z, 0–9, Ä, Ö, Ü, ß. Dazu eine Groß-Schreibweise, die ä/ö/ü zu Ä/Ö/Ü macht und ß unverändert lässt.
2. Diese Regel an allen Stellen einsetzen, damit nichts auseinanderläuft:
   - Server: Format-Prüfung und Normalisierung des Kürzels.
   - Server: Präfix der Belegnummer (bisher pauschales Großschreiben, das aus ß ein SS machen würde).
   - Formular "Neuer Kunde" und Dialog "Kunde bearbeiten": Eingabefilter und Kürzel-Vorschlag aus dem Firmennamen.
   - Belegnummer-Vorschau in der Oberfläche.
3. Eindeutigkeit absichern: Da alle Kürzel normalisiert (großgeschrieben) gespeichert werden, greifen der bestehende eindeutige Index und die Live-Prüfung unverändert; "grö" und "GRÖ" landen auf demselben Wert und kollidieren korrekt.
4. Prüfen: Typprüfung, bestehende Tests, plus ein Durchlauf im Browser (Kunde mit Kürzel "GRÖ" anlegen, Doppelvergabe testen, Rechnung erzeugen und PDF ansehen).

## Technische Details

- Neue Helfer `normalizeKuerzel`/`isKuerzelFormatOk` in `backend/src/kunden/kuerzel.ts`: Regex `^[A-Z0-9ÄÖÜß]+$`, Uppercase über eine Funktion, die `ß` schützt (`s.replace(/ß/g,'\u0000').toUpperCase().replace(/\u0000/g,'ß')`).
- Gleiche Funktion (eigene kleine Datei in `src/lib/`) für Frontend: `sanitizeKuerzel` in `src/components/forms/KundeForm.tsx` und `KundeBearbeitenDialog.tsx`, `vorschlagKuerzel` (Umlaute nicht mehr wegfiltern), `vorschauBelegnummer` in `src/lib/belegNummer.ts`.
- `bestimmePrefix` in `backend/src/belege/belegnummer.ts` nutzt statt `trim().toUpperCase()` denselben Helfer.
- `sanitizeSegment` in `backend/src/drive/naming.ts` entfernt bereits keine Umlaute — keine Änderung nötig.
- Keine Migration, keine Schema-Änderung, keine Änderung an `package.json`, Lockfile oder `update.sh`.
