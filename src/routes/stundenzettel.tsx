// Stundenzettel-Modul — Phase 2: Mitarbeiter- und Feiertagsverwaltung
// mit globalem Monatswechsler. Editor + Bulk-Generate folgen in Phase 3.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Plus,
  Trash2,
  UserRound,
  Wand2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PrimaryAction } from "@/components/layout/PrimaryAction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MitarbeiterDialog } from "@/components/stundenzettel/MitarbeiterDialog";
import { StundenzettelTabelle } from "@/components/stundenzettel/StundenzettelTabelle";
import { StundenzettelPdfAktionen } from "@/components/stundenzettel/StundenzettelPdfAktionen";
import {
  useCreateCustomFeiertag,
  useDeleteCustomFeiertag,
  useFeiertage,
  useGenerieren,
  useMitarbeiter,
  useZettelMonat,
} from "@/hooks/useStundenzettel";
import { useConfirm } from "@/hooks/useConfirm";
import type { Mitarbeiter } from "@/lib/stundenzettel/types";

const MONATE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export const Route = createFileRoute("/stundenzettel")({
  head: () => ({
    meta: [
      { title: "Stundenzettel — My Clean Center" },
      { name: "description", content: "Monatliche Stundenzettel für Mitarbeiter — automatisch aus Arbeitszeiten und Feiertagen erzeugt." },
      { property: "og:title", content: "Stundenzettel — My Clean Center" },
      { property: "og:description", content: "Monatliche Stundenzettel automatisch generieren und pflegen." },
    ],
  }),
  component: Page,
});

