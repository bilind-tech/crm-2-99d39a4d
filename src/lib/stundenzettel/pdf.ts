// Lädt das Stundenzettel-PDF vom Pi-Backend (Phase 4).
// Es gibt keinen Browser-Fallback: der Renderer lebt bewusst nur im Backend,
// damit Druck, Download und späterer Drive-Upload identische Dateien nutzen.

import { getBackendUrl } from "@/lib/api/backendUrl";

export interface StundenzettelPdf {
  blob: Blob;
  dateiname: string;
}

function parseDateiname(headers: Headers, fallback: string): string {
  const cd = headers.get("content-disposition") ?? "";
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* noop */
    }
  }
  const plain = /filename="?([^"]+)"?/i.exec(cd);
  return plain ? plain[1] : fallback;
}

export async function fetchStundenzettelPdf(zettelId: string): Promise<StundenzettelPdf> {
  const base = getBackendUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/stundenzettel/${encodeURIComponent(zettelId)}/pdf`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) msg = body.message;
    } catch {
      /* keep status */
    }
    throw new Error(`Stundenzettel-PDF konnte nicht geladen werden: ${msg}`);
  }
  const blob = await res.blob();
  if (!blob || blob.size === 0) throw new Error("Stundenzettel-PDF ist leer.");
  return { blob, dateiname: parseDateiname(res.headers, `Stundenzettel-${zettelId}.pdf`) };
}
