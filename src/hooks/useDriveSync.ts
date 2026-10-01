import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { errorToMessage } from "@/lib/api/piClient";

export type OrdnerDriveStatusMap = Record<
  string,
  { status: "synced" | "pending" | "error" | "none"; error?: string; syncedAt?: string }
>;

export type BulkDriveItemStatus = "missing" | "pending" | "running" | "synced" | "error" | "not-found";
export interface BulkDriveStatusResponse {
  verbunden: boolean;
  items: { belegId: string; status: BulkDriveItemStatus; currentSha?: string; error?: string }[];
}

export function useBulkDriveStatus(
  belegArt: "angebot" | "rechnung",
  belegIds: string[],
) {
  return useQuery({
    queryKey: ["drive", "bulk-status", belegArt, belegIds] as const,
    queryFn: () => api.post<BulkDriveStatusResponse>("/drive/uploads/bulk-status", { belegArt, belegIds }),
    enabled: belegIds.length > 0,
    staleTime: 3_000,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      return items.some((item) => item.status === "pending" || item.status === "running") ? 4_000 : false;
    },
  });
}

export function useBulkDriveUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { belegArt: "angebot" | "rechnung"; belegIds: string[] }) =>
      api.post<{ ok: true; total: number; enqueued: number; alreadyQueued: number; alreadySynced: number; failed: number }>(
        "/drive/uploads/bulk-enqueue",
        input,
      ),
    onSuccess: (result, input) => {
      if (result.failed > 0) {
        toast.warning(`${result.failed} Beleg(e) konnten nicht vorbereitet werden`);
      } else if (result.enqueued > 0 || result.alreadyQueued > 0) {
        toast.success("Drive-Sicherung wurde gestartet");
      } else {
        toast.success("Alles ist bereits in Google Drive");
      }
      void qc.invalidateQueries({ queryKey: ["drive", "bulk-status", input.belegArt] });
      void qc.invalidateQueries({ queryKey: ["drive", "uploads"] });
    },
    onError: (error) => toast.error(errorToMessage(error, "Drive-Sicherung konnte nicht gestartet werden")),
  });
}

/** Retry-Upload für ein Dokument (oder Beleg) — enqueued neuen Versuch. */
export function useDriveRetry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { belegArt: "angebot" | "rechnung" | "dokument"; belegId: string }) =>
      api.post<{ ok: boolean }>("/drive/uploads/enqueue", v),
    onSuccess: () => {
      toast.success("Drive-Synchronisierung neu gestartet");
      qc.invalidateQueries({ queryKey: ["dokumente"] });
      qc.invalidateQueries({ queryKey: ["drive", "ordner-status"] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Konnte Drive-Sync nicht starten";
      toast.error(msg);
    },
  });
}

/** Drift-Check für Dokumente: gleicht alles gegen Drive ab und enqueued
 *  fehlende Operationen. Niemals destruktiv. */
export function useDriveDriftCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{
        ok: boolean;
        ordnerNeu: number; ordnerVerschoben: number;
        dokumenteNeu: number; dokumenteVerschoben: number;
        uebersprungen: number;
      }>("/drive/sync/dokumente-full", {}),
    onSuccess: (r) => {
      const total = r.ordnerNeu + r.ordnerVerschoben + r.dokumenteNeu + r.dokumenteVerschoben;
      toast.success(
        total === 0
          ? "Alles synchron — keine Drift gefunden"
          : `Drift-Check: ${total} Aktion(en) eingeplant`,
      );
      qc.invalidateQueries({ queryKey: ["dokumente"] });
      qc.invalidateQueries({ queryKey: ["drive", "ordner-status"] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Drift-Check fehlgeschlagen";
      toast.error(msg);
    },
  });
}

/** Drive-Status pro CRM-Ordner. Pollt nur, wenn das Browser-Tab sichtbar ist. */
export function useOrdnerDriveStatus(enabled = true) {
  const q = useQuery<OrdnerDriveStatusMap>({
    queryKey: ["drive", "ordner-status"],
    queryFn: () => api.get<OrdnerDriveStatusMap>("/drive/ordner/status"),
    enabled,
    refetchInterval: () => (document.visibilityState === "visible" ? 15000 : false),
    staleTime: 5000,
  });
  // Bei Tab-Sichtbarkeit sofort refetchen
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "visible") void q.refetch();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [q]);
  return q;
}