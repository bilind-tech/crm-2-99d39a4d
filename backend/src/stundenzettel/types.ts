// API-Shapes für das Stundenzettel-Modul (Phase 1).
// camelCase Richtung UI, snake_case bleibt in SQLite (siehe mappers).

export type Wochentag =
  | "montag"
  | "dienstag"
  | "mittwoch"
  | "donnerstag"
  | "freitag"
  | "samstag"
  | "sonntag";

export const WOCHENTAGE: Wochentag[] = [
  "montag",
  "dienstag",
  "mittwoch",
  "donnerstag",
  "freitag",
  "samstag",
  "sonntag",
];

/** Reihenfolge JS-getDay() (0=So..6=Sa) → Wochentag. */
export const JS_DAY_TO_WOCHENTAG: Wochentag[] = [
  "sonntag",
  "montag",
  "dienstag",
  "mittwoch",
  "donnerstag",
  "freitag",
  "samstag",
];

export type WpiMuster = "gleich" | "unterschiedlich";

export interface Block2 {
  beginn: string; // "HH:MM"
  ende: string;
}

export interface WochentagZeit {
  aktiv: boolean;
  beginn: string;
  ende: string;
  /** Pausendauer in Minuten (nur für Block 1). */
  pause: number;
  block2?: Block2 | null;
}

export interface StandardZeit {
  arbeitsbeginn: string;
  arbeitsende: string;
  pauseDauer: number;
  pauseAbStunden: number;
}

export interface ArbeitsZeitConfig {
  arbeitetAmWochenende: boolean;
  wpiMuster: WpiMuster;
  standardZeiten: StandardZeit;
  wochentagZeiten: Record<Wochentag, WochentagZeit>;
  /** Wochentage, an denen im Muster "gleich" gearbeitet wird. */
  arbeitstage: Wochentag[];
  /** Zielstunden pro Monat. `null` = kein Zielausgleich. */
  zielStundenProMonat: number | null;
}

export interface Mitarbeiter {
  id: string;
  name: string;
  aktiv: boolean;
  arbeitszeiten: ArbeitsZeitConfig;
  erstelltAm: string;
  aktualisiertAm: string;
}

export interface MitarbeiterInput {
  name: string;
  aktiv: boolean;
  arbeitszeiten: ArbeitsZeitConfig;
}

export interface CustomFeiertag {
  id: string;
  datum: string; // YYYY-MM-DD
  name: string;
  erstelltAm: string;
}

export interface GenerierterTag {
  datum: string; // YYYY-MM-DD
  wochentag: Wochentag;
  beginn?: string;
  ende?: string;
  beginn2?: string;
  ende2?: string;
  /** Angewendete Pause in Minuten (nur wenn Block 1 > Schwelle). */
  pause?: number;
  /** Ganze Stunden nach Floor + optionalem Zielausgleich. */
  stunden: number;
  /** Feiertagsname, "Samstag"/"Sonntag" oder frei ("Krank", "Urlaub"). */
  bemerkung?: string;
}

export interface GenerierterStundenzettel {
  id: string | null;
  mitarbeiterId: string;
  jahr: number;
  monat: number;
  tage: GenerierterTag[];
  gesamtStunden: number;
  aktualisiertAm: string | null;
}

/** Default-Config für einen neuen Mitarbeiter — Mo–Fr 08:00–17:00, 60 Min Pause ab 4h. */
export const DEFAULT_ARBEITSZEIT: ArbeitsZeitConfig = {
  arbeitetAmWochenende: false,
  wpiMuster: "gleich",
  standardZeiten: {
    arbeitsbeginn: "08:00",
    arbeitsende: "17:00",
    pauseDauer: 60,
    pauseAbStunden: 4,
  },
  wochentagZeiten: {
    montag:     { aktiv: true,  beginn: "08:00", ende: "17:00", pause: 60, block2: null },
    dienstag:   { aktiv: true,  beginn: "08:00", ende: "17:00", pause: 60, block2: null },
    mittwoch:   { aktiv: true,  beginn: "08:00", ende: "17:00", pause: 60, block2: null },
    donnerstag: { aktiv: true,  beginn: "08:00", ende: "17:00", pause: 60, block2: null },
    freitag:    { aktiv: true,  beginn: "08:00", ende: "17:00", pause: 60, block2: null },
    samstag:    { aktiv: false, beginn: "08:00", ende: "12:00", pause: 0,  block2: null },
    sonntag:    { aktiv: false, beginn: "08:00", ende: "12:00", pause: 0,  block2: null },
  },
  arbeitstage: ["montag", "dienstag", "mittwoch", "donnerstag", "freitag"],
  zielStundenProMonat: null,
};