// Preview-Fallback (Lovable-Vorschau ohne Pi-Backend) für das Stundenzettel-Modul.
// Spiegelt die Backend-Routen /mitarbeiter, /feiertage, /stundenzettel im Browser.

import {
  DEFAULT_ARBEITSZEIT,
  WOCHENTAGE,
  type CustomFeiertag,
  type FeiertageResponse,
  type GenerierenErgebnis,
  type GenerierterTag,
  type Mitarbeiter,
  type MitarbeiterInput,
  type Stundenzettel,
  type Wochentag,
} from "@/lib/stundenzettel/types";

const KEY = "mcc.localPreview.stundenzettel.v1";

interface Store {
  mitarbeiter: Mitarbeiter[];
  zettel: Stundenzettel[];
  customFeiertage: CustomFeiertag[];
}

function empty(): Store {
  return { mitarbeiter: [], zettel: [], customFeiertage: [] };
}

function read(): Store {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      mitarbeiter: parsed.mitarbeiter ?? [],
      zettel: parsed.zettel ?? [],
      customFeiertage: parsed.customFeiertage ?? [],
    };
  } catch {
    return empty();
  }
}

function write(store: Store): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

// ---------- Feiertage NRW ----------

function ostersonntag(jahr: number): Date {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(jahr, monat - 1, tag));
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function plus(d: Date, tage: number): Date {
  return new Date(d.getTime() + tage * 86400000);
}

function gesetzlicheFeiertageNrw(jahr: number): Array<{ datum: string; name: string }> {
  const o = ostersonntag(jahr);
  return [
    { datum: `${jahr}-01-01`, name: "Neujahr" },
    { datum: iso(plus(o, -2)), name: "Karfreitag" },
    { datum: iso(o), name: "Ostersonntag" },
    { datum: iso(plus(o, 1)), name: "Ostermontag" },
    { datum: `${jahr}-05-01`, name: "Tag der Arbeit" },
    { datum: iso(plus(o, 39)), name: "Christi Himmelfahrt" },
    { datum: iso(plus(o, 49)), name: "Pfingstsonntag" },
    { datum: iso(plus(o, 50)), name: "Pfingstmontag" },
    { datum: iso(plus(o, 60)), name: "Fronleichnam" },
    { datum: `${jahr}-10-03`, name: "Tag der Deutschen Einheit" },
    { datum: `${jahr}-11-01`, name: "Allerheiligen" },
    { datum: `${jahr}-12-25`, name: "1. Weihnachtstag" },
    { datum: `${jahr}-12-26`, name: "2. Weihnachtstag" },
  ].sort((a, b) => a.datum.localeCompare(b.datum));
}

// ---------- Generierung ----------

