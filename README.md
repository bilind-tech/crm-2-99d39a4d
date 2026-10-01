# CRM-2

Projekt-Prompt: Eigenes CRM-System auf Raspberry Pi 5 (selbst gehostet)

Hallo KI,

ich möchte mit dir gemeinsam ein vollständiges CRM- und Rechnungssystem bauen, das komplett auf meinem eigenen Raspberry Pi 5 (8 GB RAM) läuft. Bevor wir mit Code beginnen, lies dir bitte alles ganz genau durch — ich erkläre dir jetzt im Detail, was das System können muss, wie es aufgebaut sein soll und welche Rahmenbedingungen gelten.

1. Wichtigste Rahmenbedingungen (bitte zwingend beachten!)

Hosting: Das System läuft ausschließlich auf einem Raspberry Pi 5 mit 8 GB RAM in meinem lokalen Netzwerk. Es darf keine Lovable Cloud, kein Supabase, keine externe Cloud-Datenbank verwendet werden.

Datenbank: Lokal auf dem Pi — bevorzugt SQLite (eine einzelne Datei, sehr ressourcenschonend, perfekt für den Pi). Alternativ wäre PostgreSQL lokal denkbar, aber SQLite reicht für einen Einzelnutzer mehr als aus.

Nutzer: Es gibt nur einen einzigen Nutzer (mich). Kein Multi-User, keine Rollen, keine komplexe Rechteverwaltung. Einfach ein Passwort → Login → fertig. Beim Start ist die App "gesperrt" (Lock-Screen), nach Passwort-Eingabe ist alles freigeschaltet.

E-Mail-Versand: Soll später über meinen Strato-Mailserver (SMTP) laufen — also kein SendGrid/Mailgun/etc., sondern direkt meine eigene Strato-Adresse mit SMTP-Zugang.

Dateispeicher: Alle Anhänge, Logos, generierte PDFs etc. liegen lokal auf dem Pi (ein Ordner z. B. /var/lib/mcc/files/). Optional Backup auf Google Drive oder ein NAS.

Sprache: Deutsche UI, deutsche Datums- und Währungsformate (EUR, dd.mm.yyyy).

