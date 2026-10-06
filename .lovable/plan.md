# Urlaubsantrag: größeres Logo, sichere Speicherung überall

## 1. PDF-Kopf
- Das Logo oben rechts wird deutlich größer, etwa so groß wie auf deiner Papiervorlage.
- Der zusätzliche Text „MYCLEANCENTER GmbH / Gebäude- und Hausmeisterservice“ unter dem Logo wird entfernt. Er steht bereits im Logo.
- Der Rest bleibt unverändert, ebenso die Fußzeile ganz unten.

## 2. Speichern: System, Dokumente, Google Drive
Ein Klick auf **Speichern** erledigt nacheinander:
1. **Datenbank:** Der Antrag wird gespeichert (Mitarbeiter, von, bis, Anzahl Tage).
2. **Stundenzettel:** Derselbe Eintrag erscheint sofort bei Stundenzettel → „Urlaub & Krank“ für diesen Mitarbeiter.
3. **Dokumente:** Das PDF wird unter Dokumente → Urlaubsanträge/{Jahr} abgelegt. Beim erneuten Speichern wird die alte Fassung ersetzt, damit es keine Doppelungen gibt.
4. **Google Drive:** Das abgelegte PDF geht automatisch in Drive, über den bestehenden Dokumente-Weg (Ordner Urlaubsanträge/{Jahr}). Löschen entfernt es auch dort.

Sichtbarkeit in der Liste „Gespeicherte Urlaubsanträge“:
- Jeder Antrag zeigt einen kleinen Status: „In Dokumente“ und „In Drive“ bzw. „Drive ausstehend“.
- Ein Knopf öffnet das PDF direkt aus Dokumente.
- Ältere Einträge ohne abgelegtes PDF zeigen „PDF fehlt“. Ein Klick auf „Erneut ablegen“ holt das nach.

## 3. Stundenzettel
- Beim Erstellen oder Neu-Generieren eines Stundenzettels stehen die Urlaubstage automatisch als „Urlaub“ drin, mit den normalen Tagesstunden. Das Monatsziel wird erreicht.
- Bereits erstellte Stundenzettel des betroffenen Monats werden beim Speichern des Antrags sofort angepasst, nur an den Urlaubstagen.

## Technische Details
- `generateUrlaubsantragPdf`: `firmenSchriftzug` und die Zusatzzeile werden entfernt. Logo `fit` etwa 190×120, rechtsbündig. Ohne Logo wird nur der Firmenname gezeigt.
- Neuer Endpunkt `GET /abwesenheiten/:id/antrag-status` liefert `{ dokumentId, dateiname, driveStatus }`. Das Dokument wird über den vorhandenen Tag `[antrag:…]` in `beschreibung` gefunden, der Drive-Status kommt aus der bestehenden Drive-Upload-Tabelle bzw. der `drive_file_id` des Dokuments. Die Vorschau bekommt einen gleichen Spiegel.
- Kein neuer Datenbank-Umbau nötig. Datenbank, Dokument-Ablage und Drive-Auto-Upload über `dokument:erstellt`/`dokument:geloescht` sind schon vorhanden. Geprüft wird, dass sie für Urlaubsanträge wirklich greifen.
- Prüfung: PDF-Seitenbild (großes Logo, kein Doppeltext). Playwright: Antrag speichern, dann erscheint er bei „Urlaub & Krank“, die Statusanzeige ist in der Liste sichtbar und ein Stundenzettel für den Monat zeigt die Urlaubstage. Backend-Test für Ablage, Ersetzen und Löschen samt Drive-Ereignissen.
