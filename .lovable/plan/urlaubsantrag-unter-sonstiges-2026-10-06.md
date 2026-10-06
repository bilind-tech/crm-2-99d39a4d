# Urlaubsantrag unter „Sonstiges“

## Was du bekommst
- Unter **Sonstiges** gibt es ein neues Werkzeug **„Urlaubsantrag“**.
- Die Eingabe ist einfach: Mitarbeiter auswählen (aus den Stundenzettel-Mitarbeitern), „Urlaub von“ und „bis“ eintippen oder im Kalender wählen. Die **Anzahl Urlaubstage** wird automatisch berechnet, Wochenenden und NRW-Feiertage zählen nicht mit. Du kannst die Zahl auch selbst ändern.
- Links ist das Formular, rechts eine Live-Vorschau des PDFs. Darunter gibt es die Knöpfe Speichern, Drucken und Herunterladen.
- **Gespeichert:** Jeder Antrag erscheint in einer Liste „Gespeicherte Urlaubsanträge“ (Mitarbeiter, Zeitraum, Tage). Du kannst ihn öffnen, ändern, erneut drucken oder löschen.
- **Verknüpft mit dem Stundenzettel:** Ein gespeicherter Antrag trägt den Urlaub automatisch bei „Urlaub & Krank“ ein. Er zählt dann mit den normalen Tagesstunden im Stundenzettel und im Stundenzettel-PDF. Wird der Antrag gelöscht, wird auch der Urlaub wieder entfernt.
- Das PDF wird zusätzlich unter Dokumente → `Urlaubsanträge/{Jahr}` abgelegt.

## PDF-Design (wie deine Vorlage)
- Oben rechts das Logo mit „MYCLEANCENTER GmbH / Gebäude- und Hausmeisterservice“.
- Links die Überschrift „Urlaubsantrag“, **deutlich kleiner als auf dem Foto**, mit kurzer dünner Linie darunter.
- Dann folgen:
  - „Name des Mitarbeiters / der Mitarbeiterin:“ mit dem Namen auf einer Linie
  - „Urlaub von: ___ bis: ___“
  - „Anzahl Urlaubstage: ___“
  - der Bestätigungssatz „Hiermit wird bestätigt, dass der/die oben genannte Mitarbeiter/in den beantragten Urlaub im angegebenen Zeitraum genommen hat.“
  - zwei Unterschriftslinien „Datum, Unterschrift, Arbeitnehmer/in“ und „Datum, Unterschrift, Arbeitgeber“
- **Neu ganz unten:** die gleiche vierteilige Firmen-Fußzeile wie bei Rechnungen (Adresse, Bankverbindung, Kontakt, Register).
- Eine Seite A4, ruhige Abstände wie auf der Vorlage.

## Technische Details
- Gespeichert wird in der vorhandenen Abwesenheiten-Tabelle (`stz_abwesenheit`, art = urlaub). Damit ist keine neue Datenbank-Tabelle nötig, Updates bleiben unkritisch. Die Spalte `notiz` bleibt frei. Ein eigener Tage-Override kommt per additiver Migration `046`: neue Spalte `tage_override REAL NULL`. Die Werkzeug-Liste ist ein gefilterter Blick auf `art = urlaub`.
- Neues Werkzeug in `src/lib/werkzeuge/registry.ts` (Gruppe „Sonstiges“, Route `/werkzeuge/urlaubsantrag`) und neue Datei `src/routes/werkzeuge.urlaubsantrag.tsx` mit eigenem `head()`.
- PDF: `generateUrlaubsantragPdf` in `src/lib/pdf/werkzeugePdf.ts`. Logo und Footer nutzen die vorhandenen `header`/`footer`-Helfer der Werkzeug-PDFs. Die Fußzeile wird an die Rechnungs-Fußzeile angeglichen: „Bankverbindung“, Blöcke linksbündig. Titel 16 pt.
- Arbeitstage-Zählung: geteilte Funktion mit den NRW-Feiertagen und den eigenen Feiertagen aus dem Stundenzettel-Modul. Die Browser-Vorschau zählt genauso.
- Ablage in Dokumente über die vorhandene Upload-Pipeline. Wird ein Antrag erneut gespeichert, ersetzt das die vorige Fassung, damit keine Doppelungen entstehen.
- Prüfung: echte PDF-Seitenbilder (kurzer/langer Name, Monatswechsel, ohne Logo) ansehen. In Playwright Datum tippen, speichern, die Liste und „Urlaub & Krank“ prüfen. Tests und Build grün.
