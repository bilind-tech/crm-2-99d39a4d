# E-Mails planen + Vorschau-Editor zum Selberschreiben

Zwei neue Funktionen, beide so gebaut, dass beim Update auf dem Pi nichts kaputtgeht.

## 1. E-Mail zeitgesteuert planen

Im Versand-Dialog (Rechnung oder Angebot per E-Mail schicken) kommt neben „Jetzt senden" ein zweiter Weg: **„Später senden"**.

- Schnellwahl-Buttons: Heute 18:00, Morgen 8:00, Morgen 12:00, Montag 8:00
- Zusätzlich freies Feld für beliebiges Datum + Uhrzeit
- Unter dem Feld steht immer im Klartext, was passiert: „Geht raus am Dienstag, 15.09.2026 um 08:00 Uhr."
- Vergangene Zeitpunkte werden abgelehnt, Planung maximal 1 Jahr im Voraus

Nach dem Planen:
- Die Mail liegt im System mit Status „geplant" und kann jederzeit **verschoben, sofort gesendet oder abgebrochen** werden.
- Der Beleg bleibt auf seinem bisherigen Status. Erst **nachdem** die Mail tatsächlich rausgegangen ist, wird die Rechnung bzw. das Angebot automatisch auf „Versendet" gesetzt — genau wie beim sofortigen Versand.
- Geht der Versand schief, bleibt der Beleg unverändert, die Mail landet sichtbar auf „Fehler" mit Klartext-Grund und Wiederholen-Knopf.

**Oranger Hinweis in den Listen:** In der Rechnungs- und Angebotsliste (Karten auf dem Handy und Tabelle am Rechner) sowie auf der Detailseite erscheint ein kleines oranges Abzeichen „E-Mail geplant" mit Datum und Uhrzeit. Verschwindet automatisch, sobald die Mail raus ist oder abgebrochen wurde.

**Zum Zeitpunkt selbst:** Das System prüft jede Minute, ob eine geplante Mail fällig ist, und verschickt genau diese eine Mail. War der Pi aus oder das Internet weg, wird die Mail nachgeholt, sobald das System wieder läuft — mit Hinweis „verspätet versendet" in der Historie.

**Wichtige Sicherheitsregel bleibt bestehen:** Automatisch verschickt wird ausschließlich, was du selbst mit Empfänger, Text und Zeitpunkt bestätigt geplant hast. Mahnautomatik, Statuswechsel, Daueraufträge oder sonstige Abläufe können weiterhin keine einzige Mail auslösen — das ist technisch gesperrt und wird mit Tests abgesichert.

**Übersicht:** In der E-Mail-Historie (Einstellungen) gibt es einen eigenen Bereich „Geplant" mit allen anstehenden Mails, Zeitpunkt, Empfänger und Knöpfen zum Verschieben, Sofort-Senden und Abbrechen.

## 2. Vorlagen in der Vorschau direkt schreiben

Der Editor für E-Mail-Vorlagen und Signaturen wird umgebaut: kein HTML mehr, du schreibst direkt in der Vorschau wie in einem Textprogramm.

- Werkzeugleiste: **Fett**, *Kursiv*, Unterstrichen, Aufzählung, nummerierte Liste, Überschrift, Link einfügen, Formatierung entfernen
- Platzhalter (Kundenname, Rechnungsnummer usw.) über ein Auswahlmenü einfügen, statt sie tippen zu müssen
- Beim Speichern wird im Hintergrund sauberes, E-Mail-taugliches HTML erzeugt — bestehende Vorlagen bleiben unverändert erhalten und lassen sich direkt weiterbearbeiten
- Eingefügter Text aus Word oder Webseiten wird automatisch von kaputtem Fremd-Code befreit

Die HTML-Ansicht wird ausgeblendet, so wie gewünscht.

## Technische Umsetzung

