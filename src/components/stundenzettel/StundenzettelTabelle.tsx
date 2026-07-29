// Editierbare Monats-Tabelle eines Stundenzettels (Phase 3).
// Zeiten/Pause/Bemerkung sind editierbar; Stunden werden lokal
// nach derselben Ganze-Stunden-Regel wie im Backend berechnet.

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { WOCHENTAG_LABEL, type GenerierterTag, type Stundenzettel } from "@/lib/stundenzettel/types";
import { useDeleteZettel, usePatchZettel } from "@/hooks/useStundenzettel";
import { useConfirm } from "@/hooks/useConfirm";
import { cn } from "@/lib/utils";

function toMin(t?: string): number | null {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Ganze Stunden je Block (Floor), Pause nur von Block 1 abgezogen. */
function berechneStunden(t: GenerierterTag): number {
  const s1 = toMin(t.beginn);
  const e1 = toMin(t.ende);
  let min = 0;
  if (s1 != null && e1 != null && e1 > s1) {
    const netto = Math.max(0, e1 - s1 - (t.pause ?? 0));
    min += Math.floor(netto / 60) * 60;
  }
  const s2 = toMin(t.beginn2);
  const e2 = toMin(t.ende2);
  if (s2 != null && e2 != null && e2 > s2) {
    min += Math.floor((e2 - s2) / 60) * 60;
  }
  return min / 60;
}

function tagNr(datum: string): string {
  return datum.slice(8, 10);
}

/** Auswählbare Tages-Status. "" = normaler Arbeitstag. */
export const TAG_STATUS = [
  "Krank",
  "Urlaub",
  "Feiertag",
  "Frei",
  "Unbezahlt",
  "Schule",
] as const;

export function StundenzettelTabelle({
  zettel,
  name,
  jahr,
  monat,
}: {
  zettel: Stundenzettel;
  name: string;
  jahr: number;
  monat: number;
}) {
  const [tage, setTage] = useState<GenerierterTag[]>(zettel.tage);
  const [dirty, setDirty] = useState(false);
  const patch = usePatchZettel(jahr, monat);
  const del = useDeleteZettel(jahr, monat);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    setTage(zettel.tage);
    setDirty(false);
  }, [zettel]);

  const gesamt = useMemo(() => tage.reduce((s, t) => s + (t.stunden || 0), 0), [tage]);

  function setFeld(idx: number, feld: keyof GenerierterTag, value: string) {
    setTage((prev) => {
      const next = prev.slice();
      const t = { ...next[idx] } as GenerierterTag;
      if (feld === "pause") {
        const n = Number(value);
        t.pause = value === "" || Number.isNaN(n) ? undefined : Math.max(0, Math.min(600, n));
      } else if (feld === "bemerkung") {
        t.bemerkung = value === "" ? undefined : value.slice(0, 200);
      } else if (
        feld === "beginn" ||
        feld === "ende" ||
        feld === "beginn2" ||
        feld === "ende2"
      ) {
        t[feld] = value === "" ? undefined : value;
      }
      t.stunden = berechneStunden(t);
      next[idx] = t;
      return next;
    });
    setDirty(true);
  }

  /** Status setzt die Bemerkung und leert bei Abwesenheit alle Zeiten. */
  function setStatus(idx: number, status: string) {
    setTage((prev) => {
      const next = prev.slice();
      const t = { ...next[idx] } as GenerierterTag;
      if (status === "") {
        if (t.bemerkung && (TAG_STATUS as readonly string[]).includes(t.bemerkung)) {
          t.bemerkung = undefined;
        }
      } else {
        t.bemerkung = status;
        t.beginn = undefined;
        t.ende = undefined;
        t.beginn2 = undefined;
        t.ende2 = undefined;
        t.pause = undefined;
      }
      t.stunden = berechneStunden(t);
      next[idx] = t;
      return next;
    });
    setDirty(true);
  }

  async function speichern() {
    if (!zettel.id) return;
    try {
      await patch.mutateAsync({ id: zettel.id, tage });
      setDirty(false);
      toast.success("Stundenzettel gespeichert");
    } catch (e) {
      toast.error((e as Error).message || "Speichern fehlgeschlagen");
    }
  }

  function loeschen() {
    if (!zettel.id) return;
    confirm(
      {
        title: "Stundenzettel löschen?",
        description: `Der Zettel von ${name} für diesen Monat wird entfernt.`,
        confirmLabel: "Löschen",
        variant: "destructive",
      },
      async () => {
        try {
          await del.mutateAsync(zettel.id!);
          toast.success("Gelöscht");
        } catch (e) {
          toast.error((e as Error).message || "Löschen fehlgeschlagen");
        }
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Gesamt:{" "}
          <span className="font-semibold text-foreground">
            {gesamt.toLocaleString("de-DE")} Std.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loeschen} disabled={del.isPending}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Löschen
          </Button>
          <Button size="sm" onClick={speichern} disabled={!dirty || patch.isPending}>
            {patch.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Speichern
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-left font-medium">Tag</th>
              <th className="px-2 py-2 text-left font-medium">Beginn</th>
              <th className="px-2 py-2 text-left font-medium">Ende</th>
              <th className="px-2 py-2 text-left font-medium">Beginn 2</th>
              <th className="px-2 py-2 text-left font-medium">Ende 2</th>
              <th className="px-2 py-2 text-left font-medium">Pause</th>
              <th className="px-2 py-2 text-right font-medium">Std.</th>
              <th className="px-2 py-2 text-left font-medium">Status</th>
              <th className="px-2 py-2 text-left font-medium">Bemerkung</th>
            </tr>
          </thead>
          <tbody>
            {tage.map((t, i) => {
              const we = t.wochentag === "samstag" || t.wochentag === "sonntag";
              return (
                <tr
                  key={t.datum}
                  className={cn("border-t border-border", we && "bg-muted/30")}
                >
                  <td className="whitespace-nowrap px-2 py-1.5 text-xs">
                    <span className="font-medium">{tagNr(t.datum)}.</span>{" "}
                    <span className="text-muted-foreground">
                      {WOCHENTAG_LABEL[t.wochentag].slice(0, 2)}
                    </span>
                  </td>
                  {(["beginn", "ende", "beginn2", "ende2"] as const).map((f) => (
                    <td key={f} className="px-1 py-1">
                      <Input
                        type="time"
                        value={t[f] ?? ""}
                        onChange={(e) => setFeld(i, f, e.target.value)}
                        className="h-8 w-[110px] text-xs"
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      min={0}
                      max={600}
                      step={5}
                      value={t.pause ?? ""}
                      onChange={(e) => setFeld(i, "pause", e.target.value)}
                      className="h-8 w-[72px] text-xs"
                    />
                  </td>
                  <td className="px-2 py-1 text-right text-xs font-medium tabular-nums">
                    {t.stunden || ""}
                  </td>
                  <td className="px-1 py-1">
                    <select
                      value={
                        t.bemerkung && (TAG_STATUS as readonly string[]).includes(t.bemerkung)
                          ? t.bemerkung
                          : ""
                      }
                      onChange={(e) => setStatus(i, e.target.value)}
                      aria-label="Status"
                      className="h-8 w-[110px] rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Arbeit</option>
                      {TAG_STATUS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      value={t.bemerkung ?? ""}
                      onChange={(e) => setFeld(i, "bemerkung", e.target.value)}
                      className="h-8 min-w-[140px] text-xs"
                      placeholder="—"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {dialog}
    </div>
  );
}
