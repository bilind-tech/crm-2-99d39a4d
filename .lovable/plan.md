## Problem
Pauschal-Positionen erzeugen aktuell pro Zeile der Leistungsbeschreibung eine eigene Tabellenzeile. Dadurch zieht pdfmake zwischen jeder Textzeile eine horizontale Trennlinie — sichtbar als „Extra-Striche" mitten in einem einzelnen Pauschalblock, besonders bei Leerzeilen oder Bullet-Listen.

Ursache: In beiden PDF-Renderern (Frontend + Backend) wird für `modus === "pauschal"` per `beschreibungZeilen(...).forEach(...)` je Zeile ein eigenes `body.push(row)` gemacht. Die Nicht-Pauschal-Positionen nutzen dagegen bereits `beschreibungBlock(...)` in einem `stack` innerhalb **einer** Zelle — genau das, was wir wollen.

## Fix
Pauschal genauso rendern wie die anderen Modi: eine einzige Tabellenzeile pro Position mit `beschreibungBlock(...)` als Stack in der ersten Spalte. Bold-Titel-Verhalten bleibt über `beschreibungBlock` erhalten (die Funktion setzt die erste nicht-leere Zeile bereits fett, sofern kein Bullet). Abrechnungsart und Preis erscheinen wie gewohnt genau einmal rechts.

Betroffene Stellen (identische Logik, doppelt gepflegt):
- `src/lib/pdf/belegPdf.ts` — Zeilen ~401-422 (Pauschal-Zweig entfernen, in den Standard-Zweig zusammenführen; `id: pos:${p.id}` bleibt an der Zelle)
- `backend/src/pdf/layout.ts` — Zeilen ~217-236 (analog)

Keine Änderungen an Tabellen-Layout, Widths, Summenzeilen, Hotspots-IDs oder API-Typen. Positions-Reihenfolge und Border-Layout unverändert — es entfällt nur die pro-Textzeile-Aufsplittung, und damit auch die ungewollten horizontalen Linien innerhalb eines Pauschalblocks.

## Update-Sicherheit
- Nur zwei TS-Dateien werden angepasst, keine Migrations, keine Package-Änderungen, keine Lockfile-Änderungen → `mcc-update` läuft unverändert durch.
- PDF-Cache-Version (`PDF_RENDER_CACHE_VERSION` in `backend/src/pdf/cache.ts` und `src/hooks/useBelegPdf.ts`) wird auf einen neuen Wert (`2026-07-26-pauschal-single-row-v5`) gehoben, damit alte gecachte PDFs mit den alten Trennlinien nach dem Update nicht wiederverwendet werden.

## Verifikation
- Backend-Tests: `bunx vitest run backend/test/pdf.spec.ts` — muss weiter grün sein (nur Cache-Version + Row-Aufbau ändert sich, PDF-Bytes ändern sich, aber Assertions prüfen `%PDF-`, Dateiname, Cache-Verhalten — nicht das interne Zeilen-Schema).
- Frontend-Typecheck via automatischer Build.
