export interface DocGenConfig {
  dateRange: "this_week" | "last_week" | "this_month" | "last_month" | "custom";
  customStart?: string;
  customEnd?: string;
  projectName?: string;
  includeTasks: boolean;
  includeNotes: boolean;
  includeGroupMessages: boolean;
  includeActivity: boolean;
}

export interface GatheredData {
  tasks: Array<{ id: number; title: string; completionPercentage: number; date?: string; priority?: string }>;
  notes: Array<{ id: number; title: string; updatedAt?: string }>;
  groupMessages: Array<{ id: number; message: string; userId: string; createdAt?: string }>;
  dateRange: { start: string; end: string };
  projectName?: string;
}

function getDateRange(config: DocGenConfig): { start: string; end: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  if (config.dateRange === "custom" && config.customStart && config.customEnd) {
    return { start: config.customStart, end: config.customEnd };
  }
  if (config.dateRange === "this_week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { start: fmt(start), end: fmt(now) };
  }
  if (config.dateRange === "last_week") {
    const end = new Date(now);
    end.setDate(now.getDate() - now.getDay() - 1);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { start: fmt(start), end: fmt(end) };
  }
  if (config.dateRange === "this_month") {
    return { start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end: fmt(now) };
  }
  if (config.dateRange === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: fmt(start), end: fmt(end) };
  }
  const start = new Date(now);
  start.setDate(now.getDate() - 7);
  return { start: fmt(start), end: fmt(now) };
}

function isInRange(dateStr: string | undefined, range: { start: string; end: string }): boolean {
  if (!dateStr) return false;
  return dateStr >= range.start && dateStr <= range.end;
}

export function gatherData(
  config: DocGenConfig,
  allTasks: Array<{ id: number; title: string; completionPercentage: number; date?: string; priority?: string }>,
  allNotes: Array<{ id: number; title: string; updatedAt?: string }>,
  allMessages: Array<{ id: number; message: string; userId: string; createdAt?: string }>
): GatheredData {
  const dateRange = getDateRange(config);

  const tasks = config.includeTasks
    ? allTasks.filter((t) => isInRange(t.date, dateRange))
    : [];

  const notes = config.includeNotes
    ? allNotes.filter((n) => isInRange(n.updatedAt?.slice(0, 10), dateRange))
    : [];

  const groupMessages = config.includeGroupMessages
    ? allMessages.filter((m) => isInRange(m.createdAt?.slice(0, 10), dateRange))
    : [];

  return { tasks, notes, groupMessages, dateRange, projectName: config.projectName };
}
