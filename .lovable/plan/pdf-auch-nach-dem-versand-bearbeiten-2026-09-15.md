# PDF auch nach dem Versand bearbeiten

Heute ist der Knopf „PDF bearbeiten" nur im Entwurf aktiv. Sobald ein Angebot oder eine Rechnung versendet ist, ist er ausgegraut. Das wird geändert: Bearbeiten bleibt immer möglich, mit klarem Hinweis und – bei bezahlten oder stornierten Rechnungen – einer Rückfrage. Die geänderte Fassung landet automatisch wieder in Google Drive und ersetzt dort die alte Datei.

## Was sich für dich ändert

1. **Knopf immer aktiv.** „PDF bearbeiten" funktioniert in jedem Status (Entwurf, versendet, angenommen, abgelehnt, offen, überfällig, teilbezahlt, bezahlt, storniert, abgelaufen).
2. **Hinweis im Editor.** Bei einem bereits versendeten Beleg steht oben im Editor ein ruhiger, gelber Hinweisstreifen: „Dieser Beleg wurde am … versendet. Änderungen ändern das bereits verschickte Dokument nicht rückwirkend – du musst es erneut versenden."
3. **Rückfrage bei bezahlt/storniert.** Klick auf „PDF bearbeiten" öffnet bei bezahlten oder stornierten Rechnungen zuerst eine kurze Rückfrage („Diese Rechnung ist bereits bezahlt. Trotzdem bearbeiten?"). Erst nach „Ja" geht der Editor auf.
4. **Google Drive bleibt aktuell.** Nach dem Speichern einer Änderung an einem bereits versendeten Beleg wird die neue Fassung automatisch hochgeladen und ersetzt dieselbe Datei in Drive (gleicher Link, kein Duplikat). Nie versendete Belege kommen weiterhin nicht nach Drive.
5. **Geplante E-Mails.** Ist für den Beleg eine Mail geplant, wird beim Versand ohnehin die neueste Fassung erzeugt – im Editor erscheint dazu ein kleiner Hinweis, dass die geplante Mail die geänderte Fassung verschickt.

## Technische Umsetzung

**Frontend**
- `src/routes/angebote.$id.tsx`, `src/routes/rechnungen.$id.tsx`: Status-Bedingung am „PDF bearbeiten"-Knopf entfernen. Statt `disabled` ein aktiver Knopf; bei `bezahlt`/`storniert` erst `ConfirmDialog` (`src/components/ui/confirm-dialog.tsx`), dann `navigate` in die Editor-Route.
- Neue kleine Komponente `src/components/pdf-editor/VersendetHinweis.tsx`: gelber Hinweisstreifen mit `versendetAm` (Format über `formatDate`), plus optionalem Zusatz, wenn `offeneFuerBeleg(...)` eine geplante Mail meldet.
- `src/components/pdf-editor/PdfEditorLayout.tsx`: Hinweis über dem Editor/der Vorschau einblenden, wenn `beleg.versendetAm` gesetzt ist. Keine Änderung an Speichern/Autosave (`useBelegEditor`).

**Backend**
- Kein Schema-Wechsel, keine Migration. `updateAngebot`/`updateRechnung` erlauben Inhaltsänderungen bereits unabhängig vom Status; Status-Übergänge bleiben unverändert abgesichert.
- PDF-Cache wird über `onBelegMutated` → `invalidatePdfCache` bereits korrekt verworfen (`backend/src/pdf/wireup.ts`).
- `backend/src/drive/auto-enqueue.ts`: zusätzlich an `onBelegMutated` hängen. Enqueue nur, wenn der Beleg `versendetAm` gesetzt hat und `autoUpload !== false`. Idempotenzschlüssel enthält den PDF-SHA, gleicher Inhalt erzeugt also keinen zweiten Upload. Der Worker überschreibt über `replaceFileId` die vorhandene Drive-Datei – kein Duplikat.
- Die Regel „kein Versand → kein Drive-Upload" bleibt bestehen; der Kommentarblock in `auto-enqueue.ts` wird entsprechend präzisiert.

**Prüfung**
- Neuer Backend-Test (`backend/test/belege.spec.ts` bzw. eigene Spec): versendeten Beleg ändern → Update greift, PDF-Cache ist verworfen, Drive-Enqueue entsteht genau einmal pro geänderter Fassung; nie versendeter Beleg → kein Enqueue.
- Bestehende Suiten (`belege`, `pdf`, `email-planung`, `release-bundle`) laufen lassen, dazu Typprüfung und Lint.
- Browser-Durchlauf: versendete Rechnung öffnen → bearbeiten → speichern → Vorschau und Detail-PDF zeigen die Änderung; bezahlte Rechnung → Rückfrage erscheint.

**Update-Sicherheit**
- Keine Migration, keine Änderung an `package.json`, Lockfiles, `update.sh` oder Daten-Verzeichnis. Reines Code-Update, `mcc-update` läuft unverändert durch.
