-- 040_position_abrechnungsart_label.sql
-- Optionales, pro Position frei editierbares Label für die Spalte
-- „Abrechnungsart" in der Leistungs-Tabelle (Angebot + Rechnung).
-- NULL = System-Default anhand modus ("Pauschal" / "Stundensatz" / "Einzelposition").

ALTER TABLE angebot_position ADD COLUMN abrechnungsart_label TEXT NULL;
ALTER TABLE rechnung_position ADD COLUMN abrechnungsart_label TEXT NULL;