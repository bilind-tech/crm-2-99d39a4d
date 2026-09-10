export interface StoryProjekt {
  id: string;
  name: string;
  status: "entwurf" | "fertig";
  konfiguration: Record<string, unknown>;
  bilder: StoryBild[];
  erstelltAm: string;
  aktualisiertAm: string;
}

export interface StoryBild {
  id: string;
  projektId: string;
  dateiname: string;
  mimeType: string;
  groesseBytes: number;
  sortierung: number;
  konfiguration: Record<string, unknown>;
  erstelltAm: string;
}

export interface StoryBewertung {
  id: string;
  name: string;
  text: string;
  sterne: number;
  quelle: string;
  erstelltAm: string;
  aktualisiertAm: string;
}
