import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import type { notes } from "@shared/schema";

type Note = typeof notes.$inferSelect;

export function useNotes() {
  return useQuery<Note[]>({
    queryKey: [api.notes.list.path],
  });
}

export function useNote(id: number | null) {
  return useQuery<Note | null>({
    queryKey: [api.notes.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.notes.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch note");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input?: { title?: string; icon?: string; parentId?: number | null }) => {
      const res = await apiRequest("POST", api.notes.create.path, input || {});
      return await res.json() as Note;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.notes.list.path] }),
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; title?: string; content?: string; icon?: string; parentId?: number | null }) => {
      const url = buildUrl(api.notes.update.path, { id });
      const res = await apiRequest("PUT", url, updates);
      return await res.json() as Note;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.notes.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.notes.get.path, variables.id] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.notes.delete.path, { id });
      await apiRequest("DELETE", url);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.notes.list.path] }),
  });
}
