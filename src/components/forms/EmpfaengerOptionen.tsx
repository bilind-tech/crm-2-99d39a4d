// Sichtbare Steuerung des Empfängerblocks (oben links im PDF) direkt bei der
// Kunden-/Objektauswahl: Objektname ein/aus, Ansprechpartner ein/aus, eigene Anrede.
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OptionenState } from "./OptionenBlock";

interface Props {
  value: OptionenState;
  onChange: (next: OptionenState) => void;
  objektName?: string;
  /** Vorschau der automatischen Anrede (Platzhalter im Eingabefeld). */
  anredeVorschau?: string;
}

export function EmpfaengerOptionen({ value, onChange, objektName, anredeVorschau }: Props) {
  const set = <K extends keyof OptionenState>(k: K, v: OptionenState[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card/50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Empfängerblock im PDF
      </p>

      <Row
        checked={value.ansprechpartnerImEmpfaenger}
        onChange={(v) => set("ansprechpartnerImEmpfaenger", v)}
        label="Ansprechpartner im Empfängerblock anzeigen"
        hint="Aus = die Namenszeile entfällt oben links; Kundenname und Adresse bleiben erhalten."
      />

      {objektName && (
        <Row
          checked={value.objektnameImEmpfaenger}
          onChange={(v) => set("objektnameImEmpfaenger", v)}
          label="Objektname im Empfängerblock anzeigen"
          hint={`Zeigt „${objektName}" oben links zwischen Kundenname und Adresse.`}
        />
      )}

      <div>
        <Label className="text-xs font-medium text-muted-foreground">Anrede (optional)</Label>
        <Input
          className="mt-1.5"
          value={value.eigeneAnrede}
          onChange={(e) => set("eigeneAnrede", e.target.value)}
          placeholder={anredeVorschau || "Sehr geehrte Damen und Herren,"}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Leer lassen = automatische Anrede. Eigener Text ersetzt die Anrede im PDF, ohne dass ein
          zusätzlicher Ansprechpartner angelegt werden muss.
        </p>
      </div>
    </div>
  );
}

function Row({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} className="mt-0.5" />
      <div className="min-w-0">
        <Label className="cursor-pointer text-sm font-medium" onClick={() => onChange(!checked)}>
          {label}
        </Label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}