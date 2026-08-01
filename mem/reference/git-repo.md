---
name: Git Repository
description: Öffentliches GitHub-Repo für Pi-Updates (clone-URL, public)
type: reference
---
Repo: https://github.com/bilind-tech/crm-2-99d39a4d.git
Sichtbarkeit: PUBLIC (kein Token nötig für git clone)
Verwendung: Pi-Update via `git clone --depth 1` nach /tmp/mcc-build

## Lockfile-Sync (Pflicht vor jeder Auslieferung)
Die Plattform hebt `@lovable.dev/*`-Versionen in `package.json` an, ohne `package-lock.json`
mitzuziehen. Dann bricht `npm ci` beim `mcc-update` ab.
Vor jeder Änderung prüfen:
`npm ci --dry-run --ignore-scripts >/dev/null 2>&1 || npm install --package-lock-only`
(sowohl im Root als auch in `backend/`).
`backend/deploy/update.sh` erkennt Drift zusätzlich still und weicht auf `npm install` aus.
