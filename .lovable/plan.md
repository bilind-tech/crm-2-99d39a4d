## Ziel

1. Nach dem Generieren füllt die PDF-Vorschau den kompletten freien Bereich.
2. Alle Buttons (PDF ansehen, Drucken, Herunterladen, In Dokumente ablegen, Bearbeiten, Vorschau aktualisieren) liegen in einer Zeile ganz oben.
3. „Bearbeiten" öffnet die Tabelle über den ganzen Bildschirm (statt der halben Spalte).
4. Das neu hochgeladene MYCLEANCENTER-Logo wird im Stundenzettel-PDF oben verwendet.

## Umsetzung

### Layout (`src/components/stundenzettel/StundenzettelWorkspace.tsx`)

```text
┌──────────────────────────────────────────────┐
│ Titel + Schließen                            │
├───────────┬──────────────────────────────────┤
│ Mit-      │ [Buttons in einer Zeile]         │
│ arbeiter  ├──────────────────────────────────┤
│ liste     │                                  │
│           │   PDF-Vorschau (voller Rest)     │
│           │                                  │
└───────────┴──────────────────────────────────┘
```

- Buttonleiste wird aus der linken Karte herausgezogen und als eigene Zeile über den Inhaltsbereich gelegt.
- Darunter nur noch die PDF-Vorschau — volle Breite und Höhe (kein `xl:grid-cols-2` mehr, keine Text-Zusammenfassungsspalte).
- PDF-Vorschau ist auch auf kleineren Breiten sichtbar (bisher `hidden … xl:block`).
- „Bearbeiten" schaltet nicht mehr eine Spalte um, sondern ersetzt die PDF-Vorschau durch die Tabelle über die volle Fläche (scrollbar); erneuter Klick bzw. „Bearbeiten schließen" geht zurück zur Vorschau. Nach dem Schließen wird die Vorschau automatisch aktualisiert, damit Änderungen sichtbar sind.

### Logo im Stundenzettel-PDF

- Das hochgeladene Bild wird als feste Datei ins Backend gelegt: `backend/src/pdf/assets/stundenzettel-logo.png`.
- `backend/src/pdf/stundenzettelPdf.ts` lädt dieses Bild (Base64) als Kopfbild und nutzt es anstelle des Branding-Logos; nur falls die Datei fehlt, greift wie bisher `loadLogoDataUrl()`.
- Datei wird in `backend/package.json` (files/Distribution) mitverteilt, analog zum Font-Ordner, damit sie beim Pi-Update mitkommt.
- Cache-Hash im PDF-Renderer berücksichtigt das neue Logo, damit alte gecachte PDFs nicht weiterverwendet werden.

### Hinweis

Die Rechnungen/Angebote bleiben unverändert beim Branding-Logo aus den Einstellungen — nur der Stundenzettel bekommt das fest hinterlegte Bild.
