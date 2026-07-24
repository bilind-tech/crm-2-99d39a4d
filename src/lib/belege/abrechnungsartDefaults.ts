import type { PositionModus } from "@/lib/api/types";

const STORAGE_KEY = "mcc.abrechnungsart_defaults.v1";

export const SYSTEM_DEFAULTS: Record<PositionModus, string> = {
  pauschal: "Pauschal",
  stunden: "Stundensatz",
  einzel: "Einzelposition",
};

type Store = Partial<Record<PositionModus, string>>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/** Aktueller Default für den Modus (User-Override oder System-Default). */
export function getAbrechnungsartDefault(modus: PositionModus): string {
  const store = read();
  const custom = typeof store[modus] === "string" ? store[modus]!.trim() : "";
  return custom || SYSTEM_DEFAULTS[modus];
}

/** User-Override speichern (leer / gleich System-Default → Override löschen). */
export function setAbrechnungsartDefault(modus: PositionModus, value: string): void {
  const trimmed = value.trim();
  const store = read();
  if (!trimmed || trimmed === SYSTEM_DEFAULTS[modus]) {
    delete store[modus];
  } else {
    store[modus] = trimmed;
  }
  write(store);
}