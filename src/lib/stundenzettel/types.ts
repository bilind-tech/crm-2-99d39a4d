// Client-Types für das Stundenzettel-Modul.
// Spiegel der Backend-Types, damit Frontend & Backend dieselben Shapes teilen.

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

export const WOCHENTAG_LABEL: Record<Wochentag, string> = {
  montag: "Montag",
  dienstag: "Dienstag",
  mittwoch: "Mittwoch",
  donnerstag: "Donnerstag",
  freitag: "Freitag",
  samstag: "Samstag",
  sonntag: "Sonntag",
};

export type WpiMuster = "gleich" | "unterschiedlich";

export interface Block2 {
  beginn: string;
  ende: string;
}

export interface WochentagZeit {
  aktiv: boolean;
  beginn: string;
  ende: string;
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
  arbeitstage: Wochentag[];
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
  datum: string;
  name: string;
  erstelltAm: string;
}

export interface FeiertagEintrag {
  datum: string;
  name: string;
}

export interface FeiertageResponse {
  jahr: number;
  gesetzlich: FeiertagEintrag[];
  custom: CustomFeiertag[];
}

export interface GenerierterTag {
  datum: string;
  wochentag: Wochentag;
  beginn?: string;
  ende?: string;
  beginn2?: string;
  ende2?: string;
  pause?: number;
  stunden: number;
  bemerkung?: string;
}

export interface Stundenzettel {
  id: string | null;
  mitarbeiterId: string;
  jahr: number;
  monat: number;
  tage: GenerierterTag[];
  gesamtStunden: number;
  aktualisiertAm: string | null;
}

export interface GenerierenErgebnis {
  jahr: number;
  monat: number;
  ergebnis: Array<{
    mitarbeiterId: string;
    ok: boolean;
    id?: string;
    error?: string;
    skipped?: boolean;
  }>;
}

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