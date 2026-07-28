// React-Query-Hooks für das Stundenzettel-Modul (Phase 2).
// Alle Requests laufen über den bestehenden `api`-Client (Pi-Backend).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  CustomFeiertag,
  FeiertageResponse,
  GenerierenErgebnis,
  GenerierterTag,
  Mitarbeiter,
  MitarbeiterInput,
  Stundenzettel,
} from "@/lib/stundenzettel/types";

export const qkStz = {
  mitarbeiter: ["stz", "mitarbeiter"] as const,
  feiertage: (jahr: number) => ["stz", "feiertage", jahr] as const,
  zettel: (jahr: number, monat: number) => ["stz", "zettel", jahr, monat] as const,
};

// ---------- Mitarbeiter ----------

export function useMitarbeiter() {
  return useQuery({
    queryKey: qkStz.mitarbeiter,
    queryFn: async () => {
      const r = await api.get<{ mitarbeiter: Mitarbeiter[] }>("/mitarbeiter");
      return r.mitarbeiter;
    },
  });
}

export function useCreateMitarbeiter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MitarbeiterInput) =>
      api.post<Mitarbeiter>("/mitarbeiter", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qkStz.mitarbeiter });
    },
  });
}

export function useUpdateMitarbeiter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<MitarbeiterInput> }) =>
      api.put<Mitarbeiter>(`/mitarbeiter/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qkStz.mitarbeiter });
    },
  });
}

export function useDeleteMitarbeiter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/mitarbeiter/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qkStz.mitarbeiter });
    },
  });
}

// ---------- Feiertage ----------

export function useFeiertage(jahr: number) {
  return useQuery({
    queryKey: qkStz.feiertage(jahr),
    queryFn: () => api.get<FeiertageResponse>(`/feiertage?jahr=${jahr}`),
  });
}

export function useCreateCustomFeiertag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { datum: string; name: string }) =>
      api.post<CustomFeiertag>("/feiertage/custom", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stz", "feiertage"] });
    },
  });
}

export function useDeleteCustomFeiertag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/feiertage/custom/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stz", "feiertage"] });
    },
  });
}

// ---------- Stundenzettel ----------

export function useZettelMonat(jahr: number, monat: number) {
  return useQuery({
    queryKey: qkStz.zettel(jahr, monat),
    queryFn: async () => {
      const r = await api.get<{ zettel: Stundenzettel[] }>(
        `/stundenzettel?jahr=${jahr}&monat=${monat}`,
      );
      return r.zettel;
    },
  });
}

export function useGenerieren() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      jahr: number;
      monat: number;
      mitarbeiterIds?: string[];
      ueberschreiben?: boolean;
    }) => api.post<GenerierenErgebnis>("/stundenzettel/generieren", input),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qkStz.zettel(vars.jahr, vars.monat) });
    },
  });
}

export function usePatchZettel(jahr: number, monat: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tage }: { id: string; tage: GenerierterTag[] }) =>
      api.put<Stundenzettel>(`/stundenzettel/${id}`, {
        tage: tage.map((t) => ({
          datum: t.datum,
          beginn: t.beginn ?? null,
          ende: t.ende ?? null,
          beginn2: t.beginn2 ?? null,
          ende2: t.ende2 ?? null,
          pause: t.pause ?? null,
          stunden: t.stunden,
          bemerkung: t.bemerkung ?? null,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qkStz.zettel(jahr, monat) });
    },
  });
}

export function useDeleteZettel(jahr: number, monat: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/stundenzettel/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qkStz.zettel(jahr, monat) });
    },
  });
}