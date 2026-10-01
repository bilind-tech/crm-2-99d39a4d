// Hochlevel-Renderer mit Cache. Liefert Buffer + Hash + Dateiname.

import { getAngebot } from "../belege/angebote-repo.js";
import { getRechnung } from "../belege/rechnungen-repo.js";
import { getKunde, getAnsprechpartner, getObjekt } from "../kunden/repo.js";
import { angebotDocDef, rechnungDocDef } from "./layout.js";
import { angebotsdatumVon } from "../belege/angebotsdatum.js";
import { renderPdf } from "./render.js";
import { LEERER_PLAN, liegtImRaster, verbessereRasterPlan, waagerechteLinienAusPdf, type RasterOptionen, type RasterPlan } from "./linienRaster.js";
import { computeHash, invalidate, invalidateAll, logoFingerprint, readCached, writeCached, type BelegArt } from "./cache.js";
import { loadFirmaForPdf, loadLogoDataUrl } from "./firma.js";
import type { ApiAngebot, ApiRechnung } from "../belege/mappers.js";
import type { ApiKunde, ApiAnsprechpartner, ApiObjekt } from "../kunden/mappers.js";
import { getSetting } from "../settings/store.js";
import type { PdfVorlageSettings } from "../settings/schemas.js";

function safe(s: string): string {
  return s.replace(/[^\p{L}\p{N}\- _]/gu, "").replace(/\s+/g, " ").trim();
}
function kundeName(k: ApiKunde): string {
  return safe(k.firmenname || [k.vorname, k.nachname].filter(Boolean).join(" ") || k.nummer);
}
function mmYYYY(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return mmYYYY(undefined);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${mm}-${d.getUTCFullYear()}`;
}
function nummerForFilename(n: string): string {
  return n.replace(/\//g, "-");
}
function dateinameAngebot(a: ApiAngebot, k: ApiKunde): string {
  const teile = [`Angebot ${nummerForFilename(a.nummer)}`, kundeName(k)];
  const titel = safe(a.titel || "");
  if (titel) teile.push(`– ${titel}`);
  teile.push(`(${mmYYYY(angebotsdatumVon(a))})`);
  return `${teile.join(" ")}.pdf`.replace(/\s+/g, " ");
}
function dateinameRechnung(r: ApiRechnung, k: ApiKunde): string {
  const teile = [`Rechnung ${nummerForFilename(r.nummer)}`, kundeName(k)];
  const titel = safe(r.titel || "");
  if (titel) teile.push(`– ${titel}`);
  teile.push(`(${mmYYYY(r.rechnungsdatum || r.erstelltAm)})`);
  return `${teile.join(" ")}.pdf`.replace(/\s+/g, " ");
}

/**
 * Setzt den Beleg so, dass alle Linien der Leistungstabelle auf dem
 * Linien-Raster liegen (siehe linienRaster.ts). Messdurchläufe sind
 * unkomprimiert, damit die Linien direkt lesbar sind; das ausgelieferte PDF
 * wird normal komprimiert gesetzt. Jeder Fehler bei der Feinausrichtung führt
 * einfach zum normalen PDF — niemals zu einem Abbruch.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function renderMitRaster(build: (raster: RasterOptionen) => any): Promise<Buffer> {
  let plan: RasterPlan = LEERER_PLAN;
  try {
    for (let runde = 0; runde < 3; runde++) {
      const raster: RasterOptionen = { plan };
      const probe = build(raster);
      probe.compress = false;
      // Kopf (Logo) und Fuß liegen fest im Seitenrand und beeinflussen das
      // Layout nicht — beim Messen weglassen, das spart viel Zeit.
      delete probe.header;
      delete probe.footer;
      const linien = waagerechteLinienAusPdf((await renderPdf(probe)).toString("latin1"));
      if (liegtImRaster(linien, raster.zeilen)) break;
      const naechster = verbessereRasterPlan(linien, raster.zeilen, plan);
      if (!naechster) break;
      plan = naechster;
    }
  } catch {
    plan = LEERER_PLAN;
  }
  return await renderPdf(build({ plan }));
}

export interface RenderResult {
  buffer: Buffer;
  hash: string;
  dateiname: string;
  fromCache: boolean;
}

export async function renderAngebotPdf(angebotId: string): Promise<RenderResult | null> {
  const a = getAngebot(angebotId);
  if (!a) return null;
  const k = getKunde(a.kundeId);
  if (!k) throw new Error("Kunde zum Angebot nicht gefunden");
  const ap: ApiAnsprechpartner | undefined = a.ansprechpartnerId
    ? (getAnsprechpartner(a.ansprechpartnerId) ?? undefined)
    : undefined;
  const obj: ApiObjekt | null = a.objektId ? (getObjekt(a.objektId) ?? null) : null;
  const firma = loadFirmaForPdf();
  const logoDataUrl = loadLogoDataUrl();
  const pdfVorlage = getSetting<PdfVorlageSettings>("pdfVorlage") ?? { empfaengerOben: false };
  const hash = computeHash({ beleg: a, kunde: k, firma, ansprechpartner: ap, objekt: obj, logoFingerprint: logoFingerprint(logoDataUrl), pdfVorlage });
  const dateiname = dateinameAngebot(a, k);

  const cached = readCached("angebot", a.id, hash);
  if (cached) return { buffer: cached, hash, dateiname, fromCache: true };

  const buffer = await renderMitRaster((raster) =>
    angebotDocDef({ angebot: a, kunde: k, firma, ansprechpartner: ap, objekt: obj, logoDataUrl, raster, empfaengerOben: pdfVorlage.empfaengerOben }),
  );
  writeCached("angebot", a.id, hash, buffer);
  return { buffer, hash, dateiname, fromCache: false };
}

export async function renderRechnungPdf(rechnungId: string): Promise<RenderResult | null> {
  const r = getRechnung(rechnungId);
  if (!r) return null;
  const k = getKunde(r.kundeId);
  if (!k) throw new Error("Kunde zur Rechnung nicht gefunden");
  const ap: ApiAnsprechpartner | undefined = r.ansprechpartnerId
    ? (getAnsprechpartner(r.ansprechpartnerId) ?? undefined)
    : undefined;
  const obj: ApiObjekt | null = r.objektId ? (getObjekt(r.objektId) ?? null) : null;
  const firma = loadFirmaForPdf();
  const logoDataUrl = loadLogoDataUrl();
  const pdfVorlage = getSetting<PdfVorlageSettings>("pdfVorlage") ?? { empfaengerOben: false };
  const hash = computeHash({ beleg: r, kunde: k, firma, ansprechpartner: ap, objekt: obj, logoFingerprint: logoFingerprint(logoDataUrl), pdfVorlage });
  const dateiname = dateinameRechnung(r, k);

  const cached = readCached("rechnung", r.id, hash);
  if (cached) return { buffer: cached, hash, dateiname, fromCache: true };

  const buffer = await renderMitRaster((raster) =>
    rechnungDocDef({ rechnung: r, kunde: k, firma, ansprechpartner: ap, objekt: obj, logoDataUrl, raster, empfaengerOben: pdfVorlage.empfaengerOben }),
  );
  writeCached("rechnung", r.id, hash, buffer);
  return { buffer, hash, dateiname, fromCache: false };
}

export function invalidatePdfCache(art: BelegArt, id: string): void {
  invalidate(art, id);
}

export function invalidateAllPdfCaches(): void {
  invalidateAll();
}
