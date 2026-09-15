// Prüft: Änderungen an einem bereits VERSENDETEN Beleg landen erneut in der
// Drive-Warteschlange (aktualisierte Fassung), Entwürfe dagegen nie.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const DATA = mkdtempSync(path.join(tmpdir(), "mcc-drive-enqueue-"));
process.env.DATA_DIR = DATA;
process.env.NODE_ENV = "development";
process.env.PORT = "0";
process.env.HOST = "127.0.0.1";

const { openDatabase, closeDatabase, getDatabase } = await import("../src/db/index.js");
const { ensureMasterKey } = await import("../src/crypto/masterkey.js");
const { config } = await import("../src/config.js");
const { createKunde } = await import("../src/kunden/repo.js");
const { createRechnung, updateRechnung, sendeRechnung } = await import(
  "../src/belege/rechnungen-repo.js"
);
const { wireDriveAutoEnqueue, flushDriveAutoEnqueueForTests } = await import(
  "../src/drive/auto-enqueue.js"
);
const { wirePdfCacheInvalidation } = await import("../src/pdf/wireup.js");

function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true, mode: 0o700 });
}

function queueCount(belegId: string): number {
  const r = getDatabase()
    .prepare(`SELECT COUNT(*) AS n FROM drive_upload_queue WHERE beleg_id = ?`)
    .get(belegId) as { n: number };
  return r.n;
}

let kundeId = "";

beforeAll(() => {
  ensureMasterKey(config.keyPath);
  for (const d of [
    config.uploadsDir,
    config.backupsDir,
    config.backupsDailyDir,
    config.backupsWeeklyDir,
    config.backupsMonthlyDir,
    config.backupsSafetyDir,
    config.backupsTmpDir,
  ]) ensureDir(d);
  openDatabase(config.dbPath);
  wirePdfCacheInvalidation();
  wireDriveAutoEnqueue();
  kundeId = createKunde({ typ: "firma", firmenname: "Drive Test GmbH", kuerzel: "DTG" }).id;
});

afterAll(() => {
  closeDatabase();
  rmSync(DATA, { recursive: true, force: true });
});

describe("Drive-Auto-Enqueue nach Bearbeitung", () => {
  it("Entwurf-Änderung erzeugt keinen Upload", async () => {
    const r = createRechnung({
      kundeId,
      titel: "Entwurf",
      positionen: [{ bezeichnung: "Reinigung", menge: 1, einzelpreis: 100 }],
    });
    updateRechnung(r.id, { titel: "Entwurf geändert" });
    await flushDriveAutoEnqueueForTests();
    expect(queueCount(r.id)).toBe(0);
  });

  it("Änderung an versendeter Rechnung erzeugt genau einen Upload je Fassung", async () => {
    const r = createRechnung({
      kundeId,
      titel: "Versendet",
      positionen: [{ bezeichnung: "Reinigung", menge: 1, einzelpreis: 100 }],
    });
    sendeRechnung(r.id);
    await flushDriveAutoEnqueueForTests();
    const nachVersand = queueCount(r.id);

    updateRechnung(r.id, { titel: "Versendet – korrigiert" });
    await flushDriveAutoEnqueueForTests();
    expect(queueCount(r.id)).toBe(nachVersand + 1);

    // Gleiche Fassung erneut: keine zweite Zeile (Idempotenz über PDF-Hash).
    await flushDriveAutoEnqueueForTests();
    expect(queueCount(r.id)).toBe(nachVersand + 1);
  });
});
