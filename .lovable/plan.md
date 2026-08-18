# Übergabeprotokoll: sinnvoller Satz, Kästchen immer leer

## Was geändert wird

### 1. Satz beim Dienstleister
Statt „Es wurden gemeinsam mit ☐ Frau ☐ Herr ______ / handschriftlich im Augenschein genommen."
lautet die Zeile künftig:

```text
Die Leistung des Dienstleisters wurde gemeinsam mit  ☐ Frau  ☐ Herr  ______________________
im Augenschein genommen.
```

Der Standardsatz-Baustein wird entsprechend auf „im Augenschein genommen." geändert; er bleibt
im Editor frei überschreibbar.

### 2. Kästchen sind nie angekreuzt
Alle Ankreuzkästchen im PDF (keine Mängel / Mängel vorhanden, Frau / Herr) werden immer leer
gezeichnet — sie sind zum handschriftlichen Ankreuzen gedacht.

### 3. Keine Ankreuz-Auswahl mehr in der Software
- Erstellen-Dialog: Auswahl „Mängel" und „Anrede (Augenschein)" entfallen.
- Editor-Seitenpanel: Mängel-Radiobuttons und Frau/Herr-Radiobuttons entfallen.
- Klick-Editor in der PDF-Vorschau: dieselben Auswahlfelder entfallen.
- Bleibt erhalten: das Namensfeld (Augenschein) und alle Textbausteine.

### 4. Mängelbereich
Unter „Es liegen folgende Mängel vor:" steht immer genau eine leere Schreiblinie zum
handschriftlichen Eintrag. Das bisherige Mängel-Textfeld entfällt aus der Oberfläche.

## Technische Umsetzung
- `src/lib/pdf/werkzeugePdf.ts`: `checkboxCanvas` immer ohne X rendern (checked-Parameter entfällt
  bzw. wird ignoriert), Dienstleister-Block auf den neuen Satzbau umbauen,
  `DEFAULT_DIENSTLEISTER_SATZ` auf „im Augenschein genommen." setzen, Mängelbereich fix auf eine
  Schreiblinie.
- `src/components/forms/UebergabeProtokollForm.tsx`, `src/components/protokoll-editor/UebergabePanel.tsx`,
  `src/components/protokoll-editor/ProtokollHotspotEditor.tsx`: Mängel- und Anrede-Auswahl entfernen.
- Datenfelder `maengelVorhanden`, `maengelText`, `abnahmeAnrede` bleiben im Typ erhalten (Altdaten),
  werden aber nicht mehr gesetzt und nicht mehr fürs Ankreuzen ausgewertet.
- Keine Backend- oder Datenbankänderung; Lockfiles bleiben unverändert.

## Prüfung
Test-PDF erzeugen, als Bild rendern und prüfen: eine Seite, alle vier Kästchen leer,
Satz vollständig lesbar, eine Schreiblinie bei Mängeln. Zusätzlich Typecheck.

## Nachtrag (Kopfbereich & Überschrift)

### 5. Überschrift
„ÜBERGABE- UND ABNAHMEPROTOKOLL" ohne Unterstreichung, etwas größer (ca. +3 pt gegenüber
jetzt) und mit mehr Abstand nach oben, damit sie deutlich unter dem Logo sitzt.

### 6. Absenderzeile immer einzeilig
Die kleine unterstrichene Absenderzeile oben links (Firmenname · Straße · PLZ Ort) darf nie
umbrechen:
- Logo etwas kleiner (`fit` von 260x110 auf ca. 210x88) und leicht nach rechts/oben gesetzt,
  damit links mehr Platz entsteht.
- Die Absenderspalte wird breiter (rechte Platzhalterspalte entsprechend schmaler) und auf
  `noWrap` gestellt; bei sehr langen Firmendaten wird die Schriftgröße automatisch von 8 auf bis
  zu 6,5 pt reduziert, statt in eine zweite Zeile zu rutschen.
- Gilt einheitlich für alle PDFs aus `werkzeugePdf.ts` (Protokolle) — Rechnungen/Angebote nutzen
  denselben Header-Aufbau in `belegPdf.ts`/Backend-Layout und werden gleich mitgezogen.
