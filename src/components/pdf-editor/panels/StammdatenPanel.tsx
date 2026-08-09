import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnsprechpartnerPicker } from "@/components/forms/AnsprechpartnerPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVertraege, useObjekt, useKunde, useObjekte } from "@/hooks/useApi";
import type {
  Angebot,
  Rechnung,
  Kunde,
  BelegOptionen,
  Ansprechpartner,
  Objekt,
} from "@/lib/api/types";

interface Props {
  kind: "angebot" | "rechnung";
  draft: Angebot | Rechnung;
  kunde: Kunde;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: (key: any, value: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setOption: (key: keyof BelegOptionen, value: any) => void;
}

export function StammdatenPanel({ kind, draft, kunde, set, setOption }: Props) {
  const { data: vertraege = [] } = useVertraege(kind === "rechnung" ? kunde.id : "");
  const { data: objekt } = useObjekt(draft.objektId ?? "");
  const { data: kundeVoll } = useKunde(kunde.id);
  const { data: objekte = [] } = useObjekte(kunde.id);
  const o = draft.optionen;
  const zeigeAp = o?.ansprechpartnerImEmpfaenger ?? true;
  const zeigeObjekt = o?.objektnameImEmpfaenger ?? true;
  const ansprechpartner = kundeVoll?.ansprechpartner?.find(
    (a) => a.id === draft.ansprechpartnerId,
  );
  const autoAnrede = automatischeAnrede(kunde, ansprechpartner, zeigeAp);
  const aktivesObjekt: Objekt | null =
    (objekte as Objekt[]).find((x) => x.id === draft.objektId) ?? objekt ?? null;
  const autoZeilen = empfaengerZeilenAuto(
    kundeVoll ?? kunde,
    ansprechpartner,
    aktivesObjekt,
    zeigeObjekt,
    zeigeAp,
  );
  const manuell = Array.isArray(o?.empfaengerZeilen);
  return (
    <div className="space-y-5">
      <Section label="Objekt" feldId="objekt">
        <Select
          value={draft.objektId ?? "__none__"}
          onValueChange={(v) => set("objektId", v === "__none__" ? undefined : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="— ohne Objekt —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— ohne Objekt —</SelectItem>
            {(objekte as Objekt[]).map((x) => (
              <SelectItem key={x.id} value={x.id}>
                {x.name || "Objekt"}
                {x.ort ? ` · ${x.ort}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          Ordnet diesen Beleg einem Objekt zu. Die Objektadresse wird dann im Empfängerblock
          verwendet.
        </p>
      </Section>

      <Section label="Empfänger" feldId="kunde">
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
          {(manuell ? (o?.empfaengerZeilen ?? []) : autoZeilen).map((zeile, i) => (
            <p key={i} className={i === 0 ? "font-medium" : "mt-0.5 text-xs text-muted-foreground"}>
              {zeile || "\u00a0"}
            </p>
          ))}
          <p className="mt-1 text-[11px] text-muted-foreground">
            {manuell
              ? "Manueller Empfängerblock aktiv — genau diese Zeilen erscheinen im PDF."
              : "Automatisch aus Kunde, Ansprechpartner und Objekt."}
          </p>
        </div>

        <div className="mt-3 space-y-3 rounded-lg border border-border p-3">
          {!manuell && (
            <>
              <SwitchRow
                checked={zeigeAp}
                onChange={(v) => setOption("ansprechpartnerImEmpfaenger", v)}
                label="Ansprechpartner im Empfängerblock anzeigen"
                hint="Aus = die Namenszeile des Ansprechpartners entfällt oben links; Kundenname und Adresse bleiben."
              />
              {aktivesObjekt?.name && (
                <SwitchRow
                  checked={zeigeObjekt}
                  onChange={(v) => setOption("objektnameImEmpfaenger", v)}
                  label="Objektname im Empfängerblock anzeigen"
                  hint={`Zeigt „${aktivesObjekt.name}" oben links zwischen Kundenname und Adresse.`}
                />
              )}
            </>
          )}
          <SwitchRow
            checked={manuell}
            onChange={(v) => setOption("empfaengerZeilen", v ? autoZeilen : undefined)}
            label="Empfängerblock manuell schreiben"
            hint="An = jede Zeile frei bearbeitbar (Objektname, Ansprechpartner, Adresse, eigene Zeilen)."
          />
          {manuell && (
            <div className="space-y-2">
              <Textarea
                rows={7}
                value={(o?.empfaengerZeilen ?? []).join("\n")}
                onChange={(e) => setOption("empfaengerZeilen", e.target.value.split("\n"))}
                placeholder={autoZeilen.join("\n")}
                className="font-mono text-xs"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">
                  Eine Zeile pro PDF-Zeile. Leere Zeilen bleiben als Abstand erhalten.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setOption("empfaengerZeilen", autoZeilen)}
                >
                  Auf Automatik zurücksetzen
                </Button>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section label="Ansprechpartner" feldId="ansprechpartner">
        <AnsprechpartnerPicker
          kundeId={kunde.id}
          value={draft.ansprechpartnerId}
          onChange={(id) => set("ansprechpartnerId", id)}
        />
      </Section>

      <Section label="Anrede" feldId="anrede">
        <Input
          value={o?.eigeneAnrede ?? ""}
          onChange={(e) => setOption("eigeneAnrede", e.target.value)}
          placeholder={autoAnrede}
        />
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            Leer lassen = automatisch: <span className="font-medium">{autoAnrede}</span>. Eigener
            Text ersetzt die Anrede im PDF — ganz ohne zusätzlichen Ansprechpartner.
          </p>
          {!!o?.eigeneAnrede && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => setOption("eigeneAnrede", "")}
            >
              Zurücksetzen
            </Button>
          )}
        </div>
      </Section>

      {kind === "rechnung" && vertraege.length > 0 && (
        <Section label="Vertragsbezug" feldId="vertrag">
          <Select
            value={(draft as Rechnung).vertragId ?? "__none__"}
            onValueChange={(v) => set("vertragId", v === "__none__" ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— ohne Vertragsbezug —</SelectItem>
              {vertraege.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {(v.bezeichnung || "Vertrag")} · ab {v.startDatum}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>
      )}

      <Section label="Titel" feldId="titel">
        <Input
          value={draft.titel}
          onChange={(e) => set("titel", e.target.value)}
          placeholder="z. B. Unterhaltsreinigung Hauptsitz"
        />
      </Section>

      <Section label="Meta-Daten" feldId="meta">
        <div className="grid gap-3 sm:grid-cols-2">
          {kind === "angebot" ? (
            <Field label="Gültig bis">
              <Input
                type="date"
                value={(draft as Angebot).gueltigBis ?? ""}
                onChange={(e) => set("gueltigBis", e.target.value || undefined)}
              />
            </Field>
          ) : (
            <>
              <Field label="Rechnungsdatum">
                <Input
                  type="date"
                  value={(draft as Rechnung).rechnungsdatum}
                  onChange={(e) => set("rechnungsdatum", e.target.value)}
                />
              </Field>
              <Field label="Fällig am">
                <Input
                  type="date"
                  value={(draft as Rechnung).faelligkeitsdatum}
                  onChange={(e) => set("faelligkeitsdatum", e.target.value)}
                />
              </Field>
            </>
          )}
        </div>
      </Section>

      <Section label="Steuersatz & Rabatt" feldId="steuersatz">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="MwSt %">
            <Input
              type="number"
              inputMode="decimal"
              value={draft.steuersatz}
              onChange={(e) => set("steuersatz", Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Gesamtrabatt %">
            <Input
              type="number"
              inputMode="decimal"
              value={draft.rabattGesamt}
              onChange={(e) => set("rabattGesamt", Number(e.target.value) || 0)}
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}

function Section({
  label,
  feldId,
  children,
}: {
  label: string;
  feldId: string;
  children: React.ReactNode;
}) {
  return (
    <div data-feld-id={feldId} className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
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

function SwitchRow({
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
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Label className="cursor-pointer text-sm font-medium" onClick={() => onChange(!checked)}>
          {label}
        </Label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5 shrink-0" />
    </div>
  );
}

/** Spiegelt die Anrede-Logik der PDF-Renderer für die Vorschau im Editor. */
function automatischeAnrede(k: Kunde, ap: Ansprechpartner | undefined, zeigeAp: boolean): string {
  if (ap && zeigeAp) {
    const name = ap.nachname?.trim() || "";
    if (ap.anrede === "herr") return `Sehr geehrter Herr ${name},`;
    if (ap.anrede === "frau") return `Sehr geehrte Frau ${name},`;
    if (ap.vorname || ap.nachname)
      return `Hallo ${[ap.vorname, ap.nachname].filter(Boolean).join(" ")},`;
  }
  if (k.anrede === "herr") return `Sehr geehrter Herr ${k.nachname ?? ""},`;
  if (k.anrede === "frau") return `Sehr geehrte Frau ${k.nachname ?? ""},`;
  return "Sehr geehrte Damen und Herren,";
}
