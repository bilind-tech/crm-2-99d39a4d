Aktuell ist das Firmenlogo in den PDF-Layouts (Rechnung/Angebot/Protokolle) mit `fit: [220, 95]` und `absolutePosition: { x: 320, y: 24 }` positioniert. Es wird also noch etwas Platz links des Logos freigelassen.

Ich passe das Logo in allen drei PDF-Renderern an:

- Backend-PDF-Renderer (`backend/src/pdf/layout.ts`) für Rechnungen/Angebote vom Pi
- Client-PDF-Fallback (`src/lib/pdf/belegPdf.ts`) für Browser-Generierung
- Werkzeug-Protokolle (`src/lib/pdf/werkzeugePdf.ts`) für Übergabe-/Schlüsselprotokolle

Konkrete Änderung:
- `fit: [260, 110]` statt `[220, 95]` → Logo wird etwas größer
- `absolutePosition: { x: 335, y: 22 }` statt `{ x: 320, y: 24 }` → Logo rutscht weiter nach rechts und etwas höher
- PDF-Cache-Version erhöhen, damit bestehende PDFs neu gerendert werden und das geänderte Logo sofort sichtbar ist

Nach dem Update sollte das Logo deutlich präsenter oben rechts sitzen. Falls es damit noch nicht perfekt ist (z. B. zu nah am Rand oder doch noch zu klein), sende einfach einen Screenshot – dann feintunen wir die Werte in einem weiteren Schritt.