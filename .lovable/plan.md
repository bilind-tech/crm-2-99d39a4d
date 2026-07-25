Das Logo sitzt oben rechts mit `fit: [260, 110]` an `y: 22`, reicht also bis ca. `y: 132`. Der Content-Bereich beginnt aktuell schon bei `pageMargins` Top = 130 (Belege) bzw. entsprechend bei den Protokollen, dadurch stößt die Empfängeradresse / der Absenderstrich direkt an das Logo.

Änderung: Oberen Seitenrand erhöhen, damit spürbar Luft zwischen Logo und dem darunterliegenden Block entsteht.

**Konkret anzupassen:**

1. `backend/src/pdf/layout.ts`
   - `pageMargins: [55, 130, 55, 100]` → `pageMargins: [55, 155, 55, 100]`
   - Absenderzeile-Margin `margin: [0, 50, 0, 0]` → `margin: [0, 70, 0, 0]` (damit der unterstrichene Absender ebenfalls unter dem Logo bleibt und nicht ins Logo rutscht)

2. `src/lib/pdf/belegPdf.ts` (Client-Fallback) — identische Werte spiegeln

3. `src/lib/pdf/werkzeugePdf.ts` (Übergabe-/Schlüsselprotokolle) — analog `pageMargins` Top erhöhen und Absenderzeile-Margin nachziehen, damit alle drei Dokumenttypen konsistent bleiben

4. `backend/src/pdf/cache.ts` und `src/hooks/useBelegPdf.ts`
   - `PDF_RENDER_CACHE_VERSION` hochzählen auf `2026-07-25-logo-spacing-v5`, damit vorhandene PDFs neu gerendert werden und die neue Abstände sofort sichtbar sind

**Nicht geändert:** Logo-Größe und -Position bleiben (`fit: [260, 110]`, `x: 335, y: 22`) — nur der Content darunter rückt weiter nach unten.

Falls der Abstand nach dem Update noch nicht perfekt ist (zu viel/zu wenig), können wir mit einem Screenshot die 155 pt in einem zweiten Schritt feinjustieren.