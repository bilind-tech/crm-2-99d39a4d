import { it } from "vitest";
import { writeFileSync } from "node:fs";
const { rechnungDocDef } = await import("../src/pdf/layout.js");
const { renderPdf } = await import("../src/pdf/render.js");
it("dbg", async () => {
  const firma: any = { name: "My Clean Center GmbH", strasse: "Hauptstr. 1", plz: "53757", ort: "Sankt Augustin" };
  const kunde: any = { id: "k", typ: "firma", firmenname: "Acme GmbH", nummer: "K1" };
  const rechnung: any = { id: "r", nummer: "ACM1026/01", rechnungsdatum: "2026-10-01", positionen: [{ id: "a", beschreibung: "Unterhaltsreinigung", menge: 1, einzelpreisNetto: 420, steuersatz: 19, modus: "pauschal" }], rabattGesamt: 0, steuersatz: 19 };
  const d: any = rechnungDocDef({ rechnung, kunde, firma, logoDataUrl: null });
  d.compress = false;
  const buf = await renderPdf(d);
  writeFileSync("/tmp/pdfcheck/raw.pdf", buf);
});
