// Merkt die letzten fehlgeschlagenen Pi-Anfragen (nur im Browser, sessionStorage),
// damit ein kopierbarer Fehlerbericht erzeugt werden kann. Enthält nie Tokens.

export interface FehlerEintrag {
  zeit: string;
  methode: string;
  pfad: string;
  status: number;
  meldung: string;
  antwort?: string;
}

const KEY = "mcc.diagnose.fehler.v1";
const MAX = 50;

function lesen(): FehlerEintrag[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr as FehlerEintrag[]) : [];
  } catch {
    return [];
  }
}

/** Entfernt Query-Werte, die Geheimnisse enthalten könnten. */
export function bereinigePfad(pfad: string): string {
  return pfad.replace(/([?&](?:token|code|key|secret|password|passwort)=)[^&]*/gi, "$1***");
}

function kuerzen(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 400 ? `${s.slice(0, 400)}…` : s;
}

export function protokolliereFehler(e: Omit<FehlerEintrag, "zeit" | "antwort"> & { antwort?: unknown }): void {
  if (typeof window === "undefined") return;
  try {
    const eintrag: FehlerEintrag = {
      zeit: new Date().toISOString(),
      methode: e.methode,
      pfad: bereinigePfad(e.pfad),
      status: e.status,
      meldung: e.meldung,
      antwort: kuerzen(e.antwort),
    };
    const liste = [eintrag, ...lesen()].slice(0, MAX);
    window.sessionStorage.setItem(KEY, JSON.stringify(liste));
  } catch {
    /* Protokoll darf nie die App stören */
  }
}

export function leseFehlerProtokoll(): FehlerEintrag[] {
  return lesen();
}

export function leereFehlerProtokoll(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

/** Verständliche Erklärung eines HTTP-Status. */
export function erklaereStatus(status: number): string {
  if (status === 0) return "Pi nicht erreichbar (offline, falsche Adresse oder Zeitüberschreitung).";
  if (status === 401) return "Nicht angemeldet — bitte neu entsperren.";
  if (status === 404)
    return "Der Pi kennt diese Adresse nicht. Meist läuft auf dem Pi eine ältere Programmversion — bitte System-Update einspielen.";
  if (status === 503) return "Pi ist im Wartungsmodus oder startet gerade.";
  if (status >= 500) return "Fehler auf dem Pi (z. B. Datenbank oder Datei fehlt). Details siehe Diagnose.";
  return "Anfrage wurde vom Pi abgelehnt.";
}

export function formatiereEintrag(e: FehlerEintrag): string {
  return `[${e.zeit}] ${e.methode} ${e.pfad} → HTTP ${e.status}: ${e.meldung}${e.antwort ? ` | Antwort: ${e.antwort}` : ""}`;
}

/** Fertiger Text-Bericht zum Kopieren. */
export function erstelleFehlerBericht(titel: string, details: string[] = []): string {
  const zeilen = [
    `=== Fehlerbericht: ${titel} ===`,
    `Zeit: ${new Date().toISOString()}`,
    typeof window !== "undefined" ? `Seite: ${window.location.pathname}` : "",
    typeof navigator !== "undefined" ? `Browser: ${navigator.userAgent}` : "",
    ...details,
    "",
    "Letzte fehlgeschlagene Anfragen:",
    ...(lesen().slice(0, 15).map(formatiereEintrag)),
  ].filter((z) => z !== "");
  return zeilen.join("\n");
}

export async function kopiereText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
