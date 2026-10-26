// Einstellungen → Diagnose: prüft Pi, Datenbank, Speicher, PDF, Drive und
// erzeugt einen kopierbaren Komplettbericht. Rein lesend.
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { piApi, PiApiError } from "@/lib/api/piClient";
import { getBackendUrl } from "@/lib/api/backendUrl";
import {
  erklaereStatus,
  erstelleFehlerBericht,
  formatiereEintrag,
  kopiereText,
  leereFehlerProtokoll,
  leseFehlerProtokoll,
  type FehlerEintrag,
} from "@/lib/diagnose/fehlerProtokoll";

type PruefStatus = "ok" | "warnung" | "fehler";
interface Pruefung {
  id: string;
  name: string;
  status: PruefStatus;
  detail: string;
}

function Icon({ s }: { s: PruefStatus }) {
  if (s === "ok") return <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />;
  if (s === "warnung") return <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <XCircle className="h-4 w-4 shrink-0 text-destructive" />;
}

async function pruefeAlles(): Promise<Pruefung[]> {
  const liste: Pruefung[] = [];
  // 1) erreichbar + Version
  try {
    const h = await piApi.get<{ status: string; version: string; schemaVersion: number; db: { ok: boolean } }>("/health");
    liste.push({ id: "erreichbar", name: "Pi erreichbar", status: "ok", detail: `${getBackendUrl() || "gleiche Adresse"} · Version ${h.version}` });
    liste.push({
      id: "dbhealth",
      name: "Datenbank (Kurzcheck)",
      status: h.db?.ok ? "ok" : "fehler",
      detail: h.db?.ok ? `Schema ${h.schemaVersion}` : "Datenbank antwortet nicht — Festplatte/Pfad prüfen",
    });
  } catch (e) {
    const st = e instanceof PiApiError ? e.status : 0;
    liste.push({ id: "erreichbar", name: "Pi erreichbar", status: "fehler", detail: `HTTP ${st}: ${erklaereStatus(st)}` });
    return liste;
  }
  // 2) ausführliche Pi-Prüfung
  try {
    const d = await piApi.get<{ pruefungen: Pruefung[] }>("/diagnose");
    liste.push(...d.pruefungen);
  } catch (e) {
    const st = e instanceof PiApiError ? e.status : 0;
    liste.push({
      id: "diagnose",
      name: "Ausführliche Pi-Prüfung",
      status: st === 404 ? "warnung" : "fehler",
      detail:
        st === 404
          ? "Pi-Programm ist älter als die App (Diagnose fehlt). Bitte System-Update einspielen — das erklärt oft „Not found“."
          : `HTTP ${st}: ${erklaereStatus(st)}`,
    });
  }
  // 3) Einstellungen, die die PDF-Vorschau braucht
  for (const [pfad, name] of [
    ["/einstellungen/firmendaten", "Firmendaten lesbar"],
    ["/einstellungen/pdfVorlage", "PDF-Vorlage-Einstellung lesbar"],
  ] as const) {
    try {
      await piApi.get(pfad);
      liste.push({ id: pfad, name, status: "ok", detail: pfad });
    } catch (e) {
      const st = e instanceof PiApiError ? e.status : 0;
      liste.push({ id: pfad, name, status: "fehler", detail: `${pfad} → HTTP ${st}: ${erklaereStatus(st)}` });
    }
  }
  return liste;
}

export function DiagnoseTab() {
  const [laeuft, setLaeuft] = useState(false);
  const [ergebnis, setErgebnis] = useState<Pruefung[]>([]);
  const [protokoll, setProtokoll] = useState<FehlerEintrag[]>([]);

  const start = useCallback(async () => {
    setLaeuft(true);
    try {
      setErgebnis(await pruefeAlles());
    } finally {
      setProtokoll(leseFehlerProtokoll());
      setLaeuft(false);
    }
  }, []);

  useEffect(() => {
    void start();
  }, [start]);

  const kopieren = async () => {
    const text = erstelleFehlerBericht("Komplett-Diagnose", [
      `Pi-Adresse: ${getBackendUrl() || "(gleiche Adresse)"}`,
      "",
      "Prüfungen:",
      ...ergebnis.map((p) => `[${p.status.toUpperCase()}] ${p.name}: ${p.detail}`),
    ]);
    if (await kopiereText(text)) toast.success("Bericht kopiert — einfach im Chat einfügen.");
    else toast.error("Kopieren nicht möglich.");
  };

  const fehler = ergebnis.filter((p) => p.status !== "ok").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Diagnose</h2>
          <p className="text-sm text-muted-foreground">
            {laeuft ? "Prüfe …" : fehler ? `${fehler} Auffälligkeit(en) gefunden` : "Alles in Ordnung"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void start()} disabled={laeuft}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${laeuft ? "animate-spin" : ""}`} /> Erneut prüfen
          </Button>
          <Button size="sm" onClick={() => void kopieren()} disabled={laeuft}>
            <Copy className="mr-1.5 h-4 w-4" /> Komplettbericht kopieren
          </Button>
        </div>
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border">
        {ergebnis.map((p) => (
          <li key={p.id} className="flex items-start gap-3 p-3">
            <Icon s={p.status} />
            <div className="min-w-0">
              <div className="text-sm font-medium">{p.name}</div>
              <div className="break-words text-xs text-muted-foreground">{p.detail}</div>
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Letzte Fehler dieser Sitzung</h3>
          {protokoll.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                leereFehlerProtokoll();
                setProtokoll([]);
              }}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Leeren
            </Button>
          )}
        </div>
        {protokoll.length === 0 ? (
          <p className="text-xs text-muted-foreground">Keine fehlgeschlagenen Anfragen.</p>
        ) : (
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-xs">
            {protokoll.map(formatiereEintrag).join("\n")}
          </pre>
        )}
      </div>
    </div>
  );
}
