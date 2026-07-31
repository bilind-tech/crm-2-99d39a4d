// Voreingestellter Mitarbeiter-Datensatz (Export vom 06.05.2026),
// damit der Import-Dialog mit einem Klick befüllt werden kann.

const STANDARD_TAG = { aktiv: true, beginn: "08:00", ende: "16:00", pause: 60 };
const WOCHENENDE_AUS = { aktiv: false, beginn: "08:00", ende: "14:00", pause: 0 };

const STANDARD_WOCHE = {
  montag: STANDARD_TAG,
  dienstag: STANDARD_TAG,
  mittwoch: STANDARD_TAG,
  donnerstag: STANDARD_TAG,
  freitag: STANDARD_TAG,
  samstag: WOCHENENDE_AUS,
  sonntag: WOCHENENDE_AUS,
};

const MO_FR = ["montag", "dienstag", "mittwoch", "donnerstag", "freitag"];

function standard(name: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    aktiv: true,
    arbeitszeiten: {
      arbeitetAmWochenende: false,
      wpiMuster: "gleich",
      standardZeiten: {
        arbeitsbeginn: "08:00",
        arbeitsende: "16:00",
        pauseDauer: 60,
        pauseAbStunden: 4,
      },
      wochentagZeiten: STANDARD_WOCHE,
      arbeitstage: MO_FR,
      zielStundenProMonat: null,
      ...extra,
    },
  };
}

export const MITARBEITER_PRESET = {
  version: 1,
  mitarbeiter: [
    standard("Haifa Mohammed"),
    standard("Yasin Mohammed"),
    standard("Aland Mohammed"),
    standard("Yusuf Mohammed"),
    standard("Salim Darweesh"),
    {
      name: "Hava Kurt",
      aktiv: true,
      arbeitszeiten: {
        arbeitetAmWochenende: true,
        wpiMuster: "unterschiedlich",
        standardZeiten: {
          arbeitsbeginn: "08:00",
          arbeitsende: "16:00",
          pauseDauer: 60,
          pauseAbStunden: 4,
        },
        wochentagZeiten: {
          montag: { aktiv: true, beginn: "08:00", ende: "10:00", pause: 0, block2: { beginn: "17:00", ende: "19:00" } },
          dienstag: { aktiv: true, beginn: "08:00", ende: "10:00", pause: 0, block2: { beginn: "17:00", ende: "19:00" } },
          mittwoch: { aktiv: true, beginn: "08:00", ende: "10:00", pause: 0, block2: { beginn: "17:00", ende: "19:00" } },
          donnerstag: { aktiv: true, beginn: "08:00", ende: "10:00", pause: 0 },
          freitag: { aktiv: false, beginn: "08:00", ende: "10:00", pause: 0 },
          samstag: { aktiv: true, beginn: "08:00", ende: "12:00", pause: 0 },
          sonntag: WOCHENENDE_AUS,
        },
        arbeitstage: MO_FR,
        zielStundenProMonat: 80,
      },
    },
    standard("Abel Habtemikael", {
      standardZeiten: {
        arbeitsbeginn: "15:30",
        arbeitsende: "17:30",
        pauseDauer: 0,
        pauseAbStunden: 4,
      },
      zielStundenProMonat: 40,
    }),
    standard("Yonas Gedion Kahsaye", {
      standardZeiten: {
        arbeitsbeginn: "16:00",
        arbeitsende: "19:00",
        pauseDauer: 0,
        pauseAbStunden: 4,
      },
      arbeitstage: ["dienstag", "mittwoch", "donnerstag"],
      zielStundenProMonat: 35,
    }),
  ],
};

export const MITARBEITER_PRESET_JSON = JSON.stringify(MITARBEITER_PRESET, null, 2);
