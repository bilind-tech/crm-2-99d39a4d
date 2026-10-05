import { describe, expect, it } from "vitest";
import { generiereStundenzettel } from "../src/stundenzettel/generieren.js";
import { ersetzeTageImZeitraum, monateImZeitraum } from "../src/stundenzettel/abwesenheitZeitraum.js";
import { DEFAULT_ARBEITSZEIT, type Abwesenheit, type Mitarbeiter } from "../src/stundenzettel/types.js";

const m: Mitarbeiter = {
  id: "ma1", name: "Test", aktiv: true, erstelltAm: "", aktualisiertAm: "",
  arbeitszeiten: { ...DEFAULT_ARBEITSZEIT, zielStundenProMonat: 160 },
};
const urlaub: Abwesenheit = {
  id: "a1", mitarbeiterId: "ma1", art: "urlaub", von: "2026-09-28", bis: "2026-10-09",
  notiz: null, erstelltAm: "2026-01-01", aktualisiertAm: "",
};

describe("Abwesenheiten", () => {
  it("Zeitraum über zwei Monate, Summe = Ziel, Urlaub zählt Stunden", () => {
    for (const monat of [9, 10]) {
      const z = generiereStundenzettel(m, 2026, monat, [], [urlaub]);
      expect(z.gesamtStunden).toBe(160);
      const u = z.tage.filter((t) => t.bemerkung === "Urlaub");
      expect(u.length).toBeGreaterThan(0);
      for (const t of u) { expect(t.stunden).toBe(8); expect(t.beginn).toBeUndefined(); }
    }
  });
  it("Wochenende und Feiertag werden übersprungen", () => {
    const z = generiereStundenzettel(m, 2026, 10, [], [urlaub]);
    expect(z.tage.find((t) => t.datum === "2026-10-03")!.bemerkung).not.toBe("Urlaub");
    expect(z.tage.find((t) => t.datum === "2026-10-04")!.bemerkung).toBe("Sonntag");
  });
  it("manuelle Tage außerhalb bleiben", () => {
    const alt = generiereStundenzettel(m, 2026, 10, [], []).tage;
    alt[20] = { ...alt[20], bemerkung: "manuell" };
    const neu = ersetzeTageImZeitraum(alt, generiereStundenzettel(m, 2026, 10, [], [urlaub]).tage, [urlaub]);
    expect(neu[20].bemerkung).toBe("manuell");
    expect(neu[0].bemerkung).toBe("Urlaub");
    expect(monateImZeitraum("2026-12-20", "2027-01-05")).toEqual([{ jahr: 2026, monat: 12 }, { jahr: 2027, monat: 1 }]);
  });
});
