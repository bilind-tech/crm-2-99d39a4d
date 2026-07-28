// Dialog zum Anlegen und Bearbeiten eines Mitarbeiters inkl. Arbeitszeit-Config.
// Alle Regeln aus der Original-Spec: Muster gleich/unterschiedlich,
// Wochenend-Arbeit, Standardzeiten mit Pause-Schwelle, Zielstunden.

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  DEFAULT_ARBEITSZEIT,
  WOCHENTAGE,
  WOCHENTAG_LABEL,
  type ArbeitsZeitConfig,
  type Mitarbeiter,
  type MitarbeiterInput,
  type Wochentag,
} from "@/lib/stundenzettel/types";
import {
  useCreateMitarbeiter,
  useDeleteMitarbeiter,
  useUpdateMitarbeiter,
} from "@/hooks/useStundenzettel";
import { useConfirm } from "@/hooks/useConfirm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mitarbeiter?: Mitarbeiter | null;
}

function initialInput(m?: Mitarbeiter | null): MitarbeiterInput {
  return {
    name: m?.name ?? "",
    aktiv: m?.aktiv ?? true,
    arbeitszeiten: m?.arbeitszeiten
      ? { ...DEFAULT_ARBEITSZEIT, ...m.arbeitszeiten }
      : { ...DEFAULT_ARBEITSZEIT },
  };
}

