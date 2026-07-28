// Phase 5: Stundenzettel-PDFs werden in die bestehende Dokumenten-Ablage
// geschrieben — Ordner "Stundenzettel/{YYYY}/{MM}". Kein Google-Drive-Spezialweg;
// falls Drive verbunden ist, greift die normale Dokument-Pipeline.
import { renderStundenzettelPdf } from "../pdf/stundenzettelPdf.js";
import { storeBuffer } from "../dokumente/storage.js";
import { createDokument, listDokumente, softDeleteDokument } from "../dokumente/repo.js";
import { createOrdner, listOrdner } from "../dokumente/ordner-repo.js";
import { getZettel } from "./repo.js";

export const STUNDENZETTEL_ORDNER = "Stundenzettel";

/** Findet einen Ordner nach Name+Parent oder legt ihn an. */
function ensureOrdner(name: string, parentId: string | null): string {
  const vorhanden = listOrdner().find(
    (o) => o.parentId === parentId && o.name.toLowerCase() === name.toLowerCase(),
  );
  if (vorhanden) return vorhanden.id;
  return createOrdner({ name, parentId }).id;
}

/** Ordnerpfad Stundenzettel/{YYYY}/{MM} sicherstellen, liefert die Ziel-Ordner-ID. */
export function ensureStundenzettelOrdner(jahr: number, monat: number): string {
  const root = ensureOrdner(STUNDENZETTEL_ORDNER, null);
  const jahrId = ensureOrdner(String(jahr), root);
  return ensureOrdner(String(monat).padStart(2, "0"), jahrId);
}

export interface ArchivErgebnis {
  dokumentId: string;
  dateiname: string;
  ordnerId: string;
  ersetzt: boolean;
}

/**
 * Rendert den Stundenzettel und legt ihn als Dokument ab.
 * Eine ältere Version desselben Monats/Mitarbeiters wird ersetzt (Soft-Delete).
 */
export async function archiviereStundenzettel(zettelId: string): Promise<ArchivErgebnis | null> {
  const z = getZettel(zettelId);
  if (!z) return null;
  const pdf = await renderStundenzettelPdf(zettelId);
  if (!pdf) return null;

  const ordnerId = ensureStundenzettelOrdner(z.jahr, z.monat);
  const stored = await storeBuffer(pdf.buffer, "application/pdf", pdf.dateiname);

  // Vorherige Version im selben Ordner entfernen (gleicher Dateiname).
  let ersetzt = false;
  for (const alt of listDokumente({ ordnerId })) {
    if (alt.dateiname === pdf.dateiname) {
      softDeleteDokument(alt.id);
      ersetzt = true;
    }
  }

  const dok = createDokument({
    titel: pdf.dateiname.replace(/\.pdf$/i, "").replace(/_/g, " "),
    typ: "pdf",
    ordnerId,
    dateiname: pdf.dateiname,
    mimeType: "application/pdf",
    groesseBytes: stored.groesseBytes,
    sha256: stored.sha256,
    storagePath: stored.storagePath,
    dokumentdatum: `${z.jahr}-${String(z.monat).padStart(2, "0")}-01`,
    beschreibung: `Stundenzettel ${String(z.monat).padStart(2, "0")}/${z.jahr} — ${z.gesamtStunden.toFixed(2)} Stunden`,
  });

  return { dokumentId: dok.id, dateiname: pdf.dateiname, ordnerId, ersetzt };
}
