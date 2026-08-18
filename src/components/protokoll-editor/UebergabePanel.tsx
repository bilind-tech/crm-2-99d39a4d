// Editor-Panel für Übergabe-/Abnahmeprotokoll.
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { KundenObjektPicker } from "@/components/werkzeuge/KundenObjektPicker";
import { auftragsAdresseAusStamm } from "@/lib/pdf/werkzeugePdf";
import type { Kunde, Objekt, UebergabeProtokoll, UebergabeArt } from "@/lib/api/types";

interface Props {
  draft: UebergabeProtokoll;
  kunde?: Kunde;
  objekt?: Objekt;
  set: <K extends keyof UebergabeProtokoll>(key: K, value: UebergabeProtokoll[K]) => void;
  onKundeChange: (k: Kunde | undefined) => void;
  onObjektChange: (o: Objekt | undefined) => void;
}

export function UebergabePanel({
  draft,
  kunde,
  objekt,
  set,
  onKundeChange,
  onObjektChange,
}: Props) {
  const vomKunden = draft.adresseVomKunden !== false;
  const autoAdresse = auftragsAdresseAusStamm(kunde, objekt);
  return (
    <div className="space-y-5">
      <KundenObjektPicker
        kundeId={kunde?.id}
        objektId={objekt?.id}
        onKundeChange={(k) => {
          onKundeChange(k);
          set("kundeId", k?.id);
          set("objektId", undefined);
        }}
        onObjektChange={(o) => {
          onObjektChange(o);
          set("objektId", o?.id);
        }}
      />
      <div className="space-y-2">
        <Label>Art</Label>
        <RadioGroup
          value={draft.art}
          onValueChange={(v) => set("art", v as UebergabeArt)}
          className="flex flex-wrap gap-4"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="uebergabe" /> Übergabe
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="abnahme" /> Abnahme
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="beides" /> Übergabe &amp; Abnahme
          </label>
        </RadioGroup>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Datum</Label>
          <Input type="date" value={draft.datum} onChange={(e) => set("datum", e.target.value)} />
        </div>
      </div>
      <div className="space-y-2 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">Auftragsadresse vom Kunden/Objekt übernehmen</Label>
          <Switch
            checked={vomKunden}
            onCheckedChange={(v) => {
              set("adresseVomKunden", v);
              if (!v && !draft.auftragsAdresse) set("auftragsAdresse", autoAdresse);
            }}
          />
        </div>
        <Textarea
          rows={4}
          value={vomKunden ? autoAdresse : (draft.auftragsAdresse ?? "")}
          onChange={(e) => set("auftragsAdresse", e.target.value)}
          disabled={vomKunden}
          placeholder="Straße, PLZ Ort"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Vertreter Auftraggeber</Label>
          <Input
            value={draft.vertreterAuftraggeber}
            onChange={(e) => set("vertreterAuftraggeber", e.target.value)}
            placeholder="Name in Druckbuchstaben"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Vertreter Auftragnehmer</Label>
          <Input
            value={draft.vertreterAuftragnehmer}
            onChange={(e) => set("vertreterAuftragnehmer", e.target.value)}
            placeholder="Name in Druckbuchstaben"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Leistungsumfang</Label>
        <Textarea
          rows={3}
          value={draft.leistungsumfang}
          onChange={(e) => set("leistungsumfang", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Bemerkungen</Label>
        <Textarea
          rows={3}
          value={draft.bemerkungen}
          onChange={(e) => set("bemerkungen", e.target.value)}
          placeholder="Optionaler Text über den Ankreuzfeldern"
        />
      </div>
      <div className="space-y-2">
        <Label>Mängel</Label>
        <p className="text-sm text-muted-foreground">
          Die beiden Kästchen im PDF bleiben leer und werden handschriftlich angekreuzt; darunter
          steht eine Schreiblinie für die Mängel.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Leistung des Dienstleisters</Label>
        <Input
          value={draft.abnahmeName ?? ""}
          onChange={(e) => set("abnahmeName", e.target.value)}
          placeholder="Name (Frau/Herr wird handschriftlich angekreuzt)"
        />
        <Textarea
          rows={2}
          value={draft.optionen?.dienstleisterSatz ?? ""}
          onChange={(e) =>
            set("optionen", {
              ...(draft.optionen ?? {}),
              dienstleisterSatz: e.target.value || undefined,
            })
          }
          placeholder="im Augenschein genommen."
        />
        <Textarea
          rows={2}
          value={draft.optionen?.abnahmeSatz ?? ""}
          onChange={(e) =>
            set("optionen", {
              ...(draft.optionen ?? {}),
              abnahmeSatz: e.target.value || undefined,
            })
          }
          placeholder="Die Leistung wird mit den oben genannten Vorbehalten abgenommen."
        />
      </div>
    </div>
  );
}
