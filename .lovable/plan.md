## Was passiert ist

Der Build ist **durchgelaufen** (Fallback hat gegriffen) — aber der Bildschirm war voller roter `npm error`-Blöcke. Ursache, bestätigt durch Prüfung:

- `package.json`: `@lovable.dev/vite-tanstack-config` = **2.8.4**
- `package-lock.json`: noch **2.8.3** (und dessen Unterpaket `vite-plugin-hmr-gate` 1.3.1 statt 1.3.3)

Die Lovable-Plattform hebt diese Pakete automatisch in der `package.json` an, ohne die Lockfile mitzuziehen. `npm ci` verweigert dann prinzipiell den Dienst.

## Lösung (zwei Ebenen)

### 1. Lockfile jetzt synchronisieren
`npm install --package-lock-only` im Projekt-Root ausführen, damit die Lockfile auf 2.8.4 / 1.3.3 steht. Danach `npm ci --dry-run` als Gegenprobe.

### 2. Update-Skript so umbauen, dass Drift nie mehr als Fehler aussieht

In `backend/deploy/update.sh` wird `npm_ci_safe` umgedreht:

```text
vorher:  npm ci  →  Fehlerwand  →  Cache leeren  →  Fehlerwand  →  npm install
nachher: stille Sync-Prüfung
         ├─ synchron    → npm ci (wie gewohnt)
         └─ Drift       → Hinweiszeile "Lockfile-Drift erkannt, nutze npm install"
                          → npm install (kein npm-error-Block)
```

Konkret:
- Vorab-Prüfung `npm ci --dry-run --ignore-scripts >/dev/null 2>&1` — schlägt sie fehl, wird direkt auf `npm install` gewechselt, mit einer einzigen ruhigen Info-Zeile statt der npm-Fehlerausgabe.
- Der bisherige Cache-Leeren-Retry bleibt erhalten, aber nur für den Fall echter Netz-/Cache-Fehler (dort ist eine Fehlermeldung ja sinnvoll).
- Gilt für Frontend- **und** Backend-Schritt, da beide `npm_ci_safe` nutzen.

### 3. Dauerhafte Absicherung
Notiz im Projektgedächtnis: Vor jeder Auslieferung prüfen, ob `package.json` und `package-lock.json` synchron sind, und die Lockfile bei Drift regenerieren — damit dieser Fall gar nicht erst auf dem Pi ankommt.

## Danach auf dem Pi

Ganz normal `mcc-update` — das Skript aktualisiert sich beim Lauf selbst und die Ausgabe bleibt sauber.

## Technische Details
- Betroffene Dateien: `package-lock.json` (regeneriert), `backend/deploy/update.sh` (Funktion `npm_ci_safe`), `mem/`-Eintrag.
- Keine Migration, keine Änderung am Datenverzeichnis, kein Eingriff in Backend-Logik.
