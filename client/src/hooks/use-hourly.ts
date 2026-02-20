import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { insertHourlyEntrySchema } from "@shared/schema";
import { z } from "zod";

type InsertEntry = z.infer<typeof insertHourlyEntrySchema>;

export function useHourlyEntries(date: string) {
  return useQuery({
    queryKey: [api.hourlyEntries.list.path, date],
    queryFn: async () => {
      const url = `${api.hourlyEntries.list.path}?date=${date}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch entries");
      return api.hourlyEntries.list.responses[200].parse(await res.json());
    },
  });
}

export function useHourlyEntriesByMonth(month: string) {
  return useQuery({
    queryKey: [api.hourlyEntries.list.path, "month", month],
    queryFn: async () => {
      const url = `${api.hourlyEntries.list.path}?month=${month}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch monthly entries");
      return api.hourlyEntries.list.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateHourlyEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertEntry, "userId">) => {
      const validated = api.hourlyEntries.createOrUpdate.input.parse(data);
      const res = await fetch(api.hourlyEntries.createOrUpdate.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update entry");
      return api.hourlyEntries.createOrUpdate.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [api.hourlyEntries.list.path, variables.date] 
      });
      queryClient.invalidateQueries({
        queryKey: [api.hourlyEntries.list.path, "month"],
      });
    },
  });
}
