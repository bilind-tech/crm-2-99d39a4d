# Stundenzettel: echte Arbeitszeiten und Stundenziele für alle Mitarbeiter

## So kommen die Daten ins Programm
Die Mitarbeiter sind in der Datenbank auf deinem Pi gespeichert. Von hier aus kann ich sie nicht direkt ändern.
Außerdem darf ein Update laut unserer Regel keine Daten verändern.

Deshalb gibt es auf der Stundenzettel-Seite einen neuen Knopf **„Zeiten aus Papier-Stundenzetteln übernehmen"**. So funktioniert er:
- Vor dem Übernehmen zeigt er eine Vorschau: wer geändert, wer neu angelegt und wer gelöscht wird.
- Er gleicht die Mitarbeiter über den Namen ab. Vorhandene Mitarbeiter werden aktualisiert, es entstehen keine doppelten.
- **Yusuf Mohammed wird gelöscht**, samt seiner Stundenzettel. Vorher kommt eine Rückfrage.
- **Bilind Mohammed** wird neu angelegt.
- Du löst das nach dem Update einmal selbst aus. Ein erneutes Drücken ändert nichts mehr.

## Ausgewertete Zeiten (neuester Monat = Stundenziel)

| Mitarbeiter | Monat | Feste Zeiten | Ziel |
|---|---|---|---|
| Aland Mohammed | Jan 2026 | Di + Mi 16:00–20:00, Sa 09:00–13:00 | 40 |
| Bilind Mohammed (neu) | – | genau wie Aland | 40 |
| Yasin Mohammed | Jan 2026 | Mo 18:00–20:00, Fr 18:00–21:00, Sa 10:00–14:00 | 40 |
| Haifa Mohammed | Jan 2026 | Mo + Do 08:30–12:30 | 37 |
| Hava Kurt | Jan 2026 | Mo + Mi 08:00–10:00 und 17:00–19:00, Di 08:00–10:00 und 15:00–17:00, Do + Fr 08:00–10:00, Sa 10:00–12:00 | 85 |
| Salim Darweesh | Juni 2026 | Di, Mi, Fr 08:30–17:30 (Pause 12:30–13:30), Do 11:00–15:00 | 120 |
| Abel Habtemikael | Mai 2026 | Mo–Fr 15:30–17:30 | 40 |
| Yonas Gedion Kahsaye | Mai 2026 | Di–Do 16:00–18:00 | 30 |

Die Stunden kommen aus der Summenzeile der Zettel. Zur Kontrolle habe ich die Einzeltage nachgerechnet, und sie ergeben dieselbe Summe.
Wenn ein Monat mehr oder weniger Arbeitstage hat, gleicht der bestehende Zielausgleich das automatisch aus (nur volle Stunden, keine Wochenenden oder Feiertage).

## Bitte kurz prüfen
- **Aland:** Seine Samstage wechseln zwischen 4 und 8 Stunden. Ich nehme den Samstag mit 4 Stunden als festen Tag, den Rest verteilt der Zielausgleich.
- **Bilind:** Du schreibst „Minijobber 40 Stunden Woche". Ich setze **40 Stunden im Monat** wie bei Aland, nicht 40 pro Woche.
- **Hava:** Ihre Zeiten sind unregelmäßig. Die Wochentage oben sind die häufigsten, die Summe 85 ist das Ziel.

## Technik
- Neue Daten in der bestehenden Vorlagen-Datei für den Mitarbeiter-Import (Wochentagszeiten mit zweitem Block, Stundenziel, Liste der zu entfernenden Namen).
- Der Import-Knopf nutzt die vorhandenen Funktionen zum Anlegen, Ändern und Löschen von Mitarbeitern.
- Keine Datenbank-Änderung, keine Änderung an den Update-Dateien. Das Update läuft normal.
- Nach dem Umbau kontrolliere ich im Browser, dass die Zielsummen für einen Beispielmonat stimmen.