Zugriff: Web-App, die ich im LAN über den Browser erreiche (z. B. http://meinpi.local:3000). Optional später per Tailscale auch von unterwegs.

2. Was das System macht (Überblick)

Es ist ein CRM für meinen Reinigungsbetrieb. Es verwaltet:

Kunden (Firmen + Privatkunden) mit allen Stammdaten, mehreren Ansprechpartnern, Notizen

Objekte (Gebäude/Standorte, die zu Kunden gehören und gereinigt werden)

Angebote (PDF-Erstellung, Versand, Status-Verfolgung)

Rechnungen (mit Zahlungserfassung, offenen Posten, automatischer Berechnung)

Dokumente (Belege, Verträge, Bilder hochladen und einem Kunden/Objekt zuordnen)

Vorlagen für Positionen, Texte (Intro/Outro für Angebote/Rechnungen)

Dashboard mit Live-Übersicht über alles

Einstellungen für Firmendaten, Logo, Bankverbindung, Nummernkreise, Erscheinung

Backup & Wiederherstellung

Aktivitäts-Verlauf (was wurde wann gemacht)

Globale Suche (überall etwas finden)

Benachrichtigungen (Glocke oben rechts)

3. Detaillierte Feature-Beschreibung pro Bereich

3.1 Login / Lock-Screen

Beim ersten Start: Master-Passwort setzen. Dieses verschlüsselt sensible Daten (z. B. SMTP-Passwort, ggf. Backup-Tokens) im Klartext-Vault auf dem Pi.

Bei jedem App-Start: Lock-Screen → Passwort eingeben → entsperrt für die Sitzung.

Auto-Lock nach z. B. 30 Min Inaktivität (konfigurierbar).

Passwort kann in den Einstellungen geändert werden.

3.2 Dashboard (Startseite)

Das Dashboard ist mein Cockpit. Es zeigt:

Kennzahlen-Karten oben: Anzahl aktiver Kunden, Anzahl aktiver Objekte, offene Angebote, offene Rechnungen, Gesamt-Außenstände in EUR.

Umsatz-Diagramm: Balken-/Linienchart über die letzten 12 Monate, Umsatz brutto/netto. Ich muss zwischen Monaten / Zeiträumen wechseln können (z. B. dieses Jahr, letztes Jahr, letzte 6 Monate, frei wählbarer Zeitraum).

Warnungen / Hinweise (sehr wichtig!): Eine Liste mit proaktiven Hinweisen, z. B.:

„⚠️ Kunde Müller GmbH hat eine Rechnung über 1.234,56 € seit 42 Tagen offen — bitte prüfen."

„⚠️ Angebot AN-2025-017 an Schmidt wurde vor 3 Wochen verschickt und ist immer noch offen."

„ℹ️ Rechnung RE-2025-088 ist seit gestern überfällig."

„⚠️ Kunde XY hat insgesamt 3 offene Zahlungen über 2.500 €."

Letzte Aktivitäten: Stream der letzten Aktionen (neuer Kunde angelegt, Rechnung als bezahlt markiert, Angebot versendet etc.).

Quick-Actions: Buttons „Neuer Kunde", „Neues Angebot", „Neue Rechnung", „Neues Objekt".

3.3 Kunden

Kundenliste mit Suche, Filter (aktiv/inaktiv/Interessent), Tags, archivierte ein-/ausblenden.

Kunde anlegen — Formular hat ALLE diese Felder:

Typ: Firma / Privat (umschaltbar — je nach Auswahl andere Pflichtfelder)

Anrede (Herr/Frau/Divers/keine)

Firmenname (bei Firma)

Vorname / Nachname

Straße, PLZ, Ort, Land (Default Deutschland)

Telefon / Mobil / E-Mail / Webseite

USt-ID / Steuernummer

Zahlungsziel in Tagen (Default 14)

Standard-Steuersatz (Default 19 %)

Standard-Rabatt %

Notizen (Freitext)

Tags (frei vergebbar, z. B. „A-Kunde", „Region Nord")

Status: aktiv / inaktiv / Interessent

Kundennummer: wird automatisch fortlaufend vergeben (Präfix konfigurierbar, z. B. K-2025-001)

Detailseite eines Kunden (sehr umfangreich!):

Stammdaten-Block (alles oben + inline editierbar)

Ansprechpartner-Tab/-Block: Beliebig viele Personen anlegen mit Anrede, Vor-/Nachname, Position, Abteilung, Telefon, Mobil, E-Mail, Notiz. Ein Ansprechpartner kann als „Primärer Ansprechpartner" markiert werden — dieser wird dann z. B. automatisch in Angeboten/Rechnungen vorausgewählt.

Objekte-Block: Alle Objekte des Kunden auf einen Blick, mit Schnell-Anlegen.

Angebote-Block: Alle Angebote des Kunden, gefiltert nach Status, mit Direktlink zum Angebot.

Rechnungen-Block: Alle Rechnungen, mit Status-Badge (Entwurf/Versendet/Teilbezahlt/Bezahlt/Überfällig), Restbetrag, Fälligkeit.

Dokumente-Block: Alle hochgeladenen Belege/Verträge/Bilder dieses Kunden.

Notizen-Block: Eigenes Notiz-Modul mit Titel + Inhalt + Zeitstempel.

Warnungs-Banner: Falls offene überfällige Rechnungen existieren → roter Hinweis oben auf der Seite („Achtung: 2 Rechnungen überfällig, gesamt 1.450 €").

Aktionen: Bearbeiten, Archivieren, Wiederherstellen, Löschen (nur möglich wenn keine verknüpften Objekte/Rechnungen mehr existieren).

3.4 Objekte (Standorte)

Objekte gehören immer zu einem Kunden. Sie repräsentieren z. B. ein Bürogebäude, das gereinigt wird.

Felder:

Objektnummer (auto)

Zugehöriger Kunde (Pflicht)

Name (z. B. „Bürohaus Hauptstraße")

Typ: Büro / Wohnen / Gewerbe / Industrie / Medizin / Bildung / Sonstiges

Adresse (Straße/PLZ/Ort/Land)

Quadratmeter gesamt + zu reinigende m²

Stockwerke + Räume

Reinigungs-Frequenz: täglich / wöchentlich / 14-tägig / monatlich / quartalsweise / auf Abruf

Reinigungstage: Mo–So Multi-Select

Bevorzugte Uhrzeit von / bis

Zugangsinfo / Schlüssel / Codes (Freitext)

Alarmanlagen-Info

Ansprechpartner vor Ort (Verknüpfung zu einem Ansprechpartner des Kunden)

Notizen

Status: aktiv / pausiert / beendet

Archivieren / Wiederherstellen

Detailseite Objekt: Stammdaten, Notizen, verknüpfte Angebote/Rechnungen/Dokumente.

3.5 Angebote

Angebot anlegen:

Kunde wählen (oder neu anlegen via Quick-Create)

Objekt wählen (optional, aus den Objekten des Kunden)

Titel

Intro-Text (kann aus Vorlagen geladen werden)

Positionen-Editor: Zeilen mit Beschreibung, Menge, Einheit (Stk/h/m²/Pauschal), Einzelpreis netto, Steuersatz. Summe pro Zeile + Gesamt automatisch berechnet. Positionen können aus Vorlagen geladen werden (Position-Templates wie „Grundreinigung 1 m²", „Fensterreinigung pro Fenster" etc. siehe Einstellungen).

Outro-Text (wieder aus Vorlagen ladbar)

Gültig bis (Datum)

Rabatt % (gesamt)

Steuersatz (default aus Kunden- oder Firmeneinstellung)

Notizen

Status: Entwurf → Versendet → Angenommen / Abgelehnt / Abgelaufen.

Aktionen:

PDF generieren (mit Logo, Firmendaten, Bankverbindung, Footer aus Einstellungen)

PDF-Vorschau direkt im Browser (eingebetteter Viewer)

Per E-Mail versenden (über meinen Strato-SMTP-Zugang) — Empfänger ist primärer Ansprechpartner oder frei wählbar, anhängbar das PDF, Betreff/Text aus Text-Vorlagen

In Rechnung umwandeln — übernimmt alle Positionen 1:1 in eine neue Rechnung

Duplizieren

Archivieren

3.6 Rechnungen

Wie Angebote, plus:

Rechnungsnummer auto, fortlaufend, Präfix konfigurierbar (z. B. RE-2025-001)

Rechnungsdatum + Fälligkeitsdatum (auto = Datum + Zahlungsziel des Kunden)

Status: Entwurf / Versendet / Teilweise bezahlt / Vollständig bezahlt / Überfällig / Storniert

Zahlungs-Erfassung: Mehrere Teilzahlungen pro Rechnung möglich, mit Datum, Betrag, Methode (Überweisung/Bar/Karte/PayPal/SEPA/Sonstiges), Referenz, Notiz. System rechnet automatisch Restbetrag aus und ändert Status entsprechend.

„Als bezahlt markieren"-Button für Schnellerfassung

PDF-Generierung mit allen Pflichtangaben einer deutschen Rechnung (USt-ID, Steuernummer, Bankverbindung, fortlaufende Nummer etc.)

PDF-Versand per Strato-SMTP, Vorlagen für E-Mail-Text

Fälligkeits-Logik: Rechnungen, deren Fälligkeitsdatum überschritten ist und die nicht voll bezahlt sind, werden automatisch als „Überfällig" markiert und tauchen im Dashboard auf.

3.7 Dokumente

Drag-&-Drop Upload (PDF, JPG, PNG, etc.)

Jedes Dokument einem Kunden und/oder Objekt zuordnen

Typ: Beleg / Vertrag / Angebot / Rechnung / Protokoll / Bild / Sonstiges

Titel, Beschreibung, Dokumentdatum, Betrag (für Belege)

Steuerrelevant ja/nein

Vorschau im Browser

Speicherung lokal auf dem Pi (Dateipfad in DB, Datei im Filesystem)

3.8 Globale Suche

Tastenkürzel ⌘/Ctrl + K öffnet Such-Dialog

Sucht über alle Entitäten gleichzeitig: Kunden, Objekte, Angebote, Rechnungen, Dokumente, Notizen

Direktsprung zur Detailseite

3.9 Benachrichtigungen (Glocke oben rechts)

Zeigt Anzahl ungelesener Hinweise

Beispiele: „Rechnung X wurde überfällig", „Angebot Y läuft in 3 Tagen ab", „Backup erfolgreich erstellt"

Klick auf Benachrichtigung springt zum betroffenen Objekt

3.10 Einstellungen (sehr wichtig — alles konfigurierbar!)

Mehrere Tabs:

a) Firmendaten — Firmenname, Rechtsform, Slogan, vollständige Anschrift, Telefon, E-Mail, Webseite, USt-ID, Steuernummer, Handelsregister, Geschäftsführer, Bankverbindung (Name/IBAN/BIC), Logo-Upload (wird in alle PDFs eingebunden), Standard-Steuersatz, Standard-Zahlungsziel.

b) Erscheinungsbild — Hell/Dunkel-Modus, Akzentfarbe, evtl. Schriftgröße. Soll modern, übersichtlich, „Apple-like" wirken.

c) Nummernkreise — Präfixe für Kundennummern, Angebots-, Rechnungsnummern (z. B. RE-{YYYY}-{####}).

d) Positionsvorlagen (Item-Templates) — Wiederkehrende Positionen für Angebote/Rechnungen anlegen, z. B. „Unterhaltsreinigung pro m²" mit Standard-Preis, Einheit, Beschreibung. Werden im Positionseditor per Klick eingefügt.

e) Textvorlagen — Vordefinierte Intros, Outros, E-Mail-Texte für Angebote und Rechnungen mit Platzhaltern wie {kunde.name}, {rechnung.nummer}, {betrag}.

