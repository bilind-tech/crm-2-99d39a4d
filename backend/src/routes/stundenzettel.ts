// REST-Endpunkte für das Stundenzettel-Modul (Phase 1).
// Pfade:
//   GET    /mitarbeiter
//   POST   /mitarbeiter
//   GET    /mitarbeiter/:id
//   PUT    /mitarbeiter/:id
//   DELETE /mitarbeiter/:id
//   GET    /feiertage?jahr=YYYY
//   GET    /feiertage/custom?jahr=YYYY
//   POST   /feiertage/custom
//   DELETE /feiertage/custom/:id
//   GET    /stundenzettel?jahr=YYYY&monat=MM&mitarbeiterId=…
//   POST   /stundenzettel/generieren  { mitarbeiterId?, mitarbeiterIds?, jahr, monat, ueberschreiben? }
//   PUT    /stundenzettel/:id         (manuelle Tages-Edits, mit Neu-Summierung)
//   DELETE /stundenzettel/:id

import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/middleware.js";
import { audit } from "../auth/audit.js";
import { emit } from "../events/bus.js";
import { getFeiertageFuerJahr } from "../stundenzettel/feiertage.js";
import { generiereStundenzettel } from "../stundenzettel/generieren.js";
import { renderStundenzettelPdf } from "../pdf/stundenzettelPdf.js";
import { archiviereStundenzettel, archivStatus } from "../stundenzettel/archiv.js";
import {
  createCustomFeiertag,
  createMitarbeiter,
  deleteCustomFeiertag,
  deleteMitarbeiter,
  deleteZettel,
  findZettel,
  getMitarbeiter,
  getZettel,
  listCustomFeiertage,
  listMitarbeiter,
  listZettelFuerMonat,
  updateMitarbeiter,
  upsertZettel,
} from "../stundenzettel/repo.js";
import {
  createAbwesenheit,
  deleteAbwesenheit,
  ersetzeTageImZeitraum,
  getAbwesenheit,
  listAbwesenheiten,
  monateImZeitraum,
  updateAbwesenheit,
} from "../stundenzettel/abwesenheit.js";
import { getMonatsplan, listMonatsplaene, speichereMonatsplan } from "../stundenzettel/monatsplan.js";
import { effektivesZiel } from "../stundenzettel/monatsplanLogik.js";
import { z } from "zod";
import { pruefeZiel, wendeZielausgleichAn } from "../stundenzettel/zielausgleich.js";
import { entferneUrlaubsantragDokumente, legeUrlaubsantragAb, urlaubsantragStatus } from "../stundenzettel/urlaubsantragArchiv.js";
import {
  AbwesenheitInputSchema,
  CustomFeiertagInputSchema,
  MitarbeiterInputSchema,
  MitarbeiterPatchSchema,
  ZettelPatchSchema,
} from "../stundenzettel/validation.js";

function badRequest(reply: import("fastify").FastifyReply, issues: unknown) {
  reply.status(400);
  return { error: "validation", issues };
}

/**
 * Berechnet vorhandene Zettel eines Mitarbeiters neu, aber nur die Tage in
 * den übergebenen Zeiträumen. Manuell bearbeitete Tage außerhalb bleiben.
 */
async function nachberechnen(
  mitarbeiterId: string,
  zeitraeume: Array<{ von: string; bis: string }>,
  log: { error: (o: unknown, msg: string) => void },
): Promise<void> {
  const m = getMitarbeiter(mitarbeiterId);
  if (!m) return;
  const abw = listAbwesenheiten(mitarbeiterId);
  const monate = new Map<string, { jahr: number; monat: number }>();
  for (const z of zeitraeume) for (const mo of monateImZeitraum(z.von, z.bis)) monate.set(`${mo.jahr}-${mo.monat}`, mo);
  for (const { jahr, monat } of monate.values()) {
    const existing = findZettel(mitarbeiterId, jahr, monat);
    if (!existing) continue;
    const plan = getMonatsplan(mitarbeiterId, jahr, monat);
    const frisch = generiereStundenzettel(m, jahr, monat, listCustomFeiertage(jahr), abw, plan);
    const tage = ersetzeTageImZeitraum(existing.tage, frisch.tage, zeitraeume);
    const ziel = effektivesZiel(m.arbeitszeiten.zielStundenProMonat, plan);
    let gesamt = tage.reduce((s, t) => s + t.stunden, 0);
    if (ziel != null) gesamt = wendeZielausgleichAn(tage, ziel, `${m.id}-${jahr}-${monat}`);
    const saved = upsertZettel({ mitarbeiterId, jahr, monat, tage, gesamtStunden: gesamt });
  }
}

