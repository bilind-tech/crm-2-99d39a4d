# Stundenzettel-Modul im CRM — Umsetzungsplan

Ziel: Die bisher externe Stundenzettel-App vollständig als natives CRM-Modul nachbauen — **ohne** eigenes Passwort/Port/iframe. Nutzt vorhandene CRM-Auth, das bestehende Backend (Fastify + SQLite auf dem Pi) und den vorhandenen PDF-Renderer-Stack (pdfmake im Backend, Frontend-Preview via pdf.js). PDF muss **1:1** wie die Referenz aussehen.

## Leitprinzipien

- Keine Zweit-App, kein Iframe, kein Zweit-Passwort — die bestehende Route `/stundenzettel` wird umgebaut.
- Daten liegen in der bestehenden SQLite unter `/var/lib/mycleancenter/` (Code/Daten-Trennung bleibt).
- PDF-Generierung serverseitig mit pdfmake (wie Rechnung/Angebot) → deterministisch, druckt aus Backend, landet automatisch in Drive-Ordner `Stundenzettel/{YYYY}/{MM}/`.
- Berechnungslogik (Ganze-Stunden-Regel, Zielstunden-Ausgleich, Feiertage) lebt in einem gemeinsamen `src/lib/stundenzettel/`-Modul, damit Frontend-Preview und Backend-PDF **exakt dieselben** Ergebnisse liefern.
- Keine externen `040506`-Direktlogin-URLs, kein "Angemeldet bleiben"-Extra — CRM-Login gilt.

## Datenmodell (SQLite)

```text
mitarbeiter
  id TEXT PK, name TEXT, aktiv INTEGER, erstelltAm TEXT,
  arbeitszeiten_json TEXT  -- ArbeitsZeitConfig als JSON
feiertage_custom
  id TEXT PK, datum TEXT (YYYY-MM-DD), name TEXT
stundenzettel
  id TEXT PK, mitarbeiterId TEXT FK, jahr INTEGER, monat INTEGER,
  tage_json TEXT, gesamtStunden REAL, aktualisiertAm TEXT,
  UNIQUE(mitarbeiterId, jahr, monat)
```

NRW-Feiertage werden nicht gespeichert, sondern deterministisch pro Jahr berechnet (Gauß). `feiertage_custom` überlagert.

Manuell im Editor geänderte Tage werden im `stundenzettel.tage_json` fixiert (Snapshot). Neu-Generieren überschreibt nur, wenn User zustimmt.

## Phasen

### Phase 1 — Fundament & Daten (Backend + Berechnung)
1. Alten `/stundenzettel` Iframe-Code + Reverse-Proxy im Backend + Settings-Tab „Stundenzettel-URL" entfernen. Memory-Rules zu iframe-URL aufräumen.
2. SQLite-Migration für die 3 Tabellen.
3. Shared-Modul `src/lib/stundenzettel/` (auch vom Backend importiert):
   - `types.ts` (Mitarbeiter, ArbeitsZeitConfig, GenerierterTag, …)
   - `feiertage.ts` (NRW-Gauß, `istFeiertag`, `istWochenende`, `getFeiertageFuerJahr`)
   - `berechnung.ts` (Tagesberechnung in Minuten, Ganze-Stunden-Floor mit Endzeit-Rückrechnung, 2-Block-Regel, Pause-Schwelle)
   - `zielausgleich.ts` (Wochentag-Priorität Fr→Do→Mi→Di→Mo→Sa→So, ±1h Runden, Grenzen 1–12h/Block, max 2 Runden)
   - `generieren.ts` (`generiereStundenzettel(mitarbeiter, jahr, monat, feiertage)`)
4. Fastify-Routen (auth-geschützt):
   - `GET/POST/PUT/DELETE /mitarbeiter`
   - `GET/POST/DELETE /feiertage/custom`
   - `GET /stundenzettel?jahr&monat&mitarbeiterId`
   - `POST /stundenzettel/generieren` (einzeln + bulk)
   - `PUT /stundenzettel/:id` (manuelle Tageszeilen-Edits)
5. Vitest für Berechnung & Zielausgleich (deterministische Snapshot-Tests).

### Phase 2 — Mitarbeiter- & Feiertagsverwaltung (UI)
1. Neue Route `/stundenzettel` mit MonatContext (Vor/Zurück + Kalender-Popover, Standard = aktueller Monat).
2. Accordion-Sektionen:
   - **Mitarbeiter**: Liste + „Neu"/„Bearbeiten"-Dialog mit allen Feldern (Name, Aktiv, WE-arbeit, Muster gleich/unterschiedlich, Wochentagszeiten, Block 2, Pause+Schwelle, Zielstunden). Reuse `KundePicker`-Stil.
   - **Feiertage**: NRW-Liste (readonly, aus `getFeiertageFuerJahr(jahr)`) + eigene Einträge hinzufügen/löschen.
3. React-Query-Hooks (`useMitarbeiter`, `useFeiertage`) analog zu bestehenden Modulen.

