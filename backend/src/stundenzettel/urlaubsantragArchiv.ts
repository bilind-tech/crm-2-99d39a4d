// Urlaubsantrag-PDFs (im Browser erzeugt) in Dokumente → Urlaubsanträge/{YYYY} ablegen.
// Pro Abwesenheit genau eine aktuelle Fassung; ältere werden per Soft-Delete ersetzt.
import { storeBuffer } from "../dokumente/storage.js";
import { createDokument, getDokumentRaw, listDokumente, softDeleteDokument } from "../dokumente/repo.js";
import { createOrdner, listOrdner } from "../dokumente/ordner-repo.js";
import type { Abwesenheit } from "./types.js";

export const URLAUBSANTRAG_ORDNER = "Urlaubsanträge";

function ensureOrdner(name: string, parentId: string | null): string {
  const vorhanden = listOrdner().find(
    (o) => o.parentId === parentId && o.name.toLowerCase() === name.toLowerCase(),
  );
  if (vorhanden) return vorhanden.id;
  return createOrdner({ name, parentId }).id;
}

function kennung(a: Pick<Abwesenheit, "id">): string {
  return a.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
}

function sicher(s: string): string {
  return s.normalize("NFC").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "_").slice(0, 60) || "Mitarbeiter";
}

/** Entfernt alle abgelegten Fassungen dieses Antrags. */
export function entferneUrlaubsantragDokumente(a: Pick<Abwesenheit, "id">): number {
  const tag = `[antrag:${kennung(a)}]`;
  let n = 0;
  for (const d of listDokumente({})) {
    if ((d.beschreibung ?? "").includes(tag)) {
      softDeleteDokument(d.id);
      n++;
    }
  }
  return n;
}

export async function legeUrlaubsantragAb(
  a: Abwesenheit,
  mitarbeiterName: string,
  pdf: Buffer,
): Promise<{ dokumentId: string; dateiname: string; ersetzt: boolean }> {
  const root = ensureOrdner(URLAUBSANTRAG_ORDNER, null);
  const ordnerId = ensureOrdner(a.von.slice(0, 4), root);
  const dateiname = `Urlaubsantrag_${sicher(mitarbeiterName)}_${a.von}_bis_${a.bis}.pdf`;
  const stored = await storeBuffer(pdf, "application/pdf", dateiname);
  const ersetzt = entferneUrlaubsantragDokumente(a) > 0;
  const dok = createDokument({
    titel: `Urlaubsantrag ${mitarbeiterName} ${a.von} – ${a.bis}`,
    typ: "protokoll",
    ordnerId,
    dateiname,
    mimeType: "application/pdf",
    groesseBytes: stored.groesseBytes,
    sha256: stored.sha256,
    storagePath: stored.storagePath,
    dokumentdatum: a.von,
    beschreibung: `Urlaubsantrag ${mitarbeiterName} [antrag:${kennung(a)}]`,
  });
  return { dokumentId: dok.id, dateiname, ersetzt };
}

/** Aktuell abgelegte Fassung + Drive-Status eines Antrags. */
export function urlaubsantragStatus(a: Pick<Abwesenheit, "id">): {
  dokumentId: string | null;
  dateiname: string | null;
  driveStatus: "keins" | "pending" | "uploaded" | "fehler";
  driveUrl: string | null;
} {
  const tag = `[antrag:${kennung(a)}]`;
  const d = listDokumente({}).find((x) => (x.beschreibung ?? "").includes(tag));
  if (!d) return { dokumentId: null, dateiname: null, driveStatus: "keins", driveUrl: null };
  const raw = getDokumentRaw(d.id) as { drive_status?: string | null; drive_url?: string | null } | null;
  const st = raw?.drive_status;
  return {
    dokumentId: d.id,
    dateiname: d.dateiname ?? null,
    driveStatus: st === "uploaded" || st === "fehler" || st === "pending" ? st : "pending",
    driveUrl: raw?.drive_url ?? null,
  };
}
