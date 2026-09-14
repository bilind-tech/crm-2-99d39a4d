// Repository für geplanten E-Mail-Versand.
//
// SICHERHEIT: Eine Zeile hier entsteht AUSSCHLIESSLICH durch einen direkten
// User-Klick im Versand-Dialog ("Später senden") — mit Empfänger, Text und
// Zeitpunkt, die der User selbst bestätigt hat. Es gibt keinen Trigger, keinen
// Statuswechsel und keinen Hook, der hier etwas einfügt.
//
// Alle Zeitstempel sind UTC im SQLite-Format 'YYYY-MM-DD HH:MM:SS'.

import crypto from "node:crypto";
import { getDatabase } from "../db/index.js";
import { emit } from "../events/bus.js";

export type EmailGeplantStatus =
  | "geplant"
  | "sending"
  | "gesendet"
  | "fehler"
  | "abgebrochen";

export type BelegArt = "angebot" | "rechnung";

export interface EmailGeplant {
  id: string;
  geplantFuer: string;
  empfaengerTo: string;
  empfaengerCc?: string | null;
  empfaengerBcc?: string | null;
  betreff: string;
  bodyHtml: string;
  belegArt?: BelegArt | null;
  belegId?: string | null;
  vorlageId?: string | null;
  signaturId?: string | null;
  idempotenzKey: string;
  status: EmailGeplantStatus;
  versuche: number;
  verspaetet: boolean;
  versandId?: string | null;
  versendetAm?: string | null;
  fehlerText?: string | null;
  angelegtVon?: string | null;
  erstelltAm: string;
  geaendertAm: string;
}

interface Row {
  id: string;
  geplant_fuer: string;
  empfaenger_to: string;
  empfaenger_cc: string | null;
  empfaenger_bcc: string | null;
  betreff: string;
  body_html: string;
  beleg_art: BelegArt | null;
  beleg_id: string | null;
  vorlage_id: string | null;
  signatur_id: string | null;
  idempotenz_key: string;
  status: EmailGeplantStatus;
  versuche: number;
  verspaetet: number;
  versand_id: string | null;
  versendet_am: string | null;
  fehler_text: string | null;
  angelegt_von: string | null;
  erstellt_am: string;
  geaendert_am: string;
}

const map = (r: Row): EmailGeplant => ({
  id: r.id,
  geplantFuer: r.geplant_fuer,
  empfaengerTo: r.empfaenger_to,
  empfaengerCc: r.empfaenger_cc,
  empfaengerBcc: r.empfaenger_bcc,
  betreff: r.betreff,
  bodyHtml: r.body_html,
  belegArt: r.beleg_art,
  belegId: r.beleg_id,
  vorlageId: r.vorlage_id,
  signaturId: r.signatur_id,
  idempotenzKey: r.idempotenz_key,
  status: r.status,
  versuche: r.versuche,
  verspaetet: r.verspaetet === 1,
  versandId: r.versand_id,
  versendetAm: r.versendet_am,
  fehlerText: r.fehler_text,
  angelegtVon: r.angelegt_von,
  erstelltAm: r.erstellt_am,
  geaendertAm: r.geaendert_am,
});

/** Aktuelle UTC-Zeit im SQLite-Format. */
export function nowUtc(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/** Beliebige Date/ISO-Eingabe -> UTC 'YYYY-MM-DD HH:MM:SS'. */
export function toUtcStamp(input: string | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) throw new Error("Ungültiger Zeitpunkt");
  return d.toISOString().slice(0, 19).replace("T", " ");
}

/** Minuten auf einen UTC-Stempel addieren. */
export function plusMinutenUtc(min: number, from: Date = new Date()): string {
  return toUtcStamp(new Date(from.getTime() + min * 60_000));
}

