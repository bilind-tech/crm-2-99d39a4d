# Architektur-Regeln

- PDF-Leistungstabelle: alle 0,8-pt-Linien liegen auf einem 3-pt-Raster (feste Spaltenbreiten + Messdurchläufe in `linienRaster.ts`, Browser- und Pi-Kopie identisch halten) — damit Linien in Vorschauen überall gleich dick wirken.
- PDF layout settings use their own persisted settings area and must participate in every browser/server PDF cache key, so settings changes cannot serve stale documents.
