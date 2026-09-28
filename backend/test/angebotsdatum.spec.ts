import { describe, it, expect } from "vitest";
import { angebotsdatumVon } from "../src/belege/angebotsdatum.js";

describe("Angebotsdatum nachträglich änderbar", () => {
  it("nutzt manuelles Datum", () => {
    expect(angebotsdatumVon({ erstelltAm: "2026-01-05T10:00:00Z", optionen: { angebotsdatum: "2026-02-10" } })).toBe("2026-02-10");
  });
  it("fällt auf Erstellungstag zurück (alte Angebote)", () => {
    expect(angebotsdatumVon({ erstelltAm: "2026-01-05T10:00:00Z", optionen: null })).toBe("2026-01-05T10:00:00Z");
    expect(angebotsdatumVon({ erstelltAm: "2026-01-05T10:00:00Z", optionen: { angebotsdatum: "kaputt" } })).toBe("2026-01-05T10:00:00Z");
  });
});
