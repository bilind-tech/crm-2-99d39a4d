// Breite der PDF-Vorschau so wählen, dass das Linien-Raster der Belege
// (alle Tabellenlinien im Raster-Abstand, siehe linienRaster.ts) auf ganze
// Bildschirmpixel fällt. Dann zeichnet die Vorschau jede Tabellenlinie mit
// exakt derselben Pixelstärke — keine „mal dünn, mal dick"-Linien mehr.
import { A4 } from "./hotspotTracker";
import { RASTER_PT } from "./linienRaster";

/** Gerätepixel-Verhältnis des Bildschirms (1 auf dem Server). */
export function aktuellesPixelVerhaeltnis(): number {
  if (typeof window === "undefined") return 1;
  const d = window.devicePixelRatio;
  return Number.isFinite(d) && d > 0 ? d : 1;
}

/**
 * Rundet die gewünschte Breite (CSS-Pixel) minimal ab, sodass ein Raster-Schritt
 * einer ganzen Zahl an Gerätepixeln entspricht. Die Änderung ist kleiner als
 * ein paar Pixel und daher optisch nicht sichtbar.
 */
export function rasterGenaueBreite(breite: number, pixelVerhaeltnis: number): number {
  const dpr = Number.isFinite(pixelVerhaeltnis) && pixelVerhaeltnis > 0 ? pixelVerhaeltnis : 1;
  if (!Number.isFinite(breite) || breite <= 0) return breite;
  const pxProRaster = Math.floor((breite * dpr * RASTER_PT) / A4.width);
  if (pxProRaster < 1) return breite;
  return (pxProRaster * A4.width) / (RASTER_PT * dpr);
}
