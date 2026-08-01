## Ziel
Drei Anpassungen an Angebot- und Rechnungs-PDFs (und den zugehörigen Formularen).

### 1. Leistungstext nicht mehr automatisch fett
Aktuell wird in `beschreibungBlock()` die **erste Zeile** einer Leistungsbeschreibung immer fett gesetzt (`bold: true`) — sowohl im Frontend (`src/lib/pdf/belegPdf.ts`) als auch im Backend (`backend/src/pdf/layout.ts`).

Änderung: `bold` entfällt, alle Zeilen werden normal gerendert. Aufzählungspunkte (`•`, `-`, `*`) und Zeilenumbrüche bleiben unverändert. Fett gibt es dann nur noch, wenn es explizit über die Formatierung gesetzt wird.

### 2. Switch „Objektname im Empfängerblock"
Heute wird der Objektname fest in den Empfängerblock oben links eingefügt (`kundeAdresse()`), sobald ein Objekt ausgewählt ist.

Neu: eine schaltbare Option, **standardmäßig eingeschaltet**.
- Gespeichert im vorhandenen JSON-Feld `optionen` des Belegs (`objektnameImEmpfaenger`) — **keine Datenbank-Migration nötig**, alte Belege ohne das Feld gelten als „an".
- Sichtbar an zwei Stellen:
  - Rechnung/Angebot erstellen & bearbeiten → Optionen-Block, direkt bei den anderen Schaltern
  - PDF-Editor → Tab „Texte/Optionen"
- Kurzer Erklärtext darunter, z. B.: *„Zeigt den Objektnamen (z. B. »Bürogebäude Nord«) oben links im Empfängerblock zwischen Kundenname und Adresse an. Die Einsatzadresse des Objekts bleibt unabhängig davon erhalten."*
- Der Switch erscheint nur, wenn überhaupt ein Objekt am Beleg hängt (sonst ohne Wirkung).
- Aus = nur Kundenname/Ansprechpartner + Adresse, an = wie bisher.

Wirksam in beiden PDF-Pfaden (Live-Vorschau im Editor **und** Backend-PDF), damit Vorschau und finales PDF identisch bleiben.

### 3. Spalten „Abrechnungsart" / „Preis (netto)" vertikal mittig
Aktuell kleben die Werte am oberen Rand der Zeile, während die Leistungsbeschreibung mehrere Zeilen hoch sein kann.

pdfmake kennt keine echte vertikale Zentrierung in Tabellenzellen. Umsetzung deshalb über einen berechneten Oberrand: Aus der Beschreibungsbreite und dem Text wird die Zeilenanzahl der linken Spalte geschätzt und daraus ein `margin-top` für die Zellen „Stunden", „Abrechnungsart" und „Preis (netto)" abgeleitet, sodass sie optisch mittig in der Zeile stehen. Bei einzeiligen Positionen ändert sich nichts.

Die gleiche Berechnung kommt in Frontend- und Backend-Renderer, damit Vorschau und Ausgabe deckungsgleich sind.

## Betroffene Dateien
- `src/lib/pdf/belegPdf.ts` — Beschreibung ohne Bold, Objektname-Option, vertikale Zentrierung
- `backend/src/pdf/layout.ts` — identische drei Änderungen
- `src/lib/api/types.ts` — `objektnameImEmpfaenger?: boolean` in `BelegOptionen`
- `src/components/forms/OptionenBlock.tsx` (+ Angebot-/Rechnung-Form-Anbindung) — neuer Schalter mit Erklärtext
- `src/components/pdf-editor/panels/TexteOptionenPanel.tsx` — gleicher Schalter im PDF-Editor

## Prüfung vor Abschluss
Test-PDF (Angebot + Rechnung) mit mehrzeiliger Beschreibung, Objekt an/aus, Pauschal- und Einzelposition rendern und optisch gegenchecken. Keine Migration, `mcc-update` läuft unverändert.
