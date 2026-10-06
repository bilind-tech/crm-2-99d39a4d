// Zod-Schemas für Stundenzettel-REST-Endpunkte.

import { z } from "zod";
import { WOCHENTAGE, type Wochentag } from "./types.js";

const zeitStr = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Zeit muss HH:MM sein");

const Block2Schema = z
  .object({ beginn: zeitStr, ende: zeitStr })
  .nullable()
  .optional();

const WochentagZeitSchema = z.object({
  aktiv: z.boolean(),
  beginn: zeitStr,
  ende: zeitStr,
  pause: z.number().int().min(0).max(600),
  block2: Block2Schema,
});

const StandardZeitSchema = z.object({
  arbeitsbeginn: zeitStr,
  arbeitsende: zeitStr,
  pauseDauer: z.number().int().min(0).max(600),
  pauseAbStunden: z.number().min(0).max(24),
});

const WochentagRecord = z.object(
  Object.fromEntries(WOCHENTAGE.map((w) => [w, WochentagZeitSchema])) as Record<
    Wochentag,
    typeof WochentagZeitSchema
  >,
);

export const ArbeitsZeitConfigSchema = z.object({
  arbeitetAmWochenende: z.boolean(),
  wpiMuster: z.enum(["gleich", "unterschiedlich"]),
  standardZeiten: StandardZeitSchema,
  wochentagZeiten: WochentagRecord,
  arbeitstage: z.array(z.enum(WOCHENTAGE as [Wochentag, ...Wochentag[]])),
  zielStundenProMonat: z.number().min(0).max(500).multipleOf(0.5).nullable(),
});

export const MitarbeiterInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  aktiv: z.boolean(),
  arbeitszeiten: ArbeitsZeitConfigSchema,
});

export const MitarbeiterPatchSchema = MitarbeiterInputSchema.partial();

export const CustomFeiertagInputSchema = z.object({
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss YYYY-MM-DD sein"),
  name: z.string().trim().min(1).max(200),
});

export const TagPatchSchema = z.object({
  beginn: zeitStr.optional().nullable(),
  ende: zeitStr.optional().nullable(),
  beginn2: zeitStr.optional().nullable(),
  ende2: zeitStr.optional().nullable(),
  pause: z.number().int().min(0).max(600).optional().nullable(),
  stunden: z.number().min(0).max(24).optional(),
  bemerkung: z.string().max(200).optional().nullable(),
});

export const ZettelPatchSchema = z.object({
  tage: z.array(
    z.object({
      datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      beginn: zeitStr.optional().nullable(),
      ende: zeitStr.optional().nullable(),
      beginn2: zeitStr.optional().nullable(),
      ende2: zeitStr.optional().nullable(),
      pause: z.number().int().min(0).max(600).optional().nullable(),
      stunden: z.number().min(0).max(24),
      bemerkung: z.string().max(200).optional().nullable(),
      quelle: z.enum(["auto", "manuell"]).optional().nullable(),
      ausgeschlossen: z.boolean().optional().nullable(),
    }),
  ),
});
const datumStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss YYYY-MM-DD sein")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "Ungültiges Datum");

export const AbwesenheitInputSchema = z
  .object({
    mitarbeiterId: z.string().min(1),
    art: z.enum(["urlaub", "krank", "sonstiges"]),
    von: datumStr,
    bis: datumStr,
    notiz: z.string().trim().max(200).optional().nullable(),
    tageOverride: z.number().min(0).max(366).multipleOf(0.5).optional().nullable(),
  })
  .refine((a) => a.von <= a.bis, { message: "„Bis“ darf nicht vor „Von“ liegen", path: ["bis"] })
  .refine(
    (a) => (Date.parse(`${a.bis}T00:00:00Z`) - Date.parse(`${a.von}T00:00:00Z`)) / 86400000 <= 366,
    { message: "Zeitraum höchstens 1 Jahr", path: ["bis"] },
  );
