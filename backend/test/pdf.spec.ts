// Smoke-Test für Step 5: PDF-Rendering + Cache.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const DATA = mkdtempSync(path.join(tmpdir(), "mcc-pdf-"));
process.env.DATA_DIR = DATA;
process.env.NODE_ENV = "development";

const { openDatabase, closeDatabase } = await import("../src/db/index.js");
const { ensureMasterKey } = await import("../src/crypto/masterkey.js");
const { config } = await import("../src/config.js");
const { setSetting } = await import("../src/settings/store.js");
const { createKunde } = await import("../src/kunden/repo.js");
const { createAngebot, updateAngebot } = await import("../src/belege/angebote-repo.js");
const { createRechnung } = await import("../src/belege/rechnungen-repo.js");
const { renderAngebotPdf, renderRechnungPdf } = await import("../src/pdf/belegPdf.server.js");
const { rechnungDocDef } = await import("../src/pdf/layout.js");
const { wirePdfCacheInvalidation } = await import("../src/pdf/wireup.js");
const { brandingDir, loadFirmaForPdf, loadLogoDataUrl } = await import("../src/pdf/firma.js");

function ensureDir(p: string) { if (!existsSync(p)) mkdirSync(p, { recursive: true, mode: 0o700 }); }

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

beforeAll(() => {
  ensureMasterKey(config.keyPath);
  for (const d of [config.uploadsDir, config.backupsDir, config.backupsDailyDir,
    config.backupsWeeklyDir, config.backupsMonthlyDir, config.backupsSafetyDir,
    config.backupsTmpDir]) ensureDir(d);
  openDatabase(config.dbPath);
  wirePdfCacheInvalidation();
  setSetting("firma", {
    name: "My Clean Center GmbH", strasse: "Hauptstr. 1", plz: "53757", ort: "Sankt Augustin",
    telefon: "02241/000000", email: "info@mcc.de", web: "https://mcc.de",
    ustId: "DE123456789", geschaeftsfuehrer: "Max Mustermann",
    bankName: "Sparkasse", iban: "DE12...", bic: "WELADEDD",
  });
});

afterAll(() => { closeDatabase(); rmSync(DATA, { recursive: true, force: true }); });

