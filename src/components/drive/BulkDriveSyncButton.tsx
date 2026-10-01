import { useMemo } from "react";
import { Check, Cloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useBulkDriveStatus, useBulkDriveUpload } from "@/hooks/useDriveSync";

interface Props {
  belegArt: "angebot" | "rechnung";
  belegIds: string[];
}

export function BulkDriveSyncButton({ belegArt, belegIds }: Props) {
  const stableIds = useMemo(() => [...belegIds].sort(), [belegIds]);
  const status = useBulkDriveStatus(belegArt, stableIds);
  const upload = useBulkDriveUpload();
  const items = status.data?.items ?? [];
  const synced = items.filter((item) => item.status === "synced").length;
  const active = items.some((item) => item.status === "pending" || item.status === "running");
  const complete = stableIds.length > 0 && items.length === stableIds.length && synced === stableIds.length;
  const progress = stableIds.length > 0 ? Math.round((synced / stableIds.length) * 100) : 0;
  const busy = upload.isPending || active || status.isFetching;
  const verbunden = status.data?.verbunden === true;

  const label = complete
    ? "Alles ist in Google Drive"
    : active
      ? `${synced} von ${stableIds.length} in Drive`
      : `Alle sichtbaren in Drive (${stableIds.length})`;

  return (
    <div className="flex min-w-0 flex-col items-stretch gap-1.5 sm:items-end">
      <Button
        type="button"
        variant={complete ? "secondary" : "outline"}
        className={complete ? "border-success/30 bg-success/10 text-success" : ""}
        disabled={stableIds.length === 0 || !verbunden || complete || busy}
        title={!verbunden ? "Google Drive ist nicht verbunden" : label}
        onClick={() => upload.mutate({ belegArt, belegIds: stableIds })}
      >
        {complete ? (
          <Check className="animate-in zoom-in duration-300" />
        ) : busy ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Cloud />
        )}
        <span className="truncate">{label}</span>
      </Button>
      {(active || upload.isPending) && (
        <Progress value={progress} className="h-1 w-full sm:w-56" aria-label={`Drive-Fortschritt ${progress} Prozent`} />
      )}
    </div>
  );
}