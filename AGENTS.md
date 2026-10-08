# Architektur-Regeln

- PDF-Leistungstabelle: alle 0,8-pt-Linien liegen auf einem 3-pt-Raster (feste Spaltenbreiten + Messdurchläufe in `linienRaster.ts`, Browser- und Pi-Kopie identisch halten) — damit Linien in Vorschauen überall gleich dick wirken.
- PDF layout settings use their own persisted settings area and must participate in every browser/server PDF cache key, so settings changes cannot serve stale documents.
- Bulk Drive sync accepts only explicit filtered document IDs and reports success only after matching PDF hashes completed uploading, preventing hidden records or stale versions from appearing synced.
- Stundenzettel calculations use the same 30-minute floor and 0.5-hour target-adjustment rules in browser preview and Pi backend, preventing divergent monthly totals.
- Stundenzettel-Abwesenheiten: pure Zeitraum-Helfer in `abwesenheitZeitraum.ts` (ohne DB-Import), damit Generierung/Tests ohne SQLite laufen; Browser-Vorschau spiegelt dieselbe Logik.
- Stundenzettel-Monatsplanung (Monatsziel-Override + feste Tage) liegt in `stz_monatsplan`; pure Logik in `monatsplanLogik.ts` mit identischer Browser-Kopie `src/lib/stundenzettel/monatsplan.ts`, damit Generierung, Speichersperre und Vorschau dasselbe Ziel verwenden.
- Stundenzettel-PDFs werden nie automatisch archiviert; nur `POST /stundenzettel/:id/archivieren` legt ab und setzt `archiv_hash` (Inhalts-Fingerabdruck aus `archivStand.ts`, Browser-Kopie identisch), damit der Speicherstand-Button nicht/veraltet/gespeichert zuverlässig anzeigt.
- Stundenzettel mit zwei Arbeitsblöcken werden in Bearbeitung und PDF stets zeitlich sortiert als zwei gekoppelte Zeilen dargestellt; das PDF bleibt fest zweitseitig (Tage 1–15 / 16–31) mit untrennbaren Tageszeilen, damit Beginn und Ende jedes Blocks horizontal zusammenbleiben und keine Folgeseiten entstehen.
