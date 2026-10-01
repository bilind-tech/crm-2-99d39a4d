// Backfill: enqueued alle bisher nicht erfolgreich hochgeladenen Belege & Dokumente.
// Wird automatisch nach erfolgreichem OAuth-Connect ausgelöst und ist zusätzlich
// als Endpoint POST /drive/backfill für „Alles erneut prüfen" verfügbar.
import crypto from "node:crypto";
import { getDatabase } from "../db/index.js";
import { renderAngebotPdf, renderRechnungPdf } from "../pdf/belegPdf.server.js";
import { getAngebot } from "../belege/angebote-repo.js";
import { getRechnung } from "../belege/rechnungen-repo.js";
import { listDokumente } from "../dokumente/repo.js";
import { enqueue } from "./upload-repo.js";
import { loadDriveSettings } from "./oauth.js";

interface Row { id: string }

function listAngebotIdsForSync(): string[] {
  const rows = getDatabase()
    .prepare(`SELECT id FROM angebot WHERE status IN ('angenommen','versendet') AND geloescht_am IS NULL LIMIT 1000`)
    .all() as Row[];
  return rows.map((r) => r.id);
}
function listRechnungIdsForSync(): string[] {
  const rows = getDatabase()
    .prepare(`SELECT id FROM rechnung WHERE status IN ('versendet','bezahlt','teilbezahlt') AND geloescht_am IS NULL LIMIT 1000`)
    .all() as Row[];
  return rows.map((r) => r.id);
}

export interface BackfillOneResult {
  found: boolean;
  created: boolean;
  pdfSha256?: string;
}

async function enqueueAngebot(id: string): Promise<BackfillOneResult> {
  const beleg = getAngebot(id);
  if (!beleg) return { found: false, created: false };
  const pdf = await renderAngebotPdf(id);
  if (!pdf) return { found: false, created: false };
  const sha = crypto.createHash("sha256").update(pdf.buffer).digest("hex");
  const result = enqueue({
    belegArt: "angebot",
    belegId: id,
    dateiName: pdf.dateiname,
    pdfSha256: sha,
    idempotenzKey: `angebot-${(beleg as { nummer?: string }).nummer ?? id}-${sha.slice(0, 16)}`,
  });
  return { found: true, created: result.created, pdfSha256: sha };
}

async function enqueueRechnung(id: string): Promise<BackfillOneResult> {
  const beleg = getRechnung(id);
  if (!beleg) return { found: false, created: false };
  const pdf = await renderRechnungPdf(id);
  if (!pdf) return { found: false, created: false };
  const sha = crypto.createHash("sha256").update(pdf.buffer).digest("hex");
  const result = enqueue({
    belegArt: "rechnung",
    belegId: id,
    dateiName: pdf.dateiname,
    pdfSha256: sha,
    idempotenzKey: `rechnung-${(beleg as { nummer?: string }).nummer ?? id}-${sha.slice(0, 16)}`,
  });
  return { found: true, created: result.created, pdfSha256: sha };
}

function enqueueDokument(id: string, sha256: string | null, dateiname: string | null): boolean {
  enqueue({
    belegArt: "dokument",
    belegId: id,
    dateiName: dateiname ?? `Dokument-${id}`,
    pdfSha256: sha256 ?? id,
    idempotenzKey: `dokument-${id}-${(sha256 ?? "").slice(0, 16)}`,
  });
  return true;
}

export interface BackfillResult {
  angebote: number;
  rechnungen: number;
  dokumente: number;
  skipped: number;
}

/** Enqueued alle relevanten Belege/Dokumente, die noch nicht in Drive sind. */
export async function backfillAll(): Promise<BackfillResult> {
  const out: BackfillResult = { angebote: 0, rechnungen: 0, dokumente: 0, skipped: 0 };
  const settings = loadDriveSettings();
  if (!settings.refreshTokenIsSet) return out;

  // Idempotenz im Repo verhindert Duplikate — wir können bedenkenlos alle enqueuen.
  for (const id of listAngebotIdsForSync()) {
    try { if ((await enqueueAngebot(id)).found) out.angebote++; }
    catch { out.skipped++; }
  }
  for (const id of listRechnungIdsForSync()) {
    try { if ((await enqueueRechnung(id)).found) out.rechnungen++; }
    catch { out.skipped++; }
  }
  const dokumente = listDokumente({ limit: 1000 } as never);
  for (const d of dokumente) {
    // Bereits hochgeladene überspringen — drive_status === 'uploaded'.
    if (d.drive?.fileId) { out.skipped++; continue; }
    try { if (enqueueDokument(d.id, d.sha256 ?? null, d.dateiname ?? null)) out.dokumente++; }
    catch { out.skipped++; }
  }
  return out;
}

/** Einzelner Beleg/Dokument auf Knopfdruck enqueuen. */
export async function backfillOne(
  belegArt: "angebot" | "rechnung" | "dokument",
  belegId: string,
): Promise<boolean> {
  if (belegArt === "angebot") return (await enqueueAngebot(belegId)).found;
  if (belegArt === "rechnung") return (await enqueueRechnung(belegId)).found;
  const dokumente = listDokumente({ limit: 1000 } as never);
  const d = dokumente.find((x) => x.id === belegId);
  if (!d) return false;
  return enqueueDokument(d.id, d.sha256 ?? null, d.dateiname ?? null);
}

/** Einzelner Beleg mit Information, ob wirklich eine neue Queue-Zeile entstand. */
export async function backfillOneDetailed(
  belegArt: "angebot" | "rechnung",
  belegId: string,
): Promise<BackfillOneResult> {
  return belegArt === "angebot" ? enqueueAngebot(belegId) : enqueueRechnung(belegId);
}