f) E-Mail (Strato SMTP) — SMTP-Server, Port, Benutzer, Passwort (verschlüsselt gespeichert), Absender-Name, Test-Mail-Button.

g) Backup — Manuelles Backup als ZIP (DB + alle Dateien + Settings) herunterladen, automatische tägliche Backups in einen Ordner auf dem Pi (oder USB-Platte), Anzahl behaltener Backups konfigurierbar, Wiederherstellung aus Backup-Datei.

h) Aktivitätsverlauf — Komplette Historie aller Änderungen mit Zeitstempel, Filter nach Typ.

i) Sicherheit — Master-Passwort ändern, Auto-Lock-Timer einstellen.

3.11 Aktivitätsprotokoll (Audit-Log)

Jede wichtige Aktion (Kunde angelegt, Rechnung versendet, Zahlung erfasst, Einstellung geändert) wird automatisch protokolliert und ist im Verlauf einsehbar.

3.12 Quick-Create-Menü

Schwebender „+"-Button bzw. Befehlspalette → schnell Kunde / Objekt / Angebot / Rechnung / Dokument anlegen ohne Navigation.

4. Wie alles miteinander zusammenarbeitet (Verknüpfungs-Logik)

Das System soll konsequent vernetzt sein:

Ein Angebot kennt seinen Kunden + Objekt → auf der Kundenseite taucht das Angebot auf, auf der Objektseite ebenfalls.

