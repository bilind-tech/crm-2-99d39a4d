# PDF-Vorschau in Chrome: Flackern beheben

## Problem
In Chrome blinkt die PDF-Vorschau sehr schnell zwischen leer und sichtbar. Wahrscheinliche Ursache (gilt zuerst als Vermutung, Schritt 1 bestätigt sie): eine Schleife mit dem Scrollbalken.
1. Die Seite wird gezeichnet, ist höher als der Kasten, und Chrome blendet einen Scrollbalken ein.
2. Der Kasten wird dadurch ca. 15 px schmaler, die Vorschau wird neu berechnet und die Seite kurz geleert.
3. Ohne Inhalt verschwindet der Scrollbalken, der Kasten wird wieder breiter, und alles beginnt von vorn.

Safari und Mac-Browser blenden Scrollbalken über dem Inhalt ein. Deshalb tritt das Problem dort nicht auf.

## Lösung
1. In Chrome (Breite 1113 px, sichtbarer Scrollbalken) mit einem Browsertest nachstellen: zählen, wie oft sich die Breite ändert und wie oft die Seite neu gezeichnet wird.
2. Für den Scrollbalken der Vorschau dauerhaft Platz reservieren. Dann ändert sich die Breite nicht mehr, wenn er erscheint.
3. Breitenänderungen erst ab mehr als 24 px berücksichtigen und kurz bündeln. So kann sich keine Schleife mehr aufschaukeln.
4. Beim Neuzeichnen die alte Seite sichtbar lassen, bis die neue fertig ist. So entsteht kein weißes Aufblitzen.
5. Das gilt für alle Stellen, die diese Vorschau nutzen: Detailseite, Auge-Ansicht und PDF-Editor. Danach prüfe ich erneut in Chrome, ob nichts mehr flackert und die Linien gleich scharf bleiben.

## Technische Details
- `PdfCanvasViewerImpl.tsx`: `scrollbar-gutter: stable` am Container; ResizeObserver mit Schwelle von 24 px und rAF-Debounce; `pixelVerhaeltnis`-Effekt nur bei echter DPR-Änderung.
- `LivePdfPreview.tsx` auf dieselbe Messlogik prüfen und angleichen.
- Linienraster (`rasterGenaueBreite`) bleibt unverändert. Es gibt keine Backend- oder Datenbankänderung, das Update bleibt unberührt.
