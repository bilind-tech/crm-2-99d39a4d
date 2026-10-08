import { describe, expect, it } from "vitest";
import { berechneNormalenTag } from "../src/stundenzettel/berechnung.js";
import { generiereStundenzettel } from "../src/stundenzettel/generieren.js";
import { pruefeZiel, summeStunden } from "../src/stundenzettel/zielausgleich.js";
import { DEFAULT_ARBEITSZEIT, type Mitarbeiter } from "../src/stundenzettel/types.js";
import { ArbeitsZeitConfigSchema } from "../src/stundenzettel/validation.js";
import { stundenzettelZeitzeilen } from "../src/pdf/stundenzettelZeitzeilen.js";
import { stundenzettelDocDef } from "../src/pdf/stundenzettelPdf.js";

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

  it("rechnet 90 Minuten als 1,5 Stunden", () => {
    const tag = berechneNormalenTag(
      { aktiv: true, beginn: "15:30", ende: "17:00", pause: 0, block2: null },
      DEFAULT_ARBEITSZEIT.standardZeiten,
    );
    expect(tag.stunden).toBe(1.5);
    expect(tag.ende).toBe("17:00");
  });

  it("rundet je Zeitblock auf die vorherige halbe Stunde ab", () => {
    const tag = berechneNormalenTag(
      { aktiv: true, beginn: "08:00", ende: "10:50", pause: 0, block2: { beginn: "12:00", ende: "13:40" } },
      DEFAULT_ARBEITSZEIT.standardZeiten,
    );
    expect(tag.stunden).toBe(4);
    expect(tag.ende).toBe("10:30");
    expect(tag.ende2).toBe("13:30");
  });

  it("stellt zwei Arbeitsblöcke im PDF untereinander und zeitlich sortiert dar", () => {
    const zeiten = stundenzettelZeitzeilen({
      datum: "2026-10-07",
      wochentag: "mittwoch",
      beginn: "17:00",
      ende: "20:00",
      beginn2: "08:00",
      ende2: "12:00",
      stunden: 7,
    });

    expect(zeiten.beginn).toBe("08:00\n17:00");
    expect(zeiten.ende).toBe("12:00\n20:00");
  });

  it("hält 31 Zwei-Block-Tage in zwei untrennbaren PDF-Tabellen", () => {
    const tage = Array.from({ length: 31 }, (_, index) => ({
      datum: `2026-10-${String(index + 1).padStart(2, "0")}`,
      wochentag: "mittwoch" as const,
      beginn: "08:00",
      ende: "10:00",
      beginn2: "17:00",
      ende2: "19:00",
      stunden: 4,
    }));
    const doc = stundenzettelDocDef({
      mitarbeiterName: "Zwei Blöcke",
      zettel: { id: "z", mitarbeiterId: "m", jahr: 2026, monat: 10, tage, gesamtStunden: 124, aktualisiertAm: null },
      logoDataUrl: null,
    }) as any;

    const tabellen = doc.content.filter((node: { table?: unknown }) => node.table);
    expect(tabellen).toHaveLength(2);
    expect(tabellen[0].table.body).toHaveLength(17);
    expect(tabellen[1].table.body).toHaveLength(19);
    expect(tabellen.every((table: any) => table.table.dontBreakRows === true)).toBe(true);
    expect(tabellen[0].table.body[2][1].text).toBe("08:00\n17:00");
    expect(tabellen[0].table.body[2][1].margin).toEqual([2, 0, 2, 0.5]);
    expect(tabellen[1].table.body.at(-2)[0].text).toBe("31");
  });

  it("richtet einzeilige Uhrzeiten optisch mittig aus", () => {
    const tage = [{
      datum: "2026-10-08",
      wochentag: "donnerstag" as const,
      beginn: "08:00",
      ende: "10:00",
      stunden: 2,
    }];
    const doc = stundenzettelDocDef({
      mitarbeiterName: "Eine Schicht",
      zettel: { id: "z", mitarbeiterId: "m", jahr: 2026, monat: 10, tage, gesamtStunden: 2, aktualisiertAm: null },
      logoDataUrl: null,
    }) as any;

    const ersteZeile = doc.content.find((node: { table?: unknown }) => node.table).table.body[2];
    expect(ersteZeile[1].margin).toEqual([2, 3.5, 2, 5.5]);
    expect(ersteZeile[2].margin).toEqual([2, 3.5, 2, 5.5]);
  });

  it("erreicht auch ein halbstündiges Monatsziel exakt", () => {
    const z = generiereStundenzettel(ma(120.5), 2026, 7, []);
    expect(summeStunden(z.tage)).toBe(120.5);
    expect(pruefeZiel(z.tage, 120.5).erfuellt).toBe(true);
  });

  it("akzeptiert Monatsziele in Halbstunden", () => {
    const config = { ...DEFAULT_ARBEITSZEIT, zielStundenProMonat: 40.5 };
    expect(ArbeitsZeitConfigSchema.safeParse(config).success).toBe(true);
    expect(
      ArbeitsZeitConfigSchema.safeParse({ ...config, zielStundenProMonat: 40.25 }).success,
    ).toBe(false);
  });
});
