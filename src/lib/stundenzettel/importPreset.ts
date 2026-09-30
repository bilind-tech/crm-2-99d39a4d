// Mitarbeiter-Datensatz aus den Papier-Stundenzetteln (ausgewertet 30.09.2026).
// Stundenziel = Summe des jeweils neuesten Papier-Monats.
// Der Import-Dialog gleicht über den Namen ab (keine Duplikate) und entfernt
// die unter `entfernen` genannten ehemaligen Mitarbeiter.

type Tag = {
  aktiv: boolean;
  beginn: string;
  ende: string;
  pause: number;
  block2?: { beginn: string; ende: string } | null;
};

const AUS: Tag = { aktiv: false, beginn: "08:00", ende: "12:00", pause: 0, block2: null };
const t = (beginn: string, ende: string, pause = 0, block2?: { beginn: string; ende: string }): Tag => ({
  aktiv: true,
  beginn,
  ende,
  pause,
  block2: block2 ?? null,
});

type Woche = {
  montag: Tag;
  dienstag: Tag;
  mittwoch: Tag;
  donnerstag: Tag;
  freitag: Tag;
  samstag: Tag;
  sonntag: Tag;
};

function woche(p: Partial<Woche>): Woche {
  return {
    montag: AUS,
    dienstag: AUS,
    mittwoch: AUS,
    donnerstag: AUS,
    freitag: AUS,
    samstag: AUS,
    sonntag: AUS,
    ...p,
  };
}

function ma(name: string, w: Woche, ziel: number) {
  const arbeitstage = (Object.keys(w) as Array<keyof Woche>).filter((k) => w[k].aktiv);
  return {
    name,
    aktiv: true,
    arbeitszeiten: {
      arbeitetAmWochenende: w.samstag.aktiv || w.sonntag.aktiv,
      wpiMuster: "unterschiedlich",
      standardZeiten: { arbeitsbeginn: "08:00", arbeitsende: "16:00", pauseDauer: 60, pauseAbStunden: 4 },
      wochentagZeiten: w,
      arbeitstage,
      zielStundenProMonat: ziel,
    },
  };
}

// Aland (Jan 2026): Di + Mi 16–20, Sa 09–13 · Summe 40
const ALAND = woche({ dienstag: t("16:00", "20:00"), mittwoch: t("16:00", "20:00"), samstag: t("09:00", "13:00") });

export const MITARBEITER_PRESET = {
  version: 2,
  entfernen: ["Yusuf Mohammed", "Yussuf Mohamed", "Yusuf Mohamed", "Yussuf Mohammed"],
  mitarbeiter: [
    ma("Aland Mohammed", ALAND, 40),
    ma("Bilind Mohammed", ALAND, 40),
    // Yasin (Jan 2026): Mo 18–20, Fr 18–21, Sa 10–14 · Summe 40
    ma(
      "Yasin Mohammed",
      woche({ montag: t("18:00", "20:00"), freitag: t("18:00", "21:00"), samstag: t("10:00", "14:00") }),
      40,
    ),
    // Haifa (Jan 2026): Mo + Do 08:30–12:30 · Summe 37
    ma("Haifa Mohammed", woche({ montag: t("08:30", "12:30"), donnerstag: t("08:30", "12:30") }), 37),
    // Hava (Jan 2026) · Summe 85
    ma(
      "Hava Kurt",
      woche({
        montag: t("08:00", "10:00", 0, { beginn: "17:00", ende: "19:00" }),
        dienstag: t("08:00", "10:00", 0, { beginn: "15:00", ende: "17:00" }),
        mittwoch: t("08:00", "10:00", 0, { beginn: "17:00", ende: "19:00" }),
        donnerstag: t("08:00", "10:00"),
        freitag: t("08:00", "10:00"),
        samstag: t("10:00", "12:00"),
      }),
      85,
    ),
    // Salim (Juni 2026): Di/Mi/Fr 08:30–17:30 (Pause 1 h), Do 11–15 · Summe 120
    ma(
      "Salim Darweesh",
      woche({
        dienstag: t("08:30", "17:30", 60),
        mittwoch: t("08:30", "17:30", 60),
        donnerstag: t("11:00", "15:00"),
        freitag: t("08:30", "17:30", 60),
      }),
      120,
    ),
    // Abel (Mai 2026): Mo–Fr 15:30–17:30 · Summe 40
    ma(
      "Abel Habtemikael",
      woche({
        montag: t("15:30", "17:30"),
        dienstag: t("15:30", "17:30"),
        mittwoch: t("15:30", "17:30"),
        donnerstag: t("15:30", "17:30"),
        freitag: t("15:30", "17:30"),
      }),
      40,
    ),
    // Yonas (Mai 2026): Di–Do 16–18 · Summe 30
    ma(
      "Yonas Gedion Kahsaye",
      woche({ dienstag: t("16:00", "18:00"), mittwoch: t("16:00", "18:00"), donnerstag: t("16:00", "18:00") }),
      30,
    ),
  ],
};

export const MITARBEITER_PRESET_JSON = JSON.stringify(MITARBEITER_PRESET, null, 2);
