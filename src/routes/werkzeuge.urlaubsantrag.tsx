// Urlaubsantrag — Formular links, Live-PDF rechts. Gespeichert als Abwesenheit
// (art = urlaub), dadurch automatisch im Stundenzettel berücksichtigt.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CloudUpload, Download, ExternalLink, FolderCheck, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PdfCanvasViewer } from "@/components/pdf/PdfCanvasViewer";
import { PrintButton } from "@/components/pdf/PrintButton";
import { useConfirm } from "@/hooks/useConfirm";
import { useFirmendaten } from "@/hooks/useApi";
import {
  useAbwesenheiten,
  useAntragStatus,
  useDeleteAbwesenheit,
  useFeiertage,
  useMitarbeiter,
  useSpeichereAbwesenheit,
  useUrlaubsantragAblegen,
} from "@/hooks/useStundenzettel";
import {
  downloadBlob,
  generateUrlaubsantragPdf,
  safeFilename,
  zaehleUrlaubstage,
} from "@/lib/pdf/werkzeugePdf";
import { blobToDataUrl } from "@/lib/dokumente/blobToDataUrl";
import type { Abwesenheit } from "@/lib/stundenzettel/types";

export const Route = createFileRoute("/werkzeuge/urlaubsantrag")({
  head: () => ({
    meta: [
      { title: "Urlaubsantrag | My Clean Center" },
      { name: "description", content: "Urlaubsanträge für Mitarbeiter ausfüllen, speichern und als PDF drucken." },
      { property: "og:title", content: "Urlaubsantrag | My Clean Center" },
      { property: "og:description", content: "Urlaubsanträge ausfüllen, speichern und drucken." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UrlaubsantragPage,
});

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function fmt(d: string): string {
  return ISO.test(d) ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : "";
}

function UrlaubsantragPage() {
  const { data: mitarbeiter = [] } = useMitarbeiter();
  const { data: alle = [] } = useAbwesenheiten();
  const { data: firma } = useFirmendaten();
  const speichern = useSpeichereAbwesenheit();
  const ablegen = useUrlaubsantragAblegen();
  const loeschen = useDeleteAbwesenheit();
  const { data: antragStatus = {} } = useAntragStatus();
  const { confirm, dialog } = useConfirm();

  const [editId, setEditId] = useState<string | null>(null);
  const [mitarbeiterId, setMitarbeiterId] = useState("");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [tageManuell, setTageManuell] = useState<string>("");
  const [versucht, setVersucht] = useState(false);
  const vonRef = useRef<HTMLInputElement>(null);
  const bisRef = useRef<HTMLInputElement>(null);

  const jahrVon = ISO.test(von) ? Number(von.slice(0, 4)) : new Date().getFullYear();
  const jahrBis = ISO.test(bis) ? Number(bis.slice(0, 4)) : jahrVon;
  const ftA = useFeiertage(jahrVon);
  const ftB = useFeiertage(jahrBis);
  const feiertage = useMemo(() => {
    const s = new Set<string>();
    for (const r of [ftA.data, ftB.data]) {
      r?.gesetzlich.forEach((f) => s.add(f.datum));
      r?.custom.forEach((f) => s.add(f.datum));
    }
    return s;
  }, [ftA.data, ftB.data]);

  const autoTage = zaehleUrlaubstage(von, bis, feiertage);
  const manuell = tageManuell.trim() === "" ? null : Number(tageManuell.replace(",", "."));
  const tage = manuell != null && Number.isFinite(manuell) ? manuell : autoTage;
  const name = mitarbeiter.find((m) => m.id === mitarbeiterId)?.name ?? "";
  const antraege = alle.filter((a) => a.art === "urlaub");
  const nameVon = useMemo(() => new Map(mitarbeiter.map((m) => [m.id, m.name])), [mitarbeiter]);

  function pruefe(v: string, b: string): string | null {
    if (!mitarbeiterId) return "Bitte Mitarbeiter wählen";
    if (!ISO.test(v) || !ISO.test(b)) return "Bitte „Urlaub von“ und „bis“ vollständig eintragen";
    if (b < v) return "„bis“ liegt vor „von“";
    if (manuell != null && (!Number.isFinite(manuell) || manuell < 0 || manuell > 366 || (manuell * 2) % 1 !== 0))
      return "Anzahl Urlaubstage muss eine Zahl in halben Schritten sein";
    return null;
  }
  const fehler = pruefe(von, bis);

  // Live-Vorschau (leicht verzögert, damit Tippen flüssig bleibt)
  const [blob, setBlob] = useState<Blob | null>(null);
  const [vorschauFehler, setVorschauFehler] = useState<string | null>(null);
  useEffect(() => {
    let aktiv = true;
    const t = setTimeout(() => {
      generateUrlaubsantragPdf({ firma, mitarbeiterName: name, von, bis, tage: ISO.test(von) && ISO.test(bis) ? tage : NaN })
        .then((b) => aktiv && (setBlob(b), setVorschauFehler(null)))
        .catch((e: Error) => aktiv && setVorschauFehler(e.message));
    }, 350);
    return () => {
      aktiv = false;
      clearTimeout(t);
    };
  }, [firma, name, von, bis, tage]);

  const dateiname = `Urlaubsantrag_${safeFilename(name || "Mitarbeiter")}_${von || "datum"}.pdf`;

  function neu() {
    setEditId(null);
    setMitarbeiterId("");
    setVon("");
    setBis("");
    setTageManuell("");
    setVersucht(false);
  }

  function oeffnen(a: Abwesenheit) {
    setEditId(a.id);
    setMitarbeiterId(a.mitarbeiterId);
    setVon(a.von);
    setBis(a.bis);
    setTageManuell(a.tageOverride != null ? String(a.tageOverride).replace(".", ",") : "");
    setVersucht(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function absenden() {
    const v = vonRef.current?.value || von;
    const b = bisRef.current?.value || bis;
    if (v !== von) setVon(v);
    if (b !== bis) setBis(b);
    const f = pruefe(v, b);
    if (f) {
      setVersucht(true);
      toast.error(f);
      return;
    }
    try {
      const gespeichert = await speichern.mutateAsync({
        id: editId ?? undefined,
        input: { mitarbeiterId, art: "urlaub", von: v, bis: b, notiz: null, tageOverride: manuell },
      });
      setEditId(gespeichert.id);
      const pdf = await generateUrlaubsantragPdf({
        firma,
        mitarbeiterName: name,
        von: v,
        bis: b,
        tage: manuell ?? zaehleUrlaubstage(v, b, feiertage),
      });
      try {
        await ablegen.mutateAsync({ id: gespeichert.id, pdfBase64: await blobToDataUrl(pdf) });
        toast.success("Urlaubsantrag gespeichert", {
          description: "Im Stundenzettel eingetragen und unter Dokumente → Urlaubsanträge abgelegt.",
        });
      } catch {
        toast.warning("Urlaubsantrag gespeichert", {
          description: "Im Stundenzettel eingetragen — PDF-Ablage in Dokumente fehlgeschlagen.",
        });
      }
    } catch (e) {
      toast.error((e as Error).message || "Speichern fehlgeschlagen");
    }
  }

  async function erneutAblegen(a: Abwesenheit) {
    try {
      const n = nameVon.get(a.mitarbeiterId) ?? "";
      const pdf = await generateUrlaubsantragPdf({
        firma,
        mitarbeiterName: n,
        von: a.von,
        bis: a.bis,
        tage: a.tageOverride ?? zaehleUrlaubstage(a.von, a.bis, feiertage),
      });
      await ablegen.mutateAsync({ id: a.id, pdfBase64: await blobToDataUrl(pdf) });
      toast.success("PDF in Dokumente abgelegt");
    } catch (e) {
      toast.error((e as Error).message || "Ablage fehlgeschlagen");
    }
  }

  function entfernen(a: Abwesenheit) {
    confirm(
      {
        title: "Urlaubsantrag löschen?",
        description: `${nameVon.get(a.mitarbeiterId) ?? "?"} · ${fmt(a.von)} – ${fmt(a.bis)}. Der Urlaub wird auch aus dem Stundenzettel entfernt.`,
        confirmLabel: "Löschen",
        variant: "destructive",
      },
      async () => {
        try {
          await loeschen.mutateAsync(a.id);
          if (editId === a.id) neu();
          toast.success("Urlaubsantrag gelöscht");
        } catch (e) {
          toast.error((e as Error).message || "Löschen fehlgeschlagen");
        }
      },
    );
  }

  const busy = speichern.isPending || ablegen.isPending;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Urlaubsantrag"
        subtitle="Mitarbeiter und Zeitraum eintragen — wird gespeichert, im Stundenzettel berücksichtigt und als PDF abgelegt."
        actions={
          editId ? (
            <Button variant="outline" onClick={neu}>
              <Plus className="mr-1.5 h-4 w-4" /> Neuer Antrag
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="space-y-5">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="space-y-1.5">
              <Label>Mitarbeiter</Label>
              <Select value={mitarbeiterId} onValueChange={setMitarbeiterId}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {mitarbeiter.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mitarbeiter.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Noch keine Mitarbeiter — lege sie unter Stundenzettel an.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ua-von">Urlaub von</Label>
                <DateInput
                  id="ua-von"
                  ref={vonRef}
                  value={von}
                  onInput={(e) => setVon((e.target as HTMLInputElement).value)}
                  onChange={(v) => {
                    setVon(v);
                    if (v && (!bis || bis < v)) setBis(v);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ua-bis">bis</Label>
                <DateInput
                  id="ua-bis"
                  ref={bisRef}
                  value={bis}
                  min={von || undefined}
                  onInput={(e) => setBis((e.target as HTMLInputElement).value)}
                  onChange={setBis}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ua-tage">Anzahl Urlaubstage</Label>
              <Input
                id="ua-tage"
                inputMode="decimal"
                className="h-12 text-base"
                value={tageManuell}
                placeholder={autoTage ? `${autoTage} (automatisch)` : "wird automatisch berechnet"}
                onChange={(e) => setTageManuell(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Automatisch: Mo–Fr ohne Feiertage{autoTage ? ` = ${autoTage} Tage` : ""}. Leer lassen für die automatische Zahl.
              </p>
            </div>

            {fehler && versucht && <p className="text-sm font-medium text-destructive">{fehler}</p>}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={absenden} disabled={busy} className="flex-1">
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                {editId ? "Änderung speichern" : "Speichern"}
              </Button>
              <PrintButton getBlob={async () => blob ?? (await generateUrlaubsantragPdf({ firma, mitarbeiterName: name, von, bis, tage }))} />
              <Button variant="outline" size="sm" disabled={!blob} onClick={() => blob && downloadBlob(blob, dateiname)}>
                <Download className="mr-1.5 h-4 w-4" /> Herunterladen
              </Button>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Gespeicherte Urlaubsanträge
            </h2>
            {antraege.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Noch keine Urlaubsanträge gespeichert.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                {antraege.map((a) => (
                  <li key={a.id} className={`flex items-center gap-2 p-3 ${editId === a.id ? "bg-muted" : ""}`}>
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => oeffnen(a)}>
                      <div className="truncate text-sm font-medium">{nameVon.get(a.mitarbeiterId) ?? "Unbekannt"}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {fmt(a.von)} – {fmt(a.bis)}
                        {a.tageOverride != null ? ` · ${String(a.tageOverride).replace(".", ",")} Tage` : ""}
                      </div>
                      <AntragStatusZeile status={antragStatus[a.id]} />
                    </button>
                    {antragStatus[a.id] && !antragStatus[a.id].dokumentId && (
                      <Button variant="outline" size="sm" disabled={ablegen.isPending} onClick={() => erneutAblegen(a)}>
                        Erneut ablegen
                      </Button>
                    )}
                    {antragStatus[a.id]?.driveUrl && (
                      <Button variant="ghost" size="icon" aria-label="In Google Drive öffnen" asChild>
                        <a href={antragStatus[a.id].driveUrl!} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" aria-label="Öffnen" onClick={() => oeffnen(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Löschen" onClick={() => entfernen(a)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="h-[78vh] min-h-[520px] overflow-hidden rounded-2xl border border-border bg-muted/30">
          {vorschauFehler ? (
            <p className="p-6 text-sm text-muted-foreground">Vorschau nicht verfügbar: {vorschauFehler}</p>
          ) : (
            <PdfCanvasViewer
              pdfBlob={blob}
              pdfUrl={null}
              fileName={dateiname}
              className="h-full w-full overflow-y-auto bg-muted/30"
            />
          )}
        </div>
      </div>
      {dialog}
    </div>
  );
}

function AntragStatusZeile({ status }: { status?: { dokumentId: string | null; driveStatus: string } }) {
  if (!status) return null;
  if (!status.dokumentId) {
    return <div className="mt-1 text-[11px] font-medium text-destructive">PDF fehlt in Dokumente</div>;
  }
  const drive =
    status.driveStatus === "uploaded"
      ? { text: "In Drive", cls: "text-primary" }
      : status.driveStatus === "fehler"
        ? { text: "Drive-Fehler", cls: "text-destructive" }
        : status.driveStatus === "pending"
          ? { text: "Drive ausstehend", cls: "text-muted-foreground" }
          : { text: "Nicht in Drive (Drive nicht verbunden?)", cls: "text-muted-foreground" };
  return (
    <div className="mt-1 flex items-center gap-3 text-[11px]">
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <FolderCheck className="h-3 w-3" /> In Dokumente
      </span>
      <span className={`inline-flex items-center gap-1 ${drive.cls}`}>
        <CloudUpload className="h-3 w-3" /> {drive.text}
      </span>
    </div>
  );
}