export interface PlanInput {
  geplantFuer: string | Date;
  empfaengerTo: string;
  empfaengerCc?: string;
  empfaengerBcc?: string;
  betreff: string;
  bodyHtml: string;
  belegArt?: BelegArt;
  belegId?: string;
  vorlageId?: string;
  signaturId?: string;
  idempotenzKey: string;
  angelegtVon?: string | null;
}

function emitChanged(row: EmailGeplant): void {
  emit("email:geplant-changed", {
    id: row.id,
    status: row.status,
    belegArt: row.belegArt ?? null,
    belegId: row.belegId ?? null,
    geplantFuer: row.geplantFuer,
  });
}

/** Legt eine geplante Mail an. Idempotent über `idempotenzKey`. */
export function planeVersand(input: PlanInput): { row: EmailGeplant; created: boolean } {
  const db = getDatabase();
  const existing = db
    .prepare(`SELECT * FROM email_geplant WHERE idempotenz_key = ?`)
    .get(input.idempotenzKey) as Row | undefined;
  if (existing) return { row: map(existing), created: false };

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO email_geplant (
       id, geplant_fuer, empfaenger_to, empfaenger_cc, empfaenger_bcc,
       betreff, body_html, beleg_art, beleg_id, vorlage_id, signatur_id,
       idempotenz_key, status, angelegt_von
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'geplant',?)`,
  ).run(
    id,
    toUtcStamp(input.geplantFuer),
    input.empfaengerTo,
    input.empfaengerCc ?? null,
    input.empfaengerBcc ?? null,
    input.betreff,
    input.bodyHtml,
    input.belegArt ?? null,
    input.belegId ?? null,
    input.vorlageId ?? null,
    input.signaturId ?? null,
    input.idempotenzKey,
    input.angelegtVon ?? null,
  );
  const row = getGeplant(id)!;
  emitChanged(row);
  return { row, created: true };
}

export function getGeplant(id: string): EmailGeplant | null {
  const r = getDatabase().prepare(`SELECT * FROM email_geplant WHERE id = ?`).get(id) as
    | Row
    | undefined;
  return r ? map(r) : null;
}

export interface GeplantFilter {
  status?: EmailGeplantStatus;
  /** Nur offene Planungen (geplant + gerade laufend). */
  nurOffen?: boolean;
  belegId?: string;
  belegArt?: BelegArt;
  limit?: number;
}

export function listGeplant(f: GeplantFilter = {}): EmailGeplant[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.status) {
    where.push("status = ?");
    params.push(f.status);
  } else if (f.nurOffen) {
    where.push("status IN ('geplant','sending')");
  }
  if (f.belegId) {
    where.push("beleg_id = ?");
    params.push(f.belegId);
  }
  if (f.belegArt) {
    where.push("beleg_art = ?");
    params.push(f.belegArt);
  }
  const sql = `SELECT * FROM email_geplant
               ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY geplant_fuer ASC LIMIT ?`;
  params.push(f.limit ?? 200);
  return (getDatabase().prepare(sql).all(...params) as Row[]).map(map);
}

/** Verschiebt eine noch offene Planung auf einen neuen Zeitpunkt. */
export function verschiebePlanung(id: string, geplantFuer: string | Date): EmailGeplant | null {
  const stamp = toUtcStamp(geplantFuer);
  const changed = getDatabase()
    .prepare(
      `UPDATE email_geplant
         SET geplant_fuer = ?, fehler_text = NULL, geaendert_am = datetime('now')
       WHERE id = ? AND status = 'geplant'`,
    )
    .run(stamp, id).changes;
  if (!changed) return null;
  const row = getGeplant(id)!;
  emitChanged(row);
  return row;
}

/** Bricht eine offene Planung ab — es geht dann nichts raus. */
export function planungAbbrechen(id: string): EmailGeplant | null {
  const changed = getDatabase()
    .prepare(
      `UPDATE email_geplant
         SET status = 'abgebrochen', geaendert_am = datetime('now')
       WHERE id = ? AND status = 'geplant'`,
    )
    .run(id).changes;
  if (!changed) return null;
  const row = getGeplant(id)!;
  emitChanged(row);
  return row;
}

/**
 * Holt fällige Planungen und setzt sie atomar auf 'sending'.
 * Der UPDATE ist mit `status='geplant'` abgesichert — zwei parallele Ticks
 * können dieselbe Zeile niemals beide beanspruchen.
 */
export function claimFaellige(limit = 5, jetzt: string = nowUtc()): EmailGeplant[] {
  const db = getDatabase();
  const claimed: EmailGeplant[] = [];
  const tx = db.transaction(() => {
    const due = db
      .prepare(
        `SELECT * FROM email_geplant
          WHERE status = 'geplant' AND geplant_fuer <= ?
          ORDER BY geplant_fuer ASC LIMIT ?`,
      )
      .all(jetzt, limit) as Row[];
    for (const r of due) {
      const ok = db
        .prepare(
          `UPDATE email_geplant SET status='sending', geaendert_am=datetime('now')
            WHERE id = ? AND status = 'geplant'`,
        )
        .run(r.id).changes;
      if (ok) claimed.push(map({ ...r, status: "sending" }));
    }
  });
  tx();
  return claimed;
}

/** Erfolgreich versendet. `verspaetet` = ging deutlich später raus als geplant. */
export function markGeplantErfolg(
  id: string,
  versandId: string,
  verspaetet: boolean,
): EmailGeplant | null {
  getDatabase()
    .prepare(
      `UPDATE email_geplant
         SET status='gesendet', versand_id=?, versendet_am=datetime('now'),
             verspaetet=?, fehler_text=NULL, versuche = versuche + 1,
             geaendert_am=datetime('now')
       WHERE id = ?`,
    )
    .run(versandId, verspaetet ? 1 : 0, id);
  const row = getGeplant(id);
  if (row) emitChanged(row);
  return row;
}

/** Maximal so viele automatische Wiederholungen bei technischen Fehlern. */
export const MAX_VERSUCHE = 3;
/** Wartezeit zwischen zwei Versuchen (Minuten). */
export const RETRY_MINUTEN = 5;

/**
 * Versand fehlgeschlagen. Bis `MAX_VERSUCHE` wird automatisch in wenigen
 * Minuten erneut versucht (typisch: Internet kurz weg). Danach bleibt die
 * Mail sichtbar auf 'fehler' liegen und wartet auf den User.
 */
export function markGeplantFehler(id: string, fehler: string): EmailGeplant | null {
  const cur = getGeplant(id);
  if (!cur) return null;
  const versuche = cur.versuche + 1;
  const db = getDatabase();
  if (versuche < MAX_VERSUCHE) {
    db.prepare(
      `UPDATE email_geplant
         SET status='geplant', geplant_fuer=?, versuche=?, fehler_text=?,
             geaendert_am=datetime('now')
       WHERE id = ?`,
    ).run(plusMinutenUtc(RETRY_MINUTEN), versuche, fehler.slice(0, 1000), id);
  } else {
    db.prepare(
      `UPDATE email_geplant
         SET status='fehler', versuche=?, fehler_text=?, geaendert_am=datetime('now')
       WHERE id = ?`,
    ).run(versuche, fehler.slice(0, 1000), id);
  }
  const row = getGeplant(id);
  if (row) emitChanged(row);
  return row;
}

/** Setzt eine fehlgeschlagene/abgebrochene Planung wieder auf 'geplant'. */
export function planungReaktivieren(id: string, geplantFuer: string | Date): EmailGeplant | null {
  const changed = getDatabase()
    .prepare(
      `UPDATE email_geplant
         SET status='geplant', geplant_fuer=?, versuche=0, fehler_text=NULL,
             geaendert_am=datetime('now')
       WHERE id = ? AND status IN ('fehler','abgebrochen')`,
    )
    .run(toUtcStamp(geplantFuer), id).changes;
  if (!changed) return null;
  const row = getGeplant(id)!;
  emitChanged(row);
  return row;
}
