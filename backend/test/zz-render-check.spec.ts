import { describe, it } from "vitest";
import { mkdtempSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const DATA = mkdtempSync(path.join(tmpdir(), "mcc-pdfchk-"));
process.env.DATA_DIR = DATA; process.env.NODE_ENV = "development";
const { openDatabase } = await import("../src/db/index.js");
const { ensureMasterKey } = await import("../src/crypto/masterkey.js");
const { config } = await import("../src/config.js");
const { setSetting } = await import("../src/settings/store.js");
const { createKunde } = await import("../src/kunden/repo.js");
const { createAngebot } = await import("../src/belege/angebote-repo.js");
const { createRechnung } = await import("../src/belege/rechnungen-repo.js");
const { renderAngebotPdf, renderRechnungPdf } = await import("../src/pdf/belegPdf.server.js");
const OUT = process.env.PDF_OUT || "/tmp/pdfcheck/x";
describe("render", () => { it("renders", async () => {
  ensureMasterKey(config.keyPath);
  for (const d of [config.uploadsDir, config.backupsDir, config.backupsDailyDir, config.backupsWeeklyDir, config.backupsMonthlyDir, config.backupsSafetyDir, config.backupsTmpDir]) if (!existsSync(d)) mkdirSync(d, { recursive: true });
  openDatabase(config.dbPath);
  setSetting("firma", { name: "My Clean Center GmbH", strasse: "Hauptstr. 1", plz: "53757", ort: "Sankt Augustin", telefon: "02241/000000", email: "info@mcc.de", web: "https://mcc.de", ustId: "DE123456789", geschaeftsfuehrer: "Max Mustermann", bankName: "Sparkasse", iban: "DE12", bic: "WELADEDD" });
  mkdirSync(OUT, { recursive: true });
  const k = createKunde({ typ: "firma", firmenname: "Acme GmbH", kuerzel: "ACM", strasse: "Weg 1", plz: "53757", ort: "Sankt Augustin" } as any);
  const r1 = createRechnung({ kundeId: k.id, titel: "Std", positionen: [{ beschreibung: "Unterhaltsreinigung der Büro- und Gemeinschaftsflächen", menge: 1, einzelpreisNetto: 420, steuersatz: 19, einheit: "pauschal" } as any] });
  writeFileSync(path.join(OUT, "r-standard.pdf"), (await renderRechnungPdf(r1.id))!.buffer);
  const r2 = createRechnung({ kundeId: k.id, titel: "Stunden", positionen: [
    { beschreibung: "Gründliche Reinigung aller Büroräume\n- Oberflächen reinigen\n- Böden saugen", menge: 12.5, einheit: "std", einzelpreisNetto: 30, steuersatz: 19 } as any,
    { beschreibung: "Materialpauschale", menge: 1, einzelpreisNetto: 40, steuersatz: 19, einheit: "pauschal" } as any] });
  writeFileSync(path.join(OUT, "r-stunden.pdf"), (await renderRechnungPdf(r2.id))!.buffer);
  const a = createAngebot({ kundeId: k.id, titel: "Angebot", positionen: [{ beschreibung: "Wischen", menge: 2, einzelpreisNetto: 50, steuersatz: 19 }] });
  writeFileSync(path.join(OUT, "angebot.pdf"), (await renderAngebotPdf(a.id))!.buffer);
}); });