export function MitarbeiterDialog({ open, onOpenChange, mitarbeiter }: Props) {
  const [form, setForm] = useState<MitarbeiterInput>(() => initialInput(mitarbeiter));
  const create = useCreateMitarbeiter();
  const update = useUpdateMitarbeiter();
  const del = useDeleteMitarbeiter();
  const confirm = useConfirm();

  useEffect(() => {
    if (open) setForm(initialInput(mitarbeiter));
  }, [open, mitarbeiter]);

  const isEdit = !!mitarbeiter;
  const cfg = form.arbeitszeiten;

  function updateCfg(patch: Partial<ArbeitsZeitConfig>) {
    setForm((f) => ({ ...f, arbeitszeiten: { ...f.arbeitszeiten, ...patch } }));
  }

  function updateStandard(patch: Partial<ArbeitsZeitConfig["standardZeiten"]>) {
    updateCfg({ standardZeiten: { ...cfg.standardZeiten, ...patch } });
  }

  function updateWochentag(w: Wochentag, patch: Partial<ArbeitsZeitConfig["wochentagZeiten"][Wochentag]>) {
    updateCfg({
      wochentagZeiten: {
        ...cfg.wochentagZeiten,
        [w]: { ...cfg.wochentagZeiten[w], ...patch },
      },
    });
  }

  function toggleArbeitstag(w: Wochentag, on: boolean) {
    const set = new Set(cfg.arbeitstage);
    if (on) set.add(w);
    else set.delete(w);
    updateCfg({ arbeitstage: WOCHENTAGE.filter((x) => set.has(x)) });
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name ist Pflicht");
      return;
    }
    try {
      if (isEdit && mitarbeiter) {
        await update.mutateAsync({ id: mitarbeiter.id, patch: form });
        toast.success("Mitarbeiter aktualisiert");
      } else {
        await create.mutateAsync(form);
        toast.success("Mitarbeiter angelegt");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || "Speichern fehlgeschlagen");
    }
  }

  async function handleDelete() {
    if (!mitarbeiter) return;
    const ok = await confirm({
      title: "Mitarbeiter löschen?",
      description: `„${mitarbeiter.name}" und alle zugehörigen Stundenzettel werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`,
      confirmText: "Löschen",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await del.mutateAsync(mitarbeiter.id);
      toast.success("Mitarbeiter gelöscht");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || "Löschen fehlgeschlagen");
    }
  }

  const saving = create.isPending || update.isPending;

  // Anzeigezeilen: bei "gleich" nur Standardzeiten, bei "unterschiedlich" alle
  // aktivierten Wochentage (plus Sa/So wenn Wochenend-Arbeit).
  const sichtbareTage: Wochentag[] =
    cfg.wpiMuster === "gleich"
      ? []
      : WOCHENTAGE.filter((w) =>
          w === "samstag" || w === "sonntag" ? cfg.arbeitetAmWochenende : true,
        );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}</DialogTitle>
          <DialogDescription>
            Arbeitszeiten und Zielstunden bestimmen, wie der Monats-Stundenzettel automatisch
            erzeugt wird.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Stammdaten */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="mit-name">Name</Label>
              <Input
                id="mit-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Vor- und Nachname"
              />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch
                id="mit-aktiv"
                checked={form.aktiv}
                onCheckedChange={(v) => setForm((f) => ({ ...f, aktiv: v }))}
              />
              <Label htmlFor="mit-aktiv">Aktiv</Label>
            </div>
          </div>

          <Separator />

          {/* Basis-Optionen */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Arbeitszeit-Muster</Label>
              <Select
                value={cfg.wpiMuster}
                onValueChange={(v) => updateCfg({ wpiMuster: v as "gleich" | "unterschiedlich" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gleich">Immer gleich (Standardzeiten)</SelectItem>
                  <SelectItem value="unterschiedlich">Pro Wochentag unterschiedlich</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Switch
                id="we"
                checked={cfg.arbeitetAmWochenende}
                onCheckedChange={(v) => updateCfg({ arbeitetAmWochenende: v })}
              />
              <Label htmlFor="we">Arbeitet am Wochenende</Label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ziel">Zielstunden pro Monat (optional)</Label>
              <Input
                id="ziel"
                type="number"
                min={0}
                max={500}
                value={cfg.zielStundenProMonat ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  updateCfg({ zielStundenProMonat: v === "" ? null : Math.max(0, Number(v)) });
                }}
                placeholder="z. B. 160"
              />
              <p className="text-[11px] text-muted-foreground">
                Leer = kein Zielausgleich. Sonst werden generierte Stunden auf den Zielwert ±1h justiert.
              </p>
            </div>
          </div>

          <Separator />

          {/* Standardzeiten */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Standardzeiten</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Beginn</Label>
                <Input type="time" value={cfg.standardZeiten.arbeitsbeginn}
                  onChange={(e) => updateStandard({ arbeitsbeginn: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Ende</Label>
                <Input type="time" value={cfg.standardZeiten.arbeitsende}
                  onChange={(e) => updateStandard({ arbeitsende: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Pause (Min.)</Label>
                <Input type="number" min={0} max={600}
                  value={cfg.standardZeiten.pauseDauer}
                  onChange={(e) => updateStandard({ pauseDauer: Math.max(0, Number(e.target.value) || 0) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Pause ab (Std.)</Label>
                <Input type="number" min={0} max={24} step={0.5}
                  value={cfg.standardZeiten.pauseAbStunden}
                  onChange={(e) => updateStandard({ pauseAbStunden: Math.max(0, Number(e.target.value) || 0) })} />
              </div>
            </div>
          </div>

          {/* Muster "gleich": Arbeitstage-Auswahl */}
          {cfg.wpiMuster === "gleich" && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Arbeitstage</h3>
              <div className="flex flex-wrap gap-3">
                {WOCHENTAGE.map((w) => {
                  const isWE = w === "samstag" || w === "sonntag";
                  const disabled = isWE && !cfg.arbeitetAmWochenende;
                  return (
                    <label
                      key={w}
                      className={`flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm ${disabled ? "opacity-40" : "cursor-pointer hover:bg-muted"}`}
                    >
                      <Checkbox
                        checked={cfg.arbeitstage.includes(w)}
                        disabled={disabled}
                        onCheckedChange={(v) => toggleArbeitstag(w, !!v)}
                      />
                      {WOCHENTAG_LABEL[w]}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Muster "unterschiedlich": Zeiten je Wochentag */}
          {cfg.wpiMuster === "unterschiedlich" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Zeiten pro Wochentag</h3>
              <div className="space-y-2">
                {sichtbareTage.map((w) => {
                  const z = cfg.wochentagZeiten[w];
                  return (
                    <div
                      key={w}
                      className="rounded-md border border-border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={z.aktiv}
                            onCheckedChange={(v) => updateWochentag(w, { aktiv: v })}
                          />
                          <span className="text-sm font-medium">{WOCHENTAG_LABEL[w]}</span>
                        </div>
                      </div>
                      {z.aktiv && (
                        <>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Beginn</Label>
                              <Input type="time" value={z.beginn}
                                onChange={(e) => updateWochentag(w, { beginn: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Ende</Label>
                              <Input type="time" value={z.ende}
                                onChange={(e) => updateWochentag(w, { ende: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Pause (Min.)</Label>
                              <Input type="number" min={0} max={600} value={z.pause}
                                onChange={(e) => updateWochentag(w, { pause: Math.max(0, Number(e.target.value) || 0) })} />
                            </div>
                            <div className="space-y-1 flex items-end">
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <Checkbox
                                  checked={!!z.block2}
                                  onCheckedChange={(v) => updateWochentag(w, { block2: v ? { beginn: "13:00", ende: "17:00" } : null })}
                                />
                                Zweiter Block
                              </label>
                            </div>
                          </div>
                          {z.block2 && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <div className="space-y-1">
                                <Label className="text-xs">Block 2 Beginn</Label>
                                <Input type="time" value={z.block2.beginn}
                                  onChange={(e) => updateWochentag(w, { block2: { ...z.block2!, beginn: e.target.value } })} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Block 2 Ende</Label>
                                <Input type="time" value={z.block2.ende}
                                  onChange={(e) => updateWochentag(w, { block2: { ...z.block2!, ende: e.target.value } })} />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {isEdit && (
              <Button variant="ghost" size="sm" onClick={handleDelete} disabled={del.isPending}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Löschen
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {isEdit ? "Speichern" : "Anlegen"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}