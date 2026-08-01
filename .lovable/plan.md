## Problem

Die Toolbar in `src/components/forms/LeistungsBeschreibung.tsx` schreibt Markdown-Marker (`**fett**`, `*kursiv*`, `__unterstrichen__`) direkt in den Text. Beide PDF-Renderer — `src/lib/pdf/belegPdf.ts` (`beschreibungBlock`, Zeile 162) und `backend/src/pdf/layout.ts` (`beschreibungBlock`, Zeile 34) — geben den Text jedoch unverändert als einfachen String an pdfmake weiter. Ergebnis: die Sterne stehen sichtbar in der PDF, nichts ist fett oder kursiv.

## Lösung

### 1. Gemeinsamer Inline-Parser

Neues Modul `src/lib/pdf/inlineFormat.ts` mit einer Funktion, die eine Textzeile in pdfmake-Textfragmente zerlegt:

- `**…**` → `{ text, bold: true }`
- `__…__` → `{ text, decoration: "underline" }`
- `*…*` / `_…_` → `{ text, italics: true }`
- Kombinationen verschachtelt (z. B. `**_x_**`)
- Ein zweites Export `plainText(text)` entfernt alle Marker — wird für Zeilenschätzung/vertikale Zentrierung und für Dateinamen/Vorschauen gebraucht.

Wichtig: Der Bullet-Erkenner `^[•\-*]\s+` kollidiert mit dem Kursiv-Marker. Er wird auf `^[•\-]\s+` bzw. `^\*\s+` (Stern **mit** Leerzeichen danach) eingeschränkt, damit `*kursiv*` am Zeilenanfang nicht als Aufzählungspunkt gilt.

Da das Backend nicht aus `src/` importieren kann, wird der Parser 1:1 als `backend/src/pdf/inlineFormat.ts` gespiegelt (gleiche Datei-Inhalte, wie bereits bei `layout.ts` ↔ `belegPdf.ts` üblich).

### 2. Renderer anpassen

In beiden `beschreibungBlock`-Funktionen werden Titelzeile, Fließzeilen und Bullet-Einträge statt `{ text: string }` als `{ text: [ …Fragmente ] }` erzeugt. Zusätzlich benutzen `beschreibungZeilenIntern` und `geschaetzteZeilen` den markerfreien Text, damit Umbruch- und Zentrierungs-Schätzung stimmen.

Der gleiche Parser wird auch auf Intro-/Outro-Texte angewendet, damit Formatierung dort ebenfalls funktioniert statt Sterne zu zeigen.

### 3. Eingabefeld ohne sichtbare Sterne

`LeistungsBeschreibung` wird von `<textarea>` auf ein `contentEditable`-Feld umgestellt:

- Anzeige gerendert (fett/kursiv/unterstrichen sichtbar, keine Marker)
- Gespeichert wird weiterhin derselbe Markdown-String → Datenmodell, Backend, Migrationen und bestehende Datensätze bleiben unverändert
- Toolbar-Buttons und Cmd/Ctrl+B/I/U wirken auf die Auswahl (via `document.execCommand` mit HTML→Markdown-Serialisierung beim Change)
- Auto-Resize, Bullet-Button und Platzhalter bleiben erhalten
- Einfügen aus der Zwischenablage wird als Plaintext übernommen

Damit sind die Sterne nirgends mehr sichtbar — weder im Formular noch in der PDF.

### 4. Update-Sicherheit

Vor dem Abschluss: `package-lock.json` (Root) und `backend/package-lock.json` gegen die jeweilige `package.json` mit `npm install --package-lock-only` synchronisieren und `npm ci --dry-run` in beiden Verzeichnissen prüfen, damit `mcc-update` fehlerfrei durchläuft. Keine neuen Abhängigkeiten — der Parser ist eigener Code.

## Technische Details

Betroffene Dateien:
- neu: `src/lib/pdf/inlineFormat.ts`, `backend/src/pdf/inlineFormat.ts`
- `src/lib/pdf/belegPdf.ts` (`beschreibungBlock`, `beschreibungZeilenIntern`, `geschaetzteZeilen`, Intro/Outro)
- `backend/src/pdf/layout.ts` (gleiche Stellen)
- `src/components/forms/LeistungsBeschreibung.tsx` (WYSIWYG-Umbau)
- Lockfiles falls Drift

Kein Datenbank-Migrationsbedarf, keine API-Änderung.
