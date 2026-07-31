import { describe, expect, it } from "vitest";
import { generiereStundenzettel } from "../src/stundenzettel/generieren.js";
import { pruefeZiel, summeStunden } from "../src/stundenzettel/zielausgleich.js";
import { DEFAULT_ARBEITSZEIT, type Mitarbeiter } from "../src/stundenzettel/types.js";

function ma(ziel: number | null): Mitarbeiter {
  return {
    id: "ma-1",
    name: "Test",
    aktiv: true,
    arbeitszeiten: { ...DEFAULT_ARBEITSZEIT, zielStundenProMonat: ziel },
    erstelltAm: "",
    aktualisiertAm: "",
  };
}

describe("Zielstunden-Ausgleich", () => {
  for (const ziel of [120, 140, 160, 173, 200]) {
    it(`trifft Ziel ${ziel} exakt`, () => {
      const z = generiereStundenzettel(ma(ziel), 2026, 7, []);
      expect(summeStunden(z.tage)).toBe(ziel);
      expect(pruefeZiel(z.tage, ziel).erfuellt).toBe(true);
    });
  }

  it("ist reproduzierbar", () => {
    const a = generiereStundenzettel(ma(150), 2026, 8, []);
    const b = generiereStundenzettel(ma(150), 2026, 8, []);
    expect(JSON.stringify(a.tage)).toBe(JSON.stringify(b.tage));
  });

  it("verändert Feiertage und freie Tage nicht", () => {
    const z = generiereStundenzettel(ma(160), 2026, 12, [{ datum: "2026-12-24", name: "Heiligabend" }]);
    const heiligabend = z.tage.find((t) => t.datum === "2026-12-24")!;
    expect(heiligabend.beginn).toBeUndefined();
    expect(heiligabend.bemerkung).toBe("Heiligabend");
    for (const t of z.tage) {
      if (t.wochentag === "samstag" || t.wochentag === "sonntag") expect(t.stunden).toBe(0);
    }
  });

  it("ohne Ziel bleibt die Summe unverändert", () => {
    const z = generiereStundenzettel(ma(null), 2026, 7, []);
    expect(pruefeZiel(z.tage, null).erfuellt).toBe(true);
  });
});
