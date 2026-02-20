import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useTaskBankItems() {
  return useQuery({
    queryKey: [api.taskBank.list.path],
    queryFn: async () => {
      const res = await fetch(api.taskBank.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch task bank items");
      return api.taskBank.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateTaskBankItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string }) => {
      const validated = api.taskBank.create.input.parse(data);
      const res = await fetch(api.taskBank.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create task bank item");
      return api.taskBank.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.taskBank.list.path] }),
  });
}

export function useDeleteTaskBankItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.taskBank.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete task bank item");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.taskBank.list.path] }),
  });
}

export function useAssignTaskBankItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, date }: { id: number; date: string }) => {
      const url = buildUrl(api.taskBank.assign.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to assign task");
      return api.taskBank.assign.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.taskBank.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
    },
  });
}
