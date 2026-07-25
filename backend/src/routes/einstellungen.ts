// /einstellungen/* — alle hinter requireAuth.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  AREAS,
  SENSITIVE_KEYS,
  SmtpPasswordSchema,
} from "../settings/schemas.js";
import {
  deleteSetting,
  getSetting,
  getSettingMeta,
  setSetting,
} from "../settings/store.js";
import { requireAuth } from "../auth/middleware.js";
import { audit } from "../auth/audit.js";
import { emit } from "../events/bus.js";
import { createConnection } from "node:net";
import { resetTransport } from "../email/transport.js";
import { resetImapClient } from "../email/imap-archive.js";
import { flachZuUi, uiPatchZuFlach } from "../mahnung/settings-adapter.js";
import { MahnungSchema } from "../settings/schemas.js";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { brandingDir, loadLogoDataUrl } from "../pdf/firma.js";
import { invalidateAllPdfCaches } from "../pdf/belegPdf.server.js";
import { logoFingerprint } from "../pdf/cache.js";

const LOGO_MAX_BYTES = 3 * 1024 * 1024; // 3 MB roh — reicht für gängige Marken-PNGs
const LOGO_MIME_TO_EXT: Record<string, "png" | "jpg"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
};

function ensureBrandingDir(): string {
  const d = brandingDir();
  if (!existsSync(d)) mkdirSync(d, { recursive: true, mode: 0o700 });
  return d;
}

/** Sucht die aktuell gespeicherte Logo-Datei (png/jpg/jpeg) oder null. */
function findLogoFile(): { path: string; mime: string } | null {
  const d = brandingDir();
  if (!existsSync(d)) return null;
  const candidates: Array<{ ext: string; mime: string }> = [
    { ext: "png", mime: "image/png" },
    { ext: "jpg", mime: "image/jpeg" },
    { ext: "jpeg", mime: "image/jpeg" },
  ];
  for (const c of candidates) {
    const p = path.join(d, `logo.${c.ext}`);
    if (existsSync(p)) return { path: p, mime: c.mime };
  }
  return null;
}

function deleteAllLogoFiles(): void {
  const d = brandingDir();
  if (!existsSync(d)) return;
  for (const f of readdirSync(d)) {
    if (/^logo\.(png|jpe?g|webp)$/i.test(f)) {
      try { unlinkSync(path.join(d, f)); } catch { /* ignore */ }
    }
  }
}

function writeLogoAtomic(ext: "png" | "jpg", data: Buffer): void {
  const d = ensureBrandingDir();
  const tmp = path.join(d, `.logo.${ext}.tmp`);
  writeFileSync(tmp, data, { mode: 0o600 });
  // Erst alte Varianten entfernen, dann neue atomar reinbewegen.
  deleteAllLogoFiles();
  renameSync(tmp, path.join(d, `logo.${ext}`));
}

/** Detektiert MIME anhand der Magic Bytes — verhindert manipulierte Content-Type-Header. */
function detectImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  return null;
}

function countPdfCacheFiles(art: "angebot" | "rechnung"): number {
  const dir = path.join(config.dataDir, "pdf-cache", art);
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.endsWith(".pdf")).length;
}

function loadArea(name: keyof typeof AREAS): unknown {
  const a = AREAS[name];
  const stored = getSetting(a.key);
  return a.schema.parse(stored ?? {});
}

/**
 * Patch-Semantik:
 * 1. Body gegen Partial-Schema validieren (nur gesetzte Felder).
 * 2. Mit aktuellem Stand mergen.
 * 3. Gegen Vollschema validieren (Defaults bleiben für ungesetzte Felder erhalten).
 * Leere Strings werden als gewollte Werte beibehalten (kein silent revert).
 */
function patchArea(
  name: keyof typeof AREAS,
  body: unknown,
):
  | { ok: true; value: unknown }
  | { ok: false; status: number; error: string; issues?: unknown } {
  const a = AREAS[name];
  // Partial-Validierung: nur Felder die der Client schickt
  const partialSchema =
    "partial" in a.schema && typeof (a.schema as { partial: () => unknown }).partial === "function"
      ? ((a.schema as unknown as { partial: () => z.ZodTypeAny }).partial())
      : a.schema;
  const partial = partialSchema.safeParse(body ?? {});
  if (!partial.success) {
    return { ok: false, status: 422, error: "validation", issues: partial.error.issues };
  }
  const current = a.schema.parse(getSetting(a.key) ?? {}) as Record<string, unknown>;
  const merged = { ...current, ...(partial.data as Record<string, unknown>) };
  const parsed = a.schema.safeParse(merged);
  if (!parsed.success) {
    return { ok: false, status: 422, error: "validation", issues: parsed.error.issues };
  }
  setSetting(a.key, parsed.data, { encrypt: a.encrypted });
  return { ok: true, value: parsed.data };
}

