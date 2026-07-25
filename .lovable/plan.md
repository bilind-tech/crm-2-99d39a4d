## Plan: Logo endgültig robust in Rechnungen/Angeboten/Protokollen anzeigen

Ich werde die Logo-Strecke so umbauen, dass nicht mehr mehrere unterschiedliche Wege gegeneinander arbeiten. Ziel: Wenn in den Einstellungen ein Logo vorhanden ist, wird exakt dieses Logo in der Rechnung oben rechts eingebettet — nicht nur als UI-Preview angezeigt.

### 1. PDF-Logo-Quelle vereinheitlichen
- Eine zentrale Backend-Funktion lädt das Firmenlogo aus dem Datenordner und gibt immer eine PDF-taugliche Data-URL zurück.
- Dabei werden PNG und JPG/JPEG unterstützt.
- WebP wird für PDF nicht mehr still akzeptiert, weil PDF-Renderer damit je nach Umgebung leer bleiben können. Falls WebP hochgeladen wird, bekommt der Nutzer eine klare Fehlermeldung statt einer leeren Rechnung.

### 2. Backend-Lücke schließen
Aktuell bestätigt der Code eine Schwachstelle: Der Upload akzeptiert auch `logo.webp`, aber der PDF-Renderer sucht nur `logo.png`, `logo.jpg`, `logo.jpeg`. Das kann zu „Logo ist in Einstellungen da, aber PDF zeigt nichts“ führen. Das wird bereinigt.

### 3. Frontend-Fallback reparieren
Falls die App statt Backend-PDF einmal den Browser-PDF-Generator nutzt, darf sie nicht einfach die relative URL `/einstellungen/firma/logo?...` direkt an pdfmake geben. Ich werde diese URL vorher zu einer echten Data-URL umwandeln. Dadurch funktioniert auch der Fallback zuverlässig.

### 4. Cache zuverlässig brechen
- Beim Logo-Upload und Löschen werden PDF-Caches sauber invalidiert.
- Die PDF-Signatur nutzt `logoUpdatedAt` statt nur die Länge der Logo-URL, damit ein neu hochgeladenes Logo sicher als neue PDF-Version erkannt wird.
- Optional wird nach Logo-Upload serverseitig der bestehende PDF-Cache geleert, damit alte Rechnungs-PDFs nicht weiter aus dem Cache kommen.

### 5. Sichtbare Kontrolle in den Einstellungen
- In den Firmendaten soll nach Upload klar sichtbar sein: „Logo gespeichert“.
- Wenn das Format ungeeignet ist, erscheint eine verständliche Fehlermeldung: bitte PNG oder JPG verwenden.

### 6. Tests/Absicherung
- Backend-Test ergänzen: Logo hochladen → Rechnungs-PDF rendern → PDF ist gültig und Cache reagiert auf Logo-Änderung.
- Kein neues npm-Paket, kein Lockfile-Risiko, keine Migration. Damit bleibt `mcc-update` stabil wie beim letzten Mal.

### Ergebnis
Nach dem Update lädst du das Logo einmal als PNG oder JPG in Einstellungen → Firmendaten hoch. Danach wird es in neu geöffneten/neu gerenderten Rechnungen oben rechts zuverlässig eingebettet.