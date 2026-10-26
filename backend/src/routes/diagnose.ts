// GET /diagnose — rein lesende Systemprüfung für den kopierbaren Fehlerbericht.
// Gibt niemals Passwörter, Schlüssel oder Tokens zurück (nur ja/nein).
// Einziger Schreibvorgang: Test-Datei im tmp-Unterordner, sofort wieder gelöscht.

import type { FastifyInstance } from "fastify";
import { existsSync, statSync, statfsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { requireAuth } from "../auth/middleware.js";

export type PruefStatus = "ok" | "warnung" | "fehler";
export interface Pruefung {
  id: string;
  name: string;
  status: PruefStatus;
  detail: string;
}

function fehlerText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function pfadInfo(p: string): string {
  try {
    const s = statSync(p);
    return `${p} (${s.isDirectory() ? "Ordner" : `${Math.round(s.size / 1024)} KB`})`;
  } catch {
    return `${p} (fehlt)`;
  }
}

export async function sammelDiagnose(): Promise<{ version: string; zeit: string; pruefungen: Pruefung[] }> {
  const pruefungen: Pruefung[] = [];
  const add = (p: Pruefung) => pruefungen.push(p);

  // Daten-Ordner
  const dataOk = existsSync(config.dataDir);
  add({
    id: "datenordner",
    name: "Daten-Ordner vorhanden",
    status: dataOk ? "ok" : "fehler",
    detail: dataOk ? pfadInfo(config.dataDir) : `${config.dataDir} fehlt — externe Festplatte nicht eingehängt?`,
  });

  // DB-Datei
  const dbOk = existsSync(config.dbPath);
  add({
    id: "dbdatei",
    name: "Datenbank-Datei vorhanden",
    status: dbOk ? "ok" : "fehler",
    detail: pfadInfo(config.dbPath),
  });

  // DB-Abfrage
  try {
    const { getDatabase, getSchemaVersion } = await import("../db/index.js");
    const db = getDatabase();
    const row = db.prepare("SELECT 1 AS ok").get() as { ok: number };
    const r = db.prepare("SELECT COUNT(*) AS c FROM rechnung").get() as { c: number } | undefined;
    add({
      id: "dbabfrage",
      name: "Datenbank antwortet",
      status: row?.ok === 1 ? "ok" : "fehler",
      detail: `Schema-Version ${getSchemaVersion()}, Rechnungen: ${r?.c ?? "?"}`,
    });
  } catch (e) {
    add({ id: "dbabfrage", name: "Datenbank antwortet", status: "fehler", detail: fehlerText(e) });
  }

  // Schreibtest
  try {
    if (!existsSync(config.dataDir)) throw new Error("Daten-Ordner fehlt — Test übersprungen");
    const dir = path.join(config.dataDir, "tmp");
    mkdirSync(dir, { recursive: true });
    const f = path.join(dir, `diagnose-${randomUUID()}.txt`);
    writeFileSync(f, "ok");
    unlinkSync(f);
    add({ id: "schreiben", name: "Daten-Ordner beschreibbar", status: "ok", detail: dir });
  } catch (e) {
    add({ id: "schreiben", name: "Daten-Ordner beschreibbar", status: "fehler", detail: fehlerText(e) });
  }

  // Speicher
  try {
    const s = statfsSync(config.dataDir);
    const frei = Number(s.bavail) * Number(s.bsize);
    const gb = frei / 1024 ** 3;
    add({
      id: "speicher",
      name: "Freier Speicher",
      status: gb < 1 ? "fehler" : gb < 5 ? "warnung" : "ok",
      detail: `${gb.toFixed(1)} GB frei`,
    });
  } catch (e) {
    add({ id: "speicher", name: "Freier Speicher", status: "fehler", detail: fehlerText(e) });
  }

  // Master-Key
  add({
    id: "schluessel",
    name: "Verschlüsselungs-Schlüssel vorhanden",
    status: existsSync(config.keyPath) ? "ok" : "fehler",
    detail: existsSync(config.keyPath) ? "vorhanden" : `${config.keyPath} fehlt`,
  });

  // PDF-Testerstellung
  try {
    const { renderPdf } = await import("../pdf/render.js");
    const { DEFAULT_FONT } = await import("../pdf/printer.js");
    const buf = await renderPdf({ content: ["Diagnose"], defaultStyle: { font: DEFAULT_FONT } });
    add({
      id: "pdf",
      name: "PDF-Erstellung",
      status: buf.length > 100 ? "ok" : "fehler",
      detail: `Test-PDF ${buf.length} Bytes`,
    });
  } catch (e) {
    add({ id: "pdf", name: "PDF-Erstellung", status: "fehler", detail: fehlerText(e) });
  }

  // Drive
  try {
    const { loadDriveSettings } = await import("../drive/oauth.js");
    const d = loadDriveSettings();
    add({
      id: "drive",
      name: "Google Drive verbunden",
      status: d.refreshTokenIsSet ? (d.letzterFehler ? "warnung" : "ok") : "warnung",
      detail: d.refreshTokenIsSet
        ? `verbunden${d.letzterFehler ? ` — letzter Fehler: ${d.letzterFehler}` : ""}`
        : "nicht verbunden",
    });
  } catch (e) {
    add({ id: "drive", name: "Google Drive verbunden", status: "fehler", detail: fehlerText(e) });
  }

  return { version: config.version, zeit: new Date().toISOString(), pruefungen };
}

export async function diagnoseRoutes(app: FastifyInstance): Promise<void> {
  app.get("/diagnose", { preHandler: requireAuth }, async () => sammelDiagnose());
}
