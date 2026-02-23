import { db } from "./db";
import { eq, and, inArray } from "drizzle-orm";
import {
  tasks, goodHabits, goodHabitEntries, badHabits, badHabitEntries,
  hourlyEntries, userLevels, monthlyEvaluations, userSettings,
  LEVELS, LEVEL_INDEX, LEVEL_REQUIREMENTS, type Level,
} from "@shared/schema";

interface DailyMetrics {
  date: string;
  taskCompletionPct: number;
  goodHabitsPct: number;
  hourlyCompletionPct: number;
  badHabitsPct: number;
}

function getLevelForQualifyingDays(
  qualifyingDaysPerLevel: Record<string, number>,
  consecutiveMonths: number,
  totalDaysTracked: number
): Level {
  const levelsDescending = [...LEVELS].reverse();

  for (const level of levelsDescending) {
    if (level === "Unproductive") continue;
    const req = LEVEL_REQUIREMENTS[level];
    const qualDays = qualifyingDaysPerLevel[level] || 0;

    if (level === "Elite") {
      const eliteQualified = qualDays >= 26 || (qualDays === totalDaysTracked && totalDaysTracked > 0);
      if (eliteQualified && consecutiveMonths + 1 >= req.consecutiveMonths) {
        return level;
      }
      continue;
    }

    if (qualDays >= req.days && consecutiveMonths + 1 >= req.consecutiveMonths) {
      return level;
    }
  }

  return "Unproductive";
}

export async function computeDailyMetrics(userId: string, date: string): Promise<DailyMetrics> {
  const dayTasks = await db.select().from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.date, date)));

  let taskCompletionPct = 0;
  if (dayTasks.length > 0) {
    const totalCompletion = dayTasks.reduce((sum, t) => sum + (t.completionPercentage || 0), 0);
    taskCompletionPct = Math.round(totalCompletion / dayTasks.length);
  }

  const userGoodHabits = await db.select().from(goodHabits)
    .where(eq(goodHabits.userId, userId));

  let goodHabitsPct = 0;
  if (userGoodHabits.length > 0) {
    const habitIds = userGoodHabits.map(h => h.id);
    const dayEntries = await db.select().from(goodHabitEntries)
      .where(and(inArray(goodHabitEntries.habitId, habitIds), eq(goodHabitEntries.date, date)));
    const completedCount = dayEntries.filter(e => e.completed).length;
    goodHabitsPct = Math.round((completedCount / userGoodHabits.length) * 100);
  }

  const dayHourly = await db.select().from(hourlyEntries)
    .where(and(eq(hourlyEntries.userId, userId), eq(hourlyEntries.date, date)));

  let hourlyCompletionPct = 0;
  if (dayHourly.length > 0) {
    const totalScore = dayHourly.reduce((sum, h) => sum + (h.productivityScore || 0), 0);
    hourlyCompletionPct = Math.round((totalScore / (dayHourly.length * 10)) * 100);
  }

  const userBadHabits = await db.select().from(badHabits)
    .where(eq(badHabits.userId, userId));

  let badHabitsPct = 0;
  if (userBadHabits.length > 0) {
    const badHabitIds = userBadHabits.map(h => h.id);
    const dayBadEntries = await db.select().from(badHabitEntries)
      .where(and(inArray(badHabitEntries.habitId, badHabitIds), eq(badHabitEntries.date, date)));
    const occurredCount = dayBadEntries.filter(e => e.occurred).length;
    badHabitsPct = Math.round((occurredCount / userBadHabits.length) * 100);
  }

  return { date, taskCompletionPct, goodHabitsPct, hourlyCompletionPct, badHabitsPct };
}