function minuten(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((v) => Number.parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

function stundenAus(beginn: string, ende: string, pause: number): number {
  const diff = minuten(ende) - minuten(beginn) - (pause || 0);
  return Math.max(0, Math.round((diff / 60) * 100) / 100);
}

function wochentagVon(d: Date): Wochentag {
  // getUTCDay(): 0 = Sonntag
  const idx = (d.getUTCDay() + 6) % 7;
  return WOCHENTAGE[idx];
}

function generiereTage(m: Mitarbeiter, jahr: number, monat: number, feiertage: Map<string, string>): GenerierterTag[] {
  const cfg = m.arbeitszeiten ?? DEFAULT_ARBEITSZEIT;
  const tageImMonat = new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
  const out: GenerierterTag[] = [];
  for (let tag = 1; tag <= tageImMonat; tag += 1) {
    const d = new Date(Date.UTC(jahr, monat - 1, tag));
    const datum = iso(d);
    const wt = wochentagVon(d);
    const feiertag = feiertage.get(datum);
    const zeit = cfg.wochentagZeiten?.[wt];
    const istArbeitstag = zeit?.aktiv ?? cfg.arbeitstage?.includes(wt) ?? false;

    if (feiertag) {
      out.push({ datum, wochentag: wt, stunden: 0, bemerkung: feiertag });
      continue;
    }
    if (!istArbeitstag) {
      out.push({ datum, wochentag: wt, stunden: 0, bemerkung: "Frei" });
      continue;
    }
    const beginn = zeit?.beginn ?? cfg.standardZeiten.arbeitsbeginn;
    const ende = zeit?.ende ?? cfg.standardZeiten.arbeitsende;
    const pause = zeit?.pause ?? cfg.standardZeiten.pauseDauer;
    const tagEintrag: GenerierterTag = {
      datum,
      wochentag: wt,
      beginn,
      ende,
      pause,
      stunden: stundenAus(beginn, ende, pause),
    };
    if (zeit?.block2) {
      tagEintrag.beginn2 = zeit.block2.beginn;
      tagEintrag.ende2 = zeit.block2.ende;
      tagEintrag.stunden = Math.round((tagEintrag.stunden + stundenAus(zeit.block2.beginn, zeit.block2.ende, 0)) * 100) / 100;
    }
    out.push(tagEintrag);
  }
  return out;
}

function summe(tage: GenerierterTag[]): number {
  return Math.round(tage.reduce((s, t) => s + (t.stunden || 0), 0) * 100) / 100;
}

// ---------- Router ----------

export function stundenzettelPreviewGet<T>(cleanPath: string, params: URLSearchParams): T | null {
  const store = read();

  if (cleanPath === "/mitarbeiter") {
    return { mitarbeiter: store.mitarbeiter } as T;
  }
  if (cleanPath.startsWith("/mitarbeiter/")) {
    const id = cleanPath.split("/")[2];
    return (store.mitarbeiter.find((m) => m.id === id) ?? null) as T | null;
  }
  if (cleanPath === "/feiertage") {
    const jahr = Number.parseInt(params.get("jahr") ?? "", 10) || new Date().getFullYear();
    const res: FeiertageResponse = {
      jahr,
      gesetzlich: gesetzlicheFeiertageNrw(jahr),
      custom: store.customFeiertage.filter((c) => c.datum.startsWith(String(jahr))),
    };
    return res as T;
  }
  if (cleanPath === "/stundenzettel") {
    const jahr = Number.parseInt(params.get("jahr") ?? "", 10);
    const monat = Number.parseInt(params.get("monat") ?? "", 10);
    return {
      zettel: store.zettel.filter((z) => z.jahr === jahr && z.monat === monat),
    } as T;
  }
  return null;
}

export function stundenzettelPreviewMutate<T>(method: string, cleanPath: string, body?: unknown): T | null {
  const store = read();
  const ts = new Date().toISOString();

  // ---- Mitarbeiter ----
  if (method === "POST" && cleanPath === "/mitarbeiter") {
    const input = (body ?? {}) as MitarbeiterInput;
    const m: Mitarbeiter = {
      id: `preview-ma-${crypto.randomUUID()}`,
      name: (input.name ?? "").trim() || "Mitarbeiter",
      aktiv: input.aktiv ?? true,
      arbeitszeiten: input.arbeitszeiten ?? DEFAULT_ARBEITSZEIT,
      erstelltAm: ts,
      aktualisiertAm: ts,
    };
    store.mitarbeiter.push(m);
    write(store);
    return m as T;
  }
  if (cleanPath.startsWith("/mitarbeiter/")) {
    const id = cleanPath.split("/")[2];
    const idx = store.mitarbeiter.findIndex((m) => m.id === id);
    if (idx < 0) return null;
    if (method === "PUT" || method === "PATCH") {
      const patch = (body ?? {}) as Partial<MitarbeiterInput>;
      const next: Mitarbeiter = { ...store.mitarbeiter[idx], ...patch, id, aktualisiertAm: ts };
      store.mitarbeiter[idx] = next;
      write(store);
      return next as T;
    }
    if (method === "DELETE") {
      store.mitarbeiter.splice(idx, 1);
      store.zettel = store.zettel.filter((z) => z.mitarbeiterId !== id);
      write(store);
      return { ok: true } as T;
    }
  }

  // ---- Feiertage ----
  if (method === "POST" && cleanPath === "/feiertage/custom") {
    const input = (body ?? {}) as { datum: string; name: string };
    const f: CustomFeiertag = {
      id: `preview-ft-${crypto.randomUUID()}`,
      datum: input.datum,
      name: input.name,
      erstelltAm: ts,
    };
    store.customFeiertage.push(f);
    write(store);
    return f as T;
  }
  if (method === "DELETE" && cleanPath.startsWith("/feiertage/custom/")) {
    const id = cleanPath.split("/")[3];
    store.customFeiertage = store.customFeiertage.filter((f) => f.id !== id);
    write(store);
    return { ok: true } as T;
  }

  // ---- Stundenzettel ----
  if (method === "POST" && cleanPath === "/stundenzettel/generieren") {
    const input = (body ?? {}) as { jahr: number; monat: number; mitarbeiterIds?: string[]; ueberschreiben?: boolean };
    const jahr = input.jahr;
    const monat = input.monat;
    const ids = input.mitarbeiterIds?.length
      ? input.mitarbeiterIds
      : store.mitarbeiter.filter((m) => m.aktiv).map((m) => m.id);
    const ftMap = new Map<string, string>();
    for (const f of gesetzlicheFeiertageNrw(jahr)) ftMap.set(f.datum, f.name);
    for (const f of store.customFeiertage) ftMap.set(f.datum, f.name);

    const ergebnis: GenerierenErgebnis["ergebnis"] = ids.map((mid) => {
      const m = store.mitarbeiter.find((x) => x.id === mid);
      if (!m) return { mitarbeiterId: mid, ok: false, error: "Mitarbeiter nicht gefunden" };
      const vorhandenIdx = store.zettel.findIndex(
        (z) => z.mitarbeiterId === mid && z.jahr === jahr && z.monat === monat,
      );
      if (vorhandenIdx >= 0 && input.ueberschreiben !== true) {
        return { mitarbeiterId: mid, ok: true, id: store.zettel[vorhandenIdx].id ?? undefined, skipped: true };
      }
      const tage = generiereTage(m, jahr, monat, ftMap);
      const zettel: Stundenzettel = {
        id: vorhandenIdx >= 0 ? store.zettel[vorhandenIdx].id : `preview-stz-${crypto.randomUUID()}`,
        mitarbeiterId: mid,
        jahr,
        monat,
        tage,
        gesamtStunden: summe(tage),
        aktualisiertAm: ts,
      };
      if (vorhandenIdx >= 0) store.zettel[vorhandenIdx] = zettel;
      else store.zettel.push(zettel);
      return { mitarbeiterId: mid, ok: true, id: zettel.id ?? undefined };
    });

    write(store);
    return { jahr, monat, ergebnis } as T;
  }

  if (cleanPath.startsWith("/stundenzettel/")) {
    const parts = cleanPath.split("/");
    const id = parts[2];
    const action = parts[3];
    const idx = store.zettel.findIndex((z) => z.id === id);

    if ((method === "PUT" || method === "PATCH") && !action) {
      if (idx < 0) return null;
      const patch = (body ?? {}) as { tage?: GenerierterTag[] };
      const tage = (patch.tage ?? store.zettel[idx].tage).map((t) => ({
        ...t,
        wochentag: t.wochentag ?? wochentagVon(new Date(`${t.datum}T00:00:00Z`)),
      }));
      const next: Stundenzettel = {
        ...store.zettel[idx],
        tage,
        gesamtStunden: summe(tage),
        aktualisiertAm: ts,
      };
      store.zettel[idx] = next;
      write(store);
      return next as T;
    }
    if (method === "DELETE" && !action) {
      if (idx < 0) return null;
      store.zettel.splice(idx, 1);
      write(store);
      return { ok: true } as T;
    }
    if (method === "POST" && action === "archivieren") {
      return {
        dokumentId: `preview-dok-${crypto.randomUUID()}`,
        dateiname: "Stundenzettel-Vorschau.pdf",
        ordnerId: "preview-ordner",
        ersetzt: false,
      } as T;
    }
  }

  return null;
}
