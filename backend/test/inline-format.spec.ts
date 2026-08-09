import { describe, expect, it } from "vitest";
import { descriptionLines, inlineText, plainText } from "../src/pdf/inlineFormat.js";

describe("PDF-Leistungsformatierung", () => {
  it("behält die Reihenfolge aus dem gemeldeten Rechnungsfall exakt bei", () => {
    const input = [
      "**Unterhaltsreinigung**",
      "• Boden saugen",
      "• Boden wischen",
      "• Sanitär reinigen",
      "• Oberflächen reinigen",
      "Universitätsstraße 71, Köln",
      "02.08.2026",
    ].join("\n");

    expect(descriptionLines(input)).toEqual([
      { kind: "text", text: "**Unterhaltsreinigung**", first: true },
      { kind: "bullet", text: "Boden saugen" },
      { kind: "bullet", text: "Boden wischen" },
      { kind: "bullet", text: "Sanitär reinigen" },
      { kind: "bullet", text: "Oberflächen reinigen" },
      { kind: "text", text: "Universitätsstraße 71, Köln", first: false },
      { kind: "text", text: "02.08.2026", first: false },
    ]);
  });

  it("behält Leerzeilen und gemischte Aufzählungen an ihrer Position", () => {
    expect(descriptionLines("Titel\n- Eins\n\nText\n* Zwei")).toEqual([
      { kind: "text", text: "Titel", first: true },
      { kind: "bullet", text: "Eins" },
      { kind: "blank" },
      { kind: "text", text: "Text", first: false },
      { kind: "bullet", text: "Zwei" },
    ]);
  });

  it("wandelt Fett, Kursiv und Unterstrichen ohne sichtbare Marker um", () => {
    const fragments = inlineText("**Fett** *kursiv* __unterstrichen__");
    expect(fragments).toContainEqual({ text: "Fett", bold: true });
    expect(fragments).toContainEqual({ text: "kursiv", italics: true });
    expect(fragments).toContainEqual({ text: "unterstrichen", decoration: "underline" });
    expect(plainText("**Fett** *kursiv* __unterstrichen__")).toBe("Fett kursiv unterstrichen");
  });
});