## Diagnose

Das SPA-Build lief sauber durch. Der Fehler kam erst bei Schritt 3/6 (Backend `npm ci`):

```
npm error enoent Invalid response body while trying to fetch https://registry.npmjs.org/tinyexec:
ENOENT: no such file or directory, stat '/var/tmp/mcc-npm-cache/_cacache/content-v2/sha512/6b/dd/…'
```

Zwei getrennte Probleme, die zusammen das Update kippen:

1. **Dein lokales `/opt/mycleancenter/update.sh` ist eine alte Version.** Die neue Fassung im Repo nutzt bereits einen **frischen, isolierten npm-Cache pro Update-Lauf** (`$BUILD_DIR/.npm-cache`) und löscht ihn danach. Deine lokale Kopie zeigt aber noch auf den **gemeinsamen `/var/tmp/mcc-npm-cache`** — der ist jetzt beschädigt (fehlender Cache-Blob), und jeder weitere Lauf mit derselben Datei würde denselben Fehler werfen. `mcc-update` führt immer die **lokale Datei** aus — was du im Git-Repo änderst, wird erst wirksam, wenn du die Datei ebenfalls auf den Pi kopierst.
2. **Der Script hat keine Selbst-Update-Logik und keinen Retry bei kaputtem npm-Cache.** Wenn npm einmal einen ENOENT/EINTEGRITY im Cache wirft, bricht der Lauf ab, statt Cache zu leeren und einmal zu wiederholen.

Kein RAM-/Speicherproblem. Frontend war komplett fertig — es hakt rein an npm-Cache-Korruption im Backend-Step.

## Ziel

Nächstes `mcc-update` läuft ohne manuellen Eingriff durch, auch wenn der npm-Cache mal beschädigt ist, und zieht sich Änderungen am Update-Script künftig **selbst** aus dem Repo.

## Änderungen im Repo (`backend/deploy/update.sh`)

1. **Self-Update ganz am Anfang:** direkt nach dem `git clone` prüft der Script, ob die frisch geklonte `backend/deploy/update.sh` sich vom laufenden `/opt/mycleancenter/update.sh` unterscheidet. Wenn ja: neue Version installieren und den Update-Lauf sofort mit der neuen Datei neu starten (`exec`). Ab dem nächsten Update ist der Script also immer aktuell — auch ohne dass du je wieder `sed` ausführen musst.
2. **Robuster `npm ci`-Wrapper:** kleine Bash-Funktion `npm_ci_safe`, die
   - `npm ci` versucht,
   - bei Fehler den Cache mit `npm cache verify` prüft, notfalls das Cache-Verzeichnis komplett löscht,
   - und `npm ci` einmal wiederholt.
   Wird für Frontend- und Backend-Install verwendet.
3. **Cache-Verzeichnis pro Lauf bleibt** (`$BUILD_DIR/.npm-cache`, wird per Trap gelöscht) — plus zusätzlich `rm -rf /var/tmp/mcc-npm-cache` einmal beim Start als Aufräum-Sicherheit für Reste alter Versionen.
4. `RELEASE_NOTES.md`: kurzer Vermerk zu Self-Update + Cache-Retry.

## Einmalige Aufräum-Aktion auf dem Pi

Weil deine lokale `update.sh` noch die alte Version ist und der Cache kaputt ist, brauchst du **einmalig** diesen Befehl (danach nie wieder):

```bash
sudo rm -rf /var/tmp/mcc-npm-cache /var/tmp/mcc-build-* && \
  sudo curl -fsSL https://raw.githubusercontent.com/bilind-tech/crm-2-99d39a4d/main/backend/deploy/update.sh \
    -o /opt/mycleancenter/update.sh && \
  sudo chmod +x /opt/mycleancenter/update.sh && \
  mcc-update
```

Was er tut:
1. Löscht den beschädigten npm-Cache und alte Build-Reste.
2. Holt die neue `update.sh` (mit Self-Update + Retry) direkt aus deinem neuen Repo.
3. Startet `mcc-update`.

Ab da an: einfach `mcc-update` — die Datei hält sich selbst aktuell und heilt sich bei Cache-Fehlern selbst.

## Technische Details

- `exec "$0" "$@"` nach dem Self-Update, damit der laufende Prozess durch die neue Version ersetzt wird (Bash liest Scripts nicht neu ein, ohne `exec` würde die alte Logik weiterlaufen).
- Vergleich per `cmp -s` (byte-genau), damit nicht bei jedem Lauf unnötig neu gestartet wird.
- Fallback im `npm_ci_safe`: `rm -rf "$npm_config_cache"` + `mkdir -p` — pro Lauf sowieso frisch, daher unkritisch.
- Kein Eingriff in `/var/lib/mycleancenter` (Daten bleiben absolut unberührt — Kern-Regel).
