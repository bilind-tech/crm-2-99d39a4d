// Regression: Alle Linien der Leistungstabelle liegen auf dem Linien-Raster
// (gleich dicke Linien in jeder Vorschau) — für Standard-, Stunden-,
// mehrseitige Rechnungen und Angebote.
import { afterAll, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { inflateSync } from "node:zlib";

const DATA = mkdtempSync(path.join(tmpdir(), "mcc-raster-"));
process.env.DATA_DIR = DATA;
process.env.NODE_ENV = "development";

const { openDatabase, closeDatabase } = await import("../src/db/index.js");
const { ensureMasterKey } = await import("../src/crypto/masterkey.js");
const { config } = await import("../src/config.js");
const { setSetting } = await import("../src/settings/store.js");
const { createKunde } = await import("../src/kunden/repo.js");
const { createAngebot } = await import("../src/belege/angebote-repo.js");
const { createRechnung } = await import("../src/belege/rechnungen-repo.js");
const { renderAngebotPdf, renderRechnungPdf } = await import("../src/pdf/belegPdf.server.js");
const R = await import("../src/pdf/linienRaster.js");

afterAll(() => {
  try { closeDatabase(); } catch { /* ignore */ }
  rmSync(DATA, { recursive: true, force: true });
});

/** Entpackt alle Inhaltsströme eines (komprimierten) PDFs zu Text. */
function pdfInhalt(buf: Buffer): string {
  const bin = buf.toString("latin1");
  const re = /(?<!end)stream\r?\n/g;
  let out = "";
  let m: RegExpExecArray | null;
  while ((m = re.exec(bin))) {
    const start = m.index + m[0].length;
    const end = bin.indexOf("endstream", start);
    if (end < 0) break;
    try {
      out += inflateSync(Buffer.from(bin.slice(start, end), "latin1")).toString("latin1") + "\n";
    } catch {
      /* Bild/Font o. Ä. */
    }
    re.lastIndex = end;
  }
  return out;
}

function senkrechteLinien(text: string): number[] {
  const re = /(?:^|\n)([\d.]+) w\n(?:[^\n]*\n){0,6}?(-?[\d.]+) (-?[\d.]+) m\n(-?[\d.]+) (-?[\d.]+) l\n/g;
  const xs = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (Math.abs(Number(m[1]) - R.TABELLEN_LINIE) > 1e-6) continue;
    if (m[2] === m[4]) xs.add(Number(m[2]));
  }
  return [...xs];
}

function rasterAbweichung(v: number, versatz = 0): number {
  const d = (v - versatz - R.RASTER_PHASE - R.TABELLEN_LINIE / 2) / R.RASTER_PT;
  return Math.abs(d - Math.round(d)) * R.RASTER_PT;
}

function pruefe(buf: Buffer) {
  const text = pdfInhalt(buf);
  const seiten = R.waagerechteLinienAusPdf(text);
  expect(seiten).not.toBeNull();
  for (const [si, seite] of seiten!.entries()) {
    // Seite 1 absolut im Raster; Folgeseiten einheitlich zur ersten Linie der Seite.
    const versatz = si === 0 ? 0 : (seite[0] - R.RASTER_PHASE) - Math.round((seite[0] - R.RASTER_PHASE) / R.RASTER_PT) * R.RASTER_PT;
    seite.forEach((top, k) => {
      // Letzte Linie einer Nicht-Schlussseite = festes Seitenende (geteilte Zeile).
      if (si < seiten!.length - 1 && k === seite.length - 1) return;
      expect(rasterAbweichung(top + R.TABELLEN_LINIE / 2, versatz)).toBeLessThan(0.01);
    });
  }
  const xs = senkrechteLinien(text);
  expect(xs.length).toBeGreaterThanOrEqual(4);
  for (const x of xs) expect(rasterAbweichung(x)).toBeLessThan(0.01);
  return seiten!;
}

describe("Linien-Raster der Leistungstabelle", () => {
  it("reine Logik: unzuordenbare Messung ändert nichts", () => {
    expect(R.verbessereRasterPlan(null, { p: 2, s: 2 }, R.LEERER_PLAN)).toBeNull();
    expect(R.verbessereRasterPlan([[10, 20]], { p: 2, s: 2 }, R.LEERER_PLAN)).toBeNull();
    expect(R.liegtImRaster(null, { p: 2, s: 2 })).toBe(true);
    expect(R.rasterExtra({ shift: 0, extra: { "p:1": 99 } }, "p", 1)).toBe(R.RASTER_PT);
    expect(R.rasterExtra({ shift: 0, extra: { "p:1": -99 } }, "p", 1)).toBe(-R.MAX_SCHRUMPFEN);
  });

  it("Rechnungen (Standard, Stunden, mehrseitig) und Angebote liegen im Raster", async () => {
    ensureMasterKey(config.keyPath);
    for (const d of [config.uploadsDir, config.backupsDir, config.backupsDailyDir, config.backupsWeeklyDir, config.backupsMonthlyDir, config.backupsSafetyDir, config.backupsTmpDir]) {
      if (!existsSync(d)) mkdirSync(d, { recursive: true });
    }
    openDatabase(config.dbPath);
    setSetting("firma", { name: "My Clean Center GmbH", strasse: "Hauptstr. 1", plz: "53757", ort: "Sankt Augustin", iban: "DE12", bic: "X" });
    const k = createKunde({ typ: "firma", firmenname: "Acme GmbH", kuerzel: "ACM", strasse: "Weg 1", plz: "53757", ort: "Sankt Augustin" } as any);

    const standard = createRechnung({ kundeId: k.id, titel: "S", positionen: [
      { beschreibung: "Unterhaltsreinigung der Büro- und Gemeinschaftsflächen", menge: 1, einzelpreisNetto: 420, steuersatz: 19, modus: "pauschal" } as any,
    ] });
    pruefe((await renderRechnungPdf(standard.id))!.buffer);

    const stunden = createRechnung({ kundeId: k.id, titel: "H", positionen: [
      { beschreibung: "Reinigung\n- Oberflächen\n- Böden", menge: 12.5, modus: "stunden", einzelpreisNetto: 30, steuersatz: 19 } as any,
      { beschreibung: "Materialpauschale", menge: 1, einzelpreisNetto: 40, steuersatz: 19, modus: "pauschal" } as any,
    ] });
    pruefe((await renderRechnungPdf(stunden.id))!.buffer);

    const lang = createRechnung({ kundeId: k.id, titel: "L", positionen: Array.from({ length: 8 }, (_, i) => ({
      beschreibung: `Grundreinigung Etage ${i + 1}\n- Fenster innen und außen reinigen inklusive Rahmen und Fensterbänke\n- Böden saugen und feucht wischen`,
      menge: 1, einzelpreisNetto: 100 + i, steuersatz: 19, modus: "pauschal",
    } as any)) });
    const seiten = pruefe((await renderRechnungPdf(lang.id))!.buffer);
    expect(seiten.length).toBeGreaterThanOrEqual(2);

    const angebot = createAngebot({ kundeId: k.id, titel: "A", positionen: [{ beschreibung: "Wischen", menge: 2, einzelpreisNetto: 50, steuersatz: 19 }] });
    pruefe((await renderAngebotPdf(angebot.id))!.buffer);
  });
});
