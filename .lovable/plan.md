## Problem (bestätigt)

`package.json` fordert `@lovable.dev/vite-tanstack-config@2.8.3`, die `package-lock.json` enthält aber noch `2.8.2` (in Zeile 72 und 942 geprüft). `npm ci` bricht deshalb hart ab — und der Retry im Update-Script macht nur den Cache leer, was nichts hilft, weil die Ursache die Lockfile-Diskrepanz ist.

Das passiert bei jedem Plattform-Update der Lovable-Vite-Config erneut. Deshalb braucht es zwei Fixes: den akuten und den dauerhaften.

## Fix 1 — Lockfile synchronisieren (akut)

`npm install --package-lock-only` im Projekt-Root ausführen, sodass die Lockfile auf 2.8.3 zeigt, und mit einem `npm ci --dry-run` verifizieren, dass es sauber durchläuft.

## Fix 2 — Update-Script selbstheilend machen (dauerhaft)

In `backend/deploy/update.sh` wird die Funktion `npm_ci_safe` erweitert:

```text
1. npm ci            → normal
2. bei Fehler:       Cache leeren, npm ci erneut
3. bei erneutem      npm install --no-audit --no-fund
   Fehler (EUSAGE):  (löst Lock-Drift automatisch auf)
```

`npm install` respektiert die Version-Ranges aus `package.json` und erzeugt die Lockfile lokal auf dem Pi neu — der Build läuft damit durch, egal ob die Lockfile im Repo einmal hinterherhinkt. Es wird nichts am Daten-Verzeichnis verändert; der Build passiert weiterhin in `/var/tmp/mcc-build-*`.

Zusätzlich wird derselbe Fallback für den Backend-Install-Schritt genutzt (nutzt bereits dieselbe Funktion, gilt also automatisch mit).

## Danach auf dem Pi

Da `update.sh` sich per Self-Update selbst aus dem Repo aktualisiert, reicht ein einfaches:

```text
mcc-update
```

Beim ersten Lauf zieht es die neue `update.sh`, startet sich neu und baut mit der reparierten Lockfile durch.

## Technische Details

- Betroffene Dateien: `package-lock.json` (regeneriert), `backend/deploy/update.sh` (Fallback-Logik in `npm_ci_safe`).
- Keine Änderung an Backend-Code, Daten oder Migrationen.
- Verifikation vor Abschluss: `npm ci --dry-run` im Root muss ohne EUSAGE durchlaufen.
