# Angebote netto, Umsatzsteuer-Übersicht, Optionen aufräumen

## 1. Angebote: nur Nettopreise

- In der PDF-Tabelle eines Angebots entfallen die Zeilen „Zzgl. gesetzlicher Mehrwertsteuer 19 %" und „Gesamtbetrag inkl. MwSt.". Stattdessen steht eine Zeile: **Gesamtbetrag (netto)**.
- Rechnungen bleiben unverändert (Netto + MwSt + Brutto).
- In der Angebotsliste zeigt die Spalte „Summe" ebenfalls den Nettobetrag, damit Liste und PDF identisch sind.
- Gilt für beide PDF-Wege: die Vorschau/den Editor im Browser und die auf dem Pi erzeugte Datei (E-Mail, Drive).

## 2. Angebotsseite: Kachel „Offenes Volumen" entfernen

Die Kachelzeile besteht dann aus Gesamt / Entwürfe / Versendet.

## 3. Rechnungsseite: Umsatzsteuer des gewählten Monats

- Neue Kachel **„Umsatzsteuer (Zeitraum)"**: Summe der Steueranteile aller Rechnungen, die im oben gewählten Jahr/Monat liegen (gleiche Filterlogik wie die Liste, ohne Status-/Suchfilter).
- Untertitel zeigt den Zeitraum und die Anzahl der Rechnungen, z. B. „Juni 2026 · 12 Rechnungen".
- Stornierte Rechnungen zählen nicht mit.
- Berechnung positionsgenau (auch Pauschalpositionen, Positionsrabatt, Gesamtrabatt, gemischte Steuersätze) — identisch zur Rechnungs-PDF, damit die Zahl gegen das Finanzamt prüfbar ist.

## 4. Option „Reinigungsmittel & Werkzeuge" nur noch beim Angebot

- Beim Erstellen und Bearbeiten einer **Rechnung** verschwindet der Schalter samt Hinweistext; der Standardsatz wird dort nicht mehr eingefügt.
- Beim **Angebot** bleibt der Schalter, weiterhin standardmäßig aktiv.

## 5. Fehlender Satz im fertigen Angebot

Ursache ist bestätigt: Das auf dem Pi erzeugte Angebots-PDF wertet die Option gar nicht aus — nur die Vorschau im PDF-Editor tut das. Deshalb fehlt der Satz nach dem Erstellen und erscheint nur im Editor.
Fix: Der Pi-Generator übernimmt dieselbe Logik wie die Vorschau, sodass der Satz „Zugunsten der Reinigung werden Reinigungswerkzeuge und Reinigungsmittel von uns zur Verfügung gestellt." dauerhaft im Angebot steht.

## Technische Umsetzung

- `src/lib/pdf/belegPdf.ts` + `backend/src/pdf/layout.ts`: `leistungstabelle`/`buildDoc` erhalten ein Flag `nurNetto`; Angebot rendert nur die Netto-Summenzeile.
- `backend/src/pdf/layout.ts`: `angebotDocDef` liest `optionen.materialBereitgestellt` (Default `true`) und übergibt es an `defaultOutroAngebot`; `rechnungDocDef` verwendet den Materialsatz nicht mehr.
- `src/lib/pdf/belegPdf.ts`: Materialsatz aus `defaultOutroRechnung`/`generateRechnungPdf` entfernen.
- `src/components/forms/OptionenBlock.tsx`: neues Prop `zeigeMaterial` (Default `true`); `RechnungForm.tsx` setzt es auf `false` und sendet das Feld nicht mehr. `TexteOptionenPanel.tsx` blendet den Schalter je nach Belegart aus.
- `src/routes/angebote.tsx`: `summe()` ohne Steuer, KPI-Kachel „Offenes Volumen" entfernen.
- `src/routes/rechnungen.tsx`: neue Kachel mit `steuerImZeitraum` (nutzt `passtInZeitraum` auf `rechnungsdatum`).
- Tests: `backend/test/belege.spec.ts`/`pdf.spec.ts` um Fälle erweitern — Angebots-PDF ohne MwSt-Zeile, Angebots-Outro mit Materialsatz, Rechnungs-Outro ohne. Zusätzlich Unit-Test für die Umsatzsteuer-Summe.
- Keine Änderungen an `package.json`/Lockfiles, damit `mcc-update` fehlerfrei bleibt; abschließend Typecheck + Testlauf.