### Phase 3 — Stundenzettel-Editor & Massenerstellung
1. Sub-Route `/stundenzettel/vorschau/$mitarbeiterId`: zeigt generierten Zettel für global gewählten Monat.
2. `EditableDayRow` (Beginn, Ende, Block 2, Pause von/bis, Stunden readonly, Bemerkung). Autosave via `PUT /stundenzettel/:id` (debounced).
3. Header: Name, Monat/Jahr, Ist-/Zielstunden, Buttons „Neu generieren", „PDF drucken", „Zurück".
4. Bulk-Aktion in der Mitarbeiterliste: „Alle Stundenzettel für {Monat} generieren" mit Fortschrittsdialog (sequentiell, mit Fehlerliste).

### Phase 4 — PDF-Renderer (pixelgleich zur Referenz)
1. Neuer pdfmake-Renderer `backend/src/pdf/stundenzettel.ts`:
   - A4 Portrait, Padding 15/20 mm.
   - Kopf: zentriertes Firmenlogo (Höhe ~100 px), kein Titel.
   - Info-Zeilen `Stundenzettel von: …` / `Monat: {Monat} {Jahr}` in 12 pt.
   - Tabelle mit Spalten Tag (fett) · Arbeitsbeginn · Arbeitsende · Pause von · Pause bis · Arbeitsstunden. Header grau `#e8e8e8`.
   - Zeilenhöhe fix, Zahlen/Uhrzeiten in Helvetica, Bemerkungen/Text in Madani.
   - **Tage 1–15 Seite 1, 16–31 Seite 2**; fehlende Tage als leere Zeilen aufgefüllt.
   - Block 2: zwei Zeilen übereinander in Beginn-/Ende-Zelle.
   - Feiertag/Krank/Urlaub-Bemerkung → in Arbeitsbeginn-Spalte statt Uhrzeit; keine Uhrzeit-Anzeige, aber Stunden zählen bei Feiertag-an-Arbeitstag.
   - Wochenende bei Nicht-WE-Mitarbeiter: **leere** Zeile im PDF (kein „Samstag/Sonntag"-Text — abweichend zum Alt-Spec, entspricht Referenz).
   - Seite 2 Ende: Summenzeile (`colSpan=4` "Summe Arbeitsstunden:" + Zahl).
   - Unterschriften-Block Seite 2 (Linie + „Unterschrift Arbeitsnehmer" / „…Arbeitsgeber").
   - Seitenzahl unten rechts grau.
2. Fonts: Madani Regular als TTF beilegen — **hier bräuchte ich die TTF vom User**. Fallback vorher: Helvetica überall, damit Layout schon steht.
3. Frontend-Preview: bestehenden `PdfCanvasViewer` wiederverwenden, Datei kommt vom Backend-Endpoint `GET /stundenzettel/:id/pdf`.
4. QA-Loop mit `pdftoppm` gegen die Referenz-PDF, bis Spaltenbreiten/Zeilenhöhen/Rahmen exakt passen.

### Phase 5 — Druck, Bulk-Export, Drive-Sync, Cleanup
1. „PDF drucken" nutzt bestehende `printBlob`-Pipeline (Desktop + Mobile).
2. Bulk-Druck-Dialog: alle aktiven Mitarbeiter sequentiell, Fortschritt + Abbruch. Dateinamen `Stundenzettel_{Name}_{Monat}_{Jahr}.pdf`.
3. Google-Drive-Upload analog Rechnungen: Zielordner `Stundenzettel/{YYYY}/{MM}/`. Auto-Upload bei jedem Generate/Save.
4. Backup-Skript prüfen (SQLite-Snapshot deckt neue Tabellen automatisch ab).
5. Memory-Files aktualisieren (`mem://features/stundenzettel.md`), Alt-Iframe-Memory entfernen.

## Was ich noch von dir brauche (später, nicht jetzt)

- **Madani-Regular TTF** — für pixelgleichen PDF-Look. Phase 4 startet mit Helvetica-Fallback, TTF wird eingebunden sobald du sie hochlädst.
- **Firmenlogo im Stundenzettel-PDF**: dasselbe Logo wie in Rechnungen (bereits im Backend unter `branding/logo.png`) — okay so? Falls du eine eigene Hell-/Dunkel-Variante möchtest, sag Bescheid.

## Abgrenzungen (bewusst weggelassen)

- Kein Zweit-Passwort `040506`, kein URL-Login `/040506`, kein „Angemeldet bleiben" — CRM-Login gilt.
- Keine separate `/mitarbeiter`- oder `/einstellungen`-Redirect-Logik — alles unter `/stundenzettel` mit Accordions.
- Keine Mitarbeiter-Logins.
- Kein html2canvas/jsPDF im Browser — nur serverseitiges pdfmake für Determinismus und Drive-Sync.

Sag mir „los" wenn Phase 1 starten soll, oder korrigiere vorher Reihenfolge/Umfang.