function Page() {
  const today = new Date();
  const [jahr, setJahr] = useState(today.getFullYear());
  const [monat, setMonat] = useState(today.getMonth() + 1);
  const [mitarbeiterDialog, setMitarbeiterDialog] = useState<{
    open: boolean;
    editing: Mitarbeiter | null;
  }>({ open: false, editing: null });

  const { data: mitarbeiter = [], isLoading: mitLoading } = useMitarbeiter();
  const { data: feiertage, isLoading: ftLoading } = useFeiertage(jahr);
  const { data: zettel = [], isLoading: zLoading } = useZettelMonat(jahr, monat);
  const generieren = useGenerieren();

  const zettelByMitarbeiter = useMemo(
    () => new Map(zettel.map((z) => [z.mitarbeiterId, z])),
    [zettel],
  );

  async function handleGenerieren(mitarbeiterIds?: string[]) {
    try {
      const r = await generieren.mutateAsync({ jahr, monat, mitarbeiterIds });
      const ok = r.ergebnis.filter((e) => e.ok).length;
      toast.success(`${ok} Stundenzettel erzeugt`);
    } catch (e) {
      toast.error((e as Error).message || "Generieren fehlgeschlagen");
    }
  }

  function stepMonat(delta: number) {
    const d = new Date(jahr, monat - 1 + delta, 1);
    setJahr(d.getFullYear());
    setMonat(d.getMonth() + 1);
  }

  const activeCount = mitarbeiter.filter((m) => m.aktiv).length;
  const customFtCount = feiertage?.custom.length ?? 0;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Stundenzettel"
        subtitle="Monats-Stundenzettel erzeugen, bearbeiten und Stammdaten pflegen."
        actions={
          <PrimaryAction
            icon={Plus}
            label="Neuer Mitarbeiter"
            onClick={() => setMitarbeiterDialog({ open: true, editing: null })}
          />
        }
      />

      {/* Monats-Wechsler */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 w-fit">
        <Button variant="ghost" size="icon" onClick={() => stepMonat(-1)} aria-label="Vorheriger Monat">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 px-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          {MONATE[monat - 1]} {jahr}
        </div>
        <Button variant="ghost" size="icon" onClick={() => stepMonat(1)} aria-label="Nächster Monat">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const n = new Date();
            setJahr(n.getFullYear());
            setMonat(n.getMonth() + 1);
          }}
          className="ml-1 text-xs text-muted-foreground"
        >
          Heute
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={["mitarbeiter"]} className="space-y-3">
        {/* --- Monats-Stundenzettel --- */}
        <AccordionItem
          value="zettel"
          className="rounded-xl border border-border bg-card px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                Stundenzettel {MONATE[monat - 1]} {jahr}
              </span>
              <Badge variant="secondary" className="ml-1">
                {zettel.length} / {activeCount}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleGenerieren()}
                disabled={generieren.isPending || activeCount === 0}
              >
                {generieren.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-1.5 h-4 w-4" />
                )}
                Alle aktiven generieren
              </Button>
              <span className="text-xs text-muted-foreground">
                Vorhandene Zettel dieses Monats werden dabei überschrieben.
              </span>
            </div>

            {zLoading || mitLoading ? (
              <p className="py-4 text-sm text-muted-foreground">Lade…</p>
            ) : mitarbeiter.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Lege zuerst einen Mitarbeiter an.
              </p>
            ) : (
              <Accordion type="multiple" className="space-y-2">
                {mitarbeiter
                  .filter((m) => m.aktiv || zettelByMitarbeiter.has(m.id))
                  .map((m) => {
                    const z = zettelByMitarbeiter.get(m.id);
                    return (
                      <AccordionItem
                        key={m.id}
                        value={m.id}
                        className="rounded-lg border border-border px-3"
                      >
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex flex-1 items-center justify-between gap-3 pr-2 text-left">
                            <span className="text-sm font-medium">{m.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {z
                                ? `${z.gesamtStunden.toLocaleString("de-DE")} Std.`
                                : "kein Zettel"}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          {z ? (
                            <div className="space-y-3">
                              {z.id ? <StundenzettelPdfAktionen zettelId={z.id} /> : null}
                              <StundenzettelTabelle
                                zettel={z}
                                name={m.name}
                                jahr={jahr}
                                monat={monat}
                              />
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerieren([m.id])}
                              disabled={generieren.isPending}
                            >
                              <Wand2 className="mr-1.5 h-4 w-4" />
                              Für {MONATE[monat - 1]} generieren
                            </Button>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
              </Accordion>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* --- Mitarbeiter --- */}
        <AccordionItem
          value="mitarbeiter"
          className="rounded-xl border border-border bg-card px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Mitarbeiter</span>
              <Badge variant="secondary" className="ml-1">
                {activeCount} aktiv / {mitarbeiter.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {mitLoading ? (
              <p className="text-sm text-muted-foreground py-4">Lade…</p>
            ) : mitarbeiter.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Noch keine Mitarbeiter angelegt.
                <div className="mt-3">
                  <Button
                    size="sm"
                    onClick={() => setMitarbeiterDialog({ open: true, editing: null })}
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Ersten Mitarbeiter anlegen
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {mitarbeiter.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-3 text-left hover:opacity-80"
                      onClick={() => setMitarbeiterDialog({ open: true, editing: m })}
                    >
                      <div className="grid h-9 w-9 place-content-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {initials(m.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{m.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {beschreibung(m)}
                        </div>
                      </div>
                    </button>
                    {!m.aktiv && (
                      <Badge variant="outline" className="text-[10px]">Inaktiv</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMitarbeiterDialog({ open: true, editing: m })}
                    >
                      Bearbeiten
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* --- Feiertage --- */}
        <AccordionItem
          value="feiertage"
          className="rounded-xl border border-border bg-card px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Feiertage {jahr}</span>
              <Badge variant="secondary" className="ml-1">
                {(feiertage?.gesetzlich.length ?? 0)} gesetzlich · {customFtCount} eigene
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <FeiertageContent jahr={jahr} loading={ftLoading} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <MitarbeiterDialog
        open={mitarbeiterDialog.open}
        onOpenChange={(o) =>
          setMitarbeiterDialog((s) => ({ ...s, open: o, editing: o ? s.editing : null }))
        }
        mitarbeiter={mitarbeiterDialog.editing}
      />
    </div>
  );
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function beschreibung(m: Mitarbeiter): string {
  const cfg = m.arbeitszeiten;
  const std = `${cfg.standardZeiten.arbeitsbeginn}–${cfg.standardZeiten.arbeitsende}`;
  const tage =
    cfg.wpiMuster === "gleich"
      ? `${cfg.arbeitstage.length} Arbeitstage`
      : "Zeiten pro Wochentag";
  const ziel = cfg.zielStundenProMonat ? ` · Ziel ${cfg.zielStundenProMonat} h` : "";
  return `${std} · ${tage}${ziel}`;
}

function FeiertageContent({ jahr, loading }: { jahr: number; loading: boolean }) {
  const { data } = useFeiertage(jahr);
  const create = useCreateCustomFeiertag();
  const del = useDeleteCustomFeiertag();
  const { confirm, dialog } = useConfirm();
  const [neuDatum, setNeuDatum] = useState<string>(`${jahr}-01-01`);
  const [neuName, setNeuName] = useState("");

  const gesetzlich = useMemo(
    () => (data?.gesetzlich ?? []).slice().sort((a, b) => a.datum.localeCompare(b.datum)),
    [data],
  );
  const custom = useMemo(
    () => (data?.custom ?? []).slice().sort((a, b) => a.datum.localeCompare(b.datum)),
    [data],
  );

  async function handleAdd() {
    if (!neuName.trim()) {
      toast.error("Name ist Pflicht");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(neuDatum)) {
      toast.error("Datum muss YYYY-MM-DD sein");
      return;
    }
    try {
      await create.mutateAsync({ datum: neuDatum, name: neuName.trim() });
      setNeuName("");
      toast.success("Feiertag hinzugefügt");
    } catch (e) {
      toast.error((e as Error).message || "Fehlgeschlagen");
    }
  }

  function handleDelete(id: string, name: string) {
    confirm(
      {
        title: "Feiertag löschen?",
        description: `„${name}" entfernen.`,
        confirmLabel: "Löschen",
        variant: "destructive",
      },
      async () => {
        try {
          await del.mutateAsync(id);
          toast.success("Gelöscht");
        } catch (e) {
          toast.error((e as Error).message || "Löschen fehlgeschlagen");
        }
      },
    );
  }

  return (
    <div className="space-y-4">
      {/* Eigenes hinzufügen */}
      <div className="rounded-md border border-dashed border-border p-3 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Eigenen Feiertag hinzufügen
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr_auto]">
          <div>
            <Label htmlFor="ft-datum" className="sr-only">Datum</Label>
            <Input
              id="ft-datum"
              type="date"
              value={neuDatum}
              onChange={(e) => setNeuDatum(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ft-name" className="sr-only">Name</Label>
            <Input
              id="ft-name"
              placeholder="z. B. Betriebsferien"
              value={neuName}
              onChange={(e) => setNeuName(e.target.value)}
            />
          </div>
          <Button onClick={handleAdd} disabled={create.isPending}>
            <Plus className="mr-1.5 h-4 w-4" /> Hinzufügen
          </Button>
        </div>
      </div>

      {/* Custom-Liste */}
      {custom.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Eigene Feiertage
          </div>
          <ul className="divide-y divide-border rounded-md border border-border">
            {custom.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{f.datum}</span>
                  <span>{f.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(f.id, f.name)}
                  aria-label="Löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gesetzliche */}
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Gesetzliche Feiertage NRW ({jahr})
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Lade…</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {gesetzlich.map((f) => (
              <li key={f.datum} className="flex items-center gap-3 px-3 py-1.5 text-sm">
                <span className="font-mono text-xs text-muted-foreground w-24">{f.datum}</span>
                <span>{f.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {dialog}
    </div>
  );
}