**Datenbank** — neue Migration `044_email_geplant.sql`, rein additiv:
- `email_versand` bekommt `geplant_fuer TEXT NULL`, `geplant_am TEXT NULL`, `geplant_von TEXT NULL`, `verspaetet INTEGER NOT NULL DEFAULT 0`
- Neuer Status `geplant` (Statusspalte hat keine CHECK-Einschränkung, daher keine Tabellen-Neuanlage nötig)
- Index auf `(status, geplant_fuer)` für den Fälligkeits-Check
- Keine Änderung an bestehenden Zeilen, keine Löschungen — Update-sicher und wiederholbar ausführbar

**Backend:**
- `versand-repo.ts`: `EnqueueInput.quelle` wird um `"geplant"` erweitert (weiterhin nur diese zwei erlaubten Quellen, jede andere wirft). Neue Funktionen `planeVersand`, `claimFaellig(now)`, `verschiebePlanung`, `planungAbbrechen`.
- Neuer `backend/src/email/plan-scheduler.ts` nach dem Muster von `fristen-cron.ts`: `setInterval` 60 s, `unref()`, holt fällige Zeilen atomar (`status='geplant' AND geplant_fuer <= now` → `sending` in einer Transaktion, damit nichts doppelt verschickt wird), ruft dasselbe `sendNow()` wie der manuelle Versand, danach `markBelegVersendet`. Start in `server.ts` neben `startFristenScheduler()`.
- Routen: `POST /email/versand/plan`, `PATCH /email/versand/:id/plan`, `POST /email/versand/:id/jetzt-senden`, `DELETE /email/versand/:id/plan`. Bestehende SMTP-Vorprüfung, Idempotenzschlüssel, Rate-Limit und Audit-Log gelten unverändert; jeder geplante Versand wird mit `quelle: "geplant"` und Planungszeitpunkt auditiert.
- `GET /email/versand` akzeptiert `status=geplant`.

**Frontend:**
- `EmailVersandDialog.tsx`: Segment „Jetzt senden / Später senden", Schnellwahl-Chips + `date-input` und Zeitfeld, Klartextzeile, Validierung.
- Neuer Hook `useGeplanteMails()` (eine Abfrage über alle geplanten Mails, nach `belegId` gruppiert, invalidiert über das bestehende Live-Event `email:versand-changed`).
- `GeplantBadge.tsx` (orange, `bg-orange-500/10 text-orange-600 border-orange-500/30`), eingebunden in `src/routes/rechnungen.tsx`, `angebote.tsx`, `rechnungen.$id.tsx`, `angebote.$id.tsx`.
- `EmailVersandHistorie.tsx`: Abschnitt „Geplant" mit Verschieben / Jetzt senden / Abbrechen.
- Neuer `src/components/email/RichtextEditor.tsx` auf Basis von `contentEditable` + `document.execCommand`-Ersatz über die Selection-API (keine neue Abhängigkeit, damit `package.json`/Lockfile unangetastet bleiben), plus `src/lib/email/htmlSanitize.ts` (Whitelist: `p, br, strong, em, u, ul, ol, li, a, h2, h3, span[style:color]`). Eingebunden in `EmailEinstellungen.tsx` für Vorlagen und Signaturen.

**Prüfung vor der Übergabe:**
- Neue Tests `backend/test/email-planung.spec.ts`: Planen + Fälligkeit + Beleg wird erst nach erfolgreichem Versand „Versendet", kein Doppelversand bei parallelen Ticks, Nachholen nach Ausfall, Abbrechen, und ein Regressionstest, dass `quelle` außerhalb von `manuell`/`geplant` weiterhin blockiert wird
- Sanitizer-Test für den Vorschau-Editor
- Vollständiger Backend-Testlauf, Typprüfung, Lint und ein Klick-Durchlauf im Browser (Planen, Abzeichen sichtbar, Abbrechen)
- Keine Änderung an `package.json`, Lockfiles oder `update.sh`; Migration additiv und idempotent
