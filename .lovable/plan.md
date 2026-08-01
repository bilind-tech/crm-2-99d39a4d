## Ziel
`mcc-update` darf bei automatisch geänderten Lovable-Paketversionen keine sichtbaren `npm ci`-Synchronisationsfehler mehr erzeugen.

## Bestätigte Ursache
- Das öffentliche GitHub-Repository enthält aktuell bereits `2.8.4` und `1.3.3` im Root-Lockfile.
- Der gezeigte Pi-Lauf verwendet trotzdem einen Stand mit `2.8.3` und `1.3.1`.
- Die ausgegebenen Fallback-Texte weichen außerdem vom aktuell öffentlich ausgelieferten `backend/deploy/update.sh` ab. Damit läuft auf dem Pi nicht exakt die derzeitige Skriptfassung.
- Die jetzige Strategie startet bei einer unerkannten Drift trotzdem zunächst `npm ci`; dadurch entsteht die komplette rote EUSAGE-Ausgabe, bevor auf `npm install` ausgewichen wird.

## Umsetzung
1. **Installationsablauf grundsätzlich absichern**
   - Vor jeder Frontend- und Backend-Installation die jeweilige `package-lock.json` im temporären Build-Verzeichnis mit `npm install --package-lock-only` synchronisieren.
   - Erst nach erfolgreicher Synchronisierung die eigentliche saubere Installation ausführen.
   - Dadurch sieht `npm ci` niemals ein veraltetes Lockfile und kann keinen EUSAGE-Lockfilefehler mehr ausgeben.

2. **Fallback gezielt und ruhig halten**
   - Den bisherigen Ablauf „`npm ci` sichtbar scheitern lassen, Cache löschen, erneut versuchen“ entfernen.
   - Nur echte Netzwerk-/Paketfehler ausgeben; Lockfile-Drift wird vorab behoben und nicht als roter Fehlerblock angezeigt.
   - Daten unter `/var/lib/mycleancenter` bleiben vollständig unberührt; Änderungen erfolgen ausschließlich im temporären Build-Verzeichnis.

3. **Self-Update zuverlässig beibehalten**
   - Das geklonte Update-Skript weiterhin vor dem Build nach `/opt/mycleancenter/update.sh` übernehmen und einmal neu starten.
   - Eine eindeutige Skriptversions-Ausgabe ergänzen, damit künftig sofort erkennbar ist, welche Update-Logik der Pi tatsächlich verwendet.

4. **Fehlerfall reproduzierbar testen**
   - Eine absichtlich veraltete Kopie des Root-Lockfiles gegen die aktuelle `package.json` testen.
   - Verifizieren, dass die Vorab-Synchronisierung die Versionen korrigiert und danach die Installation ohne EUSAGE durchläuft.
   - Root- und Backend-Lockfile abschließend auf Synchronität prüfen.

5. **Dauerhafte Projektregel aktualisieren**
   - Festhalten, dass `mcc-update` Lockfiles vor der Installation selbst synchronisiert und niemals zuerst ein erwartbar unsynchrones `npm ci` ausführt.