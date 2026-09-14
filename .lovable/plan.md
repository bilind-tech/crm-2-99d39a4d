# Durchlaufende Belegnummern + Monatsfilter beim Öffnen

## Was sich ändert

**1. Belegnummer läuft pro Kunde durch**

Heute startet der Zähler bei jedem Kunden jeden Monat wieder bei 01. Künftig zählt er pro Kunde einfach weiter — über Monats- und Jahresgrenzen hinweg.

- Format bleibt exakt gleich: `GFU0926/13` (Kürzel + Monat/Jahr des Belegs + laufende Nummer).
- Monat/Jahr zeigen weiterhin den Belegmonat an, sie steuern aber nicht mehr den Zähler.
- Rechnungen und Angebote behalten je einen eigenen durchlaufenden Zähler.
- Beispiel: letzte Rechnung im September `GFU0926/13` → erste Rechnung im Oktober `GFU1026/14`.

**2. Bestehende Belege**

Bestehende Nummern bleiben unverändert. Beim Update wird pro Kunde und Belegart die höchste bisher vergebene Nummer ermittelt; der neue durchlaufende Zähler startet genau darüber. Es kann also keine Nummer doppelt vergeben werden.

**3. „Nächste Nummer" in den Stammdaten**

Das Feld beim Kunden setzt jetzt den durchlaufenden Zähler (nicht mehr den Zähler des aktuellen Monats). Die Vorschau in Rechnungs-/Angebotsformular zeigt entsprechend die nächste echte Nummer.

**4. Monatsfilter beim Öffnen**

Die Seiten Rechnungen und Angebote starten mit dem aktuellen Monat und dem aktuellen Jahr vorausgewählt (bisher: ganzes Jahr). Ein Klick auf „Alle" bzw. das Zurücksetzen funktioniert unverändert. Andere Seiten bleiben wie bisher.

## Technische Umsetzung

- Neue Migration `043_belegnummer_durchlaufend.sql`: Zählerstände pro `(kunde_id, belegart)` zusammenführen. Die Spalte `periode` bleibt bestehen und bekommt den festen Wert `ALL`, damit das Schema additiv und rollback-fähig bleibt. Neuer Stand = `MAX(bisherige Zählerstände, höchste NN aus angebot/rechnung + 1)`. Reine Datenkonsolidierung, keine Belegdaten werden angefasst.
- `backend/src/kunden/nummern.ts`: `nextBelegNummer`, `bumpBelegNummerMindestens`, `setBelegNummerStart`, `peekBelegNummer` nutzen intern die feste Periode `ALL`; Signaturen bleiben kompatibel.
- `backend/src/belege/belegnummer.ts`: `vergebeBelegnummer` zieht die NN aus dem durchlaufenden Zähler, formatiert aber weiter mit `periodeMMYY(bezugsdatum)`. Kollisions-/Reservierungs-Prüfung und Retry bleiben unverändert.
- `importScanZaehler()` gruppiert nur noch nach `kunde_id + belegart` (Periode wird beim Parsen ignoriert), bleibt idempotent und läuft weiter beim Boot.
- `backend/src/routes/stammdaten.ts`: `GET /kunden/:id/zaehler` liefert weiterhin `periode` (aktuelles MMYY für die Anzeige) und den durchlaufenden `naechsterStart`; PATCH/POST setzen den durchlaufenden Zähler.
- Frontend: `src/components/filters/ZeitraumFilter.tsx` bekommt `zeitraumAktuellerMonat()`; `src/routes/rechnungen.tsx` und `src/routes/angebote.tsx` verwenden diesen Default.

## Update-Sicherheit

- Nur eine additive Migration, keine Tabelle wird gelöscht, keine Beleg- oder Kundendaten verändert.
- Keine neuen Pakete, keine Änderung an `update.sh` oder Lock-Dateien.
- Migration ist idempotent und läuft bei jedem Update automatisch mit.

## Prüfung

- Backend-Test: Belege über einen Monatswechsel hinweg anlegen → Nummern laufen durch (`…0926/13` → `…1026/14`), keine Dopplung.
- Test für Bestandsdaten: Migration auf einer Datenbank mit Nummern aus mehreren Monaten → nächster Zähler liegt über der höchsten vorhandenen Nummer.
- Bestehende Tests (`belege.spec.ts`, `kunden-zaehler.spec.ts`) laufen grün.
- Browser-Test: Rechnungen und Angebote öffnen sich im aktuellen Monat; Nummernvorschau im Formular stimmt mit der gespeicherten Nummer und der Anzeige im PDF überein.
