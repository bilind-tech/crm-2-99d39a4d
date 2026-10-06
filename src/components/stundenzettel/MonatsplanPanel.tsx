// Monatsplanung: pro Mitarbeiter (eingeklappt) Monats-Stundenziel und feste
// Arbeitstage mit Stunden. Leeres Ziel = Standardziel aus den Mitarbeiter-Einstellungen.

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useGenerieren, useMonatsplaene, useSpeichereMonatsplan } from "@/hooks/useStundenzettel";
import type { FesterTag, Monatsplan } from "@/lib/stundenzettel/monatsplan";
import type { Mitarbeiter } from "@/lib/stundenzettel/types";

const fmt = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });
const parseStd = (v: string) => Number(v.replace(",", "."));
const istHalb = (n: number) => Number.isFinite(n) && Number.isInteger(n * 2);

interface Props {
  mitarbeiter: Mitarbeiter[];
  jahr: number;
  monat: number;
  monatLabel: string;
}

export function MonatsplanPanel({ mitarbeiter, jahr, monat, monatLabel }: Props) {
  const { data: plaene = [], isLoading } = useMonatsplaene(jahr, monat);
  const aktive = mitarbeiter.filter((m) => m.aktiv);
  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (aktive.length === 0) return <p className="text-sm text-muted-foreground">Keine aktiven Mitarbeiter.</p>;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Für {monatLabel} {jahr}: Leeres Ziel = Standard aus den Mitarbeiter-Einstellungen. Feste Tage
        werden genau so übernommen, der Rest wird in halben Stunden ans Ziel angeglichen.
      </p>
      {aktive.map((m) => (
        <PlanZeile
          key={`${m.id}-${jahr}-${monat}`}
          m={m}
          jahr={jahr}
          monat={monat}
          plan={plaene.find((p) => p.mitarbeiterId === m.id) ?? null}
        />
      ))}
    </div>
  );
}

interface Entwurf {
  datum: string;
  stunden: string;
  bemerkung: string;
}

