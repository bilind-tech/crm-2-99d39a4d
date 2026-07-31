---
name: Stundenzettel-Modul
description: Mitarbeiter, Arbeitszeiten, NRW-Feiertage, Monats-Stundenzettel, PDF und Ablage in der Dokumentenverwaltung
type: feature
---
Natives CRM-Modul (kein Iframe, keine separate App, kein 040506-Passwort, kein Port 8080).

- Backend: `backend/src/stundenzettel/*` (Repo, Berechnung mit Floor-Regel, deterministischer Fr→So-Zielausgleich, NRW-Feiertage + eigene Feiertage), Routen in `backend/src/routes/stundenzettel.ts`, PDF-Renderer `backend/src/pdf/stundenzettelPdf.ts` (A4, Tage 1–15 Seite 1, Rest + Summe + Unterschriften Seite 2).
- Ablage: jedes generierte/geänderte Stundenzettel-PDF wird automatisch als Dokument gespeichert — Ordner `Stundenzettel/{YYYY}/{MM}` in der bestehenden Dokumentenverwaltung (`backend/src/stundenzettel/archiv.ts`). Ältere Version desselben Monats wird per Soft-Delete ersetzt. KEIN eigener Google-Drive-Weg; falls Drive verbunden ist, greift die normale Dokument-Pipeline.
- Frontend: `/stundenzettel` mit Monatswechsler, Mitarbeiterverwaltung, Tabelle, PDF ansehen/drucken/herunterladen/ablegen sowie Bulk „Alle in Dokumente ablegen" und „Alle als PDF".
- Zielstunden: pro Mitarbeiter optional `zielStundenProMonat`. Beim Generieren verteilt `zielausgleich.ts` die Differenz als ±1 volle Stunde auf pseudo-zufällig gemischte normale Arbeitstage (Seed = `{mitarbeiterId}-{jahr}-{monat}` → reproduzierbar), bis die Monatssumme exakt dem Ziel entspricht. Feiertage/Krank/Urlaub/Wochenenden bleiben unangetastet, Blockgrenzen 1–12h. Gegenprüfung `pruefeZiel()`; bei Abweichung rote Warnung im Workspace + in der Mitarbeiterliste. Frontend-Spiegel: `src/lib/stundenzettel/ziel.ts` (auch für Preview-Mock).
