import { it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "mcc-v-"));
process.env.NODE_ENV = "development";
const { openDatabase } = await import("../src/db/index.js");
const { ensureMasterKey } = await import("../src/crypto/masterkey.js");
const { config } = await import("../src/config.js");
const { setSetting } = await import("../src/settings/store.js");
const { createKunde, createObjekt } = await import("../src/kunden/repo.js") as any;
const { createRechnung } = await import("../src/belege/rechnungen-repo.js");
const { createAngebot } = await import("../src/belege/angebote-repo.js");
const { renderAngebotPdf, renderRechnungPdf } = await import("../src/pdf/belegPdf.server.js");
import { mkdirSync } from "node:fs";
it("render", async () => {
  ensureMasterKey(config.keyPath);
  for (const d of [config.uploadsDir, config.backupsDir]) mkdirSync(d, { recursive: true });
  openDatabase(config.dbPath);
  setSetting("firma", { name: "My Clean Center GmbH", strasse: "Hauptstr. 1", plz: "53757", ort: "Sankt Augustin", telefon: "02241/000000", email: "info@mcc.de", ustId: "DE123", geschaeftsfuehrer: "Max M", bankName: "Sparkasse", iban: "DE12 3456", bic: "X" });
  const k = createKunde({ typ: "firma", firmenname: "Acme GmbH", kuerzel: "ACM", strasse: "Weg 2", plz: "53111", ort: "Bonn" });
  const pos = [
    { beschreibung: "**Unterhaltsreinigung Büro**\nAlle Räume wischen, Mülleimer leeren, Sanitär reinigen und desinfizieren, Küche säubern", menge: 1, einzelpreisNetto: 450, steuersatz: 19, modus: "pauschal", pauschalpreisNetto: 450 },
    { beschreibung: "Fenster", menge: 4, einzelpreisNetto: 30, steuersatz: 19, modus: "stunden" },
  ];
  const r1 = createRechnung({ kundeId: k.id, titel: "Test", positionen: pos } as any);
  const r2 = createRechnung({ kundeId: k.id, titel: "Test2", positionen: pos, optionen: { empfaengerZeilen: ["Acme GmbH","Herr X","Objekt Hauptbahnhof","Weg 2","53111 Bonn","Zusatz"] } } as any);
  const a = createAngebot({ kundeId: k.id, titel: "A", positionen: pos } as any);
  writeFileSync("/tmp/r1.pdf", (await renderRechnungPdf(r1.id))!.buffer);
  writeFileSync("/tmp/r2.pdf", (await renderRechnungPdf(r2.id))!.buffer);
  writeFileSync("/tmp/a1.pdf", (await renderAngebotPdf(a.id))!.buffer);
});
