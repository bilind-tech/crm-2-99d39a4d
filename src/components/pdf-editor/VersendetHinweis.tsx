// Hinweisstreifen im PDF-Editor, wenn der Beleg bereits versendet wurde.
import { Info } from "lucide-react";
import { useGeplanteMails } from "@/hooks/useApi";
import { offeneFuerBeleg, geplantKurz, parseGeplantFuer } from "@/lib/email/geplant";
import { formatDate } from "@/lib/format";

interface Props {
  belegArt: "angebot" | "rechnung";
  belegId: string;
  versendetAm?: string;
}

export function VersendetHinweis({ belegArt, belegId, versendetAm }: Props) {
  const { data: geplant = [] } = useGeplanteMails();
  const offen = offeneFuerBeleg(geplant, belegArt, belegId);
  if (!versendetAm) return null;

  const bezeichnung = belegArt === "angebot" ? "Dieses Angebot" : "Diese Rechnung";
  return (
    <div className="flex items-start gap-2 border-b border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground sm:px-5">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
      <p className="leading-relaxed">
        {bezeichnung} wurde am {formatDate(versendetAm)} versendet. Änderungen wirken sich nicht
        rückwirkend auf das bereits verschickte Dokument aus — zum Nachreichen einfach erneut
        versenden.
        {offen && (
          <>
            {" "}
            Die geplante E-Mail ({geplantKurz(parseGeplantFuer(offen.geplantFuer))}) verschickt
            automatisch die geänderte Fassung.
          </>
        )}
      </p>
    </div>
  );
}
