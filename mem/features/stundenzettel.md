---
name: Stundenzettel-Modul
description: Mitarbeiter, Arbeitszeiten, NRW-Feiertage, Monats-Stundenzettel, PDF und Ablage in der Dokumentenverwaltung
type: feature
---
Natives CRM-Modul (kein Iframe, keine separate App, kein 040506-Passwort, kein Port 8080).

- Backend: `backend/src/stundenzettel/*` (Repo, Berechnung mit Floor-Regel, deterministischer Fr→So-Zielausgleich, NRW-Feiertage + eigene Feiertage), Routen in `backend/src/routes/stundenzettel.ts`, PDF-Renderer `backend/src/pdf/stundenzettelPdf.ts` (A4, Tage 1–15 Seite 1, Rest + Summe + Unterschriften Seite 2).
- Ablage: jedes generierte/geänderte Stundenzettel-PDF wird automatisch als Dokument gespeichert — Ordner `Stundenzettel/{YYYY}/{MM}` in der bestehenden Dokumentenverwaltung (`backend/src/stundenzettel/archiv.ts`). Ältere Version desselben Monats wird per Soft-Delete ersetzt. KEIN eigener Google-Drive-Weg; falls Drive verbunden ist, greift die normale Dokument-Pipeline.
- Frontend: `/stundenzettel` mit Monatswechsler, Mitarbeiterverwaltung, Tabelle, PDF ansehen/drucken/herunterladen/ablegen sowie Bulk „Alle in Dokumente ablegen" und „Alle als PDF".
