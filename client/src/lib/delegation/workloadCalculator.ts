export interface MemberWorkload {
  memberId: string;
  memberName: string;
  assignedTasks: number;
  maxTasks: number;
  capacityPercent: number;
  status: "Good" | "Busy" | "Overloaded";
  overdueTasks: number;
}

export interface WorkloadSummary {
  members: MemberWorkload[];
  totalTasks: number;
  averageCapacity: number;
  overloadedCount: number;
}

export function calculateWorkload(
  members: Array<{
    id: string;
    name: string;
    currentTasks: number;
    maxTasks: number;
    overdueCount: number;
  }>
): WorkloadSummary {
  const memberWorkloads: MemberWorkload[] = members.map((m) => {
    const capacityPercent = Math.round((m.currentTasks / Math.max(m.maxTasks, 1)) * 100);
    const status: MemberWorkload["status"] =
      capacityPercent > 100 ? "Overloaded" : capacityPercent >= 80 ? "Busy" : "Good";
    return {
      memberId: m.id,
      memberName: m.name,
      assignedTasks: m.currentTasks,
      maxTasks: m.maxTasks,
      capacityPercent,
      status,
      overdueTasks: m.overdueCount,
    };
  });

  const totalTasks = memberWorkloads.reduce((s, m) => s + m.assignedTasks, 0);
  const averageCapacity =
    memberWorkloads.length > 0
      ? Math.round(memberWorkloads.reduce((s, m) => s + m.capacityPercent, 0) / memberWorkloads.length)
      : 0;
  const overloadedCount = memberWorkloads.filter((m) => m.status === "Overloaded").length;

  return { members: memberWorkloads, totalTasks, averageCapacity, overloadedCount };
}

export interface BalanceSuggestion {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  taskCount: number;
  reason: string;
}

export function suggestAutoBalance(workload: WorkloadSummary): BalanceSuggestion[] {
  const suggestions: BalanceSuggestion[] = [];
  const overloaded = workload.members.filter((m) => m.status === "Overloaded");
  const available = workload.members.filter((m) => m.status === "Good" && m.capacityPercent < 70);

  for (const from of overloaded) {
    const to = available[0];
    if (!to) continue;
    const excess = Math.ceil((from.assignedTasks - from.maxTasks) / 2);
    suggestions.push({
      fromMemberId: from.memberId,
      fromMemberName: from.memberName,
      toMemberId: to.memberId,
      toMemberName: to.memberName,
      taskCount: Math.max(1, excess),
      reason: `${from.memberName} is at ${from.capacityPercent}% capacity`,
    });
  }
  return suggestions;
}