Ein Angebot wird angenommen → 1 Klick → Rechnung wird erzeugt (Positionen kopiert, verknüpft).

Eine Rechnung verlinkt zurück auf das Quell-Angebot.

Eine Zahlung auf einer Rechnung verändert sofort den Status, das Dashboard, die Kunden-Außenstände, die Aktivitätshistorie.

Ein Dokument, das einem Kunden zugeordnet ist, taucht auf seiner Detailseite auf.

Kunde löschen ist nur möglich, wenn keine Objekte/Rechnungen verknüpft sind — sonst Hinweis „bitte zuerst archivieren".

Inline-Editing überall: Felder direkt auf der Detailseite ändern, ohne in ein Edit-Formular wechseln zu müssen.

5. Technischer Stack-Vorschlag (offen für deine Empfehlung)

Frontend: React + TypeScript + Vite, TailwindCSS, shadcn/ui-Komponenten, TanStack Router, TanStack Query

Backend: Node.js (läuft prima auf dem Pi 5) — z. B. Express oder Fastify oder direkt TanStack Start mit Server-Functions

Datenbank: SQLite via better-sqlite3 (sehr schnell, eine Datei, kein extra Service)

PDF-Generierung: pdfmake oder pdf-lib (laufen ohne native Binaries)

E-Mail: nodemailer mit Strato-SMTP-Konfiguration

Auth: Eigenes simples Master-Passwort (Argon2id-Hash), Session per HttpOnly-Cookie

Deployment auf dem Pi: als systemd-Service starten, Nginx davor als Reverse-Proxy (optional HTTPS via Let's Encrypt + Tailscale/lokale CA)

Backups: Cron-Job auf dem Pi, der die SQLite-DB + Dateien-Ordner täglich in ein ZIP packt

6. Was ich von dir jetzt erwarte

Bitte noch keinen Code schreiben. Antworte mir stattdessen mit:

Bestätige, dass du alle oben beschriebenen Features verstanden hast.

Stelle Rückfragen, falls dir etwas unklar ist (z. B. zu E-Mail-Versand, PDF-Layout, Backup-Strategie, Nummernkreis-Format).

Mache mir einen Vorschlag zur Projekt-Struktur (Ordnerlayout, Module, wie Frontend und Backend zusammenspielen) — angepasst an die Tatsache, dass alles auf einem Pi 5 läuft.

Sag mir, welche Reihenfolge du beim Bauen empfiehlst (z. B. Phase 1: DB-Schema + Auth + Kunden, Phase 2: Objekte + Angebote, Phase 3: Rechnungen + Zahlungen, …).

Weise mich auf Stolperfallen hin, die speziell beim Pi-Betrieb auftreten können (z. B. ARM-Kompatibilität von better-sqlite3, Speicherverbrauch, PDF-Rendering ohne Headless-Chrome).

Erst wenn wir die Architektur und Reihenfolge gemeinsam abgestimmt haben, fangen wir mit dem ersten Modul an. Danke!

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/230ee2c0-47bf-40cb-a8c1-53ac3a8e2b1d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
