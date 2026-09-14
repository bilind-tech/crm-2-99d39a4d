// Karte auf der Beleg-Detailseite: zeigt eine geplante E-Mail und erlaubt
// verschieben, sofort senden oder abbrechen.

import { useState } from "react";
import { Clock, Send, X, CalendarClock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  useGeplanteMails,
  useSendeGeplantJetzt,
  useAbbrechenGeplant,
  useVerschiebeGeplant,
} from "@/hooks/useApi";
import {
  ausDatumZeit,
  geplantKlartext,
  parseGeplantFuer,
  splitDatumZeit,
  toBackendZeit,
} from "@/lib/email/geplant";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  belegId: string;
  belegTyp: "angebot" | "rechnung";
}

export function GeplanteMailKarte({ belegId, belegTyp }: Props) {
  const { data: alle = [] } = useGeplanteMails({ belegId, belegTyp });
  const verschieben = useVerschiebeGeplant();
  const jetzt = useSendeGeplantJetzt();
  const abbrechen = useAbbrechenGeplant();
  const [abbrechenOffen, setAbbrechenOffen] = useState(false);
  const [bearbeiten, setBearbeiten] = useState(false);
  const [datum, setDatum] = useState("");
  const [zeit, setZeit] = useState("");

  const offen = alle.filter((g) => g.status === "geplant" || g.status === "sending");
  const fehler = alle.filter((g) => g.status === "fehler");
  if (offen.length === 0 && fehler.length === 0) return null;

  const eintrag = offen[0] ?? fehler[0];
  const termin = parseGeplantFuer(eintrag.geplantFuer);
  const istFehler = eintrag.status === "fehler";

  const starteBearbeiten = () => {
    const sp = splitDatumZeit(termin);
    setDatum(sp.datum);
    setZeit(sp.zeit);
    setBearbeiten(true);
  };

  const speichern = () => {
    const d = ausDatumZeit(datum, zeit);
    if (!d || d.getTime() < Date.now() + 30_000) {
      toast.error("Bitte einen Zeitpunkt in der Zukunft wählen.");
      return;
    }
    verschieben.mutate(
      { id: eintrag.id, geplantFuer: toBackendZeit(d) },
      {
        onSuccess: () => {
          setBearbeiten(false);
          toast.success(`Verschoben — geht ${geplantKlartext(d)} raus.`);
        },
        onError: () => toast.error("Verschieben nicht möglich."),
      },
    );
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        istFehler ? "border-destructive/40 bg-destructive/5" : "border-warning/40 bg-warning/5"
      }`}
    >
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {istFehler ? <AlertCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
        {istFehler ? "Geplante E-Mail fehlgeschlagen" : "E-Mail geplant"}
      </p>

      {istFehler ? (
        <p className="text-sm text-destructive">
          Der Versand hat nicht geklappt: {eintrag.fehlerText ?? "Unbekannter Grund"}. Der Beleg
          wurde nicht als versendet markiert.
        </p>
      ) : (
        <p className="text-sm">
          Geht <span className="font-semibold">{geplantKlartext(termin)}</span> automatisch an{" "}
          <span className="font-medium">{eintrag.empfaengerTo}</span>.
        </p>
      )}

      {bearbeiten ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
            <Input type="time" value={zeit} onChange={(e) => setZeit(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={speichern} disabled={verschieben.isPending}>
              Speichern
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBearbeiten(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={starteBearbeiten}>
            <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
            {istFehler ? "Neu ansetzen" : "Zeit ändern"}
          </Button>
          {!istFehler && (
            <Button
              size="sm"
              variant="outline"
              disabled={jetzt.isPending}
              onClick={() =>
                jetzt.mutate(eintrag.id, {
                  onSuccess: (res) =>
                    res.sendOk === false
                      ? toast.error(`Versand fehlgeschlagen: ${res.sendError ?? ""}`)
                      : toast.success("E-Mail versendet"),
                  onError: (e: unknown) => {
                    const err = e as { body?: { sendError?: string } };
                    toast.error("Versand fehlgeschlagen", {
                      description: err?.body?.sendError ?? "",
                    });
                  },
                })
              }
            >
              <Send className="mr-1.5 h-3.5 w-3.5" /> Jetzt senden
            </Button>
          )}
          {!istFehler && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setAbbrechenOffen(true)}
            >
              <X className="mr-1.5 h-3.5 w-3.5" /> Nicht senden
            </Button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={abbrechenOffen}
        onOpenChange={setAbbrechenOffen}
        title="Geplante E-Mail abbrechen?"
        description="Die E-Mail wird dann nicht verschickt. Sie können jederzeit eine neue planen."
        confirmLabel="Ja, abbrechen"
        variant="destructive"
        onConfirm={() =>
          abbrechen.mutate(eintrag.id, {
            onSuccess: () => toast.success("Geplante E-Mail abgebrochen."),
            onError: () => toast.error("Abbrechen nicht möglich."),
          })
        }
      />
    </div>
  );
}
