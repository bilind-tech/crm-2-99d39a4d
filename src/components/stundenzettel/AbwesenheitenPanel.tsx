// Abwesenheiten (Urlaub, Krank, Sonstiges) eintragen — auch über mehrere Monate.
// Urlaub/Krank zählen mit den normalen Tagesstunden; das Monatsziel bleibt.

import { useMemo, useRef, useState } from "react";
import { DateInput } from "@/components/ui/date-input";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  useAbwesenheiten,
  useDeleteAbwesenheit,
  useSpeichereAbwesenheit,
} from "@/hooks/useStundenzettel";
import { useConfirm } from "@/hooks/useConfirm";
import {
  ABWESENHEIT_LABEL,
  type Abwesenheit,
  type AbwesenheitArt,
  type Mitarbeiter,
} from "@/lib/stundenzettel/types";

const ALLE = "__alle__";

function fmt(d: string): string {
  return `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
}

function anzahlTage(von: string, bis: string): number {
  return Math.round((Date.parse(`${bis}T00:00:00Z`) - Date.parse(`${von}T00:00:00Z`)) / 86400000) + 1;
}

export function AbwesenheitenPanel({ mitarbeiter }: { mitarbeiter: Mitarbeiter[] }) {
  const { data: liste = [], isLoading } = useAbwesenheiten();
  const speichern = useSpeichereAbwesenheit();
  const loeschen = useDeleteAbwesenheit();
  const { confirm, dialog } = useConfirm();

  const [editId, setEditId] = useState<string | null>(null);
  const [mitarbeiterId, setMitarbeiterId] = useState("");
  const [art, setArt] = useState<AbwesenheitArt>("urlaub");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [notiz, setNotiz] = useState("");
  const [filter, setFilter] = useState(ALLE);
  const vonRef = useRef<HTMLInputElement>(null);
  const bisRef = useRef<HTMLInputElement>(null);

  const nameVon = useMemo(() => new Map(mitarbeiter.map((m) => [m.id, m.name])), [mitarbeiter]);
  const gefiltert = filter === ALLE ? liste : liste.filter((a) => a.mitarbeiterId === filter);

  function pruefe(m: string, v: string, b: string): string | null {
    const ok = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
    if (!m) return "Bitte Mitarbeiter wählen";
    if (!v || !b) return "Bitte „Von“ und „Bis“ vollständig eintragen";
    if (!ok(v) || !ok(b)) return "Datum ist unvollständig";
    if (b < v) return "„Bis“ liegt vor „Von“";
    if (anzahlTage(v, b) > 367) return "Höchstens 1 Jahr am Stück";
    return null;
  }
  const fehler = pruefe(mitarbeiterId, von, bis);

  function reset() {
    setEditId(null);
    setArt("urlaub");
    setVon("");
    setBis("");
    setNotiz("");
  }

  function bearbeiten(a: Abwesenheit) {
    setEditId(a.id);
    setMitarbeiterId(a.mitarbeiterId);
    setArt(a.art);
    setVon(a.von);
    setBis(a.bis);
    setNotiz(a.notiz ?? "");
  }

  async function absenden() {
    // Direkt aus den Feldern lesen: Safari meldet getippte Daten teils verspätet.
    const v = vonRef.current?.value || von;
    const b = bisRef.current?.value || bis;
    if (v !== von) setVon(v);
    if (b !== bis) setBis(b);
    const f = pruefe(mitarbeiterId, v, b);
    if (f) {
      toast.error(f);
      return;
    }
    try {
      await speichern.mutateAsync({
        id: editId ?? undefined,
        input: { mitarbeiterId, art, von: v, bis: b, notiz: notiz.trim() || null },
      });
      toast.success(editId ? "Abwesenheit aktualisiert" : "Abwesenheit eingetragen");
      reset();
    } catch (e) {
      toast.error((e as Error).message || "Speichern fehlgeschlagen");
    }
  }

  function entfernen(a: Abwesenheit) {
    confirm({
      title: "Abwesenheit löschen?",
      description: `${ABWESENHEIT_LABEL[a.art]} von ${nameVon.get(a.mitarbeiterId) ?? "?"} (${fmt(a.von)} – ${fmt(a.bis)}) wird entfernt. Die Tage werden wieder normal berechnet.`,
      confirmLabel: "Löschen",
      variant: "destructive",
    }, async () => {
      try {
        await loeschen.mutateAsync(a.id);
        if (editId === a.id) reset();
        toast.success("Abwesenheit gelöscht");
      } catch (e) {
        toast.error((e as Error).message || "Löschen fehlgeschlagen");
      }
    });
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5 lg:col-span-1">
          <Label>Mitarbeiter</Label>
          <Select value={mitarbeiterId} onValueChange={setMitarbeiterId}>
            <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
            <SelectContent>
              {mitarbeiter.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Art</Label>
          <Select value={art} onValueChange={(v) => setArt(v as AbwesenheitArt)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(ABWESENHEIT_LABEL) as AbwesenheitArt[]).map((k) => (
                <SelectItem key={k} value={k}>{ABWESENHEIT_LABEL[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="abw-von">Von</Label>
          <DateInput
            id="abw-von"
            ref={vonRef}
            value={von}
            className="h-10"
            onInput={(e) => setVon((e.target as HTMLInputElement).value)}
            onChange={(v) => {
              setVon(v);
              if (v && (!bis || bis < v)) setBis(v);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="abw-bis">Bis</Label>
          <DateInput
            id="abw-bis"
            ref={bisRef}
            value={bis}
            className="h-10"
            min={von || undefined}
            onInput={(e) => setBis((e.target as HTMLInputElement).value)}
            onChange={setBis}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="abw-notiz">Notiz (optional)</Label>
          <Input
            id="abw-notiz"
            value={notiz}
            maxLength={200}
            placeholder={art === "sonstiges" ? "Steht im Stundenzettel" : ""}
            onChange={(e) => setNotiz(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-5">
          <Button onClick={absenden} disabled={speichern.isPending}>
            {speichern.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {editId ? "Änderung speichern" : "Eintragen"}
          </Button>
          {editId && (
            <Button variant="ghost" onClick={reset}>Abbrechen</Button>
          )}
          {fehler && (mitarbeiterId || von || bis) && (
            <span className="text-xs font-medium text-destructive">{fehler}</span>
          )}
          {!fehler && (
            <span className="text-xs text-muted-foreground">
              {anzahlTage(von, bis)} Kalendertage · Wochenenden und Feiertage werden übersprungen.
              Urlaub/Krank zählen mit den normalen Tagesstunden.
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Eingetragen</span>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALLE}>Alle Mitarbeiter</SelectItem>
              {mitarbeiter.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <p className="py-3 text-sm text-muted-foreground">Lade…</p>
        ) : gefiltert.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">Noch keine Abwesenheiten eingetragen.</p>
        ) : (
          <ul className="divide-y divide-border">
            {gefiltert.map((a) => (
              <li
                key={a.id}
                className={`flex items-center gap-3 py-2 ${editId === a.id ? "bg-muted" : ""}`}
              >
                <Badge variant={a.art === "krank" ? "destructive" : "secondary"} className="w-20 justify-center">
                  {ABWESENHEIT_LABEL[a.art]}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{nameVon.get(a.mitarbeiterId) ?? "Unbekannt"}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {fmt(a.von)} – {fmt(a.bis)} · {anzahlTage(a.von, a.bis)} Tage{a.notiz ? ` · ${a.notiz}` : ""}
                  </div>
                </div>
                <Button variant="ghost" size="icon" aria-label="Bearbeiten" onClick={() => bearbeiten(a)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Löschen" onClick={() => entfernen(a)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {dialog}
    </div>
  );
}
