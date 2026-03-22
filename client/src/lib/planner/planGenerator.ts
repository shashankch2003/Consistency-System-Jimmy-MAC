export interface PlanTask {
  id: number;
  title: string;
  description?: string;
  priority?: string;
  date?: string;
  completionPercentage: number;
}

export type BlockType = "task" | "break" | "comms" | "focus" | "lunch";
export type Tier = "MUST_DO" | "SHOULD_DO" | "NICE_TO_DO";

export interface PlanBlock {
  id: string;
  type: BlockType;
  tier?: Tier;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  priority?: string;
  energyLevel?: string;
  linkedTaskId?: number;
  icon: string;
  borderColor: string;
}

export interface DailyPlan {
  blocks: PlanBlock[];
  counts: { mustDo: number; shouldDo: number; niceToDo: number };
  totalMinutes: number;
  reasoning: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  return dateStr < todayStr();
}

function isDueToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  return dateStr === todayStr();
}

function isDueIn(dateStr?: string, days = 3): boolean {
  if (!dateStr) return false;
  const target = new Date(dateStr);
  const limit = new Date();
  limit.setDate(limit.getDate() + days);
  return target <= limit;
}

function isImportant(task: PlanTask): boolean {
  const kw = ["urgent", "critical", "important", "asap", "deadline"];
  const text = (task.title + " " + (task.description ?? "")).toLowerCase();
  return kw.some((k) => text.includes(k)) || task.priority === "high";
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function makeBlock(
  type: BlockType,
  title: string,
  startTime: string,
  durationMinutes: number,
  opts: Partial<PlanBlock> = {}
): PlanBlock {
  return {
    id: crypto.randomUUID(),
    type,
    title,
    startTime,
    endTime: addMinutes(startTime, durationMinutes),
    durationMinutes,
    icon: opts.icon ?? (type === "break" ? "☕" : type === "comms" ? "💬" : type === "lunch" ? "🍽️" : "📋"),
    borderColor:
      opts.borderColor ??
      (type === "break" ? "#6b7280" : type === "comms" ? "#f59e0b" : type === "lunch" ? "#10b981" : "#3b82f6"),
    ...opts,
  };
}

export function generateDailyPlan(tasks: PlanTask[]): DailyPlan {
  const eligible = tasks.filter(
    (t) => t.completionPercentage < 100 && isDueIn(t.date, 7)
  );

  const mustDo = eligible.filter(
    (t) => isDueToday(t.date) || isOverdue(t.date) || isImportant(t)
  );
  const shouldDo = eligible.filter(
    (t) => !mustDo.includes(t) && isDueIn(t.date, 3)
  );
  const niceToDo = eligible.filter(
    (t) => !mustDo.includes(t) && !shouldDo.includes(t)
  );

  const blocks: PlanBlock[] = [];
  let cursor = "09:00";

  blocks.push(makeBlock("comms", "Morning Messages & Emails", cursor, 30, {
    icon: "💬", borderColor: "#f59e0b", tier: undefined,
  }));
  cursor = addMinutes(cursor, 30);

  let blockCount = 0;
  for (const task of mustDo) {
    if (cursor >= "12:00") break;
    blocks.push(makeBlock("task", task.title, cursor, 30, {
      tier: "MUST_DO",
      icon: "🔴",
      borderColor: "#ef4444",
      priority: "MUST DO",
      energyLevel: "High",
      linkedTaskId: task.id,
    }));
    cursor = addMinutes(cursor, 30);
    blockCount++;
    if (blockCount % 3 === 0) {
      blocks.push(makeBlock("break", "Short Break", cursor, 15, { icon: "☕" }));
      cursor = addMinutes(cursor, 15);
    }
  }

  blocks.push(makeBlock("lunch", "Lunch Break", "12:00", 60, { icon: "🍽️", borderColor: "#10b981" }));
  cursor = "13:00";

  blocks.push(makeBlock("comms", "Post-Lunch Messages", cursor, 30, { icon: "💬", borderColor: "#f59e0b" }));
  cursor = addMinutes(cursor, 30);

  blockCount = 0;
  for (const task of shouldDo) {
    if (cursor >= "17:00") break;
    blocks.push(makeBlock("task", task.title, cursor, 30, {
      tier: "SHOULD_DO",
      icon: "🟡",
      borderColor: "#3b82f6",
      priority: "Should Do",
      energyLevel: "Medium",
      linkedTaskId: task.id,
    }));
    cursor = addMinutes(cursor, 30);
    blockCount++;
    if (blockCount % 3 === 0) {
      blocks.push(makeBlock("break", "Short Break", cursor, 15, { icon: "☕" }));
      cursor = addMinutes(cursor, 15);
    }
  }

  for (const task of niceToDo.slice(0, 2)) {
    if (cursor >= "17:30") break;
    blocks.push(makeBlock("task", task.title, cursor, 30, {
      tier: "NICE_TO_DO",
      icon: "🟢",
      borderColor: "#8b5cf6",
      priority: "Nice to Do",
      energyLevel: "Low",
      linkedTaskId: task.id,
    }));
    cursor = addMinutes(cursor, 30);
  }

  blocks.push(makeBlock("break", "End of Day Buffer", cursor, 30, { icon: "📊" }));

  const totalMinutes = blocks
    .filter((b) => b.type === "task")
    .reduce((s, b) => s + b.durationMinutes, 0);

  const reasoning = [
    mustDo.length > 0 && `${mustDo.length} must-do task${mustDo.length > 1 ? "s" : ""} scheduled during peak hours (10–12).`,
    shouldDo.length > 0 && `${shouldDo.length} should-do task${shouldDo.length > 1 ? "s" : ""} placed for afternoon focus.`,
    niceToDo.length > 0 && `${niceToDo.length} nice-to-do task${niceToDo.length > 1 ? "s" : ""} at end of day.`,
    "Breaks every 90 min to maintain energy.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    blocks,
    counts: { mustDo: mustDo.length, shouldDo: shouldDo.length, niceToDo: niceToDo.length },
    totalMinutes,
    reasoning: reasoning || "Your day is planned for optimal productivity.",
  };
}
