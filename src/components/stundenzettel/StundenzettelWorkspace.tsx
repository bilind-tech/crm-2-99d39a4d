// Vollbild-Arbeitsbereich: nach dem Generieren sieht man alle Stundenzettel
// des Monats, links die Mitarbeiterliste, rechts PDF-Vorschau + Editor.

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StundenzettelTabelle } from "./StundenzettelTabelle";
import { StundenzettelPdfAktionen } from "./StundenzettelPdfAktionen";
import { fetchStundenzettelPdf } from "@/lib/stundenzettel/pdf";
import type { Mitarbeiter, Stundenzettel } from "@/lib/stundenzettel/types";

interface Props {
  jahr: number;
  monat: number;
  monatLabel: string;
  mitarbeiter: Mitarbeiter[];
  zettel: Stundenzettel[];
  onClose: () => void;
}

/** PDF-Vorschau eines Zettels (Blob -> Object-URL -> iframe). */
function PdfVorschau({ zettelId, refreshKey }: { zettelId: string; refreshKey: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    let aktiv = true;
    let objectUrl: string | null = null;
    setUrl(null);
    setFehler(null);
    fetchStundenzettelPdf(zettelId)
      .then(({ blob }) => {
        if (!aktiv) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e: Error) => aktiv && setFehler(e.message));
    return () => {
      aktiv = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [zettelId, refreshKey]);

  if (fehler) return <p className="p-4 text-sm text-destructive">{fehler}</p>;
  if (!url)
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> PDF wird erzeugt…
      </div>
    );
  return <iframe src={`${url}#view=FitH`} title="Stundenzettel-Vorschau" className="h-full w-full" />;
}

export function StundenzettelWorkspace({
  jahr,
  monat,
  monatLabel,
  mitarbeiter,
  zettel,
  onClose,
}: Props) {
  const [aktivId, setAktivId] = useState<string | null>(zettel[0]?.mitarbeiterId ?? null);
  const [refreshKey, setRefreshKey] = useState(0);

  const nameById = useMemo(
    () => new Map(mitarbeiter.map((m) => [m.id, m.name])),
    [mitarbeiter],
  );

  useEffect(() => {
    if (!aktivId || !zettel.some((z) => z.mitarbeiterId === aktivId)) {
      setAktivId(zettel[0]?.mitarbeiterId ?? null);
    }
  }, [zettel, aktivId]);

  const aktiv = zettel.find((z) => z.mitarbeiterId === aktivId) ?? null;

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-3 sm:h-[calc(100vh-7rem)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Stundenzettel {monatLabel} {jahr}</h1>
          <p className="text-xs text-muted-foreground">
            {zettel.length} generierte Stundenzettel — bearbeiten, Status setzen, PDF prüfen.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="mr-1.5 h-4 w-4" /> Schließen
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Mitarbeiterliste */}
        <aside className="hidden w-56 shrink-0 overflow-y-auto rounded-xl border border-border bg-card p-2 lg:block">
          {zettel.map((z) => (
            <button
              key={z.mitarbeiterId}
              type="button"
              onClick={() => setAktivId(z.mitarbeiterId)}
              className={cn(
                "mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition",
                z.mitarbeiterId === aktivId ? "bg-primary/10 font-medium" : "hover:bg-muted",
              )}
            >
              <div className="truncate">{nameById.get(z.mitarbeiterId) ?? "—"}</div>
              <div className="text-xs text-muted-foreground">
                {z.gesamtStunden.toLocaleString("de-DE")} Std.
              </div>
            </button>
          ))}
        </aside>

        {/* Mobile: Auswahl als Select */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <select
            value={aktivId ?? ""}
            onChange={(e) => setAktivId(e.target.value)}
            aria-label="Mitarbeiter"
            className="h-9 rounded-md border border-input bg-background px-2 text-sm lg:hidden"
          >
            {zettel.map((z) => (
              <option key={z.mitarbeiterId} value={z.mitarbeiterId}>
                {nameById.get(z.mitarbeiterId) ?? "—"}
              </option>
            ))}
          </select>

          {aktiv ? (
            <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-2">
              <div className="min-h-0 overflow-y-auto rounded-xl border border-border bg-card p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {aktiv.id ? <StundenzettelPdfAktionen zettelId={aktiv.id} /> : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRefreshKey((k) => k + 1)}
                  >
                    <RefreshCw className="mr-1.5 h-4 w-4" /> Vorschau aktualisieren
                  </Button>
                </div>
                <StundenzettelTabelle
                  zettel={aktiv}
                  name={nameById.get(aktiv.mitarbeiterId) ?? ""}
                  jahr={jahr}
                  monat={monat}
                />
              </div>
              <div className="hidden min-h-0 overflow-hidden rounded-xl border border-border bg-muted/30 xl:block">
                {aktiv.id ? (
                  <PdfVorschau zettelId={aktiv.id} refreshKey={refreshKey} />
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">Noch kein PDF vorhanden.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Stundenzettel für diesen Monat.</p>
          )}
        </div>
      </div>
    </div>
  );
}
