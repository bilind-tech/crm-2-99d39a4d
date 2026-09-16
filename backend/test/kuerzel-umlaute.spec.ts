// Kunden-Kürzel mit Umlauten: Format, Normalisierung, Eindeutigkeit, Belegnummer.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const DATA = mkdtempSync(path.join(tmpdir(), "mcc-kuerzel-"));
process.env.DATA_DIR = DATA;
process.env.NODE_ENV = "development";
process.env.PORT = "0";
process.env.HOST = "127.0.0.1";

const { openDatabase, closeDatabase } = await import("../src/db/index.js");
const { ensureMasterKey } = await import("../src/crypto/masterkey.js");
const { config } = await import("../src/config.js");
const { createKunde } = await import("../src/kunden/repo.js");
const { normalizeKuerzel, isKuerzelFormatOk, kuerzelUpper, findKuerzelOwner } = await import(
  "../src/kunden/kuerzel.js"
);
const { vergebeBelegnummer } = await import("../src/belege/belegnummer.js");

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

describe("Kürzel mit Umlauten", () => {
  it("schreibt groß, lässt ß unverändert", () => {
    expect(kuerzelUpper("grö")).toBe("GRÖ");
    expect(kuerzelUpper("stß")).toBe("STß");
    expect(normalizeKuerzel(" müß ")).toBe("MÜß");
    expect(normalizeKuerzel("")).toBeNull();
  });

  it("akzeptiert Ä Ö Ü ß, lehnt anderes ab", () => {
    expect(isKuerzelFormatOk("GRÖ")).toBe(true);
    expect(isKuerzelFormatOk("MÜß1")).toBe(true);
    expect(isKuerzelFormatOk("AB-C")).toBe(false);
    expect(isKuerzelFormatOk("ÉAB")).toBe(false);
  });

  it("erkennt Doppelvergabe unabhängig von Groß/Klein", () => {
    const k = createKunde({
      typ: "firma",
      firmenname: "Größer GmbH",
      kuerzel: "grö",
    } as Parameters<typeof createKunde>[0]);
    expect(k.kuerzel).toBe("GRÖ");
    const owner = findKuerzelOwner(normalizeKuerzel("grö")!);
    expect(owner?.id).toBe(k.id);
    expect(findKuerzelOwner("GRÖ", k.id)).toBeNull();
  });

  it("nutzt das Umlaut-Kürzel in der Belegnummer", () => {
    const k = createKunde({
      typ: "firma",
      firmenname: "Müßig GmbH",
      kuerzel: "müß",
    } as Parameters<typeof createKunde>[0]);
    const { nummer } = vergebeBelegnummer(k.id, "rechnung");
    expect(nummer.startsWith("MÜß")).toBe(true);
  });
});
