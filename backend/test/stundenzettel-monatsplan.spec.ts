import { describe, expect, it } from "vitest";
import { generiereStundenzettel } from "../src/stundenzettel/generieren.js";
import { DEFAULT_ARBEITSZEIT, type Mitarbeiter } from "../src/stundenzettel/types.js";

const ma = (ziel: number | null): Mitarbeiter => ({
  id: "m1",
  name: "Test",
  aktiv: true,
  arbeitszeiten: { ...DEFAULT_ARBEITSZEIT, zielStundenProMonat: ziel },
  erstelltAm: "",
  aktualisiertAm: "",
});

describe("Monatsplan", () => {
  it("Standardziel greift ohne Eintrag", () => {
    const z = generiereStundenzettel(ma(120), 2026, 10, []);
    expect(z.gesamtStunden).toBe(120);
  });
  it("Monatsziel + feste Tage treffen das Ziel exakt, feste Tage bleiben", () => {
    const z = generiereStundenzettel(ma(120), 2026, 10, [], [], {
      mitarbeiterId: "m1", jahr: 2026, monat: 10, zielStunden: 101.5,
      festeTage: [{ datum: "2026-10-14", stunden: 1.5 }, { datum: "2026-10-17", stunden: 3, bemerkung: "Sondereinsatz" }],
    });
    expect(z.gesamtStunden).toBe(101.5);
    const d14 = z.tage.find((t) => t.datum === "2026-10-14")!;
    expect(d14.stunden).toBe(1.5);
    expect(d14.quelle).toBe("manuell");
    expect(d14.ende).toBe("09:30");
    expect(z.tage.find((t) => t.datum === "2026-10-17")!.stunden).toBe(3);
  });
});
