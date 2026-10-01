# Rechnungs- und Angebots-PDFs verfeinern und sichtbare Belege gesammelt in Drive sichern

## Zielbild
- Rechnungs- und Angebots-PDFs wirken ruhiger und besser proportioniert: gleich hohe Tabellenkopf- und Summenzeilen, etwas größere Fließ- und Fußtexte, kleinere Belegüberschrift sowie ein tiefer sitzender, vollständig linksbündiger Footer.
- Angebote verwenden in der zweiten Tabellenspalte die Überschrift „Ausführungen“. Der Inhalt bleibt je Position frei editierbar – sowohl beim Erstellen als auch später im PDF-Editor.
- Auf den Listen für Rechnungen und Angebote kann der aktuell sichtbare, gefilterte Bestand mit einem Klick vollständig in Google Drive gesichert werden. Sind alle angezeigten Fassungen bereits aktuell in Drive, ist der Knopf deaktiviert.

## Umsetzung

### 1. Gemeinsames PDF-Layout für Browser und Raspberry Pi
- Die Zeilen „Zzgl. gesetzlicher Mehrwertsteuer …“ und „Gesamtbetrag inkl. MwSt.“ bei Rechnungen exakt auf die Höhe der Tabellenkopfzeile bringen.
- Die Netto-Gesamtzeile bei Angeboten auf dieselbe Höhe bringen.
- Dabei das bestehende 0,8-pt-Linienbild und 3-pt-Raster unverändert erhalten; die Höhen werden über gemeinsame, rasterkonforme Abstände festgelegt.
- „Rechnung“ und die entsprechende Angebotsüberschrift etwas kleiner setzen.
- Anrede, Einleitung sowie Rechnungsschlusstext/Zahlungsbitte sichtbar größer setzen, ohne Tabellen oder Seitenumbrüche zu überlagern.
- Footer näher an den unteren Seitenrand setzen, seine Schrift etwas vergrößern und alle vier Informationsblöcke jeweils linksbündig ausrichten.
- Genügend unteren Seitenrand für den größeren Footer reservieren, damit Hauptinhalt und Footer auch bei mehrseitigen PDFs nie kollidieren.

### 2. Angebots-Spalte „Ausführungen“
- Nur bei Angeboten die bisherige Überschrift „Abrechnungsart“ durch „Ausführungen“ ersetzen; Rechnungen behalten „Abrechnungsart“.
- Das bereits vorhandene frei editierbare Positionsfeld weiterverwenden und im Angebotsformular verständlich als „Ausführungen“ beschriften.
- Im PDF-Editor für Angebote dieselbe Beschriftung und Bearbeitbarkeit anbieten.
- Bestehende Angebote bleiben kompatibel: vorhandene Werte werden übernommen, leere Werte erhalten weiterhin den sinnvollen bisherigen Standardtext.
- Keine Datenbankmigration notwendig.

### 3. „Alle sichtbaren in Drive sichern“ auf beiden Listen
- Auf der Rechnungs- und Angebotsliste jeweils einen klaren Drive-Button ergänzen.
- „Sichtbar“ bedeutet exakt die aktuell nach Monat/Jahr, Status, Suche und weiteren aktiven Filtern angezeigten Belege – einschließlich bewusst angezeigter Entwürfe, da der Upload ausdrücklich per Klick ausgelöst wird.
- Der Server erhält ausschließlich die sichtbaren IDs und prüft für jeden Beleg anhand des aktuellen PDF-Hashes, ob genau diese Fassung bereits erfolgreich in Drive liegt.
- Nur fehlende oder veraltete Fassungen werden idempotent in die bestehende Upload-Warteschlange gelegt; vorhandene Drive-Dateien werden wie bisher ersetzt statt dupliziert.
- Vor dem Start wird geprüft, ob Google Drive verbunden ist. Fehler einzelner Belege werden separat gezählt und verständlich gemeldet, ohne erfolgreiche Uploads zurückzunehmen.
- Während der Verarbeitung zeigt der Button einen stabilen Lade-/Fortschrittszustand. Nach vollständigem Erfolg wechselt er mit einer dezenten Check-/Fortschrittsanimation zu „Alles ist in Google Drive“; keine Glitzer- oder Sparkle-Dekoration.
- Der Button bleibt deaktiviert, wenn die Liste leer ist, Drive nicht verbunden ist, ein Lauf aktiv ist oder alle sichtbaren aktuellen PDF-Fassungen bereits synchron sind.
- Statusänderungen werden nach Queue-Ereignissen und kurzem Polling aktualisiert, damit der Erfolg erst nach tatsächlich abgeschlossenen Uploads erscheint – nicht bereits nach dem Einreihen.

## Technische Absicherung
- Browser-PDF und Pi-PDF mit denselben Layoutwerten und derselben Angebots-/Rechnungslogik ändern.
- Den bestehenden PDF-Cache weiterhin anhand des vollständigen Belegs und der Layout-Einstellungen trennen; die Layout-Version anheben, damit keine alte Vorschau ausgeliefert wird.
- Für die Listen eine gebündelte, geschützte Status-/Upload-Schnittstelle verwenden, statt pro Zeile viele Einzelanfragen zu erzeugen.
- Die bestehende Drive-Queue, Hash-Idempotenz, Wiederholungslogik und Ersetzung derselben Drive-Datei weiterverwenden.
- Keine Änderungen an Datenverzeichnis, Update-, Backup- oder Restore-Abläufen; kein automatischer E-Mail-Versand.

## Prüfung
- Rechnungs- und Angebots-PDFs mit kurzen, langen und mehrzeiligen Positionen sowie ein- und mehrseitigen Beispielen erzeugen und jede Seite als Bild prüfen.
- Zeilenhöhen und 0,8-pt-/3-pt-Raster vermessen; Browser- und Pi-Ausgabe strukturell vergleichen.
- Kontrollieren, dass größere Texte, kleinere Überschrift und tieferer Footer weder abgeschnitten werden noch kollidieren; alle vier Footerblöcke müssen linksbündig sein.
- Angebot anlegen und bearbeiten: „Ausführungen“ frei eingeben, speichern, erneut öffnen und in Browser-/Pi-PDF vergleichen.
- Drive-Ablauf auf beiden Listen testen: Monatsfilter, Statusfilter und Suche; teilweise synchron, vollständig synchron, veraltete Fassung, Entwurf, leere Liste, getrenntes Drive sowie Uploadfehler.
- Sicherstellen, dass der Button nur die sichtbaren Belege verarbeitet, keine Duplikate erzeugt und erst nach echten Erfolgen „Alles ist in Google Drive“ meldet.
- Relevante PDF-, Raster-, Drive- und Belegtests sowie Typprüfung und aktuellen Build-Status prüfen; Update-Paket-Smoke-Test soweit lokal möglich unverändert mitlaufen lassen.
