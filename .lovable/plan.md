# Rechnungs-Kopfbereich korrigieren

## Änderungen

- Die **Kundennummer vollständig aus dem Kasten „Bei Zahlung bitte die Rechnungs-Nr. angeben“ entfernen**. Im Kasten bleiben nur:
  - Rechnungs-Nr.
  - Rechnungsdatum
- Den Außenrahmen des Kastens von derzeit 210 pt auf etwa **190 pt** verschmälern. Innenabstände und Zeilenabstände bleiben ausgewogen; die Rechnungsnummer darf auch bei längeren Nummern nicht umbrechen oder den Rand berühren.
- Die linke Empfängerbreite und den Zwischenraum so neu verteilen, dass Absenderzeile, Empfänger, Kasten und Logo weder überlappen noch die nachfolgenden Inhalte verschieben.

## Modus „Empfängerblock weiter oben“

Bei aktivem Modus wird der Kopf klar getrennt angeordnet:

```text
Empfänger oben links                         Logo oben rechts
                                             Rechnungs-Kasten darunter
```

- Absenderzeile und Empfänger stehen links oben.
- Das Logo bleibt rechts oben.
- Der schmalere Rechnungs-Kasten sitzt unter dem Logo und nicht direkt neben dem Empfänger.
- Rechnungstitel, Leistungstabelle, Fußzeile und Seitenumbrüche behalten ihre bisherigen Positionen.
- Der Standardmodus bleibt kompakt: Empfänger links, schmalerer Kasten rechts auf gleicher Höhe.

## Technische Absicherung

- Browser-Vorschau und Raspberry-Pi-PDF identisch anpassen.
- PDF-Cache weiterhin von der Layout-Einstellung abhängig halten.
- Bestehende Tests auf „keine Kundennummer im Kasten“, neue Kastenbreite und getrennte Anordnung im oberen Modus aktualisieren.
- Rechnungen mit normaler und langer Rechnungsnummer sowie beide Layout-Modi als PDF rendern und visuell kontrollieren.
- Linienraster der Leistungstabelle, Typprüfung und Build erneut prüfen; keine Datenbankänderung und keine Änderung am Update-Ablauf.
