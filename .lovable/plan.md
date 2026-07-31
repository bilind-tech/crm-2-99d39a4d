## Ziel

Die Stundenzettel-Seite und der Arbeitsbereich nach dem Generieren werden aufgeräumt: keine blockierte PDF-Vorschau mehr, keine sofort ausgeklappte Tabelle, klarere Buttons und Texte.

## 1. PDF-Vorschau reparieren („Dieser Inhalt ist blockiert“)

Die Vorschau in `StundenzettelWorkspace.tsx` rendert das PDF aktuell in einem `<iframe src="blob:…">`. Genau das blockiert der Browser/Host in der Vorschauumgebung.

Lösung: statt iframe den im Projekt bereits vorhandenen Canvas-Viewer (`src/components/pdf/PdfCanvasViewer.tsx`, pdf.js-basiert, wird schon für Rechnungen/Angebote genutzt) verwenden. Das rendert die Seiten direkt ins Canvas — kein eingebettetes Dokument, also kein Blocken. Beide Seiten (1 und 2) scrollbar untereinander.

Fällt das Laden fehl (z. B. kein Pi-Backend in der Lovable-Vorschau), erscheint eine verständliche Meldung plus „PDF ansehen“-Button statt einer leeren Fläche.

## 2. Tabelle erst auf Klick

Direkt nach dem Generieren sieht man pro Mitarbeiter nur noch:
- Kopfzeile mit Name + Gesamtstunden
- die Buttons **PDF ansehen · Drucken · Herunterladen · In Dokumente ablegen**
- einen neuen Button **Bearbeiten**

Erst ein Klick auf „Bearbeiten“ klappt die Tabelle mit Tag/Beginn/Ende/Pause/Std./Status/Bemerkung auf (Button wechselt dann zu „Bearbeiten schließen“). Gilt sowohl im Vollbild-Arbeitsbereich als auch in den Mitarbeiter-Akkordeons auf der Hauptseite.

Im Arbeitsbereich heißt das konkret: rechts die PDF-Vorschau, links Buttons + eingeklappte Tabelle.

## 3. Texte und Buttons

- Button „Alle aktiven generieren“ → nur noch **„Generieren“**, mit neuem, passenderem Icon (`Sparkles` ist per Projektregel verboten — stattdessen `CalendarPlus`/`FilePlus2`, klar als „Zettel erzeugen“ lesbar).
- Hinweis „Vorhandene Zettel dieses Monats werden dabei überschrieben.“ → neu formuliert, freundlicher und kürzer, z. B. *„Bereits erstellte Zettel für diesen Monat werden neu erzeugt.“*
- Icons der übrigen Aktionen (Ablegen, Alle als PDF, Öffnen) auf einen einheitlichen, ruhigen Satz bringen.

## Technische Details

- `src/components/stundenzettel/StundenzettelWorkspace.tsx`: `PdfVorschau` von iframe auf `PdfCanvasViewer` umstellen; neuer lokaler State `bearbeiten` für das Ein-/Ausklappen der Tabelle.
- `src/routes/stundenzettel.tsx`: Button-Label/Icon, Hinweistext, und im Mitarbeiter-Akkordeon Tabelle hinter „Bearbeiten“ legen.
- `src/components/stundenzettel/StundenzettelPdfAktionen.tsx`: optionaler `extra`-Slot bzw. `onBearbeiten`-Prop, damit der Bearbeiten-Button in derselben Buttonzeile sitzt.
- Keine Backend-Änderungen.
