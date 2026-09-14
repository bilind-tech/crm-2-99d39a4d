// Oranges Abzeichen „E-Mail geplant" für Rechnungs- und Angebotslisten.
// Verschwindet automatisch, sobald die Mail raus ist oder abgebrochen wurde.

import { Clock } from "lucide-react";
import { useGeplanteMails } from "@/hooks/useApi";
import { geplantKurz, offeneFuerBeleg, parseGeplantFuer } from "@/lib/email/geplant";

interface Props {
  belegArt: "angebot" | "rechnung";
  belegId: string;
  /** Kompakte Variante ohne Zeitangabe (enge Tabellenzellen). */
  kompakt?: boolean;
}

export function GeplantBadge({ belegArt, belegId, kompakt }: Props) {
  const { data: geplant = [] } = useGeplanteMails();
  const treffer = offeneFuerBeleg(geplant, belegArt, belegId);
  if (!treffer) return null;

  const zeit = geplantKurz(parseGeplantFuer(treffer.geplantFuer));
  return (
    <span
      title={`E-Mail geht ${zeit} Uhr automatisch raus`}
      className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"
    >
      <Clock className="h-3 w-3" />
      {kompakt ? "Geplant" : `E-Mail geplant · ${zeit}`}
    </span>
  );
}
