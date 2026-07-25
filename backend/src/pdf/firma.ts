// Lädt Firma- + Branding-Settings und mappt sie in die PDF-FirmaForPdf-Form.
// Logo: Datei `${dataDir}/branding/logo.png` wird, wenn vorhanden, als data-URL geliefert.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { getSetting } from "../settings/store.js";
import type { FirmaForPdf } from "./types.js";

interface FirmaSettings {
  name?: string;
  inhaber?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  telefon?: string;
  mobil?: string;
  email?: string;
  web?: string;
  ustId?: string;
  steuernummer?: string;
  handelsregister?: string;
  geschaeftsfuehrer?: string;
  bankName?: string;
  iban?: string;
  bic?: string;
}

export function loadFirmaForPdf(): FirmaForPdf {
  const f = getSetting<FirmaSettings>("firma") ?? {};
  // Legacy-Korrektur: alter Default ohne Leerzeichen wird nur exakt-match
  // ersetzt. Eigene Firmennamen werden niemals verändert.
  const rawName = f.name?.trim() || "My Clean Center GmbH";
  const firmenname =
    rawName === "MyCleanCenter GmbH" ? "My Clean Center GmbH" : rawName;
  return {
    firmenname,
    strasse: f.strasse ?? null,
    plz: f.plz ?? null,
    ort: f.ort ?? null,
    telefon: f.telefon ?? null,
    mobil: f.mobil ?? null,
    email: f.email ?? null,
    webseite: f.web ?? null,
    ustId: f.ustId ?? null,
    steuernummer: f.steuernummer ?? null,
    handelsregister: f.handelsregister ?? null,
    geschaeftsfuehrer: f.geschaeftsfuehrer ?? null,
    bankName: f.bankName ?? null,
    iban: f.iban ?? null,
    bic: f.bic ?? null,
  };
}

export function brandingDir(): string {
  return path.join(config.dataDir, "branding");
}

function logoFileToDataUrl(ext: "png" | "jpg" | "jpeg"): string | null {
  const p = path.join(brandingDir(), `logo.${ext}`);
  if (!existsSync(p)) return null;
  const buf = readFileSync(p);
  const mime = ext === "png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/** Liefert das Firmen-Logo als PDF-taugliche data-URL oder null. */
export function loadLogoDataUrl(): string | null {
  // 1) Datei im Branding-Ordner. Das ist seit dem robusten Logo-Upload die
  // autoritative Quelle und darf nicht von alten Settings-Werten überschrieben werden.
  for (const ext of ["png", "jpg", "jpeg"] as const) {
    const dataUrl = logoFileToDataUrl(ext);
    if (dataUrl) return dataUrl;
  }
  // 2) Legacy-Fallback: sehr alte Installationen hatten noch Base64 im Settings-JSON.
  const f = getSetting<FirmaSettings & { logoUrl?: string }>("firma");
  if (f?.logoUrl && typeof f.logoUrl === "string" && f.logoUrl.startsWith("data:image/")) {
    return f.logoUrl;
  }
  return null;
}
