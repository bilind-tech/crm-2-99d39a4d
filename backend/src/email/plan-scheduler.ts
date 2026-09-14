// Scheduler für vom User GEPLANTE E-Mails.
//
// ABSOLUTE REGEL bleibt bestehen: Es geht nur raus, was der User selbst
// angelegt hat. Dieser Scheduler erfindet keine Mails — er schickt exakt die
// Zeilen aus `email_geplant` los, die der User im Versand-Dialog mit
// Empfänger, Text und Zeitpunkt bestätigt hat. Mahnautomatik, Statuswechsel
// oder andere Trigger haben hier keinen Zugang.
//
// Tickt jede Minute. Verpasste Zeitpunkte (Pi war aus) werden beim nächsten
// Start nachgeholt und als „verspätet" markiert.

import {
  claimFaellige,
  getGeplant,
  markGeplantErfolg,
  markGeplantFehler,
  nowUtc,
  verschiebePlanung,
  type EmailGeplant,
} from "./geplant-repo.js";
import { enqueueVersand, getById } from "./versand-repo.js";
import { sendNow } from "./worker.js";
import { loadSmtpRuntime } from "./transport.js";
import { markBelegVersendet } from "../belege/versand-status.js";
import { audit } from "../auth/audit.js";

const TICK_MS = 60_000;
/** Mehr als so viele Minuten nach dem Wunschtermin = „verspätet". */
const VERSPAETET_AB_MIN = 5;
/** Pro Tick maximal so viele Mails — schützt vor Stau nach langem Ausfall. */
const MAX_PRO_TICK = 5;

let timer: NodeJS.Timeout | null = null;
let laeuft = false;

function istVerspaetet(row: EmailGeplant): boolean {
  const soll = Date.parse(row.geplantFuer.replace(" ", "T") + "Z");
  if (Number.isNaN(soll)) return false;
  return Date.now() - soll > VERSPAETET_AB_MIN * 60_000;
}

/** Verschickt genau eine bereits beanspruchte (status='sending') Planung. */
export async function sendeGeplanteZeile(row: EmailGeplant): Promise<{ ok: boolean; error?: string }> {
  const rt = loadSmtpRuntime();
  if (!rt || !rt.smtp?.host || !rt.smtp?.user || !rt.passwordIsSet) {
    const msg = "SMTP ist nicht konfiguriert — geplante E-Mail konnte nicht versendet werden.";
    markGeplantFehler(row.id, msg);
    return { ok: false, error: msg };
  }

  let versandId: string;
  try {
    const { row: versand } = enqueueVersand({
      empfaengerTo: row.empfaengerTo,
      empfaengerCc: row.empfaengerCc ?? undefined,
      empfaengerBcc: row.empfaengerBcc ?? undefined,
      betreff: row.betreff,
      bodyHtml: row.bodyHtml,
      belegArt: row.belegArt ?? undefined,
      belegId: row.belegId ?? undefined,
      vorlageId: row.vorlageId ?? undefined,
      signaturId: row.signaturId ?? undefined,
      idempotenzKey: `plan-${row.id}`,
      quelle: "geplant",
    });
    versandId = versand.id;
    if (versand.status === "gesendet") {
      // Schon raus (z. B. doppelter Tick) — nicht erneut senden.
      markGeplantErfolg(row.id, versand.id, istVerspaetet(row));
      return { ok: true };
    }
    const result = await sendNow(versand);
    if (!result.ok) {
      markGeplantFehler(row.id, result.error ?? "Unbekannter Fehler beim Versand");
      audit({
        action: "email.geplant.fehler",
        detail: { geplantId: row.id, versandId, error: result.error ?? null },
      });
      return { ok: false, error: result.error };
    }
    markBelegVersendet(row.belegArt ?? null, row.belegId ?? null);
    const verspaetet = istVerspaetet(row);
    markGeplantErfolg(row.id, versandId, verspaetet);
    audit({
      action: "email.geplant.gesendet",
      detail: {
        geplantId: row.id,
        versandId,
        an: row.empfaengerTo,
        belegArt: row.belegArt ?? null,
        belegId: row.belegId ?? null,
        geplantFuer: row.geplantFuer,
        verspaetet,
        messageId: getById(versandId)?.messageId ?? null,
      },
    });
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message ?? "Unbekannter Fehler";
    markGeplantFehler(row.id, msg);
    audit({ action: "email.geplant.fehler", detail: { geplantId: row.id, error: msg } });
    return { ok: false, error: msg };
  }
}

/** Ein Durchlauf: fällige Planungen holen und versenden. */
export async function tickGeplanteMails(
  jetzt: string = nowUtc(),
): Promise<{ gesendet: number; fehler: number }> {
  const faellig = claimFaellige(MAX_PRO_TICK, jetzt);
  let gesendet = 0;
  let fehler = 0;
  for (const row of faellig) {
    const res = await sendeGeplanteZeile(row);
    if (res.ok) gesendet++;
    else fehler++;
  }
  return { gesendet, fehler };
}

/** Sofort senden — vom User im UI ausgelöst („Jetzt senden"). */
export async function sendeGeplantJetzt(id: string): Promise<{ ok: boolean; error?: string }> {
  const cur = getGeplant(id);
  if (!cur) return { ok: false, error: "not-found" };
  if (cur.status !== "geplant") return { ok: false, error: "nicht-geplant" };
  // Termin auf jetzt vorziehen und über den regulären Claim-Pfad holen — so
  // kann ein paralleler Tick dieselbe Zeile niemals doppelt senden.
  verschiebePlanung(id, new Date());
  const treffer = claimFaellige(MAX_PRO_TICK, nowUtc()).find((r) => r.id === id);
  if (!treffer) return { ok: false, error: "bereits-in-arbeit" };
  return sendeGeplanteZeile(treffer);
}

export function startGeplantScheduler(): void {
  if (timer) return;
  const run = (): void => {
    if (laeuft) return;
    laeuft = true;
    void tickGeplanteMails()
      .catch((e) => console.error("geplante Mails: Tick fehlgeschlagen", e))
      .finally(() => {
        laeuft = false;
      });
  };
  // Kurz nach dem Start einmal laufen — holt verpasste Termine nach.
  const first = setTimeout(run, 10_000);
  first.unref?.();
  timer = setInterval(run, TICK_MS);
  timer.unref?.();
}

export function stopGeplantScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
