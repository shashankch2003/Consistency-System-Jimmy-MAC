import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useDailyScore(date: string) {
  return useQuery({
    queryKey: [api.dailyScore.get.path, date],
    queryFn: async () => {
      const res = await fetch(`${api.dailyScore.get.path}?date=${date}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch daily score");
      return api.dailyScore.get.responses[200].parse(await res.json());
    },
    enabled: !!date,
  });
}

export function useDailyScoreRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: [api.dailyScore.range.path, startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`${api.dailyScore.range.path}?startDate=${startDate}&endDate=${endDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch daily score range");
      return api.dailyScore.range.responses[200].parse(await res.json());
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useDailyReason(date: string) {
  return useQuery({
    queryKey: [api.dailyReasons.get.path, date],
    queryFn: async () => {
      const res = await fetch(`${api.dailyReasons.get.path}?date=${date}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch daily reason");
      return await res.json();
    },
    enabled: !!date,
  });
}

export function useUpsertDailyReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { date: string; reason: string }) => {
      const res = await fetch(api.dailyReasons.upsert.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save reason");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.dailyReasons.get.path, variables.date] });
    },
  });
}