function doesDayQualifyForLevel(metrics: DailyMetrics, level: string, hourlyTrackingEnabled: boolean = true): boolean {
  if (level === "Unproductive") return true;
  const req = LEVEL_REQUIREMENTS[level];
  if (!req) return false;

  if (level === "Elite") {
    const baseQualifies = metrics.taskCompletionPct >= 95 &&
      metrics.goodHabitsPct >= 95 &&
      metrics.badHabitsPct === 0;
    return hourlyTrackingEnabled ? (baseQualifies && metrics.hourlyCompletionPct >= 95) : baseQualifies;
  }

  const baseQualifies = metrics.taskCompletionPct >= req.percent &&
    metrics.goodHabitsPct >= req.percent &&
    metrics.badHabitsPct === 0;
  return hourlyTrackingEnabled ? (baseQualifies && metrics.hourlyCompletionPct >= req.percent) : baseQualifies;
}

export async function evaluateMonth(userId: string, yearMonth: string): Promise<{
  level: Level;
  qualifyingDays: Record<string, number>;
  avgTaskCompletion: number;
  avgGoodHabits: number;
  avgHourlyCompletion: number;
  badHabitDays: number;
}> {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const daysInMonth = new Date(year, month, 0).getDate();

  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  const hourlyTrackingEnabled = settings?.hourlyTrackingEnabled ?? true;

  const allMetrics: DailyMetrics[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yearMonth}-${d.toString().padStart(2, "0")}`;
    const today = new Date().toISOString().split("T")[0];
    if (dateStr > today) break;
    const metrics = await computeDailyMetrics(userId, dateStr);
    allMetrics.push(metrics);
  }

  const qualifyingDaysPerLevel: Record<string, number> = {};
  for (const level of LEVELS) {
    if (level === "Unproductive") continue;
    qualifyingDaysPerLevel[level] = allMetrics.filter(m => doesDayQualifyForLevel(m, level, hourlyTrackingEnabled)).length;
  }

  const eliteDays95 = allMetrics.filter(m => doesDayQualifyForLevel(m, "Elite", hourlyTrackingEnabled)).length;
  const perfectDays = allMetrics.filter(m => {
    const base = m.taskCompletionPct === 100 && m.goodHabitsPct === 100 && m.badHabitsPct === 0;
    return hourlyTrackingEnabled ? (base && m.hourlyCompletionPct === 100) : base;
  }).length;

  if (eliteDays95 === allMetrics.length && allMetrics.length > 0) {
    qualifyingDaysPerLevel["Elite"] = allMetrics.length;
  } else if (perfectDays >= 26) {
    qualifyingDaysPerLevel["Elite"] = perfectDays;
  } else {
    qualifyingDaysPerLevel["Elite"] = 0;
  }

  const existing = await db.select().from(userLevels)
    .where(eq(userLevels.userId, userId));
  const consecutiveMonths = existing.length > 0 ? existing[0].consecutiveMonths : 0;

  const newLevel = getLevelForQualifyingDays(qualifyingDaysPerLevel, consecutiveMonths, allMetrics.length);

  const avgTaskCompletion = allMetrics.length > 0
    ? Math.round(allMetrics.reduce((s, m) => s + m.taskCompletionPct, 0) / allMetrics.length) : 0;
  const avgGoodHabits = allMetrics.length > 0
    ? Math.round(allMetrics.reduce((s, m) => s + m.goodHabitsPct, 0) / allMetrics.length) : 0;
  const avgHourlyCompletion = allMetrics.length > 0
    ? Math.round(allMetrics.reduce((s, m) => s + m.hourlyCompletionPct, 0) / allMetrics.length) : 0;
  const badHabitDays = allMetrics.filter(m => m.badHabitsPct > 0).length;

  return {
    level: newLevel,
    qualifyingDays: qualifyingDaysPerLevel,
    avgTaskCompletion,
    avgGoodHabits,
    avgHourlyCompletion,
    badHabitDays,
  };
}

export async function runMonthlyEvaluation(userId: string, yearMonth: string): Promise<{
  previousLevel: Level;
  newLevel: Level;
  evaluation: any;
}> {
  const result = await evaluateMonth(userId, yearMonth);

  const existing = await db.select().from(userLevels)
    .where(eq(userLevels.userId, userId));

  const previousLevel: Level = (existing.length > 0 ? existing[0].level : "Unproductive") as Level;
  const prevConsecutive = existing.length > 0 ? existing[0].consecutiveMonths : 0;

  const newLevelIdx = LEVEL_INDEX[result.level];
  const prevLevelIdx = LEVEL_INDEX[previousLevel];

  let newConsecutive: number;
  if (newLevelIdx >= prevLevelIdx && newLevelIdx > 0) {
    newConsecutive = prevConsecutive + 1;
  } else if (newLevelIdx === 0) {
    newConsecutive = 0;
  } else {
    newConsecutive = 1;
  }

  if (existing.length > 0) {
    await db.update(userLevels)
      .set({
        level: result.level,
        consecutiveMonths: newConsecutive,
        lastEvaluatedMonth: yearMonth,
        updatedAt: new Date(),
      })
      .where(eq(userLevels.userId, userId));
  } else {
    await db.insert(userLevels).values({
      userId,
      level: result.level,
      consecutiveMonths: newConsecutive,
      lastEvaluatedMonth: yearMonth,
    });
  }

  const highestLevel = result.level;

  const existingEval = await db.select().from(monthlyEvaluations)
    .where(and(eq(monthlyEvaluations.userId, userId), eq(monthlyEvaluations.month, yearMonth)));

  if (existingEval.length > 0) {
    await db.update(monthlyEvaluations)
      .set({
        qualifyingDays: result.qualifyingDays["Bronze"] || 0,
        highestQualifiedLevel: highestLevel,
        avgTaskCompletion: result.avgTaskCompletion,
        avgGoodHabits: result.avgGoodHabits,
        avgHourlyCompletion: result.avgHourlyCompletion,
        badHabitDays: result.badHabitDays,
      })
      .where(eq(monthlyEvaluations.id, existingEval[0].id));
  } else {
    await db.insert(monthlyEvaluations).values({
      userId,
      month: yearMonth,
      qualifyingDays: result.qualifyingDays["Bronze"] || 0,
      highestQualifiedLevel: highestLevel,
      avgTaskCompletion: result.avgTaskCompletion,
      avgGoodHabits: result.avgGoodHabits,
      avgHourlyCompletion: result.avgHourlyCompletion,
      badHabitDays: result.badHabitDays,
    });
  }

  return { previousLevel, newLevel: result.level, evaluation: result };
}

export async function getCurrentLevelStatus(userId: string): Promise<{
  level: Level;
  consecutiveMonths: number;
  currentMonthProgress: {
    qualifyingDays: Record<string, number>;
    avgTaskCompletion: number;
    avgGoodHabits: number;
    avgHourlyCompletion: number;
    badHabitDays: number;
    daysTracked: number;
  };
  nextLevel: Level | null;
  nextLevelRequirements: { percent: number; days: number; consecutiveMonths: number } | null;
}> {
  const existing = await db.select().from(userLevels)
    .where(eq(userLevels.userId, userId));

  const level: Level = (existing.length > 0 ? existing[0].level : "Unproductive") as Level;
  const consecutiveMonths = existing.length > 0 ? existing[0].consecutiveMonths : 0;

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
  const result = await evaluateMonth(userId, yearMonth);

  const levelIdx = LEVEL_INDEX[level];
  const nextLevel = levelIdx < LEVELS.length - 1 ? LEVELS[levelIdx + 1] : null;
  const nextLevelReqs = nextLevel ? LEVEL_REQUIREMENTS[nextLevel] : null;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();
  const daysTracked = Math.min(today, daysInMonth);

  return {
    level,
    consecutiveMonths,
    currentMonthProgress: {
      qualifyingDays: result.qualifyingDays,
      avgTaskCompletion: result.avgTaskCompletion,
      avgGoodHabits: result.avgGoodHabits,
      avgHourlyCompletion: result.avgHourlyCompletion,
      badHabitDays: result.badHabitDays,
      daysTracked,
    },
    nextLevel: nextLevel as Level | null,
    nextLevelRequirements: nextLevelReqs,
  };
}
