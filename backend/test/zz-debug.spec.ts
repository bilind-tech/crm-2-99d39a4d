import { it } from "vitest";
import { writeFileSync } from "node:fs";
const { rechnungDocDef } = await import("../src/pdf/layout.js");
const { renderPdf } = await import("../src/pdf/render.js");
const R = await import("../src/pdf/linienRaster.js");
it("dbg", async () => {
  const firma: any = { name: "My Clean Center GmbH", strasse: "Hauptstr. 1", plz: "53757", ort: "Sankt Augustin" };
  const kunde: any = { id: "k", typ: "firma", firmenname: "Acme GmbH", nummer: "K1" };
  const rechnung: any = { id: "r", nummer: "ACM1026/01", rechnungsdatum: "2026-10-01", positionen: [{ id: "a", beschreibung: "Unterhaltsreinigung der Büro- und Gemeinschaftsflächen", menge: 1, einzelpreisNetto: 420, steuersatz: 19, modus: "pauschal" }], rabattGesamt: 0, steuersatz: 19 };
  let plan = R.LEERER_PLAN;
  for (let r = 0; r < 3; r++) {
    const m = R.createLinienMesser();
    const buf = await renderPdf(rechnungDocDef({ rechnung, kunde, firma, logoDataUrl: null, raster: { plan, messer: m } }));
    writeFileSync(`/tmp/pdfcheck/dbg${r}.pdf`, buf);
    const rows = [...m.hits.entries()].map(([id, h]) => `${id} top=${h.top.toFixed(4)} off=${m.offsets[id]} line=${(h.top - m.offsets[id]).toFixed(4)}`);
    console.log("PASS", r, JSON.stringify(plan), "\n" + rows.join("\n"));
    const n = R.verbessereRasterPlan(m, plan); if (!n) break; plan = n;
  }
});
