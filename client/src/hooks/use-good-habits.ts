import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { insertGoodHabitSchema, insertGoodHabitEntrySchema } from "@shared/schema";
import { z } from "zod";

type InsertGoodHabit = z.infer<typeof insertGoodHabitSchema>;
type InsertEntry = z.infer<typeof insertGoodHabitEntrySchema>;

export function useGoodHabits() {
  return useQuery({
    queryKey: [api.goodHabits.list.path],
    queryFn: async () => {
      const res = await fetch(api.goodHabits.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch habits");
      return api.goodHabits.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateGoodHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertGoodHabit, "userId">) => {
      const validated = api.goodHabits.create.input.parse(data);
      const res = await fetch(api.goodHabits.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create habit");
      return api.goodHabits.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.goodHabits.list.path] }),
  });
}

export function useUpdateGoodHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const url = buildUrl(api.goodHabits.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update habit");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.goodHabits.list.path] }),
  });
}

export function useDeleteGoodHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.goodHabits.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete habit");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.goodHabits.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.goodHabitEntries.list.path] });
    },
  });
}

export function useGoodHabitEntries(month?: string) {
  return useQuery({
    queryKey: [api.goodHabitEntries.list.path, month],
    queryFn: async () => {
      const url = month 
        ? `${api.goodHabitEntries.list.path}?month=${month}`
        : api.goodHabitEntries.list.path;
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch entries");
      return api.goodHabitEntries.list.responses[200].parse(await res.json());
    },
  });
}

export function useToggleGoodHabitEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertEntry) => {
      const validated = api.goodHabitEntries.createOrUpdate.input.parse(data);
      const res = await fetch(api.goodHabitEntries.createOrUpdate.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update entry");
      return api.goodHabitEntries.createOrUpdate.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.goodHabitEntries.list.path] }),
  });
}
