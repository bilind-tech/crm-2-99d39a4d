## Problem

`mcc-update` bricht in Schritt 2/6 (Frontend bauen) mit `npm ci` ab, weil `package.json` und `package-lock.json` bei drei `@lovable.dev/*`-Paketen nicht mehr synchron sind:

- `@lovable.dev/vite-tanstack-config`: lock 2.7.0 vs package 2.7.7
- `@lovable.dev/vite-plugin-dev-server-bridge`: lock 1.0.3 vs package 1.2.1
- `@lovable.dev/vite-plugin-hmr-gate`: lock 1.1.2 vs package 1.1.4

Die `package.json` wurde aktualisiert (vermutlich beim letzten Sync), das Lockfile blieb auf den alten Versionen. `npm ci` verlangt exakte Übereinstimmung.

## Fix

`package-lock.json` im Projekt neu generieren, damit die drei Paket-Versionen wieder passen. Danach committen — auf dem Pi läuft `mcc-update` sauber durch, ohne dass dort etwas geändert werden muss.

Konkrete Schritte im Build-Modus:
1. Lokal `npm install --package-lock-only` ausführen, damit nur das Lockfile neu geschrieben wird (kein `node_modules`-Rebuild nötig).
2. Verifizieren, dass die drei Versionen im Lockfile jetzt 2.7.7 / 1.2.1 / 1.1.4 sind.
3. Änderung liegt nur in `package-lock.json`.

Danach auf dem Pi einfach nochmal:

```bash
mcc-update
```

Es ist keine manuelle Aktion auf dem Pi erforderlich — der nächste Pull holt das reparierte Lockfile.
