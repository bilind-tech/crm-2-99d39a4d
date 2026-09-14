// Belegnummern laufen pro (Kunde, Belegart) durchgehend weiter —
// kein Reset beim Monats- oder Jahreswechsel.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const DATA = mkdtempSync(path.join(tmpdir(), "mcc-belegnr-"));
process.env.DATA_DIR = DATA;
process.env.NODE_ENV = "development";
process.env.PORT = "0";
process.env.HOST = "127.0.0.1";

const { openDatabase, closeDatabase, getDatabase } = await import("../src/db/index.js");
const { ensureMasterKey } = await import("../src/crypto/masterkey.js");
const { config } = await import("../src/config.js");
const { createKunde } = await import("../src/kunden/repo.js");
const { vergebeBelegnummer, importScanZaehler } = await import(
  "../src/belege/belegnummer.js"
);
const { peekBelegNummer, setBelegNummerStart } = await import(
  "../src/kunden/nummern.js"
);

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

function neuerKunde(kuerzel: string) {
  return createKunde({
    typ: "firma",
    firmenname: `${kuerzel} GmbH`,
    kuerzel,
  } as Parameters<typeof createKunde>[0]);
}

describe("Belegnummer durchlaufend", () => {
  it("zählt über Monats- und Jahreswechsel weiter", () => {
    const k = neuerKunde("DUR");
    const a = vergebeBelegnummer(k.id, "rechnung", new Date(2026, 8, 10)); // Sept 26
    const b = vergebeBelegnummer(k.id, "rechnung", new Date(2026, 8, 20));
    const c = vergebeBelegnummer(k.id, "rechnung", new Date(2026, 9, 1)); // Okt 26
    const d = vergebeBelegnummer(k.id, "rechnung", new Date(2027, 0, 5)); // Jan 27

    expect(a.nummer).toBe("DUR0926/01");
    expect(b.nummer).toBe("DUR0926/02");
    expect(c.nummer).toBe("DUR1026/03");
    expect(d.nummer).toBe("DUR0127/04");
  });

  it("hält Angebot- und Rechnungszähler getrennt", () => {
    const k = neuerKunde("SEP");
    expect(vergebeBelegnummer(k.id, "rechnung", new Date(2026, 4, 1)).nummer).toBe(
      "SEP0526/01",
    );
    expect(vergebeBelegnummer(k.id, "angebot", new Date(2026, 4, 1)).nummer).toBe(
      "SEP0526/01",
    );
    expect(vergebeBelegnummer(k.id, "rechnung", new Date(2026, 5, 1)).nummer).toBe(
      "SEP0626/02",
    );
    expect(vergebeBelegnummer(k.id, "angebot", new Date(2026, 6, 1)).nummer).toBe(
      "SEP0726/02",
    );
  });

  it("manuelle Korrektur des Startwerts bleibt exakt erhalten", () => {
    const k = neuerKunde("MAN");
    setBelegNummerStart(k.id, "rechnung", undefined, 42);
    expect(peekBelegNummer(k.id, "rechnung")).toBe(42);
    expect(vergebeBelegnummer(k.id, "rechnung", new Date(2026, 2, 3)).nummer).toBe(
      "MAN0326/42",
    );
    setBelegNummerStart(k.id, "rechnung", undefined, 5);
    expect(peekBelegNummer(k.id, "rechnung")).toBe(5);
  });

  it("Import-Scan hebt den Zähler über die höchste vorhandene Nummer — periodenübergreifend", () => {
    const k = neuerKunde("IMP");
    const db = getDatabase();
    // Bestandsbelege direkt einfügen (simuliert Daten aus der Zeit vor dem Update).
    for (const [nummer, datum] of [
      ["IMP0126/07", "2026-01-15"],
      ["IMP0226/03", "2026-02-15"],
    ] as const) {
      db.prepare(
        `INSERT INTO rechnung (id, nummer, kunde_id, status, rechnungsdatum, faelligkeitsdatum)
         VALUES (?, ?, ?, 'entwurf', ?, ?)`,
      ).run(`rid-${nummer}`, nummer, k.id, datum, datum);
    }
    importScanZaehler();
    expect(peekBelegNummer(k.id, "rechnung")).toBe(8);
    expect(vergebeBelegnummer(k.id, "rechnung", new Date(2026, 2, 1)).nummer).toBe(
      "IMP0326/08",
    );
  });
});
