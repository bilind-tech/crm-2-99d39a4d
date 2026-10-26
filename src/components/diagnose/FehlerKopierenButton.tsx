import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { erstelleFehlerBericht, kopiereText } from "@/lib/diagnose/fehlerProtokoll";
import { getBackendUrl } from "@/lib/api/backendUrl";

interface Props {
  titel: string;
  details?: string[];
  label?: string;
}

export function FehlerKopierenButton({ titel, details = [], label = "Fehler kopieren" }: Props) {
  const [kopiert, setKopiert] = useState(false);
  const onClick = async () => {
    let piVersion = "unbekannt";
    try {
      const r = await fetch(`${getBackendUrl()}/version`, { credentials: "include", cache: "no-store" });
      piVersion = r.ok ? JSON.stringify(await r.json()) : `HTTP ${r.status}`;
    } catch {
      piVersion = "nicht erreichbar";
    }
    const text = erstelleFehlerBericht(titel, [...details, `Pi-Adresse: ${getBackendUrl() || "(gleiche Adresse)"}`, `Pi-Version: ${piVersion}`]);
    const ok = await kopiereText(text);
    if (ok) {
      setKopiert(true);
      toast.success("Fehlerbericht kopiert — einfach im Chat einfügen.");
      setTimeout(() => setKopiert(false), 2000);
    } else {
      toast.error("Kopieren nicht möglich.");
    }
  };
  return (
    <Button type="button" size="sm" variant="outline" onClick={() => void onClick()}>
      {kopiert ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
      {label}
    </Button>
  );
}
