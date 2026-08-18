import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { Switch } from "@/components/ui/switch";
import { PrimaryAction } from "@/components/layout/PrimaryAction";
import { useKunden, useObjekte, useCreateProtokoll } from "@/hooks/useApi";
import { todayISO } from "@/lib/format";
import { auftragsAdresseAusStamm } from "@/lib/pdf/werkzeugePdf";
import type { UebergabeArt } from "@/lib/api/types";

interface Props {
  onClose: () => void;
  defaultKundeId?: string;
  defaultObjektId?: string;
}

export function UebergabeProtokollForm({ onClose, defaultKundeId, defaultObjektId }: Props) {
  const navigate = useNavigate();
  const { data: kunden = [] } = useKunden();
  const { data: objekteAlle = [] } = useObjekte();
  const create = useCreateProtokoll();

  const [kundeId, setKundeId] = useState(defaultKundeId ?? "");
  const [objektId, setObjektId] = useState(defaultObjektId ?? "");
  const [datum, setDatum] = useState(todayISO());
  const [art, setArt] = useState<UebergabeArt>("uebergabe");
  const [leistungsumfang, setLeistungsumfang] = useState("Endreinigung gemäß Auftrag.");
  const [bemerkungen, setBemerkungen] = useState("");
  const [vertreterAuftraggeber, setVertreterAuftraggeber] = useState("");
  const [adresseVomKunden, setAdresseVomKunden] = useState(true);
  const [auftragsAdresse, setAuftragsAdresse] = useState("");
  const [maengelVorhanden, setMaengelVorhanden] = useState(false);
  const [maengelText, setMaengelText] = useState("");
  const [abnahmeAnrede, setAbnahmeAnrede] = useState<"frau" | "herr">("herr");
  const [abnahmeName, setAbnahmeName] = useState("");

  const objekteVonKunde = useMemo(
    () => objekteAlle.filter((o) => o.kundeId === kundeId),
    [objekteAlle, kundeId],
  );

  const autoAdresse = useMemo(() => {
    const k = kunden.find((x) => x.id === kundeId);
    const o = objekteAlle.find((x) => x.id === objektId);
    return auftragsAdresseAusStamm(k, o);
  }, [kunden, objekteAlle, kundeId, objektId]);

  async function submit() {
    if (!kundeId) return toast.error("Bitte Kunde wählen");
    try {
      const p = await create.mutateAsync({
        kind: "uebergabe",
        kundeId,
        objektId: objektId || undefined,
        datum,
        art,
        leistungsumfang,
        bemerkungen,
        vertreterAuftraggeber,
        adresseVomKunden,
        auftragsAdresse: adresseVomKunden ? autoAdresse : auftragsAdresse,
        maengelVorhanden,
        maengelText,
        abnahmeAnrede,
        abnahmeName,
        ohneVorbehalt: true,
      });
      toast.success("Protokoll angelegt", { description: `${p.nummer} • Editor wird geöffnet.` });
      onClose();
      navigate({ to: "/protokolle/$id/bearbeiten", params: { id: p.id } });
    } catch (e) {
      console.error(e);
      toast.error("Konnte Protokoll nicht anlegen");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kunde *">
          <Select
            value={kundeId || undefined}
            onValueChange={(v) => {
              setKundeId(v);
              setObjektId("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Kunde wählen…" />
            </SelectTrigger>
            <SelectContent>
              {kunden.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.firmenname || `${k.vorname ?? ""} ${k.nachname ?? ""}`.trim()} · {k.nummer}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Objekt (optional)">
          <Select
            value={objektId || "__none__"}
            onValueChange={(v) => setObjektId(v === "__none__" ? "" : v)}
            disabled={!kundeId}
          >
            <SelectTrigger>
              <SelectValue placeholder={kundeId ? "— kein Objekt —" : "Erst Kunde wählen"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— kein Objekt —</SelectItem>
              {objekteVonKunde.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Datum">
          <DateInput value={datum} onChange={setDatum} />
        </Field>
        <Field label="Art">
          <Select value={art} onValueChange={(v) => setArt(v as UebergabeArt)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="uebergabe">Übergabe</SelectItem>
              <SelectItem value="abnahme">Abnahme</SelectItem>
              <SelectItem value="beides">Übergabe & Abnahme</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Vertreter Auftraggeber (optional)">
        <Input
          value={vertreterAuftraggeber}
          onChange={(e) => setVertreterAuftraggeber(e.target.value)}
          placeholder="z. B. Frau Müller"
        />
      </Field>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs font-medium text-muted-foreground">
            Auftragsadresse vom Kunden/Objekt übernehmen
          </Label>
          <Switch
            checked={adresseVomKunden}
            onCheckedChange={(v) => {
              setAdresseVomKunden(v);
              if (!v && !auftragsAdresse) setAuftragsAdresse(autoAdresse);
            }}
          />
        </div>
        <Textarea
          rows={3}
          value={adresseVomKunden ? autoAdresse : auftragsAdresse}
          onChange={(e) => setAuftragsAdresse(e.target.value)}
          disabled={adresseVomKunden}
          placeholder="Straße, PLZ Ort"
        />
      </div>

      <Field label="Leistungsumfang">
        <Textarea
          value={leistungsumfang}
          onChange={(e) => setLeistungsumfang(e.target.value)}
          rows={3}
        />
      </Field>

      <Field label="Bemerkungen (optional)">
        <Textarea value={bemerkungen} onChange={(e) => setBemerkungen(e.target.value)} rows={2} />
      </Field>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Mängel</Label>
        <Select
          value={maengelVorhanden ? "ja" : "nein"}
          onValueChange={(v) => setMaengelVorhanden(v === "ja")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nein">Es liegen keine Mängel vor</SelectItem>
            <SelectItem value="ja">Es liegen folgende Mängel vor</SelectItem>
          </SelectContent>
        </Select>
        {maengelVorhanden ? (
          <Textarea
            rows={2}
            value={maengelText}
            onChange={(e) => setMaengelText(e.target.value)}
            placeholder="Mängel beschreiben"
          />
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Anrede (Augenschein)">
          <Select value={abnahmeAnrede} onValueChange={(v) => setAbnahmeAnrede(v as "frau" | "herr")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="frau">Frau</SelectItem>
              <SelectItem value="herr">Herr</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Name (Augenschein)">
          <Input value={abnahmeName} onChange={(e) => setAbnahmeName(e.target.value)} />
        </Field>
      </div>

      <div className="sticky bottom-0 -mx-4 -mb-6 mt-2 flex flex-col-reverse items-stretch gap-2 border-t border-border bg-background px-4 py-3 sm:-mx-8 sm:px-8 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="outline" onClick={onClose}>
          Abbrechen
        </Button>
        <PrimaryAction
          icon={Check}
          label={create.isPending ? "Speichere…" : "Protokoll anlegen"}
          onClick={submit}
          disabled={create.isPending}
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
