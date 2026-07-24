## Ziel
In der Positions-Tabelle (Rechnung + Angebot) den Text in der Spalte **„Abrechnungsart"** (aktuell fest „Pauschal" / „Stundensatz" / „Einzelposition") pro Position **frei editierbar** machen. Der zuletzt verwendete Text wird pro Modus als **Default** gespeichert und bei der nächsten neuen Position dieses Modus automatisch vorgeschlagen.

## Umfang
- Betrifft Rechnungen **und** Angebote (gleicher Positionen-Editor + PDF-Renderer)
- Persistenz: pro Position in der DB (individuell) **und** pro Modus als globaler Default (Browser-lokal, kein Server-Roundtrip nötig — synchronisiert sich automatisch bei jeder Bearbeitung)
- Kein Eingriff in Build / Deploy / `mcc-update` — nur Code + eine additive Migration

## UI-Änderung (PositionenEditor)
In jeder Positions-Karte kommt oberhalb der Beschreibung ein zusätzliches, dezentes Eingabefeld:

```text
Abrechnungsart (Spaltenüberschrift)   [ Pauschal            ]
                                       └── frei editierbar, Placeholder = aktueller Default
```

- Änderungen werden sofort in die Position übernommen und beim Speichern des Belegs mit in die DB geschrieben.
- Zusätzlich: bei jeder Änderung wird der Wert als neuer Default für diesen Modus in `localStorage` gespeichert (`mcc.abrechnungsart_defaults.v1`).
- Wechselt der Nutzer den Modus (Pauschal/Stunden/Einzel), springt das Label auf den Default dieses Modus.
- Wird das Feld geleert, greift bei der PDF-Ausgabe der System-Default („Pauschal" / „Stundensatz" / „Einzelposition").

## PDF-Ausgabe
Frontend- und Backend-PDF nutzen künftig `position.abrechnungsartLabel ?? SystemDefault(modus)`. Bestehende Belege ohne den neuen Wert sehen exakt aus wie heute.

## Persistenz
- **DB (additiv, keine Datenverluste):**
  - Neue Migration `040_position_abrechnungsart_label.sql`
  - `ALTER TABLE angebot_position ADD COLUMN abrechnungsart_label TEXT NULL;`
  - `ALTER TABLE rechnung_position ADD COLUMN abrechnungsart_label TEXT NULL;`
- **Defaults pro Modus:** `localStorage["mcc.abrechnungsart_defaults.v1"] = { pauschal, stunden, einzel }`.
  Bewusst client-seitig — kein neuer API-Endpunkt, kein Backend-Deploy nötig für die Default-Logik.

## Technische Details (für später)

**Backend**
- Migration 040 (siehe oben)
- `backend/src/belege/mappers.ts`: `DbPosition` + `ApiPosition` bekommen `abrechnungsart_label` / `abrechnungsartLabel` (nullable/optional); `positionRowToApi` mappt durch
- `backend/src/belege/positionen.ts`: `POS_COLS` erweitern, `INSERT` erweitert um `abrechnungsart_label` (trim, leer → NULL); `PositionInput` bekommt `abrechnungsartLabel?: string`
- `backend/src/pdf/layout.ts`: in der Abrechnungsart-Zelle `p.abrechnungsartLabel?.trim() || defaultLabel(p.modus)` verwenden
- `backend/src/pdf/cache.ts`: Feld in den Hash aufnehmen, damit Cache bei Änderung invalidiert

**Frontend**
- `src/lib/api/types.ts`: `Position.abrechnungsartLabel?: string`
- `src/components/forms/PositionenEditor.tsx`:
  - `PositionDraft.abrechnungsartLabel: string`
  - Neue kleine Helper-Datei `src/lib/belege/abrechnungsartDefaults.ts` mit `getDefault(modus)` / `setDefault(modus, value)` (localStorage, SSR-safe)
  - `emptyPosition(steuersatz, modus)` liest Default aus localStorage
  - Neues Input-Feld in `PositionCard` (kompakt, oberhalb der Beschreibung, in allen drei Modi identisch)
  - Beim Modus-Wechsel Label auf Default des neuen Modus setzen
  - `toApiPositionen` / `fromApiPosition` reichen das Feld durch
- `src/lib/pdf/belegPdf.ts`: `columnHeader`/`abrechnungsart`-Zelle nutzt `p.abrechnungsartLabel?.trim() || defaultLabel(p.modus)`
- `src/components/pdf-editor/HotspotInlineEditor.tsx`: bestehendes Label (`{pos.modus ?? "einzel"}`) durch dieselbe Logik ersetzen, damit Live-Preview passt

## Bewusst NICHT geändert
- Keine Änderungen an `package.json`, Lockfile, `update.sh`, `ensure-lightningcss-native.mjs` — damit `mcc-update` weiterhin sauber durchläuft
- Keine neue API-Route, keine Server-Function
- Bestehende Belege / Positionen bleiben unverändert (Spalte NULL → System-Default)

## Rollout auf dem Pi
Nach `mcc-update` läuft die Migration 040 automatisch beim Backend-Start (bestehender Migrations-Runner). Keine manuellen Schritte nötig.