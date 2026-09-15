// Hängt sich an Beleg-Ereignisse und enqueued Drive-Uploads.
//
// Zwei Auslöser:
//  1. Beleg wurde manuell per E-Mail versendet  -> erster Upload.
//  2. Ein BEREITS versendeter Beleg wurde geändert -> aktualisierte Fassung.
//     Der Worker überschreibt dabei dieselbe Drive-Datei (replaceFileId),
//     es entsteht also kein Duplikat.
//
// Unverändert gilt: kein Versand -> kein Drive-Upload. Entwürfe, Statuswechsel
// ohne Versand (z. B. "angenommen" klicken, Zahlung erfassen) lösen für sich
// genommen keinen Upload aus, solange versendetAm leer ist.
import crypto from "node:crypto";
import { onBelegVersendet, onBelegMutated } from "../belege/events.js";
import { renderAngebotPdf, renderRechnungPdf } from "../pdf/belegPdf.server.js";
import { getAngebot } from "../belege/angebote-repo.js";
import { getRechnung } from "../belege/rechnungen-repo.js";
import { enqueue } from "./upload-repo.js";
import { loadDriveSettings } from "./oauth.js";
import type { BelegArt } from "../pdf/cache.js";

let wired = false;

/** Autosave im PDF-Editor feuert viele Mutationen — deshalb kurz sammeln. */
const UPDATE_DEBOUNCE_MS = 20_000;
const pending = new Map<string, NodeJS.Timeout>();

/**
 * Rendert das aktuelle PDF und legt es in die Drive-Warteschlange.
 * Der Idempotenzschlüssel enthält den PDF-Hash: unveränderter Inhalt erzeugt
 * keinen zweiten Upload, geänderter Inhalt genau einen neuen.
 */
async function enqueueAktuelleFassung(art: BelegArt, id: string, nurWennVersendet: boolean): Promise<void> {
  const settings = loadDriveSettings();
  if (settings.autoUpload === false) return;
  const beleg = art === "angebot" ? getAngebot(id) : getRechnung(id);
  if (!beleg) return;
  if (nurWennVersendet && !(beleg as { versendetAm?: string }).versendetAm) return;

  const pdf = art === "angebot" ? await renderAngebotPdf(id) : await renderRechnungPdf(id);
  if (!pdf) return;
  const sha = crypto.createHash("sha256").update(pdf.buffer).digest("hex");
  enqueue({
    belegArt: art,
    belegId: id,
    dateiName: pdf.dateiname,
    pdfSha256: sha,
    idempotenzKey: `${art}-${(beleg as { nummer?: string }).nummer ?? id}-${sha.slice(0, 16)}`,
  });
}

export function wireDriveAutoEnqueue(): void {
  if (wired) return;
  wired = true;

  onBelegVersendet(async (art, id) => {
    try {
      await enqueueAktuelleFassung(art, id, false);
    } catch (e) {
      console.error("drive auto-enqueue", e);
    }
  });

  // Änderungen an bereits versendeten Belegen (PDF-Editor nach dem Versand).
  onBelegMutated((art, id) => {
    const key = `${art}:${id}`;
    const alt = pending.get(key);
    if (alt) clearTimeout(alt);
    const t = setTimeout(() => {
      pending.delete(key);
      void enqueueAktuelleFassung(art, id, true).catch((e) =>
        console.error("drive auto-enqueue (update)", e),
      );
    }, UPDATE_DEBOUNCE_MS);
    if (typeof t.unref === "function") t.unref();
    pending.set(key, t);
  });
}

/** Nur für Tests: wartende Debounce-Timer sofort ausführen. */
export async function flushDriveAutoEnqueueForTests(): Promise<void> {
  const keys = [...pending.keys()];
  for (const key of keys) {
    const t = pending.get(key);
    if (t) clearTimeout(t);
    pending.delete(key);
    const [art, id] = key.split(":") as [BelegArt, string];
    await enqueueAktuelleFassung(art, id, true);
  }
}
