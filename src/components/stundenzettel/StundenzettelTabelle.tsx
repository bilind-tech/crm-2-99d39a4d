// Editierbare Monats-Tabelle eines Stundenzettels (Phase 3).
// Zeiten/Pause/Bemerkung sind editierbar; Stunden werden lokal
// nach derselben Halbstunden-Regel wie im Backend berechnet.

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { WOCHENTAG_LABEL, type GenerierterTag, type Stundenzettel } from "@/lib/stundenzettel/types";
import { useDeleteZettel, usePatchZettel } from "@/hooks/useStundenzettel";
import { useConfirm } from "@/hooks/useConfirm";
import { cn } from "@/lib/utils";
import { pruefeZiel } from "@/lib/stundenzettel/ziel";

function toMin(t?: string): number | null {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Halbe Stunden je Block (Floor), Pause nur von Block 1 abgezogen. */
function berechneStunden(t: GenerierterTag): number {
  if (t.ausgeschlossen) return 0;
  // Urlaub/Krank zählen wie Arbeitszeit: die übernommenen Tagesstunden bleiben.
  if (t.bemerkung && (BEZAHLTE_ABWESENHEIT as readonly string[]).includes(t.bemerkung)) return t.stunden || 0;
  if (t.bemerkung && (TAG_STATUS as readonly string[]).includes(t.bemerkung)) return 0;
  const s1 = toMin(t.beginn);
  const e1 = toMin(t.ende);
  let min = 0;
  if (s1 != null && e1 != null && e1 > s1) {
    const netto = Math.max(0, e1 - s1 - (t.pause ?? 0));
    min += Math.floor(netto / 30) * 30;
  }
  const s2 = toMin(t.beginn2);
  const e2 = toMin(t.ende2);
  if (s2 != null && e2 != null && e2 > s2) {
    min += Math.floor((e2 - s2) / 30) * 30;
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

/** Abwesenheiten, die mit den normalen Tagesstunden zählen. */
export const BEZAHLTE_ABWESENHEIT = ["Krank", "Urlaub"] as const;

function editierbarerStand(t: GenerierterTag): string {
  return JSON.stringify({
    beginn: t.beginn ?? null,
    ende: t.ende ?? null,
    beginn2: t.beginn2 ?? null,
    ende2: t.ende2 ?? null,
    pause: t.pause ?? null,
    stunden: t.stunden,
    bemerkung: t.bemerkung ?? null,
    ausgeschlossen: !!t.ausgeschlossen,
  });
}

export function StundenzettelTabelle({
  zettel,
  name,
  jahr,
  monat,
  ziel,
}: {
  zettel: Stundenzettel;
  name: string;
  jahr: number;
  monat: number;
  ziel?: number | null;
}) {
  const [filter, setFilter] = useState<"alle" | "manuell" | "geaendert">("alle");
  const [tage, setTage] = useState<GenerierterTag[]>(zettel.tage);
  const [zweiterBlock, setZweiterBlock] = useState<Set<string>>(new Set());
  const [gespeicherteTage, setGespeicherteTage] = useState<GenerierterTag[]>(zettel.tage);
  const patch = usePatchZettel(jahr, monat);
  const del = useDeleteZettel(jahr, monat);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    setTage(zettel.tage);
    setGespeicherteTage(zettel.tage);
  }, [zettel]);

  const gesamt = useMemo(() => tage.reduce((s, t) => s + (t.stunden || 0), 0), [tage]);
  const geaenderteTage = useMemo(() => {
    const gespeichert = new Map(gespeicherteTage.map((t) => [t.datum, editierbarerStand(t)]));
    return new Set(
      tage
        .filter((t) => gespeichert.get(t.datum) !== editierbarerStand(t))
        .map((t) => t.datum),
    );
  }, [gespeicherteTage, tage]);
  const dirty = geaenderteTage.size > 0;
  const pruefung = useMemo(() => pruefeZiel(tage, ziel ?? null), [tage, ziel]);
  const zielSperre = pruefung.ziel != null && !pruefung.erfuellt;

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
      t.quelle = "manuell";
      t.stunden = berechneStunden(t);
      next[idx] = t;
      return next;
    });
  }

  /** Ein Klick: Zeile zählt / zählt nicht. Zeiten bleiben erhalten. */
  function toggleZaehlt(idx: number) {
    setTage((prev) => {
      const next = prev.slice();
      const t = { ...next[idx] } as GenerierterTag;
      if (t.ausgeschlossen) {
        t.ausgeschlossen = undefined;
        const orig = gespeicherteTage.find((g) => g.datum === t.datum);
        const bezahlt = !!t.bemerkung && (BEZAHLTE_ABWESENHEIT as readonly string[]).includes(t.bemerkung);
        t.stunden = bezahlt && orig && !orig.ausgeschlossen ? orig.stunden : berechneStunden(t);
      } else {
        t.ausgeschlossen = true;
        t.stunden = 0;
      }
      t.quelle = "manuell";
      next[idx] = t;
      return next;
    });
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
        const bezahlt = (BEZAHLTE_ABWESENHEIT as readonly string[]).includes(status);
        const warBezahlt = !!t.bemerkung && (BEZAHLTE_ABWESENHEIT as readonly string[]).includes(t.bemerkung);
        // Bisherige Tagesstunden übernehmen (aus Zeiten oder vorheriger Abwesenheit).
        const vorher = warBezahlt ? t.stunden || 0 : (t.beginn && t.ende ? berechneStunden({ ...t, bemerkung: undefined }) : 0);
        t.bemerkung = status;
        t.stunden = bezahlt ? vorher : 0;
        t.beginn = undefined;
        t.ende = undefined;
        t.pause = undefined;
        t.beginn2 = undefined;
        t.ende2 = undefined;
      }
      t.quelle = "manuell";
      t.stunden = berechneStunden(t);
      next[idx] = t;
      return next;
    });
  }

  async function speichern() {
    if (!zettel.id || zielSperre) return;
    try {
      await patch.mutateAsync({ id: zettel.id, tage });
      setGespeicherteTage(tage.map((tag) => ({ ...tag })));
      toast.success("Stundenzettel gespeichert");
    } catch (e) {
      toast.error((e as Error).message || "Speichern fehlgeschlagen");
    }
  }

  function loeschen() {
    if (!zettel.id) return;
    const zettelId = zettel.id;
    confirm(
      {
        title: "Stundenzettel löschen?",
        description: `Der Zettel von ${name} für diesen Monat wird entfernt.`,
        confirmLabel: "Löschen",
        variant: "destructive",
      },
      async () => {
        try {
          await del.mutateAsync(zettelId);
          toast.success("Gelöscht");
        } catch (e) {
          toast.error((e as Error).message || "Löschen fehlgeschlagen");
        }
      },
    );
  }

  const fmt = (n: number) => n.toLocaleString("de-DE");
  const sichtbar = tage
    .map((t, i) => ({ t, i }))
    .filter(({ t }) =>
      filter === "alle" ? true : filter === "manuell" ? t.quelle === "manuell" : geaenderteTage.has(t.datum),
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
            pruefung.ziel == null
              ? "border-border text-muted-foreground"
              : pruefung.erfuellt
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-destructive/40 bg-destructive/10 text-destructive",
          )}
        >
          {pruefung.ziel != null &&
            (pruefung.erfuellt ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertCircle className="h-4 w-4" />)}
          {pruefung.ziel != null ? (
            <span>
              Ziel <b>{fmt(pruefung.ziel)}</b> · Ist <b>{fmt(gesamt)}</b> Std.
              {!pruefung.erfuellt &&
                (pruefung.abweichung < 0
                  ? ` · noch ${fmt(-pruefung.abweichung)} Std. fehlen`
                  : ` · ${fmt(pruefung.abweichung)} Std. zu viel`)}
            </span>
          ) : (
            <span>
              Gesamt: <b className="text-foreground">{fmt(gesamt)} Std.</b>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loeschen} disabled={del.isPending}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Löschen
          </Button>
          <Button
            size="sm"
            onClick={speichern}
            disabled={!dirty || zielSperre || patch.isPending}
            title={zielSperre ? "Speichern erst möglich, wenn die Zielstunden genau erreicht sind" : undefined}
          >
            {patch.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {zielSperre && dirty ? "Ziel nicht erreicht" : "Speichern"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-border bg-background" /> Automatisch</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border-l-4 border-primary bg-primary/10" /> Manuell</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-accent" /> Urlaub / Krank</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-muted" /> Frei / Feiertag / WE</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-muted line-through opacity-50" /> Zählt nicht</span>
        <div className="ml-auto flex overflow-hidden rounded-md border border-border">
          {([["alle", "Alle"], ["manuell", "Nur manuelle"], ["geaendert", "Nur geänderte"]] as const).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={cn("px-2.5 py-1", filter === k ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] table-fixed text-sm">
          <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="w-[66px] px-2 py-2 text-left font-medium">Tag</th>
              <th className="w-[62px] px-2 py-2 text-left font-medium">Herkunft</th>
              <th className="w-[108px] px-2 py-2 text-left font-medium">Beginn</th>
              <th className="w-[108px] px-2 py-2 text-left font-medium">Ende</th>
              <th className="w-[76px] px-2 py-2 text-left font-medium">Pause</th>
              <th className="w-[54px] px-2 py-2 text-right font-medium">Std.</th>
              <th className="w-[84px] px-2 py-2 text-center font-medium">Zählt</th>
              <th className="w-[108px] px-2 py-2 text-left font-medium">Status</th>
              <th className="px-2 py-2 text-left font-medium">Bemerkung</th>
            </tr>
          </thead>
          <tbody>
            {sichtbar.map(({ t, i }) => {
              const we = t.wochentag === "samstag" || t.wochentag === "sonntag";
              const manuell = t.quelle === "manuell";
              const abwesend = !!t.bemerkung && (BEZAHLTE_ABWESENHEIT as readonly string[]).includes(t.bemerkung);
              const frei = !abwesend && !t.beginn && (we || !!t.bemerkung);
              const aus = !!t.ausgeschlossen;
              const nichtGezaehlt =
                aus || (!t.beginn && !t.ende && !t.stunden) || (!!t.beginn && t.beginn === t.ende);
              const geaendert = geaenderteTage.has(t.datum);
              return (
                <tr
                  key={t.datum}
                  className={cn(
                    "border-t border-border border-l-4 border-l-transparent transition-colors",
                    frei && !nichtGezaehlt && "bg-muted/60",
                    abwesend && "bg-accent/60",
                    manuell && "border-l-primary bg-primary/5",
                    geaendert && "bg-primary/15",
                    nichtGezaehlt && "border-l-foreground/60 bg-foreground/15",
                    aus && "[&_input]:line-through",
                  )}
                >
                  <td className="whitespace-nowrap px-2 py-1 text-xs">
                    <span className={cn("font-medium", aus && "line-through")}>{tagNr(t.datum)}.</span>{" "}
                    <span className="text-muted-foreground">{WOCHENTAG_LABEL[t.wochentag].slice(0, 2)}</span>
                    {nichtGezaehlt && (
                      <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">nicht gezählt</span>
                    )}
                  </td>
                  <td className="px-2 py-1">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium",
                        manuell ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {manuell ? "Manuell" : "Auto"}
                    </span>
                  </td>
                  {(["beginn", "ende"] as const).map((f) => {
                    const f2 = f === "beginn" ? "beginn2" : "ende2";
                    const zwei = t.beginn2 !== undefined || t.ende2 !== undefined || zweiterBlock.has(t.datum);
                    const zweiterFrueher =
                      zwei && toMin(t.beginn2) != null && toMin(t.beginn) != null && Number(toMin(t.beginn2)) < Number(toMin(t.beginn));
                    const oben = zweiterFrueher ? f2 : f;
                    const unten = zweiterFrueher ? f : f2;
                    return (
                      <td key={f} className="px-1 py-1 align-top">
                        <div className={cn("relative grid gap-1", zwei && "grid-rows-[2rem_2rem]")}>
                          <Input
                            type="time"
                            aria-label={f === "beginn" ? "Beginn 1. Block" : "Ende 1. Block"}
                            value={t[oben] ?? ""}
                            onChange={(e) => setFeld(i, oben, e.target.value)}
                            step={1800}
                            className="h-8 w-full min-w-[92px] text-xs"
                          />
                          {zwei && (
                            <Input
                              type="time"
                              aria-label={f === "beginn" ? "Beginn 2. Block" : "Ende 2. Block"}
                              value={t[unten] ?? ""}
                              onChange={(e) => setFeld(i, unten, e.target.value)}
                              step={1800}
                              className={cn("h-8 w-full min-w-[92px] text-xs", f === "ende" && "pr-7")}
                            />
                          )}
                          {zwei && f === "ende" && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="2. Block entfernen"
                                title="2. Block entfernen"
                                className="absolute bottom-0 right-0 h-8 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  setZweiterBlock((s) => { const n = new Set(s); n.delete(t.datum); return n; });
                                  setFeld(i, "beginn2", "");
                                  setFeld(i, "ende2", "");
                                }}
                              >
                                ×
                              </Button>
                          )}
                        </div>
                        {!zwei && f === "beginn" && !!t.beginn && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="mt-0.5 h-auto p-0 text-[10px]"
                            onClick={() => setZweiterBlock((s) => new Set(s).add(t.datum))}
                          >
                            + 2. Block
                          </Button>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      min={0}
                      max={600}
                      step={5}
                      value={t.pause ?? ""}
                      onChange={(e) => setFeld(i, "pause", e.target.value)}
                      className="h-8 w-[68px] text-xs"
                    />
                  </td>
                  <td className={cn("px-2 py-1 text-right text-xs font-semibold tabular-nums", aus && "line-through")}>
                    {t.stunden ? fmt(t.stunden) : ""}
                  </td>
                  <td className="px-1 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => toggleZaehlt(i)}
                      aria-pressed={!aus}
                      className={cn(
                        "h-7 w-[72px] rounded-md border text-[11px] font-medium transition-colors",
                        aus
                          ? "border-destructive/40 bg-destructive/10 text-destructive"
                          : "border-border bg-background hover:bg-muted",
                      )}
                    >
                      {aus ? "Zählt nicht" : "Zählt"}
                    </button>
                  </td>
                  <td className="px-1 py-1">
                    <select
                      value={t.bemerkung && (TAG_STATUS as readonly string[]).includes(t.bemerkung) ? t.bemerkung : ""}
                      onChange={(e) => setStatus(i, e.target.value)}
                      aria-label="Status"
                      className="h-8 w-full min-w-[92px] rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Arbeit</option>
                      {TAG_STATUS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      value={t.bemerkung ?? ""}
                      onChange={(e) => setFeld(i, "bemerkung", e.target.value)}
                      className="h-8 min-w-[120px] text-xs"
                      placeholder="—"
                    />
                  </td>
                </tr>
              );
            })}
            {sichtbar.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-xs text-muted-foreground">Keine Zeilen für diesen Filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {dialog}
    </div>
  );
}
