# Alle Datumsangaben im PDF-Editor nachträglich ändern

Im Editor („PDF bearbeiten“) kannst du heute nur Rechnungsdatum, Fälligkeit und „Gültig bis“ ändern. Das Angebotsdatum ist fest das Erstellungsdatum, und Leistungszeitraum / Leistungsmonat lassen sich dort gar nicht einstellen. Das wird geändert. Das gilt für alle Belege, egal ob Entwurf, versendet oder bezahlt.

## Was sich für dich ändert

1. **Angebot:** neue Felder „Angebotsdatum“ (Vorgabe: Erstellungstag), „Gültig bis“, „Leistung von / bis“.
2. **Rechnung:** „Rechnungsdatum“, „Fälligkeit“, „Leistungsmonat“, „Leistung von / bis“.
3. Alle Felder stehen gesammelt im Tab „Stammdaten“ unter „Datum“. Ein Klick auf den Datumsblock oben rechts in der PDF-Vorschau öffnet sie direkt.
4. **Komfort:** Änderst du das Rechnungsdatum, verschiebt sich die Fälligkeit um das Zahlungsziel mit. Du kannst sie danach trotzdem noch von Hand ändern. „Zurück auf heute“ steht als kleiner Knopf daneben.
5. **Überall gleich:** Das geänderte Datum erscheint im PDF, in der Vorschau, in Listen und Detailseiten, bei den E-Mail-Platzhaltern und im Monatsfilter. Bei versendeten Belegen wird die Datei in Google Drive automatisch ersetzt (so wie schon bei anderen Änderungen).
6. **Belegnummer bleibt unverändert.** Sie wird beim Datumswechsel nicht neu vergeben, damit bereits verschickte Nummern gültig bleiben.

## Technische Umsetzung

**Frontend**
- `StammdatenPanel.tsx`: Abschnitt „Datum“ mit `DateInput` für alle Felder oben. `leistungsmonat` als Monatsfeld (`YYYY-MM`). Bei Rechnungen: Fälligkeit = rechnungsdatum + `kunde.zahlungszielTage`, solange die Fälligkeit nicht von Hand gesetzt wurde.
- `HotspotInlineEditor.tsx`: Das Feld `meta` bekommt echte Datumsfelder statt nur des „Erweitert“-Hinweises.
- `src/lib/pdf/belegPdf.ts`: Angebot druckt `optionen.angebotsdatum ?? erstelltAm`. Eine gemeinsame Hilfsfunktion `angebotsdatumVon(a)` in `src/lib/belege/` wird in Listen, Detailseite, E-Mail-Platzhaltern und Zeitraumfilter statt `erstelltAm` genutzt.
- Einfache Plausibilitätsprüfung: Fälligkeit nicht vor dem Rechnungsdatum, „bis“ nicht vor „von“. Bei einem Fehler erscheint ein Hinweis und es wird nicht gespeichert.

**Backend**
- Keine Migration: Das Angebotsdatum wird im bestehenden JSON-Feld `optionen` gespeichert (`angebotsdatum?: ISODate`). `BelegOptionen` wird in beiden Typdateien und im Validierungsschema erweitert.
- `backend/src/pdf/belegPdf.server.ts` bzw. das Layout nutzen dieselbe Fallback-Regel. Der PDF-Cache wird bereits über `onBelegMutated` verworfen, der Drive-Ersatz läuft über den vorhandenen Auto-Enqueue.
- Drive-Dateiname und E-Mail-Platzhalter `{datum}` nutzen das neue Angebotsdatum.
- Rechnungs-Update: Die Felder `rechnungsdatum`, `faelligkeitsdatum`, `leistungsmonat`, `einsatzVon/Bis` sind schon änderbar. Es kommt nur eine ISO-Formatprüfung dazu.
- `localPreviewData.ts` bekommt dieselbe Logik.

**Prüfung**
- Neuer Backend-Test: Angebotsdatum und Rechnungsdatum an einem versendeten Beleg ändern. Erwartet: Das PDF enthält das neue Datum, die Belegnummer ist unverändert, es gibt genau einen Drive-Upload. Ein ungültiges Datum wird abgelehnt.
- Danach Typprüfung, Lint und die vorhandenen Suiten.
- Browser-Durchlauf: Datum im Editor ändern, dann in der Vorschau, auf der Detailseite und in der Liste kontrollieren.

**Update-Sicherheit**
- Keine Migration und keine Änderung an `package.json`, Lockfiles, `update.sh` oder am Datenverzeichnis. Alte Angebote ohne eigenes Datum zeigen weiter ihr Erstellungsdatum.
