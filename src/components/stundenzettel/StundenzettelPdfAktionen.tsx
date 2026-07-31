// PDF-Aktionsleiste je Monats-Stundenzettel: Ansehen, Drucken, Herunterladen.
// Das PDF kommt immer frisch vom Backend (Renderer in backend/src/pdf/stundenzettelPdf.ts).

import { useState, type ReactNode } from "react";
import { Download, ExternalLink, FolderInput, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/pdf/PrintButton";
import { fetchStundenzettelPdf } from "@/lib/stundenzettel/pdf";
import { useArchivieren } from "@/hooks/useStundenzettel";
import { toast } from "sonner";

interface Props {
  zettelId: string;
  /** Zusätzliche Buttons (z. B. „Bearbeiten“) in derselben Leiste. */
  extra?: ReactNode;
}

export function StundenzettelPdfAktionen({ zettelId, extra }: Props) {
  const [busy, setBusy] = useState<"ansehen" | "download" | null>(null);
  const archivieren = useArchivieren();

  const handleArchiv = async () => {
    try {
      const r = await archivieren.mutateAsync(zettelId);
      toast.success(
        r.ersetzt
          ? "In Dokumente aktualisiert (Ordner Stundenzettel)"
          : "In Dokumente gespeichert (Ordner Stundenzettel)",
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const run = async (mode: "ansehen" | "download") => {
    if (busy) return;
    setBusy(mode);
    try {
      const { blob, dateiname } = await fetchStundenzettelPdf(zettelId);
      const url = URL.createObjectURL(blob);
      if (mode === "ansehen") {
        window.open(url, "_blank", "noopener");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = dateiname;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => run("ansehen")} disabled={busy !== null}>
        {busy === "ansehen" ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <ExternalLink className="mr-1.5 h-4 w-4" />
        )}
        PDF ansehen
      </Button>
      <PrintButton getBlob={async () => (await fetchStundenzettelPdf(zettelId)).blob} />
      <Button size="sm" variant="outline" onClick={() => run("download")} disabled={busy !== null}>
        {busy === "download" ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-1.5 h-4 w-4" />
        )}
        Herunterladen
      </Button>
      <Button size="sm" variant="outline" onClick={handleArchiv} disabled={archivieren.isPending}>
        {archivieren.isPending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <FolderInput className="mr-1.5 h-4 w-4" />
        )}
        In Dokumente ablegen
      </Button>
      {extra}
    </div>
  );
}
