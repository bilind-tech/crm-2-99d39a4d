// Geplanter E-Mail-Versand: Planen, Verschieben, Abbrechen, Fälligkeit,
// Nachholen nach Ausfall, Fehler-Wiederholung — und die harte Garantie,
// dass nichts anderes als 'manuell' oder 'geplant' Mails erzeugen kann.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const DATA = mkdtempSync(path.join(tmpdir(), "mcc-mailplan-"));
process.env.DATA_DIR = DATA;
process.env.NODE_ENV = "development";
process.env.PORT = "0";
process.env.HOST = "127.0.0.1";

const { openDatabase, closeDatabase, getDatabase } = await import("../src/db/index.js");
const { ensureMasterKey } = await import("../src/crypto/masterkey.js");
const { config } = await import("../src/config.js");
const repo = await import("../src/email/geplant-repo.js");
const { enqueueVersand } = await import("../src/email/versand-repo.js");

function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true, mode: 0o700 });
}

beforeAll(() => {
  ensureMasterKey(config.keyPath);
  for (const d of [config.uploadsDir, config.backupsDir]) ensureDir(d);
  openDatabase(config.dbPath);
});

afterAll(() => {
  closeDatabase();
  rmSync(DATA, { recursive: true, force: true });
});

beforeEach(() => {
  getDatabase().prepare(`DELETE FROM email_geplant`).run();
});

let n = 0;
function plane(geplantFuer: Date) {
  n += 1;
  return repo.planeVersand({
    geplantFuer,
    empfaengerTo: "kunde@example.com",
    betreff: "Rechnung Juni",
    bodyHtml: "<p>Hallo</p>",
    belegArt: "rechnung",
    belegId: "r-1",
    idempotenzKey: `test-${n}-${Date.now()}`,
  }).row;
}

const inMinuten = (m: number) => new Date(Date.now() + m * 60_000);

describe("E-Mail planen", () => {
  it("legt eine Planung an und liefert sie als offen zurück", () => {
    const row = plane(inMinuten(60));
    expect(row.status).toBe("geplant");
    expect(row.verspaetet).toBe(false);
    const offen = repo.listGeplant({ nurOffen: true });
    expect(offen.map((r) => r.id)).toContain(row.id);
  });

  it("ist idempotent — derselbe Key legt keine zweite Mail an", () => {
    const key = `idem-${Date.now()}`;
    const a = repo.planeVersand({
      geplantFuer: inMinuten(30),
      empfaengerTo: "a@b.de",
      betreff: "x",
      bodyHtml: "<p>x</p>",
      idempotenzKey: key,
    });
    const b = repo.planeVersand({
      geplantFuer: inMinuten(30),
      empfaengerTo: "a@b.de",
      betreff: "x",
      bodyHtml: "<p>x</p>",
      idempotenzKey: key,
    });
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(b.row.id).toBe(a.row.id);
  });

  it("holt nur fällige Zeilen und beansprucht sie genau einmal", () => {
    const faellig = plane(inMinuten(-1));
    plane(inMinuten(120));
    const ersteRunde = repo.claimFaellige(10);
    expect(ersteRunde.map((r) => r.id)).toEqual([faellig.id]);
    // Zweiter Tick darf dieselbe Zeile nicht noch einmal bekommen.
    expect(repo.claimFaellige(10)).toEqual([]);
    expect(repo.getGeplant(faellig.id)?.status).toBe("sending");
  });

  it("holt nach einem Ausfall verpasste Termine nach", () => {
    const gestern = plane(new Date(Date.now() - 20 * 3600_000));
    const claimed = repo.claimFaellige(10);
    expect(claimed.map((r) => r.id)).toContain(gestern.id);
  });

  it("verschiebt und bricht nur offene Planungen ab", () => {
    const row = plane(inMinuten(60));
    const neu = repo.verschiebePlanung(row.id, inMinuten(180));
    expect(neu?.geplantFuer).not.toBe(row.geplantFuer);

    const weg = repo.planungAbbrechen(row.id);
    expect(weg?.status).toBe("abgebrochen");
    // Abgebrochene Mails gehen nie raus und sind nicht mehr verschiebbar.
    expect(repo.verschiebePlanung(row.id, inMinuten(200))).toBeNull();
    expect(repo.claimFaellige(10, repo.plusMinutenUtc(600))).toEqual([]);
  });

  it("wiederholt Fehler ein paar Mal und gibt dann auf", () => {
    const row = plane(inMinuten(-1));
    repo.claimFaellige(10);
    const nach1 = repo.markGeplantFehler(row.id, "SMTP weg");
    expect(nach1?.status).toBe("geplant");
    expect(nach1?.versuche).toBe(1);

    repo.markGeplantFehler(row.id, "SMTP weg");
    const nach3 = repo.markGeplantFehler(row.id, "SMTP weg");
    expect(nach3?.status).toBe("fehler");
    expect(nach3?.fehlerText).toContain("SMTP");

    // Der User kann sie neu ansetzen.
    const reaktiviert = repo.planungReaktivieren(row.id, inMinuten(30));
    expect(reaktiviert?.status).toBe("geplant");
    expect(reaktiviert?.versuche).toBe(0);
  });

  it("markiert einen deutlich verspäteten Versand als verspätet", () => {
    const row = plane(inMinuten(-90));
    repo.claimFaellige(10);
    const fertig = repo.markGeplantErfolg(row.id, "versand-1", true);
    expect(fertig?.status).toBe("gesendet");
    expect(fertig?.verspaetet).toBe(true);
    expect(fertig?.versandId).toBe("versand-1");
  });
});

describe("Auto-Mail-Sperre bleibt bestehen", () => {
  it("akzeptiert nur 'manuell' und 'geplant' als Quelle", () => {
    expect(() =>
      enqueueVersand({
        empfaengerTo: "x@y.de",
        betreff: "t",
        bodyHtml: "<p>t</p>",
        idempotenzKey: `q-${Date.now()}`,
        // @ts-expect-error absichtlich verbotene Quelle
        quelle: "cron",
      }),
    ).toThrow();

    const ok = enqueueVersand({
      empfaengerTo: "x@y.de",
      betreff: "t",
      bodyHtml: "<p>t</p>",
      idempotenzKey: `q-ok-${Date.now()}`,
      quelle: "geplant",
    });
    expect(ok.row.status).toBe("pending");
  });
});
