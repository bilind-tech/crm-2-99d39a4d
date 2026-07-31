// Import von Mitarbeitern per JSON (Export-Format des Stundenzettel-Moduls).
// Bestehende Mitarbeiter mit gleichem Namen werden aktualisiert statt doppelt angelegt.

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  DEFAULT_ARBEITSZEIT,
  WOCHENTAGE,
  type ArbeitsZeitConfig,
  type Mitarbeiter,
  type MitarbeiterInput,
  type Wochentag,
} from "@/lib/stundenzettel/types";
import { MITARBEITER_PRESET_JSON } from "@/lib/stundenzettel/importPreset";
import { useCreateMitarbeiter, useUpdateMitarbeiter } from "@/hooks/useStundenzettel";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vorhandene: Mitarbeiter[];
}

/** Rohdaten defensiv in eine vollständige ArbeitsZeitConfig überführen. */
function normalisiere(raw: any): ArbeitsZeitConfig {
  const a = raw ?? {};
  const wochentagZeiten = { ...DEFAULT_ARBEITSZEIT.wochentagZeiten };
  for (const w of WOCHENTAGE) {
    const q = a.wochentagZeiten?.[w];
    if (q) {
      wochentagZeiten[w as Wochentag] = {
        aktiv: !!q.aktiv,
        beginn: q.beginn ?? "08:00",
        ende: q.ende ?? "16:00",
        pause: Number(q.pause ?? 0),
        block2: q.block2?.beginn && q.block2?.ende ? { beginn: q.block2.beginn, ende: q.block2.ende } : null,
      };
    }
  }
  const arbeitstage = Array.isArray(a.arbeitstage)
    ? (a.arbeitstage.filter((t: string) => WOCHENTAGE.includes(t as Wochentag)) as Wochentag[])
    : DEFAULT_ARBEITSZEIT.arbeitstage;
  return {
    arbeitetAmWochenende: !!a.arbeitetAmWochenende,
    wpiMuster: a.wpiMuster === "unterschiedlich" ? "unterschiedlich" : "gleich",
    standardZeiten: {
      arbeitsbeginn: a.standardZeiten?.arbeitsbeginn ?? "08:00",
      arbeitsende: a.standardZeiten?.arbeitsende ?? "16:00",
      pauseDauer: Number(a.standardZeiten?.pauseDauer ?? 60),
      pauseAbStunden: Number(a.standardZeiten?.pauseAbStunden ?? 4),
    },
    wochentagZeiten,
    arbeitstage,
    zielStundenProMonat:
      a.zielStundenProMonat == null || a.zielStundenProMonat === ""
        ? null
        : Number(a.zielStundenProMonat),
  };
}

export function MitarbeiterImportDialog({ open, onOpenChange, vorhandene }: Props) {
  const [text, setText] = useState(MITARBEITER_PRESET_JSON);
  const [busy, setBusy] = useState(false);
  const create = useCreateMitarbeiter();
  const update = useUpdateMitarbeiter();

  async function handleImport() {
    let liste: any[];
    try {
      const parsed = JSON.parse(text);
      liste = Array.isArray(parsed) ? parsed : parsed.mitarbeiter;
      if (!Array.isArray(liste)) throw new Error("Kein 'mitarbeiter'-Array gefunden.");
    } catch (e) {
      toast.error(`JSON ungültig: ${(e as Error).message}`);
      return;
    }

    setBusy(true);
    let neu = 0;
    let aktualisiert = 0;
    let fehler = 0;
    for (const roh of liste) {
      const name = String(roh?.name ?? "").trim();
      if (!name) {
        fehler++;
        continue;
      }
      const input: MitarbeiterInput = {
        name,
        aktiv: roh.aktiv !== false,
        arbeitszeiten: normalisiere(roh.arbeitszeiten),
      };
      const treffer = vorhandene.find(
        (m) => m.name.trim().toLowerCase() === name.toLowerCase(),
      );
      try {
        if (treffer) {
          await update.mutateAsync({ id: treffer.id, patch: input });
          aktualisiert++;
        } else {
          await create.mutateAsync(input);
          neu++;
        }
      } catch {
        fehler++;
      }
    }
    setBusy(false);
    if (fehler > 0) toast.error(`${fehler} Einträge fehlgeschlagen`);
    toast.success(`${neu} neu angelegt, ${aktualisiert} aktualisiert`);
    if (fehler === 0) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-2xl bg-background">
        <DialogHeader>
          <DialogTitle>Mitarbeiter importieren</DialogTitle>
          <DialogDescription>
            JSON im Export-Format einfügen. Gleiche Namen werden aktualisiert, nicht doppelt angelegt.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          spellCheck={false}
          className="font-mono text-xs"
        />
        <div className="flex justify-start">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setText(MITARBEITER_PRESET_JSON)}
          >
            Beispiel-Datensatz einsetzen
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Abbrechen
          </Button>
          <Button onClick={handleImport} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-4 w-4" />
            )}
            Importieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
