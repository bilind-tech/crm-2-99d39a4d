// PDF-Aktionsleiste je Monats-Stundenzettel: Ansehen, Drucken, Herunterladen.
// Das PDF kommt immer frisch vom Backend (Renderer in backend/src/pdf/stundenzettelPdf.ts).

import { useState, type ReactNode } from "react";
import { CheckCircle2, Download, Eye, FolderInput, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PdfCanvasViewer } from "@/components/pdf/PdfCanvasViewer";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/pdf/PrintButton";
import { fetchStundenzettelPdf } from "@/lib/stundenzettel/pdf";
import { useArchivieren } from "@/hooks/useStundenzettel";
import { toast } from "sonner";

interface Props {
  zettelId: string;
  /** Zusätzliche Buttons (z. B. „Bearbeiten“) in derselben Leiste. */
  extra?: ReactNode;
  /** Speicherstand in Dokumente. */
  archivStatus?: "nicht" | "veraltet" | "gespeichert";
}

export function StundenzettelPdfAktionen({ zettelId, extra, archivStatus = "nicht" }: Props) {
  const [busy, setBusy] = useState<"ansehen" | "download" | null>(null);
  const archivieren = useArchivieren();
  const [vorschau, setVorschau] = useState<{ blob: Blob; dateiname: string } | null>(null);

  const handleArchiv = async () => {
    try {
      const r = await archivieren.mutateAsync(zettelId);
      toast.success(
        r.ersetzt
          ? "In Dokumente aktualisiert — wird mit Google Drive synchronisiert"
          : "In Dokumente gespeichert — wird mit Google Drive synchronisiert",
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
      if (mode === "ansehen") {
        // Auf derselben Seite anzeigen — kein neuer Tab, keine Weiterleitung.
        setVorschau({ blob, dateiname });
        return;
      }
      const url = URL.createObjectURL(blob);
      {
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
          <Eye className="mr-1.5 h-4 w-4" />
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
      <Button
        size="sm"
        variant="outline"
        onClick={handleArchiv}
        disabled={archivieren.isPending || archivStatus === "gespeichert"}
        title={
          archivStatus === "gespeichert"
            ? "Aktueller Stand liegt in Dokumente (und wird mit Drive synchronisiert)"
            : archivStatus === "veraltet"
              ? "Geändert seit dem letzten Speichern"
              : "Noch nicht in Dokumente gespeichert"
        }
        className={cn(
          archivStatus === "gespeichert" &&
            "border-success/40 bg-success/10 text-success disabled:opacity-100",
          archivStatus === "veraltet" && "border-warning bg-warning text-warning-foreground hover:bg-warning/85",
        )}
      >
        {archivieren.isPending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : archivStatus === "gespeichert" ? (
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
        ) : archivStatus === "veraltet" ? (
          <RefreshCw className="mr-1.5 h-4 w-4" />
        ) : (
          <FolderInput className="mr-1.5 h-4 w-4" />
        )}
        {archivStatus === "gespeichert"
          ? "Gespeichert"
          : archivStatus === "veraltet"
            ? "Aktualisieren & speichern"
            : "In Dokumente speichern"}
      </Button>
      {archivStatus === "nicht" && !archivieren.isPending && (
        <span className="text-xs text-muted-foreground">nicht gespeichert</span>
      )}
      {extra}
      <Dialog open={!!vorschau} onOpenChange={(o) => !o && setVorschau(null)}>
        <DialogContent className="flex h-[92vh] max-w-5xl flex-col gap-3 p-4">
          <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0 pr-8">
            <DialogTitle className="truncate text-base">{vorschau?.dateiname ?? "Stundenzettel"}</DialogTitle>
            <div className="flex items-center gap-2">
              <PrintButton getBlob={async () => vorschau!.blob} />
              <Button size="sm" variant="outline" onClick={() => run("download")} disabled={busy !== null}>
                <Download className="mr-1.5 h-4 w-4" /> Herunterladen
              </Button>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-muted/30">
            {vorschau && (
              <PdfCanvasViewer
                pdfBlob={vorschau.blob}
                pdfUrl={null}
                fileName={vorschau.dateiname}
                className="h-full w-full overflow-y-auto bg-muted/30"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
