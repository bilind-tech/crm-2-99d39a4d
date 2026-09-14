// Gemeinsamer Helfer: Beleg nach ERFOLGREICHEM Mailversand auf „Versendet"
// setzen. Wird vom manuellen Versand-Endpoint und vom Plan-Scheduler benutzt,
// damit beide Wege exakt dasselbe Verhalten haben.
import { sendeAngebot } from "./angebote-repo.js";
import { sendeRechnung } from "./rechnungen-repo.js";
import { emitBelegVersendet } from "./events.js";

export function markBelegVersendet(
  belegArt: "angebot" | "rechnung" | null | undefined,
  belegId: string | null | undefined,
): void {
  if (!belegArt || !belegId) return;
  try {
    if (belegArt === "angebot") sendeAngebot(belegId);
    else if (belegArt === "rechnung") sendeRechnung(belegId);
    emitBelegVersendet(belegArt, belegId);
  } catch (e) {
    console.error("markBelegVersendet", e);
  }
}
