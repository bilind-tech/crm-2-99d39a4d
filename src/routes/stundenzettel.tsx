// Platzhalter — die vollständige Stundenzettel-Oberfläche folgt in Phase 2.
// Phase 1 hat das Backend-Modul + Datenbank bereits fertig; hier stellen wir
// nur sicher, dass die Route existiert, damit die Seitenleiste funktioniert.
import { createFileRoute } from "@tanstack/react-router";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/stundenzettel")({
  head: () => ({
    meta: [
      { title: "Stundenzettel — My Clean Center" },
      { name: "description", content: "Monatliche Stundenzettel für Mitarbeiter." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-content-center rounded-full bg-muted">
        <Clock className="h-6 w-6 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-semibold">Stundenzettel</h1>
      <p className="text-sm text-muted-foreground">
        Die native Stundenzettel-Oberfläche wird gerade gebaut. Das Backend
        (Mitarbeiter, Feiertage, Monats-Berechnung) ist bereits fertig — die
        Verwaltungs-UI folgt in Phase 2.
      </p>
    </div>
  );
}