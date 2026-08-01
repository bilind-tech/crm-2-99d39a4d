## Ziel

Im PDF-Editor und beim Erstellen von Angebot/Rechnung sollen drei Dinge direkt beim Empfänger/Ansprechpartner steuerbar sein:

1. **Ansprechpartner im Empfängerblock ausblenden** (Name-Zeile oben links).
2. **Anrede frei bearbeiten** („Sehr geehrter Herr Müller,“) — ohne dass ein Ansprechpartner angelegt werden muss.
3. **Objektname im Empfängerblock** — der Schalter existiert bereits, ist aber versteckt (Checkbox unter „Optionen“ bzw. Tab „Texte & Optionen“). Er wird dorthin geholt, wo man ihn erwartet: direkt beim Objekt bzw. beim Empfängerblock.

## Was gebaut wird

### Neue Beleg-Optionen (`BelegOptionen`)
- `ansprechpartnerImEmpfaenger?: boolean` (Standard: **an**)
- `eigeneAnrede?: string` (leer = automatisch aus Ansprechpartner/Kunde)

Beide werden wie `objektnameImEmpfaenger` als JSON in den bestehenden `optionen`-Feldern von Angebot/Rechnung gespeichert — **keine DB-Migration nötig**.

### PDF-Rendering (Frontend-Vorschau + Backend identisch)
- `src/lib/pdf/belegPdf.ts` und `backend/src/pdf/layout.ts`:
  - Empfängerblock: Ansprechpartner-/Personenzeile entfällt, wenn der Schalter aus ist (Firmenname + Adresse bleiben).
  - Anrede: wenn `eigeneAnrede` gefüllt ist, wird exakt dieser Text verwendet, sonst die bisherige Automatik.
- Beide Renderer werden 1:1 gleich angepasst, damit Live-Vorschau und finales PDF identisch bleiben.

### PDF-Editor (`StammdatenPanel`)
Der Abschnitt „Empfänger“ / „Ansprechpartner“ bekommt:
- Switch **„Ansprechpartner im Empfängerblock anzeigen“** + kurzer Erklärtext.
- Switch **„Objektname im Empfängerblock anzeigen“** + Erklärtext (nur sichtbar, wenn ein Objekt gewählt ist) — die Checkbox im Tab „Texte & Optionen“ entfällt, damit es nur eine Stelle gibt.
- Feld **„Anrede (individuell)“** mit Platzhalter der automatisch berechneten Anrede und Button „Zurücksetzen“ (leert das Feld → wieder automatisch).
- Live-Vorschau aktualisiert sich wie gewohnt über den bestehenden Autosave/Draft-Pfad.

### Angebot/Rechnung erstellen (`AngebotForm`, `RechnungForm`)
- Die beiden Empfänger-Schalter und das Anrede-Feld wandern aus dem generischen „Optionen“-Block direkt unter die Kunden-/Objektauswahl (Objekt-Schalter erscheint erst, sobald ein Objekt gewählt ist).
- `OptionenBlock` behält nur die inhaltlichen Optionen (Material, Standard-Anschreiben, Intro/Outro, Dauerauftrag).

### Update-Sicherheit
- Vor Abschluss: Root- und `backend/`-Lockfile auf Sync prüfen (`npm ci --dry-run`), damit `mcc-update` fehlerfrei durchläuft.
- Typecheck + bestehende Backend-Tests (`belege`, `pdf`) laufen lassen.

## Technische Details
- Betroffene Dateien: `src/lib/api/types.ts`, `src/lib/pdf/belegPdf.ts`, `backend/src/pdf/layout.ts`, `src/components/pdf-editor/panels/StammdatenPanel.tsx`, `src/components/pdf-editor/panels/TexteOptionenPanel.tsx`, `src/components/forms/OptionenBlock.tsx`, `AngebotForm.tsx`, `RechnungForm.tsx`.
- Defaults per `?? true` bzw. `?? ""`, damit bestehende Belege unverändert aussehen.
- Der PDF-Cache-Key enthält bereits die `optionen`, daher wird die Vorschau bei Änderung automatisch neu gerendert.
