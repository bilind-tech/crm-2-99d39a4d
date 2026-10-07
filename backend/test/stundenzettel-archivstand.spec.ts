import { describe, expect, it } from "vitest";
import { generiereStundenzettel } from "../src/stundenzettel/generieren.js";
import { zettelInhalt } from "../src/stundenzettel/archivStand.js";
import { DEFAULT_ARBEITSZEIT, type Mitarbeiter } from "../src/stundenzettel/types.js";

const m: Mitarbeiter = { id: "m1", name: "A", aktiv: true, arbeitszeiten: { ...DEFAULT_ARBEITSZEIT, zielStundenProMonat: 120 }, erstelltAm: "", aktualisiertAm: "" };

describe("Archiv-Stand", () => {
  it("gleiche Generierung → gleicher Inhalt; Änderung → anders", () => {
    const a = generiereStundenzettel(m, 2026, 10, []);
    const b = generiereStundenzettel(m, 2026, 10, []);
    expect(zettelInhalt(a.tage, a.gesamtStunden, "A")).toBe(zettelInhalt(b.tage, b.gesamtStunden, "A"));
    b.tage[1].ausgeschlossen = true;
    expect(zettelInhalt(a.tage, a.gesamtStunden, "A")).not.toBe(zettelInhalt(b.tage, b.gesamtStunden, "A"));
  });
});