function PlanZeile({ m, jahr, monat, plan }: { m: Mitarbeiter; jahr: number; monat: number; plan: Monatsplan | null }) {
  const speichern = useSpeichereMonatsplan();
  const generieren = useGenerieren();
  const standard = m.arbeitszeiten?.zielStundenProMonat ?? null;
  const [offen, setOffen] = useState(false);
  const [ziel, setZiel] = useState("");
  const [tage, setTage] = useState<Entwurf[]>([]);

  const ausPlan = () => {
    setZiel(plan?.zielStunden != null ? String(plan.zielStunden).replace(".", ",") : "");
    setTage(
      (plan?.festeTage ?? []).map((f) => ({
        datum: f.datum,
        stunden: String(f.stunden).replace(".", ","),
        bemerkung: f.bemerkung ?? "",
      })),
    );
  };
  useEffect(ausPlan, [plan]); // eslint-disable-line react-hooks/exhaustive-deps

  const prefix = `${jahr}-${String(monat).padStart(2, "0")}-`;
  const zielZahl = ziel.trim() === "" ? null : parseStd(ziel);
  const effZiel = zielZahl ?? standard;
  const summeFest = tage.reduce((s, t) => s + (istHalb(parseStd(t.stunden)) ? parseStd(t.stunden) : 0), 0);

  const fehler = useMemo(() => {
    if (zielZahl != null && (!istHalb(zielZahl) || zielZahl < 0 || zielZahl > 500)) return "Ziel nur in halben Stunden (z. B. 160 oder 158,5).";
    const seen = new Set<string>();
    for (const t of tage) {
      if (!t.datum) return "Bitte bei jedem festen Tag ein Datum wählen.";
      if (!t.datum.startsWith(prefix)) return `${t.datum.split("-").reverse().join(".")} liegt nicht im gewählten Monat.`;
      if (seen.has(t.datum)) return "Ein Datum ist doppelt eingetragen.";
      seen.add(t.datum);
      const s = parseStd(t.stunden);
      if (t.stunden.trim() === "" || !istHalb(s) || s < 0 || s > 16) return "Stunden nur in halben Schritten zwischen 0 und 16 (z. B. 1,5).";
    }
    return null;
  }, [zielZahl, tage, prefix]);

  const dirty = useMemo(() => {
    const a = JSON.stringify({ z: plan?.zielStunden ?? null, t: (plan?.festeTage ?? []).map((f) => [f.datum, f.stunden, f.bemerkung ?? ""]) });
    const b = JSON.stringify({ z: zielZahl, t: tage.map((t) => [t.datum, parseStd(t.stunden), t.bemerkung.trim()]) });
    return a !== b;
  }, [plan, zielZahl, tage]);

  async function onSave() {
    if (fehler) return toast.error(fehler);
    const festeTage: FesterTag[] = tage.map((t) => ({ datum: t.datum, stunden: parseStd(t.stunden), bemerkung: t.bemerkung.trim() || null }));
    try {
      await speichern.mutateAsync({ mitarbeiterId: m.id, jahr, monat, zielStunden: zielZahl, festeTage });
      await generieren.mutateAsync({ jahr, monat, mitarbeiterIds: [m.id], ueberschreiben: true });
      toast.success(`${m.name}: gespeichert, Stundenzettel neu berechnet`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    }
  }

  const angepasst = plan?.zielStunden != null;
  const busy = speichern.isPending || generieren.isPending;

  return (
    <Collapsible open={offen} onOpenChange={setOffen} className="rounded-lg border border-border bg-background">
      <CollapsibleTrigger className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", offen && "rotate-180")} />
        <span className="flex-1 truncate font-medium">{m.name}</span>
        <span className="text-sm tabular-nums">{effZiel != null && !offen ? `${fmt(plan?.zielStunden ?? standard ?? 0)} h` : !offen ? "kein Ziel" : ""}</span>
        {!offen && (
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", angepasst ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {angepasst ? "Monat angepasst" : "Standard"}
          </span>
        )}
        {!offen && (plan?.festeTage.length ?? 0) > 0 && (
          <span className="text-xs text-muted-foreground">{plan!.festeTage.length} feste Tage</span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 border-t border-border px-3 py-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor={`ziel-${m.id}`}>Stundenziel für diesen Monat</Label>
            <Input
              id={`ziel-${m.id}`}
              inputMode="decimal"
              value={ziel}
              onChange={(e) => setZiel(e.target.value)}
              placeholder={standard != null ? `Standard ${fmt(standard)}` : "kein Standard"}
              className="w-40"
            />
          </div>
          {ziel !== "" && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setZiel("")}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Auf Standard
            </Button>
          )}
          <p className="pb-2 text-xs text-muted-foreground">
            Standard: {standard != null ? `${fmt(standard)} h` : "keins"} (in den Mitarbeiter-Einstellungen)
          </p>
        </div>

        <div className="space-y-2">
          <Label>Feste Arbeitstage</Label>
          {tage.length === 0 && <p className="text-xs text-muted-foreground">Noch keine. Z. B. 14. → 1,5 Std.</p>}
          {tage.map((t, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <DateInput
                value={t.datum}
                onChange={(v: string) => setTage((a) => a.map((x, j) => (j === i ? { ...x, datum: v } : x)))}
                className="w-40"
              />
              <Input
                inputMode="decimal"
                value={t.stunden}
                onChange={(e) => setTage((a) => a.map((x, j) => (j === i ? { ...x, stunden: e.target.value } : x)))}
                placeholder="Std."
                className="w-20"
                aria-label="Stunden"
              />
              <span className="text-xs text-muted-foreground">Std.</span>
              <Input
                value={t.bemerkung}
                maxLength={60}
                onChange={(e) => setTage((a) => a.map((x, j) => (j === i ? { ...x, bemerkung: e.target.value } : x)))}
                placeholder="Bemerkung (optional)"
                className="min-w-[140px] flex-1"
              />
              <Button type="button" variant="ghost" size="icon" aria-label="Tag entfernen" onClick={() => setTage((a) => a.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setTage((a) => [...a, { datum: "", stunden: "", bemerkung: "" }])}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Tag hinzufügen
          </Button>
        </div>

        <div className="rounded-md bg-muted px-3 py-2 text-sm">
          {effZiel != null ? (
            <>
              Ziel <b>{fmt(effZiel)} h</b> · davon fest eingetragen <b>{fmt(summeFest)} h</b> · Rest{" "}
              <b>{fmt(Math.max(0, effZiel - summeFest))} h</b> wird auf die übrigen Arbeitstage verteilt.
              {summeFest > effZiel && (
                <span className="mt-1 block text-destructive">Die festen Tage liegen schon über dem Ziel.</span>
              )}
            </>
          ) : (
            <>Kein Ziel — feste Tage werden übernommen, sonst normale Arbeitszeiten.</>
          )}
        </div>

        {fehler && <p className="text-sm text-destructive">{fehler}</p>}
        <div className="flex justify-end gap-2">
          {dirty && (
            <Button type="button" variant="ghost" onClick={ausPlan} disabled={busy}>
              Verwerfen
            </Button>
          )}
          <Button type="button" onClick={onSave} disabled={busy || !dirty}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Speichern & neu berechnen
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
