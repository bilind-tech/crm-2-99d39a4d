-- Urlaubsantrag: optional manuell festgelegte Anzahl Urlaubstage.
ALTER TABLE stz_abwesenheit ADD COLUMN tage_override REAL;