export async function einstellungenRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  const simpleAreas: Array<keyof typeof AREAS> = [
    "nummernkreise",
    "sicherheit",
    "erscheinung",
    "backup",
    // "mahnung" wird unten mit eigenem Mapper bedient
    "dauerauftrag",
    "steuer",
    "stundenzettel",
  ];
  for (const a of simpleAreas) {
    app.get(`/einstellungen/${a}`, async () => loadArea(a));
    app.patch(`/einstellungen/${a}`, async (req, reply) => {
      const r = patchArea(a, req.body);
      if (!r.ok) {
        reply.status(r.status);
        return { error: r.error, issues: r.issues };
      }
      audit({ userId: req.user?.id, action: `settings.${a}.patch`, ip: req.ip });
      emit("einstellung:geaendert", { key: a, userId: req.user?.id ?? null });
      return r.value;
    });
  }

  // -------- Firma — UI nutzt firmenname/webseite, Backend speichert name/web --------
  // Adapter akzeptiert beide Schreibweisen und liefert beide zurück, damit weder
  // Formular noch PDF-Renderer leere Felder sehen.
  function firmaToWire(base: Record<string, unknown>): Record<string, unknown> {
    const b = base;
    // Legacy-Korrektur: alter Default-Schreibung ohne Leerzeichen wird
    // nur bei exakter Übereinstimmung in „My Clean Center GmbH" überführt.
    let name = b.name;
    if (typeof name === "string" && name.trim() === "MyCleanCenter GmbH") {
      name = "My Clean Center GmbH";
    }
    // Logo-URL: bevorzugt die aktuelle Datei im branding/-Ordner (mit Cache-Bust),
    // fällt auf einen ggf. noch vorhandenen legacy Base64-Wert zurück.
    const file = findLogoFile();
    const storedLogo = typeof b.logoUrl === "string" ? b.logoUrl : "";
    const updatedAt = typeof b.logoUpdatedAt === "string" ? b.logoUpdatedAt : "";
    let logoUrl: string | null = null;
    if (file) {
      const bust = updatedAt ? encodeURIComponent(updatedAt) : String(Date.now());
      logoUrl = `/einstellungen/firma/logo?v=${bust}`;
    } else if (storedLogo) {
      logoUrl = storedLogo;
    }
    return {
      ...b,
      name,
      // UI-Aliasse zusätzlich zu den internen Feldern:
      firmenname: name,
      webseite: b.web,
      logoUrl,
      hasLogo: !!file || (typeof storedLogo === "string" && storedLogo.startsWith("data:")),
      logoUpdatedAt: updatedAt || null,
    };
  }
  function firmaFromWire(input: Record<string, unknown>): Record<string, unknown> {
    const i = { ...input };
    if (i.firmenname !== undefined && i.name === undefined) i.name = i.firmenname;
    if (i.webseite !== undefined && i.web === undefined) i.web = i.webseite;
    delete i.firmenname;
    delete i.webseite;
    // hasLogo/logoUrl (URL-Form) werden serverseitig aus der Datei abgeleitet
    // und dürfen NIE vom Formular zurückgeschrieben werden. Sonst würde ein
    // simpler „Telefon speichern"-PATCH das Logo-Setting mit einer URL
    // überschreiben, was das PDF-Rendering (das eine data:-URL erwartet)
    // still kaputtmacht. Der Upload-Endpoint pflegt logoUrl/logoUpdatedAt
    // exklusiv.
    delete i.hasLogo;
    delete i.logoUrl;
    delete i.logoUpdatedAt;
    return i;
  }

  app.get("/einstellungen/firma", async () => {
    const base = loadArea("firma") as Record<string, unknown>;
    return firmaToWire(base);
  });
  app.patch("/einstellungen/firma", async (req, reply) => {
    const mapped = firmaFromWire((req.body ?? {}) as Record<string, unknown>);
    const r = patchArea("firma", mapped);
    if (!r.ok) {
      reply.status(r.status);
      return { error: r.error, issues: r.issues };
    }
    audit({ userId: req.user?.id, action: "settings.firma.patch", ip: req.ip });
    emit("einstellung:geaendert", { key: "firma", userId: req.user?.id ?? null });
    return firmaToWire(r.value as Record<string, unknown>);
  });

  // ---------------- Firma-Logo (eigene Datei, entkoppelt vom Settings-JSON) ----------------
  // Warum eigener Endpoint: die alte Lösung (Base64-Data-URL in FirmaSchema.logoUrl)
  // hat bei großen PNGs still zu 422-Fehlern im Firma-PATCH geführt und blähte jeden
  // Settings-Roundtrip auf. Datei-Persistenz umgeht Schema-Größen komplett und wird
  // vom PDF-Renderer bereits als Fallback genutzt.

  app.get("/einstellungen/firma/logo/debug", async () => {
    const base = loadArea("firma") as Record<string, unknown>;
    const file = findLogoFile();
    const branding = brandingDir();
    const brandingFiles = existsSync(branding)
      ? readdirSync(branding).filter((f) => /^logo\./i.test(f)).sort()
      : [];

    let fileInfo: Record<string, unknown> | null = null;
    let fileReadError: string | null = null;
    if (file) {
      try {
        const buf = readFileSync(file.path);
        const st = statSync(file.path);
        fileInfo = {
          exists: true,
          fileName: path.basename(file.path),
          path: file.path,
          expectedMime: file.mime,
          detectedMime: detectImageMime(buf),
          bytes: buf.length,
          modifiedAt: st.mtime.toISOString(),
        };
      } catch (e) {
        fileReadError = e instanceof Error ? e.message : String(e);
      }
    }

    let dataUrl: string | null = null;
    let dataUrlError: string | null = null;
    try {
      dataUrl = loadLogoDataUrl();
    } catch (e) {
      dataUrlError = e instanceof Error ? e.message : String(e);
    }
    const dataUrlMime = dataUrl ? /^data:([^;]+);base64,/.exec(dataUrl)?.[1] ?? null : null;
    const legacyLogo = typeof base.logoUrl === "string" ? base.logoUrl : "";

    return {
      ok: !!dataUrl,
      generatedAt: new Date().toISOString(),
      dataDir: config.dataDir,
      brandingDir: branding,
      brandingFiles,
      file: fileInfo ?? { exists: false },
      fileReadError,
      settings: {
        hasLegacyLogoValue: legacyLogo.length > 0,
        legacyLogoLooksLikeDataUrl: legacyLogo.startsWith("data:image/"),
        logoUpdatedAt: typeof base.logoUpdatedAt === "string" ? base.logoUpdatedAt : null,
        wire: firmaToWire(base),
      },
      pdfLoader: {
        foundDataUrl: !!dataUrl,
        mime: dataUrlMime,
        length: dataUrl?.length ?? 0,
        fingerprint: logoFingerprint(dataUrl),
        error: dataUrlError,
      },
      pdfCache: {
        angebote: countPdfCacheFiles("angebot"),
        rechnungen: countPdfCacheFiles("rechnung"),
      },
    };
  });

  app.get("/einstellungen/firma/logo", async (_req, reply) => {
    const file = findLogoFile();
    if (!file) {
      // Legacy-Fallback: Falls noch ein Base64-Wert in den Settings liegt,
      // aber noch keine Datei existiert, streamen wir die Bytes einmalig aus.
      const cur = getSetting<{ logoUrl?: string }>("firma");
      const dataUrl = cur?.logoUrl;
      if (typeof dataUrl === "string" && dataUrl.startsWith("data:image/")) {
        const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
        if (match) {
          const mime = match[1];
          const buf = Buffer.from(match[2], "base64");
          return reply
            .header("Content-Type", mime)
            .header("Cache-Control", "no-store")
            .send(buf);
        }
      }
      reply.status(404);
      return { error: "no-logo" };
    }
    const buf = readFileSync(file.path);
    return reply
      .header("Content-Type", file.mime)
      .header("Cache-Control", "no-store")
      .send(buf);
  });

  app.post("/einstellungen/firma/logo", async (req, reply) => {
    if (!req.isMultipart()) {
      reply.status(400);
      return { error: "multipart-required" };
    }
    const parts = (req as unknown as { parts: () => AsyncIterable<unknown> }).parts();
    let buf: Buffer | null = null;
    let declaredMime = "application/octet-stream";
    let truncated = false;
    for await (const partRaw of parts) {
      const part = partRaw as {
        type: "file" | "field";
        fieldname: string;
        mimetype?: string;
        file?: NodeJS.ReadableStream & { truncated: boolean };
      };
      if (part.type === "file" && part.file) {
        const chunks: Buffer[] = [];
        let total = 0;
        for await (const chunk of part.file) {
          const b = chunk as Buffer;
          total += b.length;
          if (total > LOGO_MAX_BYTES) {
            truncated = true;
          } else {
            chunks.push(b);
          }
        }
        buf = Buffer.concat(chunks);
        declaredMime = part.mimetype ?? declaredMime;
        if (part.file.truncated) truncated = true;
      }
    }
    if (!buf) {
      reply.status(400);
      return { error: "no-file" };
    }
    if (truncated) {
      reply.status(413);
      return { error: "file-too-large", maxBytes: LOGO_MAX_BYTES };
    }
    const detected = detectImageMime(buf);
    const ext = detected ? LOGO_MIME_TO_EXT[detected] : undefined;
    if (!ext) {
      reply.status(415);
      return { error: "mime-not-allowed", message: "Bitte PNG oder JPG hochladen.", mime: detected ?? declaredMime };
    }
    writeLogoAtomic(ext, buf);
    // Zeitstempel + Legacy-Base64 leeren, damit firmaToWire konsistent bleibt.
    patchArea("firma", { logoUrl: "", logoUpdatedAt: new Date().toISOString() });
    invalidateAllPdfCaches();
    audit({
      userId: req.user?.id,
      action: "settings.firma.logo.set",
      detail: { mime: detected, bytes: buf.length },
      ip: req.ip,
    });
    emit("einstellung:geaendert", { key: "firma", userId: req.user?.id ?? null });
    const base = loadArea("firma") as Record<string, unknown>;
    return firmaToWire(base);
  });

  app.delete("/einstellungen/firma/logo", async (req) => {
    deleteAllLogoFiles();
    patchArea("firma", { logoUrl: "", logoUpdatedAt: new Date().toISOString() });
    invalidateAllPdfCaches();
    audit({ userId: req.user?.id, action: "settings.firma.logo.clear", ip: req.ip });
    emit("einstellung:geaendert", { key: "firma", userId: req.user?.id ?? null });
    const base = loadArea("firma") as Record<string, unknown>;
    return firmaToWire(base);
  });

  // -------- Mahnung — flach intern, nested für UI --------
  app.get("/einstellungen/mahnung", async () => {
    const flach = MahnungSchema.parse(getSetting("mahnung") ?? {});
    return flachZuUi(flach);
  });
  app.patch("/einstellungen/mahnung", async (req, reply) => {
    const patch = uiPatchZuFlach((req.body ?? {}) as Record<string, unknown>);
    const r = patchArea("mahnung", patch);
    if (!r.ok) {
      reply.status(r.status);
      return { error: r.error, issues: r.issues };
    }
    audit({ userId: req.user?.id, action: "settings.mahnung.patch", ip: req.ip });
    emit("einstellung:geaendert", { key: "mahnung", userId: req.user?.id ?? null });
    return flachZuUi(r.value as z.infer<typeof MahnungSchema>);
  });

  // SMTP — akzeptiert UI-Aliasse (server/ssl/benutzer/absenderName/absenderEmail/passwort)
  // UND die internen Felder (host/secure/user/fromName/fromEmail/password).
  // Liefert beide Schreibweisen zurück, damit jede Konsumentin glücklich ist.
  function smtpToWire(base: Record<string, unknown>, meta: { exists: boolean; updatedAt?: string | null }) {
    const b = base as Record<string, unknown>;
    return {
      host: b.host, port: b.port, secure: b.secure, user: b.user,
      fromName: b.fromName, fromEmail: b.fromEmail,
      // UI-Aliasse:
      server: b.host, ssl: b.secure, benutzer: b.user,
      absenderName: b.fromName, absenderEmail: b.fromEmail,
      passwordIsSet: meta.exists,
      passwortGesetzt: meta.exists,
      passwordUpdatedAt: meta.updatedAt ?? null,
    };
  }
  function smtpFromWire(input: Record<string, unknown>): { core: Record<string, unknown>; password?: string } {
    const i = input;
    const pw = typeof i.password === "string" && i.password.length > 0
      ? (i.password as string)
      : typeof i.passwort === "string" && (i.passwort as string).length > 0
        ? (i.passwort as string)
        : undefined;
    const core: Record<string, unknown> = {};
    if ("host" in i) core.host = i.host;
    else if ("server" in i) core.host = i.server;
    if ("port" in i) core.port = i.port;
    if ("secure" in i) core.secure = i.secure;
    else if ("ssl" in i) core.secure = i.ssl;
    if ("user" in i) core.user = i.user;
    else if ("benutzer" in i) core.user = i.benutzer;
    if ("fromName" in i) core.fromName = i.fromName;
    else if ("absenderName" in i) core.fromName = i.absenderName;
    if ("fromEmail" in i) core.fromEmail = i.fromEmail;
    else if ("absenderEmail" in i) core.fromEmail = i.absenderEmail;
    return { core, password: pw };
  }

  app.get("/einstellungen/smtp", async () => {
    const base = loadArea("smtp") as Record<string, unknown>;
    const meta = getSettingMeta(SENSITIVE_KEYS.smtpPassword);
    return smtpToWire(base, meta);
  });
  app.patch("/einstellungen/smtp", async (req, reply) => {
    const raw = (req.body ?? {}) as Record<string, unknown>;
    const { core, password } = smtpFromWire(raw);
    if (password) {
      const pw = SmtpPasswordSchema.safeParse({ password });
      if (!pw.success) {
        reply.status(422);
        return { error: "validation", issues: pw.error.issues };
      }
      setSetting(SENSITIVE_KEYS.smtpPassword, pw.data.password, { encrypt: true });
      resetTransport();
      resetImapClient();
    }
    const r = patchArea("smtp", core);
    if (!r.ok) {
      reply.status(r.status);
      return { error: r.error, issues: r.issues };
    }
    resetTransport();
    resetImapClient();
    audit({ userId: req.user?.id, action: "settings.smtp.patch", ip: req.ip });
    emit("einstellung:geaendert", { key: "smtp", userId: req.user?.id ?? null });
    const meta = getSettingMeta(SENSITIVE_KEYS.smtpPassword);
    return smtpToWire(r.value as Record<string, unknown>, meta);
  });
  app.delete("/einstellungen/smtp/passwort", async (req) => {
    deleteSetting(SENSITIVE_KEYS.smtpPassword);
    resetTransport();
    resetImapClient();
    audit({ userId: req.user?.id, action: "settings.smtp.password-clear", ip: req.ip });
    return { ok: true };
  });
  // Reiner TCP-Reachability-Check (alt). Echte Auth/TLS-Prüfung -> POST /email/verify.
  app.post("/einstellungen/smtp/test", async () => {
    const cfg = loadArea("smtp") as { host: string; port: number };
    if (!cfg.host) return { ok: false, erfolg: false, nachricht: "Host fehlt" };
    return await new Promise<{ ok: boolean; erfolg: boolean; nachricht: string; latencyMs?: number }>((resolve) => {
      const t0 = Date.now();
      const sock = createConnection({ host: cfg.host, port: cfg.port, timeout: 4000 });
      const done = (res: { ok: boolean; nachricht: string; latencyMs?: number }): void => {
        try { sock.destroy(); } catch { /* ignore */ }
        resolve({ ...res, erfolg: res.ok });
      };
      sock.once("connect", () => done({ ok: true, latencyMs: Date.now() - t0, nachricht: `Server erreichbar (${Date.now() - t0} ms) — für Auth/TLS bitte „Verbindung prüfen"` }));
      sock.once("timeout", () => done({ ok: false, nachricht: "Timeout — Server nicht erreichbar" }));
      sock.once("error", (e) => done({ ok: false, nachricht: e.message }));
    });
  });

  // Google Drive: Routen liegen in routes/drive.ts (echter OAuth-Flow + Settings).


  // Sessions-Verwaltung entfernt (Single-User-Modus).
}
