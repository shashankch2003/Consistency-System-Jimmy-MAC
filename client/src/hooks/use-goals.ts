import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Yearly Goals
export function useYearlyGoals(year: number) {
  return useQuery({
    queryKey: ['/api/yearly-goals', year],
    queryFn: async () => {
      const res = await fetch(`/api/yearly-goals?year=${year}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch yearly goals");
      return await res.json();
    },
  });
}

export function useCreateYearlyGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { year: number; goalName: string; description?: string; rating?: number }) => {
      const res = await apiRequest("POST", "/api/yearly-goals", data);
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/yearly-goals'] }),
  });
}

export function useUpdateYearlyGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; goalName?: string; description?: string; rating?: number }) => {
      const res = await apiRequest("PUT", `/api/yearly-goals/${id}`, data);
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/yearly-goals'] }),
  });
}

export function useDeleteYearlyGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/yearly-goals/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/yearly-goals'] }),
  });
}

// Monthly Overview Goals
export function useMonthlyOverviewGoals(year: number) {
  return useQuery({
    queryKey: ['/api/monthly-overview-goals', year],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-overview-goals?year=${year}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch monthly overview goals");
      return await res.json();
    },
  });
}

export function useUpsertMonthlyOverviewGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { year: number; month: number; mainGoal: string; description?: string; rating?: number }) => {
      const res = await apiRequest("POST", "/api/monthly-overview-goals", data);
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/monthly-overview-goals'] }),
  });
}

// Monthly Dynamic Goals
export function useMonthlyDynamicGoals(year: number, month: number) {
  return useQuery({
    queryKey: ['/api/monthly-dynamic-goals', year, month],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-dynamic-goals?year=${year}&month=${month}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch monthly dynamic goals");
      return await res.json();
    },
  });
}

export function useCreateMonthlyDynamicGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { year: number; month: number; title: string; description?: string; rating?: number; status?: string }) => {
      const res = await apiRequest("POST", "/api/monthly-dynamic-goals", data);
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/monthly-dynamic-goals'] }),
  });
}

export function useUpdateMonthlyDynamicGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; title?: string; description?: string; rating?: number; status?: string }) => {
      const res = await apiRequest("PUT", `/api/monthly-dynamic-goals/${id}`, data);
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/monthly-dynamic-goals'] }),
  });
}

export function useDeleteMonthlyDynamicGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/monthly-dynamic-goals/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/monthly-dynamic-goals'] }),
  });
}
