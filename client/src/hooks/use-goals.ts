import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { insertGoalSchema } from "@shared/schema";
import { z } from "zod";

type InsertGoal = z.infer<typeof insertGoalSchema>;

export function useGoals() {
  return useQuery({
    queryKey: [api.goals.list.path],
    queryFn: async () => {
      const res = await fetch(api.goals.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch goals");
      return api.goals.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertGoal, "userId">) => {
      const validated = api.goals.create.input.parse(data);
      const res = await fetch(api.goals.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create goal");
      return api.goals.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.goals.list.path] }),
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertGoal>) => {
      const validated = api.goals.update.input.parse(data);
      const url = buildUrl(api.goals.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update goal");
      return api.goals.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.goals.list.path] }),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.goals.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete goal");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.goals.list.path] }),
  });
}
