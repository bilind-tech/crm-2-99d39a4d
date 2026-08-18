# Übergabe-/Abnahmeprotokoll überarbeiten

## Ziel
Das Übergabe-/Abnahmeprotokoll bekommt eine klarere Struktur: keine Uhrzeit, Auftragsadresse oben, Bemerkungen mit Mängel-Ankreuzfeldern, kein Ergebnis-Block, ein neuer Abschnitt „Leistung des Dienstleisters" mit Frau/Herr-Auswahl — und alle Texte bleiben im PDF-Editor frei änderbar.

## Änderungen im Detail

### 1. Uhrzeit entfernen
- Uhrzeit-Feld verschwindet aus: Erstellen-Dialog, Editor-Panel, Hotspot-Editor und aus der Meta-Box im PDF.
- Nur beim Übergabe-/Abnahmeprotokoll; Schlüsselprotokoll bleibt unverändert.
- Die Datenbankspalte `uhrzeit` bleibt bestehen (Default „12:00"), damit bestehende Protokolle und das Update auf dem Pi ohne Migration und ohne Fehler durchlaufen.

### 2. Neue Reihenfolge der Blöcke im PDF
1. Auftragsadresse
2. Leistungsumfang
3. Bemerkungen (mit Mängel-Ankreuzfeldern)
4. Leistung des Dienstleisters
5. Unterschriften

Der Block „Ergebnis" entfällt komplett.

### 3. Auftragsadresse
- Neues mehrzeiliges Feld „Auftragsadresse".
- Beim Erstellen und im Editor gibt es einen Schalter „Adresse vom Kunden/Objekt übernehmen" — dann wird die vorhandene Adresse automatisch eingesetzt; sonst frei schreibbar.

### 4. Bemerkungen statt „Mängel / Bemerkungen"
- Überschrift heißt nur noch „Bemerkungen".
- Darunter zwei Ankreuzkästchen (im PDF als ☐/☒ gerendert, in der UI als Auswahl):
  - „Es liegen keine Mängel vor"
  - „Es liegen folgende Mängel vor:" — mit darunterliegendem Textfeld für die Beschreibung.
- Ist „keine Mängel" gewählt, bleibt das Mängel-Textfeld im PDF als leere Schreiblinie stehen (handschriftlich ausfüllbar).

### 5. Leistung des Dienstleisters
Neuer Abschnitt mit Text:

```text
Es wurden gemeinsam mit  ☐ Frau  ☒ Herr  ______________________
handschriftlich im Augenschein genommen.

Die Leistung wird mit den oben genannten Vorbehalten abgenommen.
```

- Frau/Herr wird in der UI ausgewählt, der Name steht auf einer Unterschriftslinie.
- Beide Sätze sind Standardtexte und im Editor frei überschreibbar.

### 6. Mehr Abstand zwischen den Blöcken
Der vertikale Abstand zwischen Leistungsumfang, Bemerkungen und den folgenden Blöcken wird deutlich erhöht, damit die Abschnitte optisch klar getrennt sind.

### 7. Alles im PDF-Editor bearbeitbar
Im Protokoll-Editor (Panel + Klick-auf-PDF-Hotspots) lassen sich ändern: Auftragsadresse, Leistungsumfang, Bemerkungen inkl. Mängel-Auswahl, Anrede und Name, sowie die beiden Standardsätze und alle Abschnittsüberschriften.

## Technische Umsetzung
- `src/lib/api/types.ts`: `UebergabeProtokoll` erhält `auftragsAdresse`, `adresseVomKunden`, `maengelVorhanden`, `maengelText`, `abnahmeAnrede` ("frau" | "herr"), `abnahmeName`; `ProtokollOptionen.sektionsTitel` bekommt die Schlüssel `adresse` und `dienstleister`, plus optionale Textbausteine `dienstleisterSatz` und `abnahmeSatz`. `ohneVorbehalt` bleibt für Abwärtskompatibilität erhalten, wird aber nicht mehr im PDF genutzt.
- Neue Felder liegen in `daten_json` — keine SQL-Migration, keine Änderung an `backend/src/protokolle/repo.ts` nötig (kind-spezifische Daten werden dort bereits generisch gespeichert). Fallbacks für Altdatensätze im Renderer.
- `src/lib/pdf/werkzeugePdf.ts`: `UebergabeprotokollData` und `generateUebergabeprotokollPdf` umbauen (Uhrzeit raus, neue Blockreihenfolge, Checkbox-Glyphen ☐/☒ mit Roboto, Schreiblinien, größere Blockabstände, Hotspot-IDs `adresse`, `leistungsumfang`, `bemerkungen`, `dienstleister`).
- `src/components/forms/UebergabeProtokollForm.tsx`: Uhrzeit raus, Auftragsadresse + Übernahme-Schalter, Mängel-Auswahl, Anrede/Name.
- `src/components/protokoll-editor/UebergabePanel.tsx` und `ProtokollHotspotEditor.tsx`: gleiche Felder plus Textbaustein-Overrides.
- Lockfiles bleiben unangetastet und synchron, damit `mcc-update` fehlerfrei durchläuft.

## Prüfung
Test-PDF erzeugen, als Bild rendern und visuell auf Reihenfolge, Abstände, Kästchen und Linien prüfen; Typecheck und bestehende Tests laufen lassen.
