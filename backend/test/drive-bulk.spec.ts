import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const DATA = mkdtempSync(path.join(tmpdir(), "mcc-drive-bulk-"));
process.env.DATA_DIR = DATA;
process.env.NODE_ENV = "development";

const { openDatabase, closeDatabase, getDatabase } = await import("../src/db/index.js");
const { ensureMasterKey } = await import("../src/crypto/masterkey.js");
const { config } = await import("../src/config.js");
const { createKunde } = await import("../src/kunden/repo.js");
const { createAngebot } = await import("../src/belege/angebote-repo.js");
const { createRechnung } = await import("../src/belege/rechnungen-repo.js");
const { backfillOneDetailed } = await import("../src/drive/backfill.js");
const { getBySha } = await import("../src/drive/upload-repo.js");

function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true, mode: 0o700 });
}

let kundeId = "";
beforeAll(() => {
  ensureMasterKey(config.keyPath);
  for (const d of [config.uploadsDir, config.backupsDir, config.backupsDailyDir, config.backupsWeeklyDir, config.backupsMonthlyDir, config.backupsSafetyDir, config.backupsTmpDir]) ensureDir(d);
  openDatabase(config.dbPath);
  kundeId = createKunde({ typ: "firma", firmenname: "Bulk Drive GmbH", kuerzel: "BDG" }).id;
});

afterAll(() => {
  closeDatabase();
  rmSync(DATA, { recursive: true, force: true });
});

describe("Drive-Sammelupload", () => {
  it("reiht auch bewusst ausgewählte Entwürfe ein und bleibt je Fassung idempotent", async () => {
    const rechnung = createRechnung({ kundeId, titel: "Entwurf Rechnung", positionen: [{ beschreibung: "R", menge: 1, einzelpreisNetto: 100 }] });
    const angebot = createAngebot({ kundeId, titel: "Entwurf Angebot", positionen: [{ beschreibung: "A", menge: 1, einzelpreisNetto: 50 }] });

    const firstR = await backfillOneDetailed("rechnung", rechnung.id);
    const firstA = await backfillOneDetailed("angebot", angebot.id);
    expect(firstR.created).toBe(true);
    expect(firstA.created).toBe(true);
    expect(getBySha("rechnung", rechnung.id, firstR.pdfSha256 ?? "")?.status).toBe("pending");
    expect(getBySha("angebot", angebot.id, firstA.pdfSha256 ?? "")?.status).toBe("pending");

    const secondR = await backfillOneDetailed("rechnung", rechnung.id);
    const secondA = await backfillOneDetailed("angebot", angebot.id);
    expect(secondR.created).toBe(false);
    expect(secondA.created).toBe(false);
    const counts = getDatabase().prepare(
      `SELECT beleg_art AS art, COUNT(*) AS n FROM drive_upload_queue WHERE beleg_id IN (?, ?) GROUP BY beleg_art`,
    ).all(rechnung.id, angebot.id) as { art: string; n: number }[];
    expect(counts).toEqual(expect.arrayContaining([{ art: "angebot", n: 1 }, { art: "rechnung", n: 1 }]));
  });
});