describe("PDF-Rendering", () => {
  it("Angebot: liefert gültiges PDF mit Belegnummer im Dateinamen", async () => {
    const k = createKunde({ typ: "firma", firmenname: "Acme GmbH", kuerzel: "ACM" });
    const a = createAngebot({
      kundeId: k.id, titel: "Treppenhausreinigung",
      positionen: [{ beschreibung: "Wischen", menge: 2, einzelpreisNetto: 50, steuersatz: 19 }],
    });
    const r = await renderAngebotPdf(a.id);
    expect(r).not.toBeNull();
    expect(r!.buffer.length).toBeGreaterThan(500);
    expect(r!.buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(r!.dateiname).toContain(a.nummer.replace(/\//g, "-"));
    expect(r!.dateiname).toContain("Acme");
    expect(r!.fromCache).toBe(false);
  });

  it("Cache: zweiter Aufruf kommt aus Cache mit identischen Bytes", async () => {
    const k = createKunde({ typ: "firma", firmenname: "Beta GmbH", kuerzel: "BET" });
    const a = createAngebot({ kundeId: k.id, titel: "X",
      positionen: [{ beschreibung: "P", menge: 1, einzelpreisNetto: 10 }] });
    const r1 = await renderAngebotPdf(a.id);
    const r2 = await renderAngebotPdf(a.id);
    expect(r1!.fromCache).toBe(false);
    expect(r2!.fromCache).toBe(true);
    expect(r2!.hash).toBe(r1!.hash);
    expect(Buffer.compare(r1!.buffer, r2!.buffer)).toBe(0);
  });

  it("Cache wird bei Mutation invalidiert (neuer Hash)", async () => {
    const k = createKunde({ typ: "firma", firmenname: "Gamma GmbH", kuerzel: "GAM" });
    const a = createAngebot({ kundeId: k.id, titel: "Y",
      positionen: [{ beschreibung: "P", menge: 1, einzelpreisNetto: 10 }] });
    const r1 = await renderAngebotPdf(a.id);
    updateAngebot(a.id, {
      positionen: [{ beschreibung: "P-neu", menge: 5, einzelpreisNetto: 99, steuersatz: 19 }],
    });
    const r2 = await renderAngebotPdf(a.id);
    expect(r2!.hash).not.toBe(r1!.hash);
    expect(r2!.fromCache).toBe(false);
    // Nur die aktuelle Cache-Datei soll übrig sein
    const dir = path.join(config.dataDir, "pdf-cache", "angebot");
    const matching = readdirSync(dir).filter((f) => f.startsWith(`${a.id}-`));
    expect(matching).toHaveLength(1);
  });

  it("Rechnung: rendert ebenfalls gültiges PDF", async () => {
    const k = createKunde({ typ: "firma", firmenname: "Delta GmbH", kuerzel: "DEL" });
    const r = createRechnung({ kundeId: k.id, titel: "Re-Test",
      positionen: [{ beschreibung: "Service", menge: 1, einzelpreisNetto: 100, steuersatz: 19 }] });
    const out = await renderRechnungPdf(r.id);
    expect(out!.buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(out!.dateiname).toContain(r.nummer.replace(/\//g, "-"));
  });

  it("Rechnung: zeichnet Tabellenkanten einheitlich und ohne doppelte Summenlinie", () => {
    const k = createKunde({ typ: "firma", firmenname: "Linien GmbH", kuerzel: "LIN" });
    const r = createRechnung({ kundeId: k.id, titel: "Linien-Test",
      positionen: [{ beschreibung: "Service", menge: 1, einzelpreisNetto: 100, steuersatz: 19 }] });
    const doc = rechnungDocDef({
      rechnung: r,
      kunde: k,
      firma: loadFirmaForPdf(),
      logoDataUrl: null,
    }) as any;

    const meta = doc.content[0].columns[1];
    const kundeSpalte = doc.content[0].columns[0];
    const absender = kundeSpalte.stack[0];
    const titel = doc.content[1];
    expect(kundeSpalte.width).toBe(230);
    expect(absender.noWrap).toBe(true);
    expect(absender.fontSize).toBeLessThanOrEqual(8);
    expect(titel.fontSize).toBe(19);
    expect(titel.margin).toEqual([0, 30, 0, 17.75]);
    expect(meta.layout.hLineWidth(0, meta)).toBe(0.6);
    expect(meta.layout.hLineWidth(1, meta)).toBe(0);
    // Mehr Luft zwischen oberer Rahmenlinie und „Bei Zahlung bitte" (6 + 5),
    // ohne dass sich der Kasten verschiebt (Ausgleich über negativen Rand).
    expect(meta.layout.paddingTop(0, meta)).toBe(11);
    expect(meta.margin[1]).toBe(-5);
    expect(meta.width).toBe(210);
    expect(doc.content[0].columnGap).toBe(45);
    expect(meta.table.body.some((row: any[]) => row[0]?.text === "Kundennummer:" && row[1]?.text === k.nummer)).toBe(true);

    const positions = doc.content[3].stack[0];
    const summen = doc.content[3].stack[1];
    expect(positions.layout.hLineWidth(0, positions)).toBe(0.8);
    expect(positions.layout.hLineWidth(positions.table.body.length, positions)).toBe(0);
    expect(summen.layout.hLineWidth(0, summen)).toBe(0.8);
    expect(summen.layout.vLineWidth(0, summen)).toBe(0.8);
    // Ohne Raster-Plan: Standard-Innenabstände.
    expect(summen.layout.paddingTop(0)).toBe(6);
    expect(summen.layout.paddingBottom(0)).toBe(6);
    expect(positions.table.body[0].every((cell: { bold?: boolean }) => cell.bold !== true)).toBe(true);
    expect(summen.table.body.at(-1)[0].bold).toBe(true);
  });

  it("Empfänger-Modus: hebt nur den Kopfbereich an und gleicht den Titelabstand aus", () => {
    const k = createKunde({ typ: "firma", firmenname: "Oben GmbH", kuerzel: "OBE" });
    const r = createRechnung({ kundeId: k.id, titel: "Oben-Test",
      positionen: [{ beschreibung: "Service", menge: 1, einzelpreisNetto: 100, steuersatz: 19 }] });
    const standard = rechnungDocDef({ rechnung: r, kunde: k, firma: loadFirmaForPdf(), logoDataUrl: null }) as any;
    const oben = rechnungDocDef({ rechnung: r, kunde: k, firma: loadFirmaForPdf(), logoDataUrl: null, empfaengerOben: true }) as any;

    expect(standard.content[0].margin).toEqual([0, 0, 0, 0]);
    expect(oben.content[0].margin).toEqual([0, -40, 0, 0]);
    expect(standard.content[1].margin[1]).toBe(30);
    expect(oben.content[1].margin[1]).toBe(70);
    expect(oben.content[3].stack[0].table.widths).toEqual(standard.content[3].stack[0].table.widths);
  });

  it("PDF-Vorlageneinstellung ändert den Cache-Hash", async () => {
    const k = createKunde({ typ: "firma", firmenname: "Cache Layout GmbH", kuerzel: "CLG" });
    const r = createRechnung({ kundeId: k.id, titel: "Layout-Cache",
      positionen: [{ beschreibung: "Service", menge: 1, einzelpreisNetto: 100, steuersatz: 19 }] });
    setSetting("pdfVorlage", { empfaengerOben: false });
    const normal = await renderRechnungPdf(r.id);
    setSetting("pdfVorlage", { empfaengerOben: true });
    const oben = await renderRechnungPdf(r.id);
    expect(oben?.hash).not.toBe(normal?.hash);
    expect(oben?.fromCache).toBe(false);
  });

  it("Absenderzeile: bleibt bei langen Firmendaten einzeilig und wird passend verkleinert", () => {
    const k = createKunde({ typ: "firma", firmenname: "Absender Test GmbH", kuerzel: "ABS" });
    const r = createRechnung({ kundeId: k.id, titel: "Absender-Test",
      positionen: [{ beschreibung: "Service", menge: 1, einzelpreisNetto: 100, steuersatz: 19 }] });
    const firma = {
      ...loadFirmaForPdf(),
      firmenname: "My Clean Center Gebäudereinigung und Hausmeisterservice GmbH",
      strasse: "Sehr lange Musterstraße 123",
      plz: "53757",
      ort: "Sankt Augustin",
    };
    const doc = rechnungDocDef({ rechnung: r, kunde: k, firma, logoDataUrl: null }) as any;
    const kundeSpalte = doc.content[0].columns[0];
    const absender = kundeSpalte.stack[0];
    expect(kundeSpalte.width).toBe(230);
    expect(absender.noWrap).toBe(true);
    expect(absender.fontSize).toBeLessThan(5.5);
    expect(absender.fontSize).toBeGreaterThanOrEqual(3);
  });

  it("Rechnung: nutzt gespeichertes Firmenlogo und ändert Cache-Hash bei Logo-Wechsel", async () => {
    const k = createKunde({ typ: "firma", firmenname: "Logo GmbH", kuerzel: "LOG" });
    const r = createRechnung({ kundeId: k.id, titel: "Logo-Test",
      positionen: [{ beschreibung: "Service", menge: 1, einzelpreisNetto: 100, steuersatz: 19 }] });

    const dir = brandingDir();
    ensureDir(dir);
    writeFileSync(path.join(dir, "logo.png"), tinyPng);
    const loaded = loadLogoDataUrl();
    expect(loaded).toMatch(/^data:image\/png;base64,/);

    const withLogo = await renderRechnungPdf(r.id);
    expect(withLogo!.buffer.subarray(0, 5).toString()).toBe("%PDF-");

    writeFileSync(path.join(dir, "logo.png"), Buffer.concat([tinyPng, Buffer.from("changed") ]));
    const changedLogo = await renderRechnungPdf(r.id);
    expect(changedLogo!.hash).not.toBe(withLogo!.hash);
    expect(changedLogo!.fromCache).toBe(false);
  });

  it("Unbekannte ID liefert null", async () => {
    expect(await renderAngebotPdf("does-not-exist")).toBeNull();
    expect(await renderRechnungPdf("does-not-exist")).toBeNull();
  });
});
