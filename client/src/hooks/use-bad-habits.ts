import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { insertBadHabitSchema, insertBadHabitEntrySchema } from "@shared/schema";
import { z } from "zod";

type InsertBadHabit = z.infer<typeof insertBadHabitSchema>;
type InsertEntry = z.infer<typeof insertBadHabitEntrySchema>;

export function useBadHabits() {
  return useQuery({
    queryKey: [api.badHabits.list.path],
    queryFn: async () => {
      const res = await fetch(api.badHabits.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch habits");
      return api.badHabits.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBadHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertBadHabit, "userId">) => {
      const validated = api.badHabits.create.input.parse(data);
      const res = await fetch(api.badHabits.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create habit");
      return api.badHabits.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.badHabits.list.path] }),
  });
}

export function useDeleteBadHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.badHabits.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete habit");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.badHabits.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.badHabitEntries.list.path] });
    },
  });
}

export function useBadHabitEntries(month?: string) {
  return useQuery({
    queryKey: [api.badHabitEntries.list.path, month],
    queryFn: async () => {
      const url = month 
        ? `${api.badHabitEntries.list.path}?month=${month}`
        : api.badHabitEntries.list.path;
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch entries");
      return api.badHabitEntries.list.responses[200].parse(await res.json());
    },
  });
}

export function useToggleBadHabitEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertEntry) => {
      const validated = api.badHabitEntries.createOrUpdate.input.parse(data);
      const res = await fetch(api.badHabitEntries.createOrUpdate.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update entry");
      return api.badHabitEntries.createOrUpdate.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.badHabitEntries.list.path] }),
  });
}
