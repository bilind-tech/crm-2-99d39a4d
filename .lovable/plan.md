# Originale Abschlussbilder und echte Google-Bewertungen

## Umsetzung

- Die zwei mitgelieferten Story-Bilder werden unverändert als feste, lokal installierte Abschlussseiten übernommen und mit dem Programm-Update ausgeliefert.
- Beim ZIP-Download kommt nach den gestalteten Kundenbildern:
  1. vorletzte Seite: **„Bewerten Sie uns“ mit dem vorhandenen QR-Code**
  2. letzte Seite: **die mitgelieferte Bewertungscollage**
- Die bisherigen künstlich gezeichneten Abschlussseiten werden nicht mehr verwendet. Beide Originalbilder werden auf das WhatsApp-Story-Format 1080 × 1920 skaliert, ohne Beschnitt oder Verzerrung.
- Der Eingabebereich für einen eigenen Google-Link entfällt, weil der QR-Code bereits fest im Originalbild enthalten ist. Die beiden Schalter für die Abschlussseiten bleiben erhalten.
- Die Auswahl der Google-Bewertungen wird mit den vollständig lesbaren Kommentaren aus den Screenshots aktualisiert. Rezensionen ohne Kommentar und Texte, die hinter „Mehr“ abgeschnitten sind, werden nicht aufgenommen.
- Vorhandene selbst eingetragene Bewertungen bleiben weiterhin erhalten und verwaltbar.

## Technische Details

- Die Originaldateien werden unter den lokalen Story-Assets gespeichert, sodass sie auf dem Raspberry Pi und ohne Internet funktionieren.
- Die Abschlussseiten werden über den bestehenden Canvas-/ZIP-Ablauf geladen; Ladefehler verhindern einen unvollständigen Download und zeigen eine verständliche Fehlermeldung.
- Die Reihenfolge und Dateinummern werden im gemeinsamen Download eindeutig geprüft.
- Keine Änderungen an Datenbank, Update-Skript, Paketen oder Lock-Dateien.

## Prüfung

- Download mit mehreren normalen Story-Bildern und beiden aktivierten Abschlussseiten testen.
- ZIP-Inhalt kontrollieren: fortlaufende Nummern, QR-Seite vorletzte, Bewertungscollage letzte.
- Darstellung der zwei Originalbilder auf Desktop und Handy prüfen.
- Offline-/Raspberry-Pi-Bereitstellung der Assets sowie den bestehenden Update-Build prüfen.
