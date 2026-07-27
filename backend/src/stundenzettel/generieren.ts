// Erzeugt für einen Mitarbeiter alle Tage eines Monats.
// Deterministisch: gleiche Eingaben → gleiches Ergebnis (keine Zufälle,
// keine Uhrzeit-Logik).

import { berechneNormalenTag } from "./berechnung.js";
import {
  baueFeiertagsKarte,
  iso,
  tageImMonat,
  wochentagVon,
  type FeiertagEintrag,
} from "./feiertage.js";
import { wendeZielausgleichAn } from "./zielausgleich.js";
import type {
  GenerierterStundenzettel,
  GenerierterTag,
  Mitarbeiter,
  Wochentag,
  WochentagZeit,
} from "./types.js";

function zeitFuerWochentag(m: Mitarbeiter, wt: Wochentag): WochentagZeit {
  const cfg = m.arbeitszeiten;
  if (cfg.wpiMuster === "gleich") {
    const aktiv = cfg.arbeitstage.includes(wt);
    const s = cfg.standardZeiten;
    return {
      aktiv,
      beginn: s.arbeitsbeginn,
      ende: s.arbeitsende,
      pause: s.pauseDauer,
      block2: null,
    };
  }
  return cfg.wochentagZeiten[wt];
}

export function generiereStundenzettel(
  mitarbeiter: Mitarbeiter,
  jahr: number,
  monat: number,
  customFeiertage: FeiertagEintrag[],
): GenerierterStundenzettel {
  const feiertage = baueFeiertagsKarte(jahr, customFeiertage);
  const cfg = mitarbeiter.arbeitszeiten;
  const anz = tageImMonat(jahr, monat);
  const tage: GenerierterTag[] = [];

  for (let tag = 1; tag <= anz; tag++) {
    const datum = iso(jahr, monat, tag);
    const wt = wochentagVon(datum);
    const feiertagName = feiertage.get(datum);
    const zeit = zeitFuerWochentag(mitarbeiter, wt);
    const istWE = wt === "samstag" || wt === "sonntag";

    // 1) Wochenende bei Nicht-WE-Mitarbeiter → leere Zeile mit Bemerkung.
    if (istWE && !cfg.arbeitetAmWochenende) {
      tage.push({
        datum,
        wochentag: wt,
        stunden: 0,
        bemerkung: wt === "samstag" ? "Samstag" : "Sonntag",
      });
      continue;
    }

    // 2) Feiertag: Name als Bemerkung. Wenn er am Arbeitstag liegt, Stunden gutschreiben,
    //    aber keine Zeiten in der Zeile.
    if (feiertagName) {
      if (zeit.aktiv) {
        const norm = berechneNormalenTag(zeit, cfg.standardZeiten);
        tage.push({
          datum,
          wochentag: wt,
          stunden: norm.stunden,
          bemerkung: feiertagName,
        });
      } else {
        tage.push({
          datum,
          wochentag: wt,
          stunden: 0,
          bemerkung: feiertagName,
        });
      }
      continue;
    }

    // 3) Nicht aktiv an diesem Wochentag → leere Zeile.
    if (!zeit.aktiv) {
      tage.push({ datum, wochentag: wt, stunden: 0 });
      continue;
    }

    // 4) Normaler Arbeitstag.
    const norm = berechneNormalenTag(zeit, cfg.standardZeiten);
    tage.push({
      datum,
      wochentag: wt,
      beginn: norm.beginn,
      ende: norm.ende,
      beginn2: norm.beginn2,
      ende2: norm.ende2,
      pause: norm.pause,
      stunden: norm.stunden,
    });
  }

  let gesamt = tage.reduce((s, t) => s + t.stunden, 0);
  if (cfg.zielStundenProMonat != null && cfg.zielStundenProMonat > 0) {
    gesamt = wendeZielausgleichAn(tage, cfg.zielStundenProMonat);
  }

  return {
    id: null,
    mitarbeiterId: mitarbeiter.id,
    jahr,
    monat,
    tage,
    gesamtStunden: gesamt,
    aktualisiertAm: null,
  };
}