export async function stundenzettelRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);


  // ---------- Monatsplanung (Monatsziel + feste Tage) ----------
  app.get("/stz-monatsplan", async (req, reply) => {
    const q = req.query as { jahr?: string; monat?: string };
    const jahr = Number(q.jahr), monat = Number(q.monat);
    if (!jahr || !monat || monat < 1 || monat > 12) return reply.status(400).send({ error: "jahr und monat sind Pflicht" });
    return { plaene: listMonatsplaene(jahr, monat) };
  });

  app.put("/stz-monatsplan/:mitarbeiterId", async (req, reply) => {
    const mitarbeiterId = (req.params as { mitarbeiterId: string }).mitarbeiterId;
    if (!getMitarbeiter(mitarbeiterId)) return reply.status(404).send({ error: "not-found" });
    const halb = z.number().min(0).max(16).refine((v) => Number.isInteger(v * 2), "nur halbe Stunden");
    const p = z
      .object({
        jahr: z.number().int().min(2000).max(2100),
        monat: z.number().int().min(1).max(12),
        zielStunden: z.number().min(0).max(500).refine((v) => Number.isInteger(v * 2), "nur halbe Stunden").nullable(),
        festeTage: z.array(z.object({ datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), stunden: halb, bemerkung: z.string().max(60).nullable().optional() })).max(31),
      })
      .safeParse(req.body);
    if (!p.success) return badRequest(reply, p.error.issues);
    const { jahr, monat, zielStunden, festeTage } = p.data;
    const prefix = `${jahr}-${String(monat).padStart(2, "0")}-`;
    const daten = new Set<string>();
    for (const f of festeTage) {
      if (!f.datum.startsWith(prefix)) return badRequest(reply, [{ message: `Datum ${f.datum} liegt nicht im Monat` }]);
      if (daten.has(f.datum)) return badRequest(reply, [{ message: `Datum ${f.datum} doppelt` }]);
      daten.add(f.datum);
    }
    const saved = speichereMonatsplan({ mitarbeiterId, jahr, monat, zielStunden, festeTage });
    audit({ userId: req.user?.id ?? null, action: "stundenzettel.monatsplan", detail: { mitarbeiterId, jahr, monat } });
    return saved;
  });

  // ---------- Abwesenheiten ----------
  app.get("/abwesenheiten", async (req) => {
    const q = req.query as { mitarbeiterId?: string };
    return { abwesenheiten: listAbwesenheiten(q.mitarbeiterId || undefined) };
  });

  app.post("/abwesenheiten", async (req, reply) => {
    const p = AbwesenheitInputSchema.safeParse(req.body);
    if (!p.success) return badRequest(reply, p.error.issues);
    if (!getMitarbeiter(p.data.mitarbeiterId)) return reply.status(404).send({ error: "mitarbeiter-not-found" });
    const a = createAbwesenheit(p.data);
    await nachberechnen(a.mitarbeiterId, [a], req.log);
    audit({ userId: req.user?.id ?? null, action: "stundenzettel.abwesenheit.create", detail: { id: a.id } });
    return reply.status(201).send(a);
  });

  app.put("/abwesenheiten/:id", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const alt = getAbwesenheit(id);
    if (!alt) return reply.status(404).send({ error: "not-found" });
    const p = AbwesenheitInputSchema.safeParse(req.body);
    if (!p.success) return badRequest(reply, p.error.issues);
    if (!getMitarbeiter(p.data.mitarbeiterId)) return reply.status(404).send({ error: "mitarbeiter-not-found" });
    const neu = updateAbwesenheit(id, p.data)!;
    if (alt.mitarbeiterId !== neu.mitarbeiterId) {
      await nachberechnen(alt.mitarbeiterId, [alt], req.log);
      await nachberechnen(neu.mitarbeiterId, [neu], req.log);
    } else {
      await nachberechnen(neu.mitarbeiterId, [alt, neu], req.log);
    }
    audit({ userId: req.user?.id ?? null, action: "stundenzettel.abwesenheit.update", detail: { id } });
    return neu;
  });

  // Ablage-/Drive-Status aller Urlaubsanträge (für die Werkzeug-Liste).
  app.get("/abwesenheiten/antrag-status", async () => {
    const status: Record<string, ReturnType<typeof urlaubsantragStatus>> = {};
    for (const a of listAbwesenheiten()) if (a.art === "urlaub") status[a.id] = urlaubsantragStatus(a);
    return { status };
  });

  // Urlaubsantrag-PDF (im Browser erzeugt) in Dokumente ablegen.
  app.post("/abwesenheiten/:id/antrag-pdf", { bodyLimit: 15 * 1024 * 1024 }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const a = getAbwesenheit(id);
    if (!a) return reply.status(404).send({ error: "not-found" });
    const b = (req.body ?? {}) as { pdfBase64?: string };
    const raw = typeof b.pdfBase64 === "string" ? b.pdfBase64.replace(/^data:application\/pdf;base64,/, "") : "";
    const buf = Buffer.from(raw, "base64");
    if (buf.length < 100 || buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return reply.status(400).send({ error: "kein-pdf" });
    }
    const m = getMitarbeiter(a.mitarbeiterId);
    const r = await legeUrlaubsantragAb(a, m?.name ?? "Mitarbeiter", buf);
    audit({ userId: req.user?.id ?? null, action: "stundenzettel.urlaubsantrag.abgelegt", detail: { id, dokumentId: r.dokumentId } });
    return r;
  });

  app.delete("/abwesenheiten/:id", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const alt = getAbwesenheit(id);
    if (!alt || !deleteAbwesenheit(id)) return reply.status(404).send({ error: "not-found" });
    try {
      entferneUrlaubsantragDokumente(alt);
    } catch (e) {
      req.log.error({ err: e }, "urlaubsantrag-dokument-delete-failed");
    }
    await nachberechnen(alt.mitarbeiterId, [alt], req.log);
    audit({ userId: req.user?.id ?? null, action: "stundenzettel.abwesenheit.delete", detail: { id } });
    return { ok: true };
  });

  // ---------- Mitarbeiter ----------
  app.get("/mitarbeiter", async () => ({ mitarbeiter: listMitarbeiter() }));

  app.get("/mitarbeiter/:id", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const m = getMitarbeiter(id);
    if (!m) return reply.status(404).send({ error: "not-found" });
    return m;
  });

  app.post("/mitarbeiter", async (req, reply) => {
    const p = MitarbeiterInputSchema.safeParse(req.body);
    if (!p.success) return badRequest(reply, p.error.issues);
    const m = createMitarbeiter(p.data);
    audit({ userId: req.user?.id ?? null, action: "stundenzettel.mitarbeiter.create", detail: { id: m.id, name: m.name } });
    emit("stundenzettel:mitarbeiter", { action: "create", id: m.id });
    return reply.status(201).send(m);
  });

  app.put("/mitarbeiter/:id", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const p = MitarbeiterPatchSchema.safeParse(req.body);
    if (!p.success) return badRequest(reply, p.error.issues);
    const m = updateMitarbeiter(id, p.data);
    if (!m) return reply.status(404).send({ error: "not-found" });
    audit({ userId: req.user?.id ?? null, action: "stundenzettel.mitarbeiter.update", detail: { id } });
    emit("stundenzettel:mitarbeiter", { action: "update", id });
    return m;
  });

  app.delete("/mitarbeiter/:id", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const ok = deleteMitarbeiter(id);
    if (!ok) return reply.status(404).send({ error: "not-found" });
    audit({ userId: req.user?.id ?? null, action: "stundenzettel.mitarbeiter.delete", detail: { id } });
    emit("stundenzettel:mitarbeiter", { action: "delete", id });
    return { ok: true };
  });

  // ---------- Feiertage ----------
  app.get("/feiertage", async (req) => {
    const q = req.query as { jahr?: string };
    const jahr = Number(q.jahr) || new Date().getFullYear();
    const gesetzlich = getFeiertageFuerJahr(jahr);
    const custom = listCustomFeiertage(jahr);
    return { jahr, gesetzlich, custom };
  });

  app.get("/feiertage/custom", async (req) => {
    const q = req.query as { jahr?: string };
    const jahr = q.jahr ? Number(q.jahr) : undefined;
    return { custom: listCustomFeiertage(jahr) };
  });

  app.post("/feiertage/custom", async (req, reply) => {
    const p = CustomFeiertagInputSchema.safeParse(req.body);
    if (!p.success) return badRequest(reply, p.error.issues);
    const f = createCustomFeiertag(p.data.datum, p.data.name);
    audit({ userId: req.user?.id ?? null, action: "stundenzettel.feiertag.create", detail: p.data });
    return reply.status(201).send(f);
  });

  app.delete("/feiertage/custom/:id", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const ok = deleteCustomFeiertag(id);
    if (!ok) return reply.status(404).send({ error: "not-found" });
    audit({ userId: req.user?.id ?? null, action: "stundenzettel.feiertag.delete", detail: { id } });
    return { ok: true };
  });

  // ---------- Stundenzettel ----------
  app.get("/stundenzettel", async (req, reply) => {
    const q = req.query as { jahr?: string; monat?: string; mitarbeiterId?: string };
    const jahr = Number(q.jahr);
    const monat = Number(q.monat);
    if (!jahr || !monat || monat < 1 || monat > 12) {
      return reply.status(400).send({ error: "jahr und monat sind Pflicht" });
    }
    if (q.mitarbeiterId) {
      const z = findZettel(q.mitarbeiterId, jahr, monat);
      return { zettel: z ? [z] : [] };
    }
    return { zettel: listZettelFuerMonat(jahr, monat) };
  });

  app.post("/stundenzettel/generieren", async (req, reply) => {
    const b = (req.body ?? {}) as {
      mitarbeiterId?: string;
      mitarbeiterIds?: string[];
      jahr?: number;
      monat?: number;
      ueberschreiben?: boolean;
    };
    const jahr = Number(b.jahr);
    const monat = Number(b.monat);
    if (!jahr || !monat || monat < 1 || monat > 12) {
      return reply.status(400).send({ error: "jahr und monat sind Pflicht" });
    }
    const ueberschreiben = b.ueberschreiben ?? true;
    const ids = b.mitarbeiterIds && b.mitarbeiterIds.length > 0
      ? b.mitarbeiterIds
      : b.mitarbeiterId
        ? [b.mitarbeiterId]
        : listMitarbeiter().filter((m) => m.aktiv).map((m) => m.id);
    const custom = listCustomFeiertage(jahr);
    const ergebnis: Array<{ mitarbeiterId: string; ok: boolean; id?: string; error?: string; skipped?: boolean }> = [];
    for (const id of ids) {
      const m = getMitarbeiter(id);
      if (!m) { ergebnis.push({ mitarbeiterId: id, ok: false, error: "not-found" }); continue; }
      const existing = findZettel(id, jahr, monat);
      if (existing && !ueberschreiben) { ergebnis.push({ mitarbeiterId: id, ok: true, id: existing.id!, skipped: true }); continue; }
      const z = generiereStundenzettel(m, jahr, monat, custom, listAbwesenheiten(id), getMonatsplan(id, jahr, monat));
      const saved = upsertZettel({
        mitarbeiterId: z.mitarbeiterId,
        jahr: z.jahr,
        monat: z.monat,
        tage: z.tage,
        gesamtStunden: z.gesamtStunden,
      });
      ergebnis.push({ mitarbeiterId: id, ok: true, id: saved.id! });
    }
    audit({ userId: req.user?.id ?? null, action: "stundenzettel.generieren", detail: { jahr, monat, count: ids.length } });
    return { jahr, monat, ergebnis };
  });

  app.put("/stundenzettel/:id", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const existing = getZettel(id);
    if (!existing) return reply.status(404).send({ error: "not-found" });
    const p = ZettelPatchSchema.safeParse(req.body);
    if (!p.success) return badRequest(reply, p.error.issues);
    // Merge: gepatchte Tage überschreiben (nach datum), Rest bleibt.
    const patchMap = new Map(p.data.tage.map((t) => [t.datum, t]));
    const neueTage = existing.tage.map((t) => {
      const patched = patchMap.get(t.datum);
      if (!patched) return t;
      return {
        ...t,
        beginn: patched.beginn ?? undefined,
        ende: patched.ende ?? undefined,
        beginn2: patched.beginn2 ?? undefined,
        ende2: patched.ende2 ?? undefined,
        pause: patched.pause ?? undefined,
        stunden: patched.ausgeschlossen ? 0 : patched.stunden,
        bemerkung: patched.bemerkung ?? undefined,
        quelle: patched.quelle ?? t.quelle,
        ausgeschlossen: patched.ausgeschlossen ? true : undefined,
      };
    });
    const gesamt = neueTage.reduce((s, t) => s + t.stunden, 0);
    const zielMa = effektivesZiel(
      getMitarbeiter(existing.mitarbeiterId)?.arbeitszeiten?.zielStundenProMonat ?? null,
      getMonatsplan(existing.mitarbeiterId, existing.jahr, existing.monat),
    );
    const zielCheck = pruefeZiel(neueTage, zielMa);
    if (!zielCheck.erfuellt) {
      return reply.status(422).send({
        code: "ziel-nicht-erreicht",
        error: `Zielstunden nicht erreicht: Ist ${zielCheck.ist.toLocaleString("de-DE")} h, Ziel ${zielCheck.ziel?.toLocaleString("de-DE")} h`,
      });
    }
    const saved = upsertZettel({
      mitarbeiterId: existing.mitarbeiterId,
      jahr: existing.jahr,
      monat: existing.monat,
      tage: neueTage,
      gesamtStunden: gesamt,
    });
    audit({ userId: req.user?.id ?? null, action: "stundenzettel.tage.patch", detail: { id, count: p.data.tage.length } });
    return saved;
  });

  // Stundenzettel-PDF in die Dokumentenablage schreiben (Ordner Stundenzettel/{YYYY}/{MM}).
  app.post("/stundenzettel/:id/archivieren", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    try {
      const r = await archiviereStundenzettel(id);
      if (!r) return reply.status(404).send({ error: "not-found" });
      audit({ userId: req.user?.id ?? null, action: "stundenzettel.archiviert", detail: { id, dokumentId: r.dokumentId } });
      return r;
    } catch (e) {
      req.log.error({ err: e }, "stundenzettel-archiv-failed");
      return reply.status(500).send({ error: "archiv-failed", message: (e as Error).message });
    }
  });

  app.delete("/stundenzettel/:id", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const ok = deleteZettel(id);
    if (!ok) return reply.status(404).send({ error: "not-found" });
    audit({ userId: req.user?.id ?? null, action: "stundenzettel.delete", detail: { id } });
    return { ok: true };
  });

  // ---------- PDF ----------
  app.get("/stundenzettel/:id/pdf", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    let result;
    try {
      result = await renderStundenzettelPdf(id);
    } catch (e) {
      req.log.error({ err: e }, "stundenzettel-pdf-failed");
      return reply.status(500).send({
        error: "pdf-render-failed",
        message: `PDF konnte nicht erzeugt werden: ${(e as Error).message ?? String(e)}`,
      });
    }
    if (!result) return reply.status(404).send({ error: "not-found" });
    const etag = `"${result.hash}"`;
    if (req.headers["if-none-match"] === etag) {
      return reply.status(304).header("ETag", etag).send();
    }
    const safeAscii = result.dateiname.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
    return reply
      .status(200)
      .header("Content-Type", "application/pdf")
      .header("Content-Length", String(result.buffer.length))
      .header(
        "Content-Disposition",
        `inline; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(result.dateiname)}`,
      )
      .header("ETag", etag)
      .header("Cache-Control", "private, max-age=0, must-revalidate")
      .send(result.buffer);
  });
}