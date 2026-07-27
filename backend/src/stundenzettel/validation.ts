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
  zielStundenProMonat: z.number().int().min(0).max(500).nullable(),
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
    }),
  ),
});