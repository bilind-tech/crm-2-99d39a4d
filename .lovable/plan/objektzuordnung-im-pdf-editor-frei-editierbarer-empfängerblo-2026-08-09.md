# Objektzuordnung im PDF-Editor + frei editierbarer Empfängerblock

## Ziel
1. Eine bereits erstellte Rechnung (und ein Angebot) kann im PDF-Editor nachträglich einem Objekt zugeordnet oder davon gelöst werden — inklusive korrekter Speicherung und sofortiger Wirkung im PDF.
2. Der Empfängerblock oben links (Kundenname, Objektname, Ansprechpartner, Adresse) wird vollständig selbst editierbar: jede Zeile frei überschreibbar, Zeilen ergänzbar, jederzeit auf Automatik zurücksetzbar.

## Teil 1 — Objekt zuordnen
- Im PDF-Editor (Tab „Stammdaten") kommt ein neuer Abschnitt **Objekt** mit Auswahlliste aller Objekte des Kunden plus Eintrag „— ohne Objekt —".
- Auswahl setzt `objektId` im Entwurf; Autosave speichert wie gewohnt, das Backend akzeptiert das Feld bereits (`PATCH /rechnungen/:id`, `PATCH /angebote/:id`).
- Beim Wechsel wird die Live-Vorschau neu gebaut, damit Objektname und PDF-Cache sofort stimmen.
- Der bestehende Schalter „Objektname im Empfängerblock anzeigen" erscheint, sobald ein Objekt zugeordnet ist.

## Teil 2 — Empfängerblock voll administrierbar
- Neue Einstellung pro Beleg: **Empfängerblock manuell schreiben**.
  - Aus (Standard): automatischer Aufbau wie heute, gesteuert über die vorhandenen Schalter (Ansprechpartner an/aus, Objektname an/aus).
  - An: ein mehrzeiliges Textfeld, vorbefüllt mit dem aktuell automatisch erzeugten Block. Jede Zeile erscheint 1:1 im PDF — Zeilen löschen, umbenennen, ergänzen oder komplett eigene Texte sind möglich.
- Button „Auf Automatik zurücksetzen" stellt den berechneten Block wieder her.
- Die Anrede bleibt separat (bestehendes Feld „Anrede"), damit ein eigener Empfängerblock die Anrede nicht überschreibt.

## Technische Umsetzung
- `src/lib/api/types.ts`: `BelegOptionen` erhält `empfaengerZeilen?: string[]` (gesetzt = manueller Block) — abwärtskompatibel, wird im vorhandenen `optionen`-JSON mitgespeichert.
- `src/lib/pdf/belegPdf.ts` und `backend/src/pdf/layout.ts`: `kundeAdresse(...)` wird nur noch aufgerufen, wenn keine manuellen Zeilen vorliegen; sonst werden die gespeicherten Zeilen gerendert (leere Zeilen bleiben als Abstand erhalten). Beide Renderer identisch, damit Vorschau und Backend-PDF gleich aussehen.
- Der PDF-Cache-Schlüssel enthält bereits die Optionen-/Objektdaten, dadurch invalidiert die Änderung korrekt.
- `src/components/pdf-editor/panels/StammdatenPanel.tsx`: neuer Objekt-Select (`useObjekte(kunde.id)`), neuer Empfängerblock-Editor mit Umschalter, Textarea und Reset.
- Keine Datenbank-Migration nötig; `objektId` und `optionen` existieren bereits in beiden Belegtabellen.

## Prüfung
- Rechnung im Editor einem Objekt zuweisen, neu laden, Zuordnung bleibt; Objektname erscheint im PDF.
- Manuellen Empfängerblock setzen, Vorschau und heruntergeladenes Backend-PDF vergleichen.
