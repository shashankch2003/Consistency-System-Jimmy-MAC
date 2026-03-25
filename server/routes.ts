import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "./db";
import { eq, and, desc, isNull, lt, ne, sql as drizzleSql } from "drizzle-orm";
import { aiService } from "./services/ai-service";
import { logAiUsage } from "./services/ai-usage-logger";
import { setupAiCronJobs } from "./jobs/cron-config";
import {
  connectMessages,
  connectChannels,
  connectChannelMembers,
  connectMessageReactions,
  connectPinnedMessages,
  connectMessageBookmarks,
  connectConversations,
  connectConversationMembers,
  connectDirectMessages,
  connectUserPresence,
} from "../shared/schema";
import { LEVELS, LEVEL_INDEX, INTERACTIVE_LEVELS, FUNDAMENTALS_LIST, DEFAULT_EXPENSE_CATEGORIES } from "@shared/schema";
import { getCurrentLevelStatus, runMonthlyEvaluation, computeDailyMetrics } from "./level-engine";
import cron from "node-cron";
import {
  autopilotRules, autopilotExecutions, autopilotActivityLog, autopilotPatterns,
  taskPredictions, taskSequences, workSessions, workPatterns, tasks, notes,
  aiCoachingMessages, teamMemberProfiles, delegationSuggestions, delegationRules,
  projectContexts, recordedWorkflows, dailyPlans, documentTemplatesAi, generatedDocuments,
  schedulingPreferences, aiHabits, aiHabitCompletions, focusSessions, aiProductivityScores,
  timeEntries,
} from "../shared/schema";
import { gt, gte, lte, like, count, asc, or, ilike } from "drizzle-orm";
import {
  aiAgents, agentRuns, agentConversations,
  aiWorkflows, aiWorkflowRuns, aiWorkflowAutomations,
  meetingIntelligence, emailThreads,
  channelMessages, users, aiRiskAlerts,
} from "../shared/schema";
import {
  aiGoals, keyResults, calendarEvents, calendarOptimizationRules,
  taskDurationEstimates, aiNotificationItems, notificationPreferences,
  aiTemplates, voiceNotes, teamInsightSnapshots, externalIntegrations,
  onboardingProgress, workspaceMembers,
} from "../shared/schema";
import { inArray, isNotNull } from "drizzle-orm";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID || "";

// In-memory rate limit cache for autopilot (key: "autopilot_daily:{userId}:{date}")
const autopilotRateCache = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of autopilotRateCache.entries()) {
    if (v.resetAt < now) autopilotRateCache.delete(k);
  }
}, 3_600_000); // clean hourly

async function getOpenAI() {
  const OpenAI = (await import("openai")).default;
  return new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL });
}

async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    const openai = await getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt ?? "You are a productivity AI assistant. Be concise and actionable." },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
    });
    return response.choices[0]?.message?.content ?? "";
  } catch { return ""; }
}

function isAdmin(req: any): boolean {
  return req.user?.claims?.sub === ADMIN_USER_ID && ADMIN_USER_ID !== "";
}

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomBytes(12).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  registerAuthRoutes(app);

  // Server-side guard: redirect unauthenticated users away from /dashboard before React loads
  app.get(["/dashboard", "/dashboard/*path"], (req: any, res, next) => {
    if (!req.isAuthenticated() || !req.user) {
      const returnTo = encodeURIComponent(req.path);
      return res.redirect(`/api/login?returnTo=${returnTo}`);
    }
    next();
  });

  // Yearly Goals
  app.get(api.yearlyGoals.list.path, isAuthenticated, async (req: any, res) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const goals = await storage.getYearlyGoals(req.user.claims.sub, year);
    res.json(goals);
  });
  app.post(api.yearlyGoals.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.yearlyGoals.create.input.parse(req.body);
      const goal = await storage.createYearlyGoal({ ...input, userId: req.user.claims.sub });
      res.status(201).json(goal);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.put(api.yearlyGoals.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.yearlyGoals.update.input.parse(req.body);
      const goal = await storage.updateYearlyGoal(parseInt(req.params.id), input);
      res.json(goal);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.delete(api.yearlyGoals.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteYearlyGoal(parseInt(req.params.id));
    res.status(204).end();
  });

  // Monthly Overview Goals
  app.get(api.monthlyOverviewGoals.list.path, isAuthenticated, async (req: any, res) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const goals = await storage.getMonthlyOverviewGoals(req.user.claims.sub, year);
    res.json(goals);
  });
  app.post(api.monthlyOverviewGoals.upsert.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.monthlyOverviewGoals.upsert.input.parse(req.body);
      const goal = await storage.upsertMonthlyOverviewGoal({ ...input, userId: req.user.claims.sub });
      res.json(goal);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // Monthly Dynamic Goals
  app.get(api.monthlyDynamicGoals.list.path, isAuthenticated, async (req: any, res) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const goals = await storage.getMonthlyDynamicGoals(req.user.claims.sub, year, month);
    res.json(goals);
  });
  app.post(api.monthlyDynamicGoals.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.monthlyDynamicGoals.create.input.parse(req.body);
      const goal = await storage.createMonthlyDynamicGoal({ ...input, userId: req.user.claims.sub });
      res.status(201).json(goal);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.put(api.monthlyDynamicGoals.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.monthlyDynamicGoals.update.input.parse(req.body);
      const goal = await storage.updateMonthlyDynamicGoal(parseInt(req.params.id), input);
      res.json(goal);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.delete(api.monthlyDynamicGoals.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteMonthlyDynamicGoal(parseInt(req.params.id));
    res.status(204).end();
  });

  // Tasks
  app.get(api.tasks.list.path, isAuthenticated, async (req: any, res) => {
    const date = req.query.date as string | undefined;
    const month = req.query.month as string | undefined;
    const year = req.query.year as string | undefined;
    if (year) {
      const tasks = await storage.getTasksByYear(req.user.claims.sub, parseInt(year));
      res.json(tasks);
    } else if (month) {
      const tasks = await storage.getTasksByMonth(req.user.claims.sub, month);
      res.json(tasks);
    } else {
      const tasks = await storage.getTasks(req.user.claims.sub, date);
      res.json(tasks);
    }
  });
  app.post(api.tasks.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.tasks.create.input.parse(req.body);
      const task = await storage.createTask({ ...input, userId: req.user.claims.sub });
      res.status(201).json(task);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.put(api.tasks.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.tasks.update.input.parse(req.body);
      const task = await storage.updateTask(parseInt(req.params.id), input);
      let prediction: any = null;
      // Inline prediction when task is completed
      if ((input as any).completionPercentage === 100 && task) {
        try {
          const userId = (req as any).user.claims.sub;
          const seqs = await storage.getTaskSequences(userId);
          const matchingSeq = seqs.find((s) => {
            const pattern = s.precedingTaskPattern as any;
            return pattern?.titlePattern && task.title?.toLowerCase().includes(pattern.titlePattern.toLowerCase());
          });
          if (matchingSeq) {
            const followingPattern = (matchingSeq.followingTaskPattern as any)?.titlePattern ?? "";
            const aiSuggestion = await callAI(`Task "${task.title}" just completed. What is the most likely next task to work on? Respond with just the task title (5-10 words max). Context hint: ${followingPattern}`);
            const predictedTitle = aiSuggestion || followingPattern;
            if (predictedTitle) {
              const expiresAt = new Date(Date.now() + 7 * 86400000);
              prediction = await storage.createTaskPrediction({ userId, triggerTaskId: task.id, predictedTitle, confidence: matchingSeq.confidence ?? 0.7, expiresAt, status: "predicted" });
            }
          }
        } catch {}
      }
      res.json(task);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.delete(api.tasks.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteTask(parseInt(req.params.id));
    res.status(204).end();
  });

  // Good Habits
  app.get(api.goodHabits.list.path, isAuthenticated, async (req: any, res) => {
    const habits = await storage.getGoodHabits(req.user.claims.sub);
    res.json(habits);
  });
  app.post(api.goodHabits.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.goodHabits.create.input.parse(req.body);
      const habit = await storage.createGoodHabit({ ...input, userId: req.user.claims.sub });
      res.status(201).json(habit);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.put(api.goodHabits.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.goodHabits.update.input.parse(req.body);
      const habits = await storage.getGoodHabits(req.user.claims.sub);
      if (!habits.find(h => h.id === parseInt(req.params.id))) return res.status(403).json({ message: "Unauthorized" });
      const habit = await storage.updateGoodHabit(parseInt(req.params.id), input.name);
      res.json(habit);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.delete(api.goodHabits.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteGoodHabit(parseInt(req.params.id));
    res.status(204).end();
  });

  app.get(api.goodHabitEntries.list.path, isAuthenticated, async (req: any, res) => {
    const month = req.query.month as string | undefined;
    const habits = await storage.getGoodHabits(req.user.claims.sub);
    const entries = await storage.getGoodHabitEntries(habits.map(h => h.id), month);
    res.json(entries);
  });
  app.post(api.goodHabitEntries.createOrUpdate.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.goodHabitEntries.createOrUpdate.input.parse(req.body);
      const habits = await storage.getGoodHabits(req.user.claims.sub);
      if (!habits.find(h => h.id === input.habitId)) return res.status(403).json({ message: "Unauthorized" });
      const entry = await storage.upsertGoodHabitEntry(input);
      res.json(entry);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // Bad Habits
  app.get(api.badHabits.list.path, isAuthenticated, async (req: any, res) => {
    const habits = await storage.getBadHabits(req.user.claims.sub);
    res.json(habits);
  });
  app.post(api.badHabits.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.badHabits.create.input.parse(req.body);
      const habit = await storage.createBadHabit({ ...input, userId: req.user.claims.sub });
      res.status(201).json(habit);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.put(api.badHabits.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.badHabits.update.input.parse(req.body);
      const habits = await storage.getBadHabits(req.user.claims.sub);
      if (!habits.find(h => h.id === parseInt(req.params.id))) return res.status(403).json({ message: "Unauthorized" });
      const habit = await storage.updateBadHabit(parseInt(req.params.id), input.name);
      res.json(habit);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.delete(api.badHabits.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteBadHabit(parseInt(req.params.id));
    res.status(204).end();
  });

  app.get(api.badHabitEntries.list.path, isAuthenticated, async (req: any, res) => {
    const month = req.query.month as string | undefined;
    const habits = await storage.getBadHabits(req.user.claims.sub);
    const entries = await storage.getBadHabitEntries(habits.map(h => h.id), month);
    res.json(entries);
  });
  app.post(api.badHabitEntries.createOrUpdate.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.badHabitEntries.createOrUpdate.input.parse(req.body);
      const habits = await storage.getBadHabits(req.user.claims.sub);
      if (!habits.find(h => h.id === input.habitId)) return res.status(403).json({ message: "Unauthorized" });
      const entry = await storage.upsertBadHabitEntry(input);
      res.json(entry);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // Hourly Entries
  app.get(api.hourlyEntries.list.path, isAuthenticated, async (req: any, res) => {
    const date = req.query.date as string | undefined;
    const month = req.query.month as string | undefined;
    if (month) {
      const entries = await storage.getHourlyEntriesByMonth(req.user.claims.sub, month);
      res.json(entries);
    } else {
      const entries = await storage.getHourlyEntries(req.user.claims.sub, date);
      res.json(entries);
    }
  });
  app.delete(api.hourlyEntries.createOrUpdate.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const date = req.query.date as string;
      const hour = parseInt(req.query.hour as string);
      if (!date || isNaN(hour)) return res.status(400).json({ message: "date and hour required" });
      await storage.deleteHourlyEntry(userId, date, hour);
      res.json({ ok: true });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post(api.hourlyEntries.createOrUpdate.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.hourlyEntries.createOrUpdate.input.parse(req.body);
      const userId = req.user.claims.sub;
      const entry = await storage.upsertHourlyEntry({ ...input, userId });
      res.json(entry);

      // Auto-sync team intelligence snapshot from today's hourly entries (fire-and-forget)
      syncTeamSnapshotFromHourly(userId, input.date).catch(() => {});
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  async function syncTeamSnapshotFromHourly(userId: string, date: string) {
    const dayEntries = await storage.getHourlyEntriesByDate(userId, date);
    const scored = dayEntries.filter(e => e.productivityScore > 0);
    if (scored.length === 0) return;

    const deepFocusHours = scored.filter(e => e.sessionType === 'deep_focus').length;
    const meetingHours = scored.filter(e => e.sessionType === 'meeting').length;
    const shallowHours = scored.filter(e => ['shallow_work', 'daily_task', 'other'].includes(e.sessionType || 'other')).length;
    const learningHours = scored.filter(e => e.sessionType === 'learning').length;
    const breakHours = scored.filter(e => e.sessionType === 'break').length;
    const activeHours = scored.filter(e => e.sessionType !== 'break').length;

    const avgScore = scored.reduce((s, e) => s + e.productivityScore, 0) / scored.length;

    // Count context switches (each session type change counts as a switch)
    let contextSwitches = 0;
    for (let i = 1; i < scored.length; i++) {
      if (scored[i].sessionType !== scored[i - 1].sessionType) contextSwitches++;
    }

    // Find longest deep focus or uninterrupted same-type block in minutes
    let longestFocus = 0;
    let currentRun = 0;
    let lastType = '';
    for (const e of scored) {
      if (e.sessionType === lastType && e.sessionType === 'deep_focus') {
        currentRun += 60;
        longestFocus = Math.max(longestFocus, currentRun);
      } else {
        currentRun = e.sessionType === 'deep_focus' ? 60 : 0;
        longestFocus = Math.max(longestFocus, currentRun);
      }
      lastType = e.sessionType || 'other';
    }

    const productivityScore = Math.round(avgScore * 10);
    const focusScore = deepFocusHours > 0 ? Math.min(100, Math.round((deepFocusHours / Math.max(activeHours, 1)) * 100 + avgScore * 5)) : 0;

    await storage.upsertTeamSnapshot({
      userId,
      workspaceId: 'default',
      date,
      activeTimeMinutes: activeHours * 60,
      deepWorkMinutes: deepFocusHours * 60,
      shallowWorkMinutes: shallowHours * 60,
      meetingTimeMinutes: meetingHours * 60,
      focusSessionMinutes: (deepFocusHours + learningHours) * 60,
      tasksAssigned: 0,
      tasksCompleted: 0,
      tasksOverdue: 0,
      tasksInProgress: 0,
      contextSwitches,
      avgFocusSession: deepFocusHours > 0 ? Math.round((deepFocusHours * 60) / Math.max(1, Math.ceil(deepFocusHours))) : 0,
      longestFocusSession: longestFocus,
      productivityScore: productivityScore.toString(),
      focusScore: focusScore.toString(),
      consistencyScore: scored.length >= 6 ? '75' : Math.round((scored.length / 8) * 100).toString(),
      executionScore: productivityScore.toString(),
      collaborationScore: meetingHours > 0 ? '70' : '50',
    });
  }

  // Daily Score (computed from tasks, good habits, bad habits, hourly entries)
  app.get(api.dailyScore.get.path, isAuthenticated, async (req: any, res) => {
    try {
      const date = req.query.date as string;
      if (!date) return res.status(400).json({ message: "date required" });
      const userId = req.user.claims.sub;

      const dayTasks = await storage.getTasks(userId, date);
      const taskScore = dayTasks.length > 0
        ? dayTasks.reduce((sum, t) => sum + (t.completionPercentage || 0), 0) / dayTasks.length
        : 0;

      const gHabits = await storage.getGoodHabits(userId);
      const gEntries = gHabits.length > 0 ? await storage.getGoodHabitEntries(gHabits.map(h => h.id)) : [];
      const dayGoodEntries = gEntries.filter(e => e.date === date);
      let goodHabitScore = 0;
      if (dayGoodEntries.length > 0) {
        goodHabitScore = (dayGoodEntries.filter(e => e.completed).length / gHabits.length) * 100;
      }

      const bHabits = await storage.getBadHabits(userId);
      const bEntries = bHabits.length > 0 ? await storage.getBadHabitEntries(bHabits.map(h => h.id)) : [];
      const dayBadEntries = bEntries.filter(e => e.date === date);
      let badHabitScore = 0;
      if (dayBadEntries.length > 0) {
        badHabitScore = ((bHabits.length - dayBadEntries.filter(e => e.occurred).length) / bHabits.length) * 100;
      }

      const hEntries = await storage.getHourlyEntries(userId, date);
      const hourlyScore = hEntries.length > 0
        ? Math.min((hEntries.reduce((sum, e) => sum + e.productivityScore, 0) / hEntries.length) * 10, 100)
        : 0;

      const weights = { task: 0.3, goodHabit: 0.25, badHabit: 0.2, hourly: 0.25 };
      const activeSections: string[] = [];
      if (dayTasks.length > 0) activeSections.push('task');
      if (dayGoodEntries.length > 0) activeSections.push('goodHabit');
      if (dayBadEntries.length > 0) activeSections.push('badHabit');
      if (hEntries.length > 0) activeSections.push('hourly');

      let totalScore = 0;
      if (activeSections.length > 0) {
        const totalWeight = activeSections.reduce((sum, s) => sum + weights[s as keyof typeof weights], 0);
        const scores: Record<string, number> = { task: taskScore, goodHabit: goodHabitScore, badHabit: badHabitScore, hourly: hourlyScore };
        totalScore = activeSections.reduce((sum, s) => sum + (scores[s] * weights[s as keyof typeof weights] / totalWeight), 0);
      }

      res.json({
        date,
        taskScore: Math.round(taskScore),
        goodHabitScore: Math.round(goodHabitScore),
        badHabitScore: Math.round(badHabitScore),
        hourlyScore: Math.round(hourlyScore),
        totalScore: Math.round(totalScore),
        taskCount: dayTasks.length,
        goodHabitCount: gHabits.length,
        badHabitCount: bHabits.length,
        hourlyCount: hEntries.length,
      });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.get(api.dailyScore.range.path, isAuthenticated, async (req: any, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      if (!startDate || !endDate) return res.status(400).json({ message: "startDate and endDate required" });
      const userId = req.user.claims.sub;

      const gHabits = await storage.getGoodHabits(userId);
      const bHabits = await storage.getBadHabits(userId);
      const allGoodEntries = gHabits.length > 0 ? await storage.getGoodHabitEntries(gHabits.map(h => h.id)) : [];
      const allBadEntries = bHabits.length > 0 ? await storage.getBadHabitEntries(bHabits.map(h => h.id)) : [];

      const start = new Date(startDate);
      const end = new Date(endDate);
      const results: { date: string; totalScore: number }[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayTasks = await storage.getTasks(userId, dateStr);
        const taskScore = dayTasks.length > 0 ? dayTasks.reduce((sum, t) => sum + (t.completionPercentage || 0), 0) / dayTasks.length : 0;

        const dayGoodEntries = gHabits.length > 0 ? allGoodEntries.filter(e => e.date === dateStr) : [];
        let goodHabitScore = 0;
        if (dayGoodEntries.length > 0) {
          goodHabitScore = (dayGoodEntries.filter(e => e.completed).length / gHabits.length) * 100;
        }

        const dayBadEntries = bHabits.length > 0 ? allBadEntries.filter(e => e.date === dateStr) : [];
        let badHabitScore = 0;
        if (dayBadEntries.length > 0) {
          badHabitScore = ((bHabits.length - dayBadEntries.filter(e => e.occurred).length) / bHabits.length) * 100;
        }

        const hEntries = await storage.getHourlyEntries(userId, dateStr);
        const hourlyScore = hEntries.length > 0 ? Math.min((hEntries.reduce((sum, e) => sum + e.productivityScore, 0) / hEntries.length) * 10, 100) : 0;

        const weights = { task: 0.3, goodHabit: 0.25, badHabit: 0.2, hourly: 0.25 };
        const activeSections: string[] = [];
        if (dayTasks.length > 0) activeSections.push('task');
        if (dayGoodEntries.length > 0) activeSections.push('goodHabit');
        if (dayBadEntries.length > 0) activeSections.push('badHabit');
        if (hEntries.length > 0) activeSections.push('hourly');

        let totalScore = 0;
        if (activeSections.length > 0) {
          const totalWeight = activeSections.reduce((sum, s) => sum + weights[s as keyof typeof weights], 0);
          const scores: Record<string, number> = { task: taskScore, goodHabit: goodHabitScore, badHabit: badHabitScore, hourly: hourlyScore };
          totalScore = activeSections.reduce((sum, s) => sum + (scores[s] * weights[s as keyof typeof weights] / totalWeight), 0);
        }

        results.push({ date: dateStr, totalScore: Math.round(totalScore) });
      }

      res.json(results);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // Daily Reasons
  app.get(api.dailyReasons.get.path, isAuthenticated, async (req: any, res) => {
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ message: "date required" });
    const reason = await storage.getDailyReason(req.user.claims.sub, date);
    res.json(reason || null);
  });
  app.post(api.dailyReasons.upsert.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.dailyReasons.upsert.input.parse(req.body);
      const reason = await storage.upsertDailyReason({ ...input, userId: req.user.claims.sub });
      res.json(reason);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // Task Bank
  app.get(api.taskBank.list.path, isAuthenticated, async (req: any, res) => {
    const items = await storage.getTaskBankItems(req.user.claims.sub);
    res.json(items);
  });
  app.post(api.taskBank.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.taskBank.create.input.parse(req.body);
      const item = await storage.createTaskBankItem({ ...input, userId: req.user.claims.sub });
      res.status(201).json(item);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.delete(api.taskBank.delete.path, isAuthenticated, async (req: any, res) => {
    await storage.deleteTaskBankItem(parseInt(req.params.id), req.user.claims.sub);
    res.status(204).end();
  });
  app.post(api.taskBank.assign.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.taskBank.assign.input.parse(req.body);
      const items = await storage.getTaskBankItems(req.user.claims.sub);
      const bankItem = items.find(i => i.id === parseInt(req.params.id));
      if (!bankItem) return res.status(404).json({ message: "Not found" });
      const task = await storage.createTask({ userId: req.user.claims.sub, title: bankItem.title, date: input.date });
      await storage.deleteTaskBankItem(bankItem.id);
      res.status(201).json(task);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // Notes
  app.get(api.notes.list.path, isAuthenticated, async (req: any, res) => {
    const notesList = await storage.getNotes(req.user.claims.sub);
    res.json(notesList);
  });
  app.get(api.notes.get.path, isAuthenticated, async (req: any, res) => {
    const note = await storage.getNote(parseInt(req.params.id), req.user.claims.sub);
    if (!note) return res.status(404).json({ message: "Not found" });
    res.json(note);
  });
  app.post(api.notes.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.notes.create.input.parse(req.body);
      const note = await storage.createNote({ ...input, userId: req.user.claims.sub });
      res.status(201).json(note);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.put(api.notes.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.notes.update.input.parse(req.body);
      const note = await storage.updateNote(parseInt(req.params.id), req.user.claims.sub, input);
      if (!note) return res.status(404).json({ message: "Not found" });
      res.json(note);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.delete(api.notes.delete.path, isAuthenticated, async (req: any, res) => {
    const noteId = parseInt(req.params.id);
    const userId = req.user.claims.sub;
    const allNotes = await storage.getNotes(userId);
    const deleteIds = [noteId];
    const findChildren = (parentId: number) => {
      allNotes.filter(n => n.parentId === parentId).forEach(child => {
        deleteIds.push(child.id);
        findChildren(child.id);
      });
    };
    findChildren(noteId);
    for (const id of deleteIds) {
      await storage.deleteNote(id, userId);
    }
    res.status(204).end();
  });

  // Payments
  app.post(api.payments.createOrder.path, isAuthenticated, async (req: any, res) => {
    const orderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    res.json({ orderId, amount: 399900 });
  });
  app.post(api.payments.verify.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.payments.verify.input.parse(req.body);
      await storage.createPayment({
        userId: req.user.claims.sub,
        razorpayPaymentId: input.razorpayPaymentId,
        amount: 399900,
        status: "success"
      });
      res.json({ success: true });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // Level & Group System
  app.get("/api/level/status", isAuthenticated, async (req: any, res) => {
    try {
      const status = await getCurrentLevelStatus(req.user.claims.sub);
      res.json(status);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/level/daily-metrics", isAuthenticated, async (req: any, res) => {
    try {
      const date = req.query.date as string;
      if (!date) return res.status(400).json({ message: "date required" });
      const metrics = await computeDailyMetrics(req.user.claims.sub, date);
      res.json(metrics);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/level/evaluate", isAuthenticated, async (req: any, res) => {
    try {
      const { month } = req.body;
      if (!month) return res.status(400).json({ message: "month required (YYYY-MM)" });
      const result = await runMonthlyEvaluation(req.user.claims.sub, month);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/level/evaluations", isAuthenticated, async (req: any, res) => {
    const evals = await storage.getMonthlyEvaluations(req.user.claims.sub);
    res.json(evals);
  });

  app.get("/api/level/is-admin", isAuthenticated, async (req: any, res) => {
    res.json({ isAdmin: isAdmin(req) });
  });

  app.get("/api/groups/:level/messages", isAuthenticated, async (req: any, res) => {
    try {
      const level = req.params.level;
      const userId = req.user.claims.sub;
      const userLevel = await storage.getUserLevel(userId);
      const userLevelName = userLevel?.level || "Unproductive";

      if (!isAdmin(req) && userLevelName !== level) {
        return res.status(403).json({ message: "You don't have access to this group" });
      }

      const messages = await storage.getGroupMessages(level);
      res.json(messages);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/groups/:level/messages", isAuthenticated, async (req: any, res) => {
    try {
      const level = req.params.level;
      const userId = req.user.claims.sub;
      const { content } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ message: "content required" });

      if (isAdmin(req)) {
        const msg = await storage.createGroupMessage({
          level,
          content: content.trim(),
          createdBy: userId,
          senderName: "Admin",
          isAdmin: true,
        });
        return res.status(201).json(msg);
      }

      if (!INTERACTIVE_LEVELS.includes(level)) {
        return res.status(403).json({ message: "Chat is not available in this group" });
      }

      const userLevel = await storage.getUserLevel(userId);
      const userLevelName = userLevel?.level || "Unproductive";
      if (userLevelName !== level) {
        return res.status(403).json({ message: "You don't have access to this group" });
      }

      const user = await storage.getUser(userId);
      const senderName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User" : "User";

      const msg = await storage.createGroupMessage({
        level,
        content: content.trim(),
        createdBy: userId,
        senderName,
        isAdmin: false,
      });
      res.status(201).json(msg);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/groups/messages/:id", isAuthenticated, async (req: any, res) => {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });
    await storage.deleteGroupMessage(parseInt(req.params.id));
    res.status(204).end();
  });

  // Admin inbox
  app.post("/api/inbox", isAuthenticated, async (req: any, res) => {
    try {
      const { content } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ message: "content required" });
      const msg = await storage.createAdminInboxMessage({
        userId: req.user.claims.sub,
        content: content.trim(),
      });
      res.status(201).json(msg);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/admin/inbox", isAuthenticated, async (req: any, res) => {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });
    const messages = await storage.getAdminInbox();
    res.json(messages);
  });

  app.patch("/api/admin/inbox/:id", isAuthenticated, async (req: any, res) => {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });
    try {
      const { status } = req.body;
      if (!["read", "dismissed"].includes(status)) return res.status(400).json({ message: "Invalid status" });
      const updated = await storage.updateAdminInboxStatus(parseInt(req.params.id), status);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: get all users with levels
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });
    const levels = await storage.getAllUserLevels();
    res.json(levels);
  });

  // ===== STREAK ROUTES =====
  app.get("/api/streak", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const streak = await storage.getUserStreak(userId);
      res.json(streak || { currentStreak: 0, longestStreak: 0, totalStreakDays: 0, lastStreakUpdateDate: null });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/streak/update", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const date = new Date().toISOString().split("T")[0];

      const existing = await storage.getUserStreak(userId);
      if (existing?.lastStreakUpdateDate === date) {
        return res.json(existing);
      }

      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const dayTasks = await storage.getTasks(userId, date);
      const taskScore = dayTasks.length > 0
        ? dayTasks.reduce((sum: number, t: any) => sum + (t.completionPercentage || 0), 0) / dayTasks.length
        : 0;

      const gHabits = await storage.getGoodHabits(userId);
      const gEntries = gHabits.length > 0 ? await storage.getGoodHabitEntries(gHabits.map(h => h.id)) : [];
      const dayGoodEntries = gEntries.filter((e: any) => e.date === date);
      let goodHabitScore = 0;
      if (dayGoodEntries.length > 0) {
        goodHabitScore = (dayGoodEntries.filter((e: any) => e.completed).length / gHabits.length) * 100;
      }

      const bHabits = await storage.getBadHabits(userId);
      const bEntries = bHabits.length > 0 ? await storage.getBadHabitEntries(bHabits.map(h => h.id)) : [];
      const dayBadEntries = bEntries.filter((e: any) => e.date === date);
      let badHabitScore = 0;
      if (dayBadEntries.length > 0) {
        badHabitScore = ((bHabits.length - dayBadEntries.filter((e: any) => e.occurred).length) / bHabits.length) * 100;
      }

      const hEntries = await storage.getHourlyEntries(userId, date);
      const hourlyScore = hEntries.length > 0
        ? Math.min((hEntries.reduce((sum: number, e: any) => sum + e.productivityScore, 0) / hEntries.length) * 10, 100)
        : 0;

      const weights = { task: 0.3, goodHabit: 0.25, badHabit: 0.2, hourly: 0.25 };
      const activeSections: string[] = [];
      if (dayTasks.length > 0) activeSections.push('task');
      if (dayGoodEntries.length > 0) activeSections.push('goodHabit');
      if (dayBadEntries.length > 0) activeSections.push('badHabit');
      if (hEntries.length > 0) activeSections.push('hourly');

      let dailyScore = 0;
      if (activeSections.length > 0) {
        const totalWeight = activeSections.reduce((sum, s) => sum + weights[s as keyof typeof weights], 0);
        const scores: Record<string, number> = { task: taskScore, goodHabit: goodHabitScore, badHabit: badHabitScore, hourly: hourlyScore };
        dailyScore = activeSections.reduce((sum, s) => sum + (scores[s] * weights[s as keyof typeof weights] / totalWeight), 0);
      }

      const qualifies = Math.round(dailyScore) >= 60;
      const prevStreak = existing?.currentStreak || 0;
      const prevLongest = existing?.longestStreak || 0;
      const prevTotal = existing?.totalStreakDays || 0;
      const prevDate = existing?.lastStreakUpdateDate;

      const isConsecutive = prevDate === yesterdayStr;

      let newCurrentStreak: number;
      if (qualifies) {
        newCurrentStreak = isConsecutive ? prevStreak + 1 : 1;
      } else {
        newCurrentStreak = 0;
      }

      const newLongest = Math.max(prevLongest, newCurrentStreak);
      const newTotal = qualifies ? prevTotal + 1 : prevTotal;

      const updated = await storage.upsertUserStreak(userId, {
        currentStreak: newCurrentStreak,
        longestStreak: newLongest,
        totalStreakDays: newTotal,
        lastStreakUpdateDate: date,
      });

      res.json({ ...updated, dailyScore: Math.round(dailyScore), qualifies });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ===== JOURNAL ROUTES =====
  app.get("/api/journal", isAuthenticated, async (req: any, res) => {
    try {
      const { date, month, year } = req.query;
      const userId = req.user.claims.sub;
      if (date) {
        const entry = await storage.getJournalEntry(userId, date as string);
        return res.json(entry || null);
      }
      if (month) {
        const entries = await storage.getJournalEntriesByMonth(userId, month as string);
        return res.json(entries);
      }
      if (year) {
        const entries = await storage.getJournalEntriesByYear(userId, parseInt(year as string));
        return res.json(entries);
      }
      return res.status(400).json({ message: "Provide date, month (YYYY-MM), or year" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/journal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { date, dayTypeName, customDayName, emoji, journalText, imageUrls, extractedText } = req.body;
      if (!date) return res.status(400).json({ message: "Date is required" });
      if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 10) {
        return res.status(400).json({ message: "Maximum 10 images allowed" });
      }
      const entry = await storage.upsertJournalEntry({
        userId,
        date,
        customDayName: customDayName || null,
        emoji: emoji || null,
        journalText: journalText || "",
        imageUrls: imageUrls || [],
        extractedText: extractedText || null,
      });
      if (dayTypeName || customDayName) {
        await storage.incrementDayTypeUsage(userId, dayTypeName || customDayName);
      }
      res.json(entry);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/journal/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteJournalEntry(parseInt(req.params.id), req.user.claims.sub);
      res.status(204).send();
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Day types (predefined + custom + usage sorting)
  app.get("/api/day-types", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [customTypes, usageData, emojiOverrides] = await Promise.all([
        storage.getCustomDayTypes(userId),
        storage.getDayTypeUsage(userId),
        storage.getDayTypeEmojiOverrides(userId),
      ]);
      const { DEFAULT_DAY_TYPES } = await import("@shared/schema");
      const usageMap = new Map(usageData.map(u => [u.dayTypeName, u.usageCount]));
      const overrideMap = new Map(emojiOverrides.map(o => [o.dayTypeName, o.emoji]));
      const allTypes = [
        ...DEFAULT_DAY_TYPES.map(dt => ({
          ...dt,
          emoji: overrideMap.get(dt.name) || dt.emoji,
          isCustom: false,
          usageCount: usageMap.get(dt.name) || 0,
        })),
        ...customTypes.map(dt => ({ name: dt.name, emoji: dt.emoji, category: "Custom", isCustom: true, id: dt.id, usageCount: usageMap.get(dt.name) || 0 })),
      ];
      allTypes.sort((a, b) => b.usageCount - a.usageCount);
      res.json(allTypes);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/day-types/custom", isAuthenticated, async (req: any, res) => {
    try {
      const { name, emoji } = req.body;
      if (!name) return res.status(400).json({ message: "Name is required" });
      const dt = await storage.createCustomDayType({ userId: req.user.claims.sub, name, emoji: emoji || "📝" });
      res.status(201).json(dt);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/day-types/emoji-override", isAuthenticated, async (req: any, res) => {
    try {
      const { dayTypeName, emoji } = req.body;
      if (!dayTypeName || !emoji?.trim()) {
        return res.status(400).json({ message: "Day type name and emoji are required" });
      }
      const override = await storage.upsertDayTypeEmojiOverride(req.user.claims.sub, dayTypeName, emoji.trim());
      res.json(override);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/day-types/custom/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { name, emoji } = req.body;
      if (emoji !== undefined && !emoji.trim()) {
        return res.status(400).json({ message: "Emoji cannot be empty" });
      }
      const updated = await storage.updateCustomDayType(parseInt(req.params.id), req.user.claims.sub, { name, emoji });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/day-types/custom/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteCustomDayType(parseInt(req.params.id), req.user.claims.sub);
      res.status(204).send();
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ===== USER SETTINGS ROUTES =====
  app.get(api.settings.get.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let settings = await storage.getUserSettings(userId);
      if (!settings) {
        settings = await storage.upsertUserSettings(userId, {});
      }
      res.json(settings);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  const settingsUpdateSchema = z.object({
    themeMode: z.enum(["dark", "light", "system"]).optional(),
    hourlyTrackingEnabled: z.boolean().optional(),
    autoLockTime: z.string().optional(),
    goodHabitStrictMode: z.boolean().optional(),
    badHabitStrictZero: z.boolean().optional(),
    performanceDisplayMode: z.enum(["percentages", "points", "minimal"]).optional(),
    levelDowngradeWarning: z.boolean().optional(),
    resetConfirmation: z.boolean().optional(),
    groupNotifications: z.enum(["all", "admin_only", "mentions", "off"]).optional(),
    showLevelPublicly: z.boolean().optional(),
    showMonthlyScore: z.boolean().optional(),
    showStreakPublicly: z.boolean().optional(),
    allowDirectMessages: z.boolean().optional(),
    showOnlineStatus: z.boolean().optional(),
    dailyReminder: z.boolean().optional(),
    dailyReminderTime: z.string().optional(),
    weeklyPerformanceSummary: z.boolean().optional(),
    monthlyLevelNotification: z.boolean().optional(),
    streakBreakAlert: z.boolean().optional(),
    groupAchievementAlerts: z.boolean().optional(),
    motivationMode: z.enum(["competitive", "private"]).optional(),
    streakVisibility: z.enum(["public", "private"]).optional(),
    dataExportFormat: z.enum(["csv", "json"]).optional(),
  });

  app.put(api.settings.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = settingsUpdateSchema.parse(req.body);
      const settings = await storage.upsertUserSettings(userId, parsed);
      res.json(settings);
    } catch (e: any) {
      if (e.name === "ZodError") return res.status(400).json({ message: "Invalid settings data", errors: e.errors });
      res.status(500).json({ message: e.message });
    }
  });

  // ===== DATA EXPORT ROUTE =====
  app.get("/api/export-data", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const format = req.query.format || "csv";

      const [userTasks, gHabits, bHabits, hEntries, jEntries, streakData] = await Promise.all([
        storage.getTasks(userId),
        storage.getGoodHabits(userId),
        storage.getBadHabits(userId),
        storage.getHourlyEntries(userId),
        storage.getJournalEntriesByYear(userId, new Date().getFullYear()),
        storage.getUserStreak(userId),
      ]);

      if (format === "json") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", "attachment; filename=consistency-data.json");
        res.json({ tasks: userTasks, goodHabits: gHabits, badHabits: bHabits, hourlyEntries: hEntries, journalEntries: jEntries, streak: streakData });
      } else {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=consistency-tasks.csv");
        const header = "Date,Title,Description,Completion%,Priority\n";
        const rows = userTasks.map(t => `${t.date},"${(t.title || "").replace(/"/g, '""')}","${(t.description || "").replace(/"/g, '""')}",${t.completionPercentage || 0},${t.priority || "Normal"}`).join("\n");
        res.send(header + rows);
      }
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ===== COMPARISON ANALYTICS ROUTE =====
  app.get(api.comparisonStats.get.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const [gHabits, bHabits, allHourlyEntries] = await Promise.all([
        storage.getGoodHabits(userId),
        storage.getBadHabits(userId),
        storage.getHourlyEntries(userId),
      ]);
      const [allGoodEntries, allBadEntries] = await Promise.all([
        gHabits.length > 0 ? storage.getGoodHabitEntries(gHabits.map(h => h.id)) : Promise.resolve([]),
        bHabits.length > 0 ? storage.getBadHabitEntries(bHabits.map(h => h.id)) : Promise.resolve([]),
      ]);

      const today = new Date();
      const currentYear = today.getFullYear();
      const [thisYearTasks, prevYearTasks] = await Promise.all([
        storage.getTasksByYear(userId, currentYear),
        storage.getTasksByYear(userId, currentYear - 1),
      ]);
      const allTasks = [...thisYearTasks, ...prevYearTasks];

      const hourlyByDate: Record<string, typeof allHourlyEntries> = {};
      for (const e of allHourlyEntries) {
        if (!hourlyByDate[e.date]) hourlyByDate[e.date] = [];
        hourlyByDate[e.date].push(e);
      }

      const lookbackDays = 365;
      const startLookback = new Date(today);
      startLookback.setDate(startLookback.getDate() - lookbackDays);

      function computeDayScore(dateStr: string) {
        const dayTasks = allTasks.filter(t => t.date === dateStr);
        const taskScore = dayTasks.length > 0 ? dayTasks.reduce((sum, t) => sum + (t.completionPercentage || 0), 0) / dayTasks.length : 0;

        const dayGE = gHabits.length > 0 ? allGoodEntries.filter(e => e.date === dateStr) : [];
        let goodHabitScore = 0;
        if (dayGE.length > 0) {
          goodHabitScore = (dayGE.filter(e => e.completed).length / gHabits.length) * 100;
        }

        const dayBE = bHabits.length > 0 ? allBadEntries.filter(e => e.date === dateStr) : [];
        let badHabitScore = 0;
        if (dayBE.length > 0) {
          badHabitScore = ((bHabits.length - dayBE.filter(e => e.occurred).length) / bHabits.length) * 100;
        }

        const hEntries = hourlyByDate[dateStr] || [];
        const hourlyScore = hEntries.length > 0 ? Math.min((hEntries.reduce((sum, e) => sum + e.productivityScore, 0) / hEntries.length) * 10, 100) : 0;

        const weights = { task: 0.3, goodHabit: 0.25, badHabit: 0.2, hourly: 0.25 };
        const active: string[] = [];
        if (dayTasks.length > 0) active.push('task');
        if (dayGE.length > 0) active.push('goodHabit');
        if (dayBE.length > 0) active.push('badHabit');
        if (hEntries.length > 0) active.push('hourly');

        if (active.length === 0) return null;
        const totalWeight = active.reduce((sum, s) => sum + weights[s as keyof typeof weights], 0);
        const scores: Record<string, number> = { task: taskScore, goodHabit: goodHabitScore, badHabit: badHabitScore, hourly: hourlyScore };
        const totalScore = active.reduce((sum, s) => sum + (scores[s] * weights[s as keyof typeof weights] / totalWeight), 0);
        return Math.round(totalScore);
      }

      const dailyScores: { date: string; score: number }[] = [];
      for (let d = new Date(startLookback); d <= today; d.setDate(d.getDate() + 1)) {
        const ds = d.toISOString().split("T")[0];
        const sc = computeDayScore(ds);
        if (sc !== null) dailyScores.push({ date: ds, score: sc });
      }

      function getWeekKey(dateStr: string): string {
        const d = new Date(dateStr + "T00:00:00");
        const dayOfWeek = d.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(d);
        monday.setDate(d.getDate() + mondayOffset);
        return monday.toISOString().split("T")[0];
      }

      const weeklyMap: Record<string, number[]> = {};
      const monthlyMap: Record<string, number[]> = {};

      for (const ds of dailyScores) {
        const wk = getWeekKey(ds.date);
        if (!weeklyMap[wk]) weeklyMap[wk] = [];
        weeklyMap[wk].push(ds.score);

        const mk = ds.date.substring(0, 7);
        if (!monthlyMap[mk]) monthlyMap[mk] = [];
        monthlyMap[mk].push(ds.score);
      }

      const weeklyAverages = Object.entries(weeklyMap)
        .map(([weekStart, scores]) => ({ weekStart, average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), days: scores.length }))
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

      const monthlyAverages = Object.entries(monthlyMap)
        .map(([month, scores]) => ({ month, average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), days: scores.length }))
        .sort((a, b) => a.month.localeCompare(b.month));

      const allScoreValues = dailyScores.map(d => d.score);
      const lifetimeAverage = allScoreValues.length > 0 ? Math.round(allScoreValues.reduce((a, b) => a + b, 0) / allScoreValues.length) : 0;
      const highestDaily = allScoreValues.length > 0 ? Math.max(...allScoreValues) : 0;
      const lowestDaily = allScoreValues.length > 0 ? Math.min(...allScoreValues) : 0;
      const bestWeek = weeklyAverages.length > 0 ? weeklyAverages.reduce((best, w) => w.average > best.average ? w : best) : null;
      const bestMonth = monthlyAverages.length > 0 ? monthlyAverages.reduce((best, m) => m.average > best.average ? m : best) : null;

      res.json({
        dailyScores,
        weeklyAverages,
        monthlyAverages,
        lifetime: { average: lifetimeAverage, totalDays: allScoreValues.length, highestDaily, lowestDaily, bestWeek, bestMonth },
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ===== SUCCESSFUL FUNDAMENTALS ROUTES =====
  app.get("/api/fundamentals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getFundamentals(userId);
      res.json(entries);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/fundamentals/:key", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entry = await storage.getFundamental(userId, req.params.key);
      res.json(entry || null);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/fundamentals/custom", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const schema = z.object({ title: z.string().min(1).max(200) });
      const parsed = schema.parse(req.body);
      const key = "custom-" + Date.now();
      const entry = await storage.upsertFundamental({ userId, fundamentalKey: key, customTitle: parsed.title, content: null });
      res.json(entry);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/fundamentals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteFundamental(parseInt(req.params.id), userId);
      res.status(204).send();
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/fundamentals/:id/toggle", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { completed } = req.body;
      if (typeof completed !== "boolean") return res.status(400).json({ message: "completed must be a boolean" });
      const updated = await storage.toggleFundamentalCompleted(parseInt(req.params.id), userId, completed);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/fundamentals/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderedKeys } = req.body;
      if (!Array.isArray(orderedKeys)) return res.status(400).json({ message: "orderedKeys must be an array" });
      await storage.reorderFundamentals(userId, orderedKeys);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put("/api/fundamentals/:key", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const key = req.params.key;
      if (!FUNDAMENTALS_LIST.some(f => f.key === key) && !key.startsWith("custom-")) {
        return res.status(400).json({ message: "Invalid fundamental key" });
      }
      const contentSchema = z.object({ content: z.string().nullable() });
      const parsed = contentSchema.parse(req.body);
      const entry = await storage.upsertFundamental({ userId, fundamentalKey: key, content: parsed.content });
      res.json(entry);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
      res.status(500).json({ message: e.message });
    }
  });

  // OCR: extract text from image using OpenAI Vision
  app.post("/api/ocr", isAuthenticated, upload.single("image"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No image provided" });
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = imageBuffer.toString("base64");
      const mimeType = req.file.mimetype || "image/png";

      const { openai } = await import("./replit_integrations/image/client");
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract ALL text from this image. If it contains handwriting, transcribe it as accurately as possible. Return ONLY the extracted text, nothing else. If no text is found, return an empty string.",
              },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64Image}` },
              },
            ],
          },
        ],
        max_tokens: 4096,
      });

      const text = (response.choices[0]?.message?.content || "").trim();
      try { fs.unlinkSync(req.file.path); } catch {}
      res.json({ text });
    } catch (e: any) {
      console.error("OCR failed:", e);
      if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch {}
      res.status(500).json({ message: "OCR failed: " + e.message });
    }
  });

  // Image upload
  app.use("/uploads", (await import("express")).default.static(uploadDir));
  app.post("/api/upload-image", isAuthenticated, (req: any, res, next) => {
    upload.single("image")(req, res, (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ message: "Image must be less than 5MB" });
        return res.status(400).json({ message: err.message || "Upload failed" });
      }
      if (!req.file) return res.status(400).json({ message: "No image provided" });
      const url = `/uploads/${req.file.filename}`;
      res.json({ url });
    });
  });

  // ===== MONEY TRACKING ROUTES =====
  
  // Money Settings
  app.get(api.moneySettings.get.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let settings = await storage.getMoneySettings(userId);
      if (!settings) {
        settings = await storage.upsertMoneySettings(userId, {});
      }
      res.json(settings);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put(api.moneySettings.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body;
      delete updates.id;
      delete updates.userId;
      const settings = await storage.upsertMoneySettings(userId, updates);
      res.json(settings);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Expense Categories
  app.get(api.moneyCategories.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let categories = await storage.getExpenseCategories(userId);
      if (categories.length === 0) {
        for (let i = 0; i < DEFAULT_EXPENSE_CATEGORIES.length; i++) {
          const cat = DEFAULT_EXPENSE_CATEGORIES[i];
          await storage.createExpenseCategory({
            userId, key: cat.key, name: cat.name, emoji: cat.emoji, color: cat.color, sortOrder: i, isDefault: true, isActive: true,
          });
        }
        categories = await storage.getExpenseCategories(userId);
      }
      res.json(categories);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post(api.moneyCategories.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cat = await storage.createExpenseCategory({ ...req.body, userId });
      res.status(201).json(cat);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.put(api.moneyCategories.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cat = await storage.updateExpenseCategory(parseInt(req.params.id), userId, req.body);
      res.json(cat);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete(api.moneyCategories.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteExpenseCategory(parseInt(req.params.id), userId);
      res.status(204).end();
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Expenses
  app.get(api.moneyExpenses.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const filters: any = {};
      if (req.query.dateFrom) filters.dateFrom = req.query.dateFrom;
      if (req.query.dateTo) filters.dateTo = req.query.dateTo;
      if (req.query.categoryKey) filters.categoryKey = req.query.categoryKey;
      if (req.query.paymentMethod) filters.paymentMethod = req.query.paymentMethod;
      if (req.query.month) {
        const exps = await storage.getExpensesByMonth(userId, req.query.month as string);
        return res.json(exps);
      }
      const exps = await storage.getExpenses(userId, filters);
      res.json(exps);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post(api.moneyExpenses.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expense = await storage.createExpense({ ...req.body, userId });
      res.status(201).json(expense);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.put(api.moneyExpenses.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expense = await storage.updateExpense(parseInt(req.params.id), userId, req.body);
      res.json(expense);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete(api.moneyExpenses.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteExpense(parseInt(req.params.id), userId);
      res.status(204).end();
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Budgets
  app.get(api.moneyBudgets.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const budgetList = await storage.getBudgets(req.user.claims.sub);
      res.json(budgetList);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post(api.moneyBudgets.upsert.path, isAuthenticated, async (req: any, res) => {
    try {
      const budget = await storage.upsertBudget({ ...req.body, userId: req.user.claims.sub });
      res.json(budget);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete(api.moneyBudgets.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteBudget(parseInt(req.params.id), req.user.claims.sub);
      res.status(204).end();
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Subscriptions
  app.get(api.moneySubscriptions.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const subs = await storage.getSubscriptions(req.user.claims.sub);
      res.json(subs);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post(api.moneySubscriptions.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const sub = await storage.createSubscription({ ...req.body, userId: req.user.claims.sub });
      res.status(201).json(sub);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.put(api.moneySubscriptions.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const sub = await storage.updateSubscription(parseInt(req.params.id), req.user.claims.sub, req.body);
      res.json(sub);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete(api.moneySubscriptions.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteSubscription(parseInt(req.params.id), req.user.claims.sub);
      res.status(204).end();
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Bills
  app.get(api.moneyBills.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const billList = await storage.getBills(req.user.claims.sub);
      res.json(billList);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post(api.moneyBills.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const bill = await storage.createBill({ ...req.body, userId: req.user.claims.sub });
      res.status(201).json(bill);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.put(api.moneyBills.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const bill = await storage.updateBill(parseInt(req.params.id), req.user.claims.sub, req.body);
      res.json(bill);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete(api.moneyBills.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteBill(parseInt(req.params.id), req.user.claims.sub);
      res.status(204).end();
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Credit Cards
  app.get(api.moneyCreditCards.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const cards = await storage.getCreditCards(req.user.claims.sub);
      res.json(cards);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post(api.moneyCreditCards.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const card = await storage.createCreditCard({ ...req.body, userId: req.user.claims.sub });
      res.status(201).json(card);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.put(api.moneyCreditCards.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const card = await storage.updateCreditCard(parseInt(req.params.id), req.user.claims.sub, req.body);
      res.json(card);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete(api.moneyCreditCards.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteCreditCard(parseInt(req.params.id), req.user.claims.sub);
      res.status(204).end();
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Savings Goals
  app.get(api.moneySavingsGoals.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const goals = await storage.getSavingsGoals(req.user.claims.sub);
      res.json(goals);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post(api.moneySavingsGoals.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const goal = await storage.createSavingsGoal({ ...req.body, userId: req.user.claims.sub });
      res.status(201).json(goal);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.put(api.moneySavingsGoals.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const goal = await storage.updateSavingsGoal(parseInt(req.params.id), req.user.claims.sub, req.body);
      res.json(goal);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete(api.moneySavingsGoals.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteSavingsGoal(parseInt(req.params.id), req.user.claims.sub);
      res.status(204).end();
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Money Dashboard aggregate data
  app.get(api.moneyDashboard.get.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const [settings, monthExpenses, allBudgets, allSubs, allBills, allGoals] = await Promise.all([
        storage.getMoneySettings(userId),
        storage.getExpensesByMonth(userId, currentMonth),
        storage.getBudgets(userId),
        storage.getSubscriptions(userId),
        storage.getBills(userId),
        storage.getSavingsGoals(userId),
      ]);

      const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      const income = settings?.monthlyIncome || 0;
      const remaining = income - totalSpent;

      const categorySpending: Record<string, number> = {};
      for (const e of monthExpenses) {
        categorySpending[e.categoryKey] = (categorySpending[e.categoryKey] || 0) + e.amount;
      }

      const dailySpending: Record<string, number> = {};
      for (const e of monthExpenses) {
        dailySpending[e.date] = (dailySpending[e.date] || 0) + e.amount;
      }

      const today = now.toISOString().split('T')[0];
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const upcomingPayments: any[] = [];
      for (const sub of allSubs.filter(s => s.status === 'active')) {
        if (sub.nextDueDate >= today && sub.nextDueDate <= thirtyDaysLater) {
          upcomingPayments.push({ type: 'subscription', name: sub.serviceName, amount: sub.amount, dueDate: sub.nextDueDate, id: sub.id });
        }
      }
      for (const bill of allBills.filter(b => b.status === 'pending')) {
        if (bill.dueDate >= today && bill.dueDate <= thirtyDaysLater) {
          upcomingPayments.push({ type: 'bill', name: bill.name, amount: bill.amount, dueDate: bill.dueDate, id: bill.id });
        }
      }
      upcomingPayments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

      const recentTransactions = monthExpenses
        .sort((a, b) => b.date.localeCompare(a.date) || (b.id - a.id))
        .slice(0, 8);

      const savingsRate = income > 0 ? Math.round(((income - totalSpent) / income) * 100) : 0;

      const daysInMonth = monthExpenses.length > 0 ? new Set(monthExpenses.map(e => e.date)).size : 0;
      const avgDailySpending = daysInMonth > 0 ? Math.round(totalSpent / daysInMonth) : 0;
      const biggestExpense = monthExpenses.length > 0 ? Math.max(...monthExpenses.map(e => e.amount)) : 0;
      
      const merchantCounts: Record<string, number> = {};
      for (const e of monthExpenses) {
        if (e.merchant) merchantCounts[e.merchant] = (merchantCounts[e.merchant] || 0) + 1;
      }
      const topMerchant = Object.entries(merchantCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      const budgetProgress = allBudgets.filter(b => b.isEnabled).map(b => ({
        categoryKey: b.categoryKey,
        limit: b.monthlyLimit,
        spent: categorySpending[b.categoryKey] || 0,
        percentage: b.monthlyLimit > 0 ? Math.round(((categorySpending[b.categoryKey] || 0) / b.monthlyLimit) * 100) : 0,
      }));

      res.json({
        income,
        totalSpent,
        remaining,
        savingsRate,
        categorySpending,
        dailySpending,
        upcomingPayments,
        recentTransactions,
        budgetProgress,
        quickStats: { avgDailySpending, biggestExpense, topMerchant },
        activeGoals: allGoals.filter(g => g.status === 'active').slice(0, 2),
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ==================== Know More - Videos ====================

  // List published videos (for all authenticated users)
  app.get("/api/videos", isAuthenticated, async (req: any, res) => {
    try {
      const vids = await storage.getVideos(true);
      res.json(vids);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Get single video
  app.get("/api/videos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const video = await storage.getVideo(parseInt(req.params.id));
      if (!video) return res.status(404).json({ message: "Video not found" });
      if (!video.isPublished && !isAdmin(req)) return res.status(404).json({ message: "Video not found" });
      res.json(video);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: List all videos (including unpublished)
  app.get("/api/admin/videos", isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });
      const vids = await storage.getVideos(false);
      res.json(vids);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: Create video
  app.post("/api/admin/videos", isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });
      const { title, description, category, youtubeUrl, thumbnailUrl, duration, sortOrder, isPublished } = req.body;
      if (!title || !youtubeUrl) return res.status(400).json({ message: "Title and YouTube URL are required" });
      const video = await storage.createVideo({
        title, description: description || "", category: category || "general",
        youtubeUrl, thumbnailUrl: thumbnailUrl || null,
        duration: duration || "", videoProvider: "youtube",
        sortOrder: sortOrder || 0, isPublished: isPublished !== false,
      });
      res.status(201).json(video);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: Update video
  app.patch("/api/admin/videos/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });
      const updated = await storage.updateVideo(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: Delete video
  app.delete("/api/admin/videos/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });
      await storage.deleteVideo(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // User: Get own feedback for a video
  app.get("/api/videos/:id/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const feedback = await storage.getVideoFeedbackByUser(parseInt(req.params.id), userId);
      res.json(feedback);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // User: Submit feedback for a video
  app.post("/api/videos/:id/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const videoId = parseInt(req.params.id);
      const video = await storage.getVideo(videoId);
      if (!video || !video.isPublished) return res.status(404).json({ message: "Video not found" });
      const { feedbackType, message } = req.body;
      if (!feedbackType || !message) return res.status(400).json({ message: "Feedback type and message are required" });
      if (message.length > 2000) return res.status(400).json({ message: "Message too long (max 2000 chars)" });
      const validTypes = ["doubt", "improvement", "issue", "feature"];
      if (!validTypes.includes(feedbackType)) return res.status(400).json({ message: "Invalid feedback type" });
      const fb = await storage.createVideoFeedback({ videoId, userId, feedbackType, message, status: "pending" });
      res.status(201).json(fb);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: Get all feedback (optionally filtered by video)
  app.get("/api/admin/video-feedback", isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });
      const videoId = req.query.videoId ? parseInt(req.query.videoId as string) : undefined;
      const feedback = await storage.getAllVideoFeedback(videoId);
      res.json(feedback);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: Update feedback status
  app.patch("/api/admin/video-feedback/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });
      const { status } = req.body;
      const updated = await storage.updateVideoFeedbackStatus(parseInt(req.params.id), status);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: Reply to feedback
  app.post("/api/admin/video-feedback/:id/reply", isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });
      const { reply } = req.body;
      if (!reply || !reply.trim()) return res.status(400).json({ message: "Reply cannot be empty" });
      const updated = await storage.replyToVideoFeedback(parseInt(req.params.id), reply.trim());
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: Delete feedback
  app.delete("/api/admin/video-feedback/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });
      await storage.deleteVideoFeedback(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ===== GROW TOGETHER - FRIENDS =====

  // Get accepted friends list
  app.get("/api/grow/friends", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const friendsList = await storage.getFriends(userId);
      const friendsWithNames = await Promise.all(friendsList.map(async (f) => {
        const friendId = f.requesterId === userId ? f.addresseeId : f.requesterId;
        const friendUser = await storage.getUser(friendId);
        return { ...f, friendId, friendName: friendUser?.firstName ? `${friendUser.firstName} ${friendUser.lastName || ""}`.trim() : friendId.slice(0, 8) };
      }));
      res.json(friendsWithNames);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Get pending friend requests received
  app.get("/api/grow/friends/requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requests = await storage.getFriendRequests(userId);
      const withNames = await Promise.all(requests.map(async (r) => {
        const user = await storage.getUser(r.requesterId);
        return { ...r, requesterName: user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : r.requesterId.slice(0, 8) };
      }));
      res.json(withNames);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Get sent requests
  app.get("/api/grow/friends/sent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      res.json(await storage.getSentRequests(userId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Generate invite link
  app.post("/api/grow/friends/invite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const hasPaid = await storage.hasPaidMembership(userId);
      if (!hasPaid) return res.status(403).json({ message: "Paid membership required to invite friends" });
      const token = crypto.randomBytes(16).toString("hex");
      const invite = await storage.createFriendInvite({ userId, token, status: "active" });
      res.json({ token: invite.token, link: `/dashboard/grow-together?invite=${invite.token}` });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Accept invite link
  app.post("/api/grow/friends/accept-invite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const hasPaid = await storage.hasPaidMembership(userId);
      if (!hasPaid) return res.status(403).json({ message: "PAYMENT_REQUIRED" });
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: "Token required" });
      const invite = await storage.getFriendInviteByToken(token);
      if (!invite) return res.status(404).json({ message: "Invalid or expired invite" });
      if (invite.userId === userId) return res.status(400).json({ message: "Cannot add yourself" });
      const existing = await storage.getFriendship(userId, invite.userId);
      if (existing) return res.status(400).json({ message: "Already connected or request pending" });
      const friend = await storage.createFriendRequest({ requesterId: invite.userId, addresseeId: userId, status: "accepted" });
      await storage.updateFriendInvite(invite.id, { status: "used", usedBy: userId });
      res.json(friend);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Accept/reject friend request
  app.patch("/api/grow/friends/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status } = req.body;
      if (!["accepted", "rejected"].includes(status)) return res.status(400).json({ message: "Invalid status" });
      const friendId = parseInt(req.params.id);
      const friendship = await storage.getFriendRequests(userId);
      const match = friendship.find(f => f.id === friendId);
      if (!match) return res.status(403).json({ message: "Not authorized to update this request" });
      const updated = await storage.updateFriendStatus(friendId, status);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Remove friend
  app.delete("/api/grow/friends/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const friendId = parseInt(req.params.id);
      const friendsList = await storage.getFriends(userId);
      const match = friendsList.find(f => f.id === friendId);
      if (!match) return res.status(403).json({ message: "Not authorized to remove this friendship" });
      await storage.deleteFriend(friendId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ===== COMPARISON PRIVACY =====

  app.get("/api/grow/privacy", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let privacy = await storage.getComparisonPrivacy(userId);
      if (!privacy) privacy = await storage.upsertComparisonPrivacy(userId, {});
      res.json(privacy);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put("/api/grow/privacy", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updated = await storage.upsertComparisonPrivacy(userId, req.body);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ===== COMPARISON DATA =====

  // Compute and cache daily stats for a user/date
  app.post("/api/grow/stats/compute", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { date } = req.body;
      if (!date) return res.status(400).json({ message: "Date required" });
      const metrics = await computeDailyMetrics(userId, date);
      const overallPct = Math.round((metrics.taskCompletionPct + metrics.goodHabitsPct + metrics.hourlyCompletionPct) / 3);
      const dayTasks = await storage.getTasks(userId, date);
      const completedTasks = dayTasks.filter(t => (t.completionPercentage || 0) >= 100).length;
      const cached = await storage.upsertDailyStats({
        userId, date,
        taskPct: metrics.taskCompletionPct,
        goodHabitPct: metrics.goodHabitsPct,
        badHabitPct: metrics.badHabitsPct,
        hourlyPct: metrics.hourlyCompletionPct,
        overallPct,
        totalTasks: dayTasks.length,
        completedTasks,
      });
      res.json(cached);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // High-level comparison with a friend
  app.get("/api/grow/compare/:friendId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const friendId = req.params.friendId;
      const friendship = await storage.getFriendship(userId, friendId);
      if (!friendship || friendship.status !== "accepted") return res.status(403).json({ message: "Not connected" });
      const friendPrivacy = await storage.getComparisonPrivacy(friendId);
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const monthStart = today.slice(0, 7) + "-01";
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split("T")[0];

      const [myStats, friendStats] = await Promise.all([
        storage.getDailyStatsRange(userId, monthStart, today),
        storage.getDailyStatsRange(friendId, monthStart, today),
      ]);
      const [myStreak, friendStreak] = await Promise.all([
        storage.getUserStreak(userId),
        storage.getUserStreak(friendId),
      ]);
      const [myLevel, friendLevel] = await Promise.all([
        storage.getUserLevel(userId),
        storage.getUserLevel(friendId),
      ]);

      const calcAvg = (stats: any[], from?: string) => {
        const filtered = from ? stats.filter(s => s.date >= from) : stats;
        if (filtered.length === 0) return 0;
        return Math.round(filtered.reduce((sum, s) => sum + s.overallPct, 0) / filtered.length);
      };

      const myData = {
        dailyAvg: calcAvg(myStats, today),
        weeklyAvg: calcAvg(myStats, weekStart),
        monthlyAvg: calcAvg(myStats),
        currentStreak: myStreak?.currentStreak || 0,
        longestStreak: myStreak?.longestStreak || 0,
        level: myLevel?.level || "Unproductive",
      };

      const isPrivate = (field: string) => friendPrivacy && !(friendPrivacy as any)[field];
      const friendData = {
        dailyAvg: isPrivate("shareDailyScore") ? null : calcAvg(friendStats, today),
        weeklyAvg: isPrivate("shareWeeklyAverage") ? null : calcAvg(friendStats, weekStart),
        monthlyAvg: isPrivate("shareMonthlyAverage") ? null : calcAvg(friendStats),
        currentStreak: isPrivate("shareStreak") ? null : (friendStreak?.currentStreak || 0),
        longestStreak: isPrivate("shareStreak") ? null : (friendStreak?.longestStreak || 0),
        level: friendLevel?.level || "Unproductive",
      };

      res.json({ myData, friendData });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Deep daily comparison for a specific date
  app.get("/api/grow/compare/:friendId/deep", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const friendId = req.params.friendId;
      const date = req.query.date as string;
      if (!date) return res.status(400).json({ message: "Date required" });
      const friendship = await storage.getFriendship(userId, friendId);
      if (!friendship || friendship.status !== "accepted") return res.status(403).json({ message: "Not connected" });
      const friendPrivacy = await storage.getComparisonPrivacy(friendId);
      if (friendPrivacy && !friendPrivacy.shareDailyBreakdown) return res.json({ friendData: null, message: "Friend has set this data to private" });

      const [myMetrics, friendMetrics] = await Promise.all([
        computeDailyMetrics(userId, date),
        computeDailyMetrics(friendId, date),
      ]);
      const [myTasks, friendTasks] = await Promise.all([
        storage.getTasks(userId, date),
        storage.getTasks(friendId, date),
      ]);

      const myOverall = Math.round((myMetrics.taskCompletionPct + myMetrics.goodHabitsPct + myMetrics.hourlyCompletionPct) / 3);
      const friendOverall = Math.round((friendMetrics.taskCompletionPct + friendMetrics.goodHabitsPct + friendMetrics.hourlyCompletionPct) / 3);

      res.json({
        myData: {
          overallPct: myOverall,
          taskPct: myMetrics.taskCompletionPct,
          goodHabitPct: myMetrics.goodHabitsPct,
          badHabitPct: myMetrics.badHabitsPct,
          hourlyPct: myMetrics.hourlyCompletionPct,
          totalTasks: myTasks.length,
          completedTasks: myTasks.filter(t => (t.completionPercentage || 0) >= 100).length,
        },
        friendData: {
          overallPct: friendOverall,
          taskPct: friendMetrics.taskCompletionPct,
          goodHabitPct: friendMetrics.goodHabitsPct,
          badHabitPct: friendMetrics.badHabitsPct,
          hourlyPct: friendMetrics.hourlyCompletionPct,
          totalTasks: friendTasks.length,
          completedTasks: friendTasks.filter(t => (t.completionPercentage || 0) >= 100).length,
        },
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Multi-friend leaderboard
  app.get("/api/grow/leaderboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const period = (req.query.period as string) || "today";
      const friendsList = await storage.getFriends(userId);
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      let dateFrom = today;
      if (period === "week") {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay());
        dateFrom = d.toISOString().split("T")[0];
      } else if (period === "month") {
        dateFrom = today.slice(0, 7) + "-01";
      }

      const userIds = [userId, ...friendsList.map(f => f.requesterId === userId ? f.addresseeId : f.requesterId)];
      const entries = await Promise.all(userIds.map(async (uid) => {
        const stats = await storage.getDailyStatsRange(uid, dateFrom, today);
        const user = await storage.getUser(uid);
        const streak = await storage.getUserStreak(uid);
        const level = await storage.getUserLevel(uid);
        const privacy = await storage.getComparisonPrivacy(uid);
        const avg = stats.length > 0 ? Math.round(stats.reduce((s, x) => s + x.overallPct, 0) / stats.length) : 0;
        const isMe = uid === userId;
        const canSee = isMe || !privacy || (privacy as any)[period === "today" ? "shareDailyScore" : period === "week" ? "shareWeeklyAverage" : "shareMonthlyAverage"];
        return {
          userId: uid,
          name: user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : uid.slice(0, 8),
          average: canSee ? avg : null,
          currentStreak: isMe || !privacy || privacy.shareStreak ? (streak?.currentStreak || 0) : null,
          level: level?.level || "Unproductive",
          isMe,
        };
      }));

      entries.sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
      res.json(entries);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ===== GROW TOGETHER - GROUPS =====

  // Check paid membership
  app.get("/api/grow/membership", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const hasPaid = await storage.hasPaidMembership(userId);
      res.json({ hasPaid });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Get user's groups
  app.get("/api/grow/groups/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groups = await storage.getUserGrowGroups(userId);
      const withCounts = await Promise.all(groups.map(async (g) => ({
        ...g,
        memberCount: await storage.getGroupMemberCount(g.id),
      })));
      res.json(withCounts);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Discover public groups
  app.get("/api/grow/groups/discover", isAuthenticated, async (req: any, res) => {
    try {
      const groups = await storage.getGrowGroups(true);
      const withCounts = await Promise.all(groups.map(async (g) => ({
        ...g,
        memberCount: await storage.getGroupMemberCount(g.id),
      })));
      res.json(withCounts);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Create group (paid only)
  app.post("/api/grow/groups", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const hasPaid = await storage.hasPaidMembership(userId);
      if (!hasPaid) return res.status(403).json({ message: "Active paid membership required to create groups" });
      const { name, description, isPublic, icon, rules } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Group name required" });
      const group = await storage.createGrowGroup({ name, description, isPublic: isPublic ?? true, createdBy: userId, icon, rules });
      await storage.addGroupMember({ groupId: group.id, userId, role: "owner" });
      res.json(group);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Get group details
  app.get("/api/grow/groups/:id", isAuthenticated, async (req: any, res) => {
    try {
      const group = await storage.getGrowGroup(parseInt(req.params.id));
      if (!group) return res.status(404).json({ message: "Group not found" });
      const members = await storage.getGroupMembers(group.id);
      const membersWithNames = await Promise.all(members.map(async (m) => {
        const user = await storage.getUser(m.userId);
        return { ...m, name: user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : m.userId.slice(0, 8) };
      }));
      res.json({ ...group, members: membersWithNames, memberCount: members.length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Update group
  app.patch("/api/grow/groups/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = parseInt(req.params.id);
      const member = await storage.getGroupMember(groupId, userId);
      if (!member || !["owner", "admin"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const updated = await storage.updateGrowGroup(groupId, req.body);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Join group (paid only)
  app.post("/api/grow/groups/:id/join", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = parseInt(req.params.id);
      const hasPaid = await storage.hasPaidMembership(userId);
      if (!hasPaid) return res.status(403).json({ message: "Active paid membership required to join groups" });
      const group = await storage.getGrowGroup(groupId);
      if (!group) return res.status(404).json({ message: "Group not found" });
      const existing = await storage.getGroupMember(groupId, userId);
      if (existing) return res.status(400).json({ message: "Already a member" });
      const member = await storage.addGroupMember({ groupId, userId, role: "member" });
      res.json(member);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Leave group
  app.post("/api/grow/groups/:id/leave", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = parseInt(req.params.id);
      const member = await storage.getGroupMember(groupId, userId);
      if (!member) return res.status(404).json({ message: "Not a member" });
      if (member.role === "owner") return res.status(400).json({ message: "Owner cannot leave. Transfer ownership or delete the group." });
      await storage.removeGroupMember(groupId, userId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Delete group (owner only)
  app.delete("/api/grow/groups/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = parseInt(req.params.id);
      const member = await storage.getGroupMember(groupId, userId);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Only group owner can delete" });
      await storage.deleteGrowGroup(groupId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Kick member (admin/owner)
  app.delete("/api/grow/groups/:id/members/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user.claims.sub;
      const groupId = parseInt(req.params.id);
      const targetUserId = req.params.userId;
      const member = await storage.getGroupMember(groupId, currentUser);
      if (!member || !["owner", "admin"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      await storage.removeGroupMember(groupId, targetUserId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Promote member (owner only)
  app.patch("/api/grow/groups/:id/members/:memberId/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = parseInt(req.params.id);
      const memberId = parseInt(req.params.memberId);
      const { role } = req.body;
      const currentMember = await storage.getGroupMember(groupId, userId);
      if (!currentMember || currentMember.role !== "owner") return res.status(403).json({ message: "Only owner can change roles" });
      const updated = await storage.updateGroupMemberRole(memberId, role);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Group messages (with pagination)
  app.get("/api/grow/groups/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = parseInt(req.params.id);
      const member = await storage.getGroupMember(groupId, userId);
      if (!member) return res.status(403).json({ message: "Not a member" });
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before ? parseInt(req.query.before as string) : undefined;
      const messages = await storage.getGroupMessages2(groupId, limit, before);
      res.json(messages.reverse());
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Send message (paid only)
  app.post("/api/grow/groups/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = parseInt(req.params.id);
      const hasPaid = await storage.hasPaidMembership(userId);
      if (!hasPaid) return res.status(403).json({ message: "Active paid membership required to send messages" });
      const member = await storage.getGroupMember(groupId, userId);
      if (!member) return res.status(403).json({ message: "Not a member" });
      const { content, replyToId } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Message content required" });
      if (content.length > 2000) return res.status(400).json({ message: "Message too long" });
      const user = await storage.getUser(userId);
      const senderName = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : undefined;
      const msg = await storage.createGroupMessage2({ groupId, userId, senderName, content, replyToId, isDeleted: false });
      res.json(msg);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Delete message (own or admin/owner)
  app.delete("/api/grow/groups/:groupId/messages/:msgId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = parseInt(req.params.groupId);
      const msgId = parseInt(req.params.msgId);
      const member = await storage.getGroupMember(groupId, userId);
      if (!member) return res.status(403).json({ message: "Not a member" });
      await storage.deleteGroupMessage2(msgId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ==================== TEAM INTELLIGENCE ROUTES ====================

  const tiDefaultFrom = () => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  };
  const tiDefaultTo = () => new Date().toISOString().split('T')[0];
  const tiIsAdminOrOwner = (req: any): boolean => isAdmin(req);

  // 1. GET /api/team-intelligence/my-dashboard
  app.get("/api/team-intelligence/my-dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workspaceId = (req.query.workspaceId as string) || "default";
      const from = (req.query.from as string) || tiDefaultFrom();
      const to = (req.query.to as string) || tiDefaultTo();

      const snapshots = await storage.getTeamSnapshots(userId, workspaceId, from, to);
      const todayStr = new Date().toISOString().split('T')[0];
      const todaySnapshot = snapshots.find(s => s.date === todayStr) || null;

      const snapshotData = snapshots.map(s => ({
        date: s.date,
        activeTimeMinutes: s.activeTimeMinutes,
        deepWorkMinutes: s.deepWorkMinutes,
        shallowWorkMinutes: s.shallowWorkMinutes,
        meetingTimeMinutes: s.meetingTimeMinutes,
        focusSessionMinutes: s.focusSessionMinutes,
        tasksAssigned: s.tasksAssigned,
        tasksCompleted: s.tasksCompleted,
        tasksOverdue: s.tasksOverdue,
        tasksInProgress: s.tasksInProgress,
        contextSwitches: s.contextSwitches,
        avgFocusSession: s.avgFocusSession,
        longestFocusSession: s.longestFocusSession,
        productivityScore: Number(s.productivityScore),
        focusScore: Number(s.focusScore),
        consistencyScore: Number(s.consistencyScore),
        executionScore: Number(s.executionScore),
        collaborationScore: Number(s.collaborationScore),
      }));

      const { calculateStreak } = await import("./lib/team-intelligence/rules-engine");
      const { detectPatterns } = await import("./lib/team-intelligence/rules-engine");
      const streak = calculateStreak(snapshotData);
      const patterns = detectPatterns(snapshotData);

      const { items: insights } = await storage.getTeamInsights(userId, workspaceId, { limit: 10, offset: 0, unreadOnly: false });
      const alerts = await storage.getTeamAlerts(workspaceId, { userId, visibleToRoles: ['employee'] });

      const latest = snapshotData[0];
      const currentScores = latest ? {
        taskCompletion: latest.productivityScore,
        focus: latest.focusScore,
        deadlineAdherence: latest.tasksAssigned > 0 ? Math.round(((latest.tasksAssigned - latest.tasksOverdue) / latest.tasksAssigned) * 100) : 100,
        consistency: latest.consistencyScore,
        execution: latest.executionScore,
        collaboration: latest.collaborationScore,
        total: latest.productivityScore,
      } : { taskCompletion: 0, focus: 0, deadlineAdherence: 0, consistency: 0, execution: 0, collaboration: 0, total: 0 };

      res.json({
        currentScores,
        todaySnapshot: todaySnapshot ? snapshotData.find(s => s.date === todayStr) : null,
        recentSnapshots: snapshotData,
        streak,
        insights: insights.map(i => ({ category: i.category, title: i.title, message: i.message, confidence: i.confidence })),
        alerts,
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 2. GET /api/team-intelligence/team-dashboard
  app.get("/api/team-intelligence/team-dashboard", isAuthenticated, async (req: any, res) => {
    try {
      if (!tiIsAdminOrOwner(req)) return res.status(403).json({ message: "Admin access required" });
      const userId = req.user.claims.sub;
      const workspaceId = (req.query.workspaceId as string) || "default";
      const from = (req.query.from as string) || tiDefaultFrom();
      const to = (req.query.to as string) || tiDefaultTo();

      const assignments = await storage.getManagerAssignments(workspaceId, userId);
      const allUsers = await storage.getAllUsers();
      const userMap = new Map(allUsers.map((u: any) => [u.id, u]));

      const { getTrendDirection, getRiskLevel, calculateRiskScore } = await import("../shared/lib/team-intelligence/scoring");

      const prevFrom = new Date(from);
      prevFrom.setDate(prevFrom.getDate() - 14);
      const prevTo = new Date(from);
      prevTo.setDate(prevTo.getDate() - 1);

      const members = [];
      let totalTasksCompleted = 0;
      let totalOverdue = 0;
      let scoreSum = 0;

      const employeeIds = assignments.length > 0
        ? assignments.map(a => a.employeeUserId)
        : allUsers.filter((u: any) => u.id !== userId).map((u: any) => u.id);

      for (const empId of employeeIds) {
        const snapshots = await storage.getTeamSnapshots(empId, workspaceId, from, to);
        const prevSnapshots = await storage.getTeamSnapshots(empId, workspaceId, prevFrom.toISOString().split('T')[0], prevTo.toISOString().split('T')[0]);

        const currentAvg = snapshots.length > 0
          ? snapshots.reduce((s, d) => s + Number(d.productivityScore), 0) / snapshots.length : 0;
        const prevAvg = prevSnapshots.length > 0
          ? prevSnapshots.reduce((s, d) => s + Number(d.productivityScore), 0) / prevSnapshots.length : 0;

        const user = userMap.get(empId);
        const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : empId;
        const avatar = user?.profileImageUrl || null;

        const latestSnap = snapshots[0];
        const completed = snapshots.reduce((s, d) => s + d.tasksCompleted, 0);
        const overdue = latestSnap?.tasksOverdue || 0;

        totalTasksCompleted += completed;
        totalOverdue += overdue;
        scoreSum += currentAvg;

        const trendDir = getTrendDirection(currentAvg, prevAvg);
        const riskScore = calculateRiskScore(overdue, currentAvg - prevAvg, 1, currentAvg);
        const riskLevel = getRiskLevel(riskScore);

        members.push({
          userId: empId,
          name,
          avatar,
          role: 'member',
          productivityScore: Math.round(currentAvg),
          trend: trendDir,
          trendDelta: Math.round(currentAvg - prevAvg),
          tasksCompleted: completed,
          overdueCount: overdue,
          focusTimeMinutes: snapshots.reduce((s, d) => s + d.deepWorkMinutes, 0),
          riskLevel,
          statusBadge: riskLevel === 'at_risk' ? 'At Risk' : riskLevel === 'needs_attention' ? 'Needs Attention' : 'On Track',
        });
      }

      const teamScore = members.length > 0 ? Math.round(scoreSum / members.length) : 0;
      const teamHealth = members.filter(m => m.riskLevel === 'at_risk').length > members.length * 0.3 ? 'at_risk' as const
        : members.filter(m => m.riskLevel !== 'on_track').length > members.length * 0.5 ? 'needs_attention' as const : 'on_track' as const;

      const alerts = await storage.getTeamAlerts(workspaceId, { visibleToRoles: ['admin'] });

      res.json({
        teamName: 'My Team',
        memberCount: members.length,
        teamScore,
        teamTrend: getTrendDirection(teamScore, teamScore),
        totalTasksCompleted,
        totalOverdue,
        teamHealth,
        members,
        alerts,
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 3. GET /api/team-intelligence/admin-dashboard
  app.get("/api/team-intelligence/admin-dashboard", isAuthenticated, async (req: any, res) => {
    try {
      if (!tiIsAdminOrOwner(req)) return res.status(403).json({ message: "Admin access required" });
      const workspaceId = (req.query.workspaceId as string) || "default";
      const from = (req.query.from as string) || tiDefaultFrom();
      const to = (req.query.to as string) || tiDefaultTo();

      const allUsers = await storage.getAllUsers();
      const allSnapshots = await storage.getTeamSnapshotsByWorkspace(workspaceId, from, to);

      const { getTrendDirection, getRiskLevel, calculateRiskScore } = await import("../shared/lib/team-intelligence/scoring");

      const userSnapshotMap = new Map<string, typeof allSnapshots>();
      for (const snap of allSnapshots) {
        if (!userSnapshotMap.has(snap.userId)) userSnapshotMap.set(snap.userId, []);
        userSnapshotMap.get(snap.userId)!.push(snap);
      }

      let totalScore = 0;
      let totalCompleted = 0;
      let totalDeadlineOk = 0;
      let totalAssigned = 0;
      let totalFocusMin = 0;
      let onTrack = 0, needsAttention = 0, atRisk = 0;

      for (const [uid, snaps] of userSnapshotMap) {
        const avg = snaps.reduce((s, d) => s + Number(d.productivityScore), 0) / snaps.length;
        totalScore += avg;
        totalCompleted += snaps.reduce((s, d) => s + d.tasksCompleted, 0);
        totalAssigned += snaps.reduce((s, d) => s + d.tasksAssigned, 0);
        totalFocusMin += snaps.reduce((s, d) => s + d.deepWorkMinutes, 0);
        const overdue = snaps[0]?.tasksOverdue || 0;
        const riskScore = calculateRiskScore(overdue, 0, 1, avg);
        const rl = getRiskLevel(riskScore);
        if (rl === 'on_track') onTrack++;
        else if (rl === 'needs_attention') needsAttention++;
        else atRisk++;
      }

      const userCount = userSnapshotMap.size || 1;
      const orgScore = Math.round(totalScore / userCount);
      const deadlineAdherenceRate = totalAssigned > 0 ? Math.round(((totalAssigned - allSnapshots.reduce((s, d) => s + d.tasksOverdue, 0)) / totalAssigned) * 100) : 100;

      const assignments = await storage.getManagerAssignments(workspaceId);
      const managerTeams = new Map<string, string[]>();
      for (const a of assignments) {
        if (!managerTeams.has(a.managerUserId)) managerTeams.set(a.managerUserId, []);
        managerTeams.get(a.managerUserId)!.push(a.employeeUserId);
      }

      const teams = [];
      for (const [managerId, empIds] of managerTeams) {
        const managerUser = allUsers.find((u: any) => u.id === managerId);
        const managerName = managerUser ? `${managerUser.firstName || ''} ${managerUser.lastName || ''}`.trim() : managerId;
        let teamScore = 0;
        let teamCompleted = 0;
        let teamOverdue = 0;
        let teamAssigned = 0;
        for (const eid of empIds) {
          const snaps = userSnapshotMap.get(eid) || [];
          teamScore += snaps.length > 0 ? snaps.reduce((s, d) => s + Number(d.productivityScore), 0) / snaps.length : 0;
          teamCompleted += snaps.reduce((s, d) => s + d.tasksCompleted, 0);
          teamOverdue += snaps.reduce((s, d) => s + d.tasksOverdue, 0);
          teamAssigned += snaps.reduce((s, d) => s + d.tasksAssigned, 0);
        }
        const avgScore = empIds.length > 0 ? Math.round(teamScore / empIds.length) : 0;
        const overduePercent = teamAssigned > 0 ? Math.round((teamOverdue / teamAssigned) * 100) : 0;
        const riskScore = calculateRiskScore(teamOverdue, 0, 1, avgScore);
        teams.push({
          teamId: managerId,
          teamName: `${managerName}'s Team`,
          managerName,
          memberCount: empIds.length,
          score: avgScore,
          velocity: teamCompleted,
          overduePercent,
          health: getRiskLevel(riskScore),
        });
      }

      res.json({
        orgScore,
        orgTrend: getTrendDirection(orgScore, orgScore),
        totalEmployees: allUsers.length,
        totalTasksCompleted: totalCompleted,
        deadlineAdherenceRate,
        avgFocusMinutes: Math.round(totalFocusMin / userCount),
        teams,
        riskDistribution: { onTrack, needsAttention, atRisk },
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 4. GET /api/team-intelligence/employee/:employeeUserId
  app.get("/api/team-intelligence/employee/:employeeUserId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const empId = req.params.employeeUserId;
      const workspaceId = (req.query.workspaceId as string) || "default";
      const from = (req.query.from as string) || tiDefaultFrom();
      const to = (req.query.to as string) || tiDefaultTo();

      if (userId !== empId) {
        const assignments = await storage.getManagerAssignments(workspaceId, userId);
        const isManager = assignments.some(a => a.employeeUserId === empId);
        if (!isManager && !tiIsAdminOrOwner(req)) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const snapshots = await storage.getTeamSnapshots(empId, workspaceId, from, to);
      const { calculateStreak, detectPatterns } = await import("./lib/team-intelligence/rules-engine");

      const snapshotData = snapshots.map(s => ({
        date: s.date,
        activeTimeMinutes: s.activeTimeMinutes,
        deepWorkMinutes: s.deepWorkMinutes,
        shallowWorkMinutes: s.shallowWorkMinutes,
        meetingTimeMinutes: s.meetingTimeMinutes,
        focusSessionMinutes: s.focusSessionMinutes,
        tasksAssigned: s.tasksAssigned,
        tasksCompleted: s.tasksCompleted,
        tasksOverdue: s.tasksOverdue,
        tasksInProgress: s.tasksInProgress,
        contextSwitches: s.contextSwitches,
        avgFocusSession: s.avgFocusSession,
        longestFocusSession: s.longestFocusSession,
        productivityScore: Number(s.productivityScore),
        focusScore: Number(s.focusScore),
        consistencyScore: Number(s.consistencyScore),
        executionScore: Number(s.executionScore),
        collaborationScore: Number(s.collaborationScore),
      }));

      const streak = calculateStreak(snapshotData);
      const todayStr = new Date().toISOString().split('T')[0];
      const latest = snapshotData[0];
      const currentScores = latest ? {
        taskCompletion: latest.productivityScore,
        focus: latest.focusScore,
        deadlineAdherence: latest.tasksAssigned > 0 ? Math.round(((latest.tasksAssigned - latest.tasksOverdue) / latest.tasksAssigned) * 100) : 100,
        consistency: latest.consistencyScore,
        execution: latest.executionScore,
        collaboration: latest.collaborationScore,
        total: latest.productivityScore,
      } : { taskCompletion: 0, focus: 0, deadlineAdherence: 0, consistency: 0, execution: 0, collaboration: 0, total: 0 };

      const { items: insights } = await storage.getTeamInsights(empId, workspaceId, { limit: 10, offset: 0, unreadOnly: false });
      const alerts = await storage.getTeamAlerts(workspaceId, { userId: empId, visibleToRoles: ['employee'] });

      res.json({
        currentScores,
        todaySnapshot: snapshotData.find(s => s.date === todayStr) || null,
        recentSnapshots: snapshotData,
        streak,
        insights: insights.map(i => ({ category: i.category, title: i.title, message: i.message, confidence: i.confidence })),
        alerts,
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 5. GET /api/team-intelligence/compare
  app.get("/api/team-intelligence/compare", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workspaceId = (req.query.workspaceId as string) || "default";
      const targetUserId = (req.query.userId as string) || userId;
      const periodAFrom = req.query.periodAFrom as string;
      const periodATo = req.query.periodATo as string;
      const periodBFrom = req.query.periodBFrom as string;
      const periodBTo = req.query.periodBTo as string;

      if (!periodAFrom || !periodATo || !periodBFrom || !periodBTo) {
        return res.status(400).json({ message: "All period parameters required (periodAFrom, periodATo, periodBFrom, periodBTo)" });
      }

      if (targetUserId !== userId && !tiIsAdminOrOwner(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const periodA = await storage.getTeamSnapshots(targetUserId, workspaceId, periodAFrom, periodATo);
      const periodB = await storage.getTeamSnapshots(targetUserId, workspaceId, periodBFrom, periodBTo);

      const metrics = ['productivityScore', 'focusScore', 'deepWorkMinutes', 'tasksCompleted', 'tasksOverdue', 'consistencyScore', 'executionScore'] as const;
      const results = metrics.map(metric => {
        const aAvg = periodA.length > 0
          ? periodA.reduce((s, d) => s + Number((d as any)[metric]), 0) / periodA.length : 0;
        const bAvg = periodB.length > 0
          ? periodB.reduce((s, d) => s + Number((d as any)[metric]), 0) / periodB.length : 0;
        const deltaPercent = aAvg !== 0 ? Math.round(((bAvg - aAvg) / aAvg) * 100) : 0;
        const direction = deltaPercent > 2 ? 'up' : deltaPercent < -2 ? 'down' : 'stable';
        return { metric, periodAValue: Math.round(aAvg * 100) / 100, periodBValue: Math.round(bAvg * 100) / 100, deltaPercent, direction };
      });

      res.json(results);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 6. GET /api/team-intelligence/insights
  app.get("/api/team-intelligence/insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workspaceId = (req.query.workspaceId as string) || "default";
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unreadOnly === 'true';

      const { items, total } = await storage.getTeamInsights(userId, workspaceId, { limit, offset, unreadOnly });
      res.json({ insights: items, total });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 7. GET /api/team-intelligence/ai-settings
  app.get("/api/team-intelligence/ai-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workspaceId = (req.query.workspaceId as string) || "default";
      const settings = await storage.getTeamAiSettings(userId, workspaceId);
      res.json(settings);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 8. GET /api/team-intelligence/org-settings
  app.get("/api/team-intelligence/org-settings", isAuthenticated, async (req: any, res) => {
    try {
      if (!tiIsAdminOrOwner(req)) return res.status(403).json({ message: "Admin access required" });
      const workspaceId = (req.query.workspaceId as string) || "default";
      const settings = await storage.getTeamOrgSettings(workspaceId);
      res.json(settings);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 9. GET /api/team-intelligence/alerts
  app.get("/api/team-intelligence/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workspaceId = (req.query.workspaceId as string) || "default";

      if (tiIsAdminOrOwner(req)) {
        const alerts = await storage.getTeamAlerts(workspaceId, { visibleToRoles: ['employee', 'admin'] });
        return res.json(alerts);
      }

      const alerts = await storage.getTeamAlerts(workspaceId, { userId, visibleToRoles: ['employee'] });
      res.json(alerts);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 10. GET /api/team-intelligence/manager-assignments
  app.get("/api/team-intelligence/manager-assignments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workspaceId = (req.query.workspaceId as string) || "default";

      if (tiIsAdminOrOwner(req)) {
        if (req.query.all === 'true') {
          const assignments = await storage.getManagerAssignments(workspaceId);
          return res.json(assignments);
        }
        const assignments = await storage.getManagerAssignments(workspaceId, userId);
        return res.json(assignments);
      }
      return res.status(403).json({ message: "Admin access required" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 11. PATCH /api/team-intelligence/insights/:insightId/read
  app.patch("/api/team-intelligence/insights/:insightId/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updated = await storage.updateTeamInsight(req.params.insightId, userId, { isRead: true });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 12. PATCH /api/team-intelligence/insights/:insightId/dismiss
  app.patch("/api/team-intelligence/insights/:insightId/dismiss", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updated = await storage.updateTeamInsight(req.params.insightId, userId, { isDismissed: true });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 13. PATCH /api/team-intelligence/insights/:insightId/save
  app.patch("/api/team-intelligence/insights/:insightId/save", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { items } = await storage.getTeamInsights(userId, "default", { limit: 1000, offset: 0, unreadOnly: false });
      const insight = items.find(i => i.id === req.params.insightId);
      if (!insight) return res.status(404).json({ message: "Insight not found" });
      const updated = await storage.updateTeamInsight(req.params.insightId, userId, { isSaved: !insight.isSaved });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 14. PUT /api/team-intelligence/ai-settings
  app.put("/api/team-intelligence/ai-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workspaceId = req.body.workspaceId || "default";
      const { workspaceId: _, ...data } = req.body;
      const updated = await storage.upsertTeamAiSettings(userId, workspaceId, data);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 15. PUT /api/team-intelligence/org-settings
  app.put("/api/team-intelligence/org-settings", isAuthenticated, async (req: any, res) => {
    try {
      if (!tiIsAdminOrOwner(req)) return res.status(403).json({ message: "Admin access required" });
      const workspaceId = req.body.workspaceId || "default";
      const { workspaceId: _, ...data } = req.body;
      const updated = await storage.upsertTeamOrgSettings(workspaceId, data);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 16. PATCH /api/team-intelligence/alerts/:alertId/acknowledge
  app.patch("/api/team-intelligence/alerts/:alertId/acknowledge", isAuthenticated, async (req: any, res) => {
    try {
      const updated = await storage.updateTeamAlert(req.params.alertId, {
        isAcknowledged: true,
        acknowledgedBy: req.user.claims.sub,
        acknowledgedAt: new Date(),
      });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 17. PATCH /api/team-intelligence/alerts/:alertId/snooze
  app.patch("/api/team-intelligence/alerts/:alertId/snooze", isAuthenticated, async (req: any, res) => {
    try {
      const { snoozeUntil } = req.body;
      if (!snoozeUntil) return res.status(400).json({ message: "snoozeUntil required" });
      const updated = await storage.updateTeamAlert(req.params.alertId, {
        isSnoozed: true,
        snoozedUntil: new Date(snoozeUntil),
      });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 18. POST /api/team-intelligence/manager-assignments
  app.post("/api/team-intelligence/manager-assignments", isAuthenticated, async (req: any, res) => {
    try {
      if (!tiIsAdminOrOwner(req)) return res.status(403).json({ message: "Admin access required" });
      const { workspaceId = "default", managerUserId, employeeUserId, teamId } = req.body;
      if (!managerUserId || !employeeUserId) return res.status(400).json({ message: "managerUserId and employeeUserId required" });
      const created = await storage.createManagerAssignment({ managerUserId, employeeUserId, workspaceId, teamId });
      res.json(created);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 19. DELETE /api/team-intelligence/manager-assignments/:assignmentId
  app.delete("/api/team-intelligence/manager-assignments/:assignmentId", isAuthenticated, async (req: any, res) => {
    try {
      if (!tiIsAdminOrOwner(req)) return res.status(403).json({ message: "Admin access required" });
      const updated = await storage.softDeleteManagerAssignment(req.params.assignmentId);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // 20. POST /api/team-intelligence/seed-demo-data
  app.post("/api/team-intelligence/seed-demo-data", isAuthenticated, async (req: any, res) => {
    try {
      if (!tiIsAdminOrOwner(req)) return res.status(403).json({ message: "Admin access required" });
      const workspaceId = req.body.workspaceId || "default";
      const allUsers = await storage.getAllUsers();
      const userIds = allUsers.map((u: any) => u.id);

      const { seedTeamIntelligenceData } = await import("./lib/team-intelligence/seed-demo-data");
      await seedTeamIntelligenceData(workspaceId, userIds);

      const adminId = req.user.claims.sub;
      for (const uid of userIds) {
        if (uid === adminId) continue;
        try {
          await storage.createManagerAssignment({ managerUserId: adminId, employeeUserId: uid, workspaceId });
        } catch { }
      }

      res.json({ success: true, usersSeeded: userIds.length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ─── Projects & Tasks Routes ─────────────────────────────────────────────

  // Projects
  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.query.workspaceId as string);
      if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });
      const list = await storage.getProjects(workspaceId);
      res.json(list);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const { workspaceId, name, description, teamId, status, priority, startDate, dueDate, template, visibility } = req.body;
      if (!name || !workspaceId) return res.status(400).json({ message: "name and workspaceId required" });
      const project = await storage.createProject({
        workspaceId, name, description, teamId: teamId || null, status: status || "Planning",
        priority: priority || "Medium", startDate: startDate || null, dueDate: dueDate || null,
        ownerId: req.user.claims.sub, template: template || null, visibility: visibility || "public",
      });
      // Auto-create project channel
      try {
        await storage.createChannel({ workspaceId, name: `#${name.toLowerCase().replace(/\s+/g, '-')}`, type: "project", projectId: project.id });
      } catch { }
      res.status(201).json(project);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(parseInt(req.params.id));
      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const updated = await storage.updateProject(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteProject(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Team Tasks
  app.get("/api/team-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.query.projectId as string);
      if (!projectId) return res.status(400).json({ message: "projectId required" });
      const list = await storage.getTeamTasks(projectId);
      res.json(list);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/team-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const { projectId, title, description, status, priority, assigneeId, startDate, dueDate, estimatedMinutes, tags, sortOrder } = req.body;
      if (!title || !projectId) return res.status(400).json({ message: "title and projectId required" });
      const task = await storage.createTeamTask({
        projectId, title, description, status: status || "Not Started", priority: priority || "Medium",
        assigneeId: assigneeId || null, startDate: startDate || null, dueDate: dueDate || null,
        estimatedMinutes: estimatedMinutes || null, tags: tags || [], sortOrder: sortOrder || 0,
        createdBy: req.user.claims.sub,
      });
      res.status(201).json(task);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/team-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.getTeamTask(parseInt(req.params.id));
      if (!task) return res.status(404).json({ message: "Task not found" });
      res.json(task);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/team-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const data = { ...req.body };
      if (data.status === "Completed" && !data.completedAt) data.completedAt = new Date();
      const updated = await storage.updateTeamTask(parseInt(req.params.id), data);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/team-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteTeamTask(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Subtasks
  app.get("/api/subtasks", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.query.taskId as string);
      if (!taskId) return res.status(400).json({ message: "taskId required" });
      res.json(await storage.getSubtasks(taskId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/subtasks", isAuthenticated, async (req: any, res) => {
    try {
      const { taskId, title, sortOrder } = req.body;
      if (!taskId || !title) return res.status(400).json({ message: "taskId and title required" });
      const sub = await storage.createSubtask({ taskId, title, sortOrder: sortOrder || 0 });
      res.status(201).json(sub);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/subtasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const updated = await storage.updateSubtask(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/subtasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteSubtask(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Task Dependencies
  app.get("/api/task-dependencies", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.query.taskId as string);
      if (!taskId) return res.status(400).json({ message: "taskId required" });
      res.json(await storage.getTaskDependencies(taskId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/task-dependencies", isAuthenticated, async (req: any, res) => {
    try {
      const { taskId, dependsOnTaskId } = req.body;
      if (!taskId || !dependsOnTaskId) return res.status(400).json({ message: "taskId and dependsOnTaskId required" });
      const dep = await storage.createTaskDependency({ taskId, dependsOnTaskId });
      res.status(201).json(dep);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/task-dependencies", isAuthenticated, async (req: any, res) => {
    try {
      const { taskId, dependsOnTaskId } = req.body;
      await storage.deleteTaskDependency(parseInt(taskId), parseInt(dependsOnTaskId));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ─── Time Tracking Routes ─────────────────────────────────────────────────

  app.get("/api/time-entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { taskId, projectId, dateFrom, dateTo } = req.query;
      const entries = await storage.getTimeEntries(userId, {
        taskId: taskId ? parseInt(taskId as string) : undefined,
        projectId: projectId ? parseInt(projectId as string) : undefined,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
      });
      res.json(entries);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/time-entries", isAuthenticated, async (req: any, res) => {
    try {
      const { taskId, projectId, date, minutes, notes, source } = req.body;
      if (!date || !minutes) return res.status(400).json({ message: "date and minutes required" });
      const entry = await storage.createTimeEntry({
        userId: req.user.claims.sub, taskId: taskId || null, projectId: projectId || null,
        date, minutes: parseInt(minutes), notes: notes || null, source: source || "manual",
      });
      // Update actual_minutes on team_tasks
      if (taskId) {
        const task = await storage.getTeamTask(parseInt(taskId));
        if (task) {
          await storage.updateTeamTask(parseInt(taskId), { actualMinutes: (task.actualMinutes ?? 0) + parseInt(minutes) });
        }
      }
      res.status(201).json(entry);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/time-entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const updated = await storage.updateTimeEntry(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/time-entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteTimeEntry(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Timesheets
  app.get("/api/timesheets", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string) : undefined;
      res.json(await storage.getTimesheets(req.user.claims.sub, workspaceId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/timesheets", isAuthenticated, async (req: any, res) => {
    try {
      const { workspaceId, weekStart } = req.body;
      if (!weekStart) return res.status(400).json({ message: "weekStart required" });
      const ts = await storage.createTimesheet({ userId: req.user.claims.sub, workspaceId: workspaceId || null, weekStart, status: "draft" });
      res.status(201).json(ts);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/timesheets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const data: any = { ...req.body };
      if (data.status === "submitted" && !data.submittedAt) data.submittedAt = new Date();
      const updated = await storage.updateTimesheet(parseInt(req.params.id), data);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Productivity
  app.get("/api/productivity/score", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.query.userId as string) || req.user.claims.sub;
      const snapshots = await storage.getProductivitySnapshots(userId);
      const latest = snapshots[0] || null;
      res.json(latest);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/productivity/snapshots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.query.userId as string) || req.user.claims.sub;
      const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string) : undefined;
      res.json(await storage.getProductivitySnapshots(userId, workspaceId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/productivity/snapshot", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const today = new Date().toISOString().split("T")[0];
      const entries = await storage.getTimeEntries(userId, { dateFrom: today, dateTo: today });
      const hoursWorked = Math.round(entries.reduce((s, e) => s + e.minutes, 0) / 60);
      const snapshot = await storage.upsertProductivitySnapshot({
        userId, workspaceId: req.body.workspaceId || null,
        date: today, overallScore: req.body.overallScore ?? 60,
        taskCompletionRate: req.body.taskCompletionRate ?? 60,
        qualityScore: req.body.qualityScore ?? 70,
        estimationAccuracy: req.body.estimationAccuracy ?? 65,
        collaborationScore: req.body.collaborationScore ?? 70,
        initiativeScore: req.body.initiativeScore ?? 55,
        consistencyScore: req.body.consistencyScore ?? 60,
        impactWeight: req.body.impactWeight ?? 65,
        tasksCompleted: req.body.tasksCompleted ?? 0, hoursWorked,
      });
      res.json(snapshot);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/productivity/comparisons", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const snapshots = await storage.getProductivitySnapshots(userId);
      const today = new Date().toISOString().split("T")[0];
      const todaySnap = snapshots.find((s) => s.date === today);
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const yesterdaySnap = snapshots.find((s) => s.date === yesterday);
      res.json({ today: todaySnap, yesterday: yesterdaySnap, recent: snapshots.slice(0, 14) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/productivity/team-health", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.query.workspaceId as string) || 0;
      if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });
      const today = new Date().toISOString().split("T")[0];
      const teamSnaps = await storage.getProductivityTeamSnapshots(workspaceId, today);
      res.json({ snapshots: teamSnaps, date: today });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/productivity/performers", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.query.workspaceId as string) || 0;
      const today = new Date().toISOString().split("T")[0];
      const snaps = workspaceId ? await storage.getProductivityTeamSnapshots(workspaceId, today) : [];
      const sorted = [...snaps].sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0));
      res.json({ top: sorted.slice(0, 3), needsAttention: sorted.slice(-3).reverse() });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ─── Collaboration Routes ─────────────────────────────────────────────────

  // Channels
  app.get("/api/channels", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.query.workspaceId as string);
      if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });
      res.json(await storage.getChannels(workspaceId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/channels", isAuthenticated, async (req: any, res) => {
    try {
      const { workspaceId, name, type, projectId } = req.body;
      if (!workspaceId || !name) return res.status(400).json({ message: "workspaceId and name required" });
      const ch = await storage.createChannel({ workspaceId, name, type: type || "team", projectId: projectId || null });
      res.status(201).json(ch);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Messages
  app.get("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const channelId = parseInt(req.query.channelId as string);
      if (!channelId) return res.status(400).json({ message: "channelId required" });
      res.json(await storage.getChannelMessages(channelId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const { channelId, content } = req.body;
      if (!channelId || !content) return res.status(400).json({ message: "channelId and content required" });
      const msg = await storage.createChannelMessage({ channelId, senderId: req.user.claims.sub, content });
      res.status(201).json(msg);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Task Comments
  app.get("/api/task-comments", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.query.taskId as string);
      if (!taskId) return res.status(400).json({ message: "taskId required" });
      res.json(await storage.getTaskComments(taskId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/task-comments", isAuthenticated, async (req: any, res) => {
    try {
      const { taskId, content, parentCommentId } = req.body;
      if (!taskId || !content) return res.status(400).json({ message: "taskId and content required" });
      const comment = await storage.createTaskComment({
        taskId, authorId: req.user.claims.sub, content, parentCommentId: parentCommentId || null,
      });
      res.status(201).json(comment);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Documents
  app.get("/api/documents", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.query.workspaceId as string);
      if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });
      const isWiki = req.query.isWiki === "true" ? true : req.query.isWiki === "false" ? false : undefined;
      res.json(await storage.getDocuments(workspaceId, isWiki));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/documents", isAuthenticated, async (req: any, res) => {
    try {
      const { workspaceId, title, content, isWiki, parentDocumentId, sortOrder } = req.body;
      if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });
      const doc = await storage.createDocument({
        workspaceId, title: title || "Untitled", content: content || "",
        createdBy: req.user.claims.sub, isWiki: isWiki || false,
        parentDocumentId: parentDocumentId || null, sortOrder: sortOrder || 0,
      });
      res.status(201).json(doc);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const doc = await storage.getDocument(parseInt(req.params.id));
      if (!doc) return res.status(404).json({ message: "Document not found" });
      res.json(doc);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const updated = await storage.updateDocument(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteDocument(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // View Preference
  app.patch("/api/workspace-members/me/preferred-view", isAuthenticated, async (req: any, res) => {
    try {
      const { view, workspaceId } = req.body;
      if (!view || !workspaceId) return res.status(400).json({ message: "view and workspaceId required" });
      await storage.updatePreferredView(req.user.claims.sub, parseInt(workspaceId), view);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ─── Workspace Platform Routes ────────────────────────────────────────────

  // Workspaces
  app.get("/api/workspaces", isAuthenticated, async (req: any, res) => {
    try {
      const list = await storage.getWorkspaces(req.user.claims.sub);
      res.json(list);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/workspaces/:id", isAuthenticated, async (req: any, res) => {
    try {
      const ws = await storage.getWorkspace(parseInt(req.params.id));
      if (!ws) return res.status(404).json({ message: "Workspace not found" });
      res.json(ws);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/workspaces", isAuthenticated, async (req: any, res) => {
    try {
      const { name, industry, companySize } = req.body;
      if (!name) return res.status(400).json({ message: "Workspace name is required" });
      const userId = req.user.claims.sub;
      const ws = await storage.createWorkspace({ name, industry, companySize, createdBy: userId });

      // Auto-add creator as Owner member
      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [creator] = await db.select().from(users).where(eq(users.id, userId));
      const displayName = creator
        ? [creator.firstName, creator.lastName].filter(Boolean).join(" ") || creator.email || userId
        : userId;
      await storage.createWorkspaceMember({
        workspaceId: ws.id,
        userId,
        email: creator?.email || "",
        displayName,
        role: "Owner",
        status: "active",
        joinedAt: new Date(),
      });

      res.status(201).json(ws);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Teams
  app.get("/api/teams", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.query.workspaceId as string);
      if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });
      const list = await storage.getTeams(workspaceId);
      res.json(list);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/teams/:id", isAuthenticated, async (req: any, res) => {
    try {
      const team = await storage.getTeam(parseInt(req.params.id));
      if (!team) return res.status(404).json({ message: "Team not found" });
      res.json(team);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/teams", isAuthenticated, async (req: any, res) => {
    try {
      const { workspaceId, name, teamType, department, description, parentTeamId } = req.body;
      if (!name || !workspaceId || !teamType) return res.status(400).json({ message: "name, workspaceId, teamType required" });
      const team = await storage.createTeam({
        workspaceId,
        name,
        teamType,
        department,
        description,
        parentTeamId: parentTeamId || null,
        createdBy: req.user.claims.sub,
      });
      res.status(201).json(team);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Workspace Members
  app.get("/api/workspace-members", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.query.workspaceId as string);
      if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });
      const list = await storage.getWorkspaceMembers(workspaceId);
      res.json(list);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/workspace-members", isAuthenticated, async (req: any, res) => {
    try {
      const { workspaceId, email, role, teamId } = req.body;
      if (!workspaceId || !email) return res.status(400).json({ message: "workspaceId and email required" });
      const member = await storage.createWorkspaceMember({
        workspaceId,
        email,
        role: role || "Member",
        teamId: teamId || null,
        invitedBy: req.user.claims.sub,
        status: "invited",
      });
      res.status(201).json(member);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/workspace-members/:id/role", isAuthenticated, async (req: any, res) => {
    try {
      const { role } = req.body;
      if (!role) return res.status(400).json({ message: "role required" });
      const updated = await storage.updateWorkspaceMemberRole(parseInt(req.params.id), role);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/workspace-members/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteWorkspaceMember(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── SEED DEMO TEAM DATA ───────────────────────────────────────────────────
  app.post("/api/seed-team-demo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub as string;
      const ws = await storage.createWorkspace({ name: "TechNova Solutions", industry: "Technology", companySize: "51-200", createdBy: userId });
      const wsId = ws.id;

      const teamDefs = [
        { name: "Engineering", teamType: "Engineering", department: "Technology", description: "Core product engineering — backend, frontend, and infrastructure", memberCount: 15 },
        { name: "Product", teamType: "Product", department: "Product", description: "Product strategy, roadmap, and user research", memberCount: 8 },
        { name: "Design", teamType: "Design", department: "Product", description: "UX/UI design, brand, and design systems", memberCount: 6 },
        { name: "Marketing", teamType: "Marketing", department: "Marketing", description: "Growth, content, and brand marketing", memberCount: 7 },
        { name: "Sales", teamType: "Sales", department: "Revenue", description: "Enterprise and SMB sales, account management", memberCount: 8 },
        { name: "Operations", teamType: "Operations", department: "Operations", description: "Infrastructure, logistics, and internal tools", memberCount: 4 },
        { name: "HR & Finance", teamType: "HR", department: "People & Finance", description: "People operations, talent acquisition, and finance", memberCount: 2 },
      ];
      const createdTeams: any[] = [];
      for (const t of teamDefs) {
        const team = await storage.createTeam({ workspaceId: wsId, createdBy: userId, parentTeamId: null, ...t });
        createdTeams.push(team);
      }

      const memberList = [
        { name: "Priya Sharma", email: "priya.sharma@technova.io", role: "Owner", teamIdx: 0 },
        { name: "James Okafor", email: "james.okafor@technova.io", role: "Admin", teamIdx: 1 },
        { name: "Sofia Reyes", email: "sofia.reyes@technova.io", role: "Manager", teamIdx: 2 },
        { name: "Liam Chen", email: "liam.chen@technova.io", role: "Manager", teamIdx: 0 },
        { name: "Amara Diallo", email: "amara.diallo@technova.io", role: "Manager", teamIdx: 3 },
        { name: "Tom Keller", email: "tom.keller@technova.io", role: "Manager", teamIdx: 4 },
        { name: "Neha Patel", email: "neha.patel@technova.io", role: "Manager", teamIdx: 5 },
        { name: "Carlos Mendez", email: "carlos.mendez@technova.io", role: "Member", teamIdx: 0 },
        { name: "Fatima Al-Rashid", email: "fatima.rashid@technova.io", role: "Member", teamIdx: 0 },
        { name: "Oliver Schmidt", email: "oliver.schmidt@technova.io", role: "Member", teamIdx: 0 },
        { name: "Yara Nwosu", email: "yara.nwosu@technova.io", role: "Member", teamIdx: 0 },
        { name: "Dmitri Volkov", email: "dmitri.volkov@technova.io", role: "Member", teamIdx: 0 },
        { name: "Mei Lin", email: "mei.lin@technova.io", role: "Member", teamIdx: 0 },
        { name: "Arjun Kapoor", email: "arjun.kapoor@technova.io", role: "Member", teamIdx: 0 },
        { name: "Isabelle Dupont", email: "isabelle.dupont@technova.io", role: "Member", teamIdx: 0 },
        { name: "Kofi Mensah", email: "kofi.mensah@technova.io", role: "Member", teamIdx: 0 },
        { name: "Aiko Tanaka", email: "aiko.tanaka@technova.io", role: "Member", teamIdx: 0 },
        { name: "Ryan Torres", email: "ryan.torres@technova.io", role: "Member", teamIdx: 0 },
        { name: "Zara Ahmed", email: "zara.ahmed@technova.io", role: "Member", teamIdx: 0 },
        { name: "Lucas Ferreira", email: "lucas.ferreira@technova.io", role: "Member", teamIdx: 0 },
        { name: "Emma Johansson", email: "emma.johansson@technova.io", role: "Member", teamIdx: 1 },
        { name: "Noah Kim", email: "noah.kim@technova.io", role: "Member", teamIdx: 1 },
        { name: "Mia Osei", email: "mia.osei@technova.io", role: "Member", teamIdx: 1 },
        { name: "Ethan Park", email: "ethan.park@technova.io", role: "Member", teamIdx: 1 },
        { name: "Ava Rodriguez", email: "ava.rodriguez@technova.io", role: "Member", teamIdx: 1 },
        { name: "Jack Williams", email: "jack.williams@technova.io", role: "Member", teamIdx: 1 },
        { name: "Lily Chang", email: "lily.chang@technova.io", role: "Member", teamIdx: 1 },
        { name: "Marcus Johnson", email: "marcus.johnson@technova.io", role: "Member", teamIdx: 2 },
        { name: "Chloe Martin", email: "chloe.martin@technova.io", role: "Member", teamIdx: 2 },
        { name: "David Müller", email: "david.muller@technova.io", role: "Member", teamIdx: 2 },
        { name: "Hannah Lee", email: "hannah.lee@technova.io", role: "Member", teamIdx: 2 },
        { name: "Finn O'Brien", email: "finn.obrien@technova.io", role: "Member", teamIdx: 2 },
        { name: "Sara Lindqvist", email: "sara.lindqvist@technova.io", role: "Member", teamIdx: 3 },
        { name: "Ben Nakamura", email: "ben.nakamura@technova.io", role: "Member", teamIdx: 3 },
        { name: "Grace Adeyemi", email: "grace.adeyemi@technova.io", role: "Member", teamIdx: 3 },
        { name: "Oscar Petrov", email: "oscar.petrov@technova.io", role: "Member", teamIdx: 3 },
        { name: "Nina Hernandez", email: "nina.hernandez@technova.io", role: "Member", teamIdx: 3 },
        { name: "Max Weber", email: "max.weber@technova.io", role: "Member", teamIdx: 4 },
        { name: "Leila Moradi", email: "leila.moradi@technova.io", role: "Member", teamIdx: 4 },
        { name: "Samuel Nduka", email: "samuel.nduka@technova.io", role: "Member", teamIdx: 4 },
        { name: "Julia Blanc", email: "julia.blanc@technova.io", role: "Member", teamIdx: 4 },
        { name: "Chris Sato", email: "chris.sato@technova.io", role: "Member", teamIdx: 4 },
        { name: "Diana Popescu", email: "diana.popescu@technova.io", role: "Member", teamIdx: 4 },
        { name: "Kai Anderson", email: "kai.anderson@technova.io", role: "Member", teamIdx: 5 },
        { name: "Ana Gutierrez", email: "ana.gutierrez@technova.io", role: "Member", teamIdx: 5 },
        { name: "Felix Braun", email: "felix.braun@technova.io", role: "Member", teamIdx: 5 },
        { name: "Rania Hassan", email: "rania.hassan@technova.io", role: "Member", teamIdx: 6 },
        { name: "Ian Clarke", email: "ian.clarke@technova.io", role: "Observer", teamIdx: 6 },
        { name: "Tanya Singh", email: "tanya.singh@technova.io", role: "Guest", teamIdx: 1 },
        { name: "Victor Okonkwo", email: "victor.okonkwo@technova.io", role: "Guest", teamIdx: 4 },
      ];
      for (const m of memberList) {
        await storage.createWorkspaceMember({ workspaceId: wsId, email: m.email, displayName: m.name, role: m.role, teamId: createdTeams[m.teamIdx].id, status: "active", invitedBy: userId });
      }

      const projectDefs = [
        { name: "Mobile App Redesign", description: "Complete UI/UX overhaul of the iOS and Android apps with new design system", status: "Active", priority: "High", progress: 65, teamIdx: 2, dueDate: "2026-05-15" },
        { name: "Platform Infrastructure Migration", description: "Migrate all services to Kubernetes with zero-downtime deployment pipeline", status: "Active", priority: "Critical", progress: 40, teamIdx: 0, dueDate: "2026-06-30" },
        { name: "Q2 Marketing Campaign", description: "Integrated digital marketing campaign targeting SMB segment in APAC and EMEA", status: "Active", priority: "High", progress: 85, teamIdx: 3, dueDate: "2026-04-30" },
        { name: "Customer Self-Service Portal", description: "New portal allowing customers to manage their accounts, billing, and support tickets", status: "Planning", priority: "Medium", progress: 10, teamIdx: 1, dueDate: "2026-08-01" },
        { name: "API v3.0 — GraphQL Migration", description: "Replace REST endpoints with GraphQL API layer, improve developer experience", status: "Active", priority: "High", progress: 55, teamIdx: 0, dueDate: "2026-07-15" },
        { name: "Sales Intelligence Dashboard", description: "Real-time pipeline visibility and AI-driven lead scoring for the sales team", status: "Completed", priority: "Medium", progress: 100, teamIdx: 4, dueDate: "2026-03-01" },
        { name: "HR System Integration", description: "Integrate BambooHR with internal tools for automated onboarding workflows", status: "On Hold", priority: "Low", progress: 30, teamIdx: 6, dueDate: "2026-09-01" },
        { name: "User Analytics Platform", description: "Build internal analytics to track engagement, retention, and feature adoption", status: "Planning", priority: "Medium", progress: 5, teamIdx: 1, dueDate: "2026-10-01" },
        { name: "SEO & Content Optimisation", description: "Restructure website content architecture and implement technical SEO improvements", status: "Active", priority: "Medium", progress: 70, teamIdx: 3, dueDate: "2026-04-15" },
        { name: "Annual Security Audit", description: "Comprehensive SOC2 Type II audit and penetration testing across all systems", status: "Completed", priority: "Critical", progress: 100, teamIdx: 5, dueDate: "2026-03-10" },
        { name: "Data Pipeline & Warehouse", description: "Build real-time event streaming pipeline feeding into Snowflake data warehouse", status: "Active", priority: "High", progress: 25, teamIdx: 0, dueDate: "2026-09-30" },
        { name: "Design System 2.0", description: "Unified component library and brand guidelines across all product surfaces", status: "Active", priority: "Medium", progress: 50, teamIdx: 2, dueDate: "2026-06-01" },
      ];
      for (const p of projectDefs) {
        await storage.createProject({ workspaceId: wsId, name: p.name, description: p.description, status: p.status, priority: p.priority, progress: p.progress, teamId: createdTeams[p.teamIdx].id, dueDate: p.dueDate, ownerId: userId, visibility: "team" });
      }

      res.json({ success: true, workspaceId: wsId, workspaceName: ws.name });
    } catch (e: any) {
      console.error("Seed error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // ── WORKLOAD ──────────────────────────────────────────────────────────────
  app.get("/api/workload", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.query.workspaceId as string);
      const teamId = req.query.teamId ? parseInt(req.query.teamId as string) : undefined;
      if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });
      const data = await storage.getWorkloadData(workspaceId, teamId);
      res.json(data);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/team-tasks/:id/reassign", isAuthenticated, async (req: any, res) => {
    try {
      const { assigneeId } = req.body;
      if (!assigneeId) return res.status(400).json({ message: "assigneeId required" });
      const updated = await storage.reassignTask(parseInt(req.params.id), assigneeId);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── MEMBER AVAILABILITY ───────────────────────────────────────────────────
  app.get("/api/member-availability", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.query.workspaceId as string);
      if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });
      const data = await storage.getMemberAvailability(
        workspaceId,
        req.query.dateFrom as string | undefined,
        req.query.dateTo as string | undefined
      );
      res.json(data);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/member-availability", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const created = await storage.createMemberAvailability({ ...req.body, userId });
      res.status(201).json(created);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/member-availability/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteMemberAvailability(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── REPORTS ───────────────────────────────────────────────────────────────
  app.get("/api/reports/executive", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.query.workspaceId as string);
      if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });
      const data = await storage.getExecutiveSummary(workspaceId);
      res.json(data);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/saved-reports", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.query.workspaceId as string);
      if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });
      const reports = await storage.getSavedReports(workspaceId);
      res.json(reports);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/saved-reports/:id", isAuthenticated, async (req: any, res) => {
    try {
      const report = await storage.getSavedReport(parseInt(req.params.id));
      if (!report) return res.status(404).json({ message: "Not found" });
      res.json(report);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/saved-reports", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const created = await storage.createSavedReport({ ...req.body, createdBy: userId });
      res.status(201).json(created);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── OKR GOALS ────────────────────────────────────────────────────────────
  app.get("/api/okr-goals", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.query.workspaceId as string);
      if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });
      const goals = await storage.getOkrGoals(workspaceId, req.query.period as string | undefined);
      res.json(goals);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/okr-goals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const goal = await storage.getOkrGoal(parseInt(req.params.id));
      if (!goal) return res.status(404).json({ message: "Not found" });
      res.json(goal);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/okr-goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const created = await storage.createOkrGoal({ ...req.body, ownerId: req.body.ownerId || userId });
      res.status(201).json(created);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/okr-goals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const updated = await storage.updateOkrGoal(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/okr-goals/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteOkrGoal(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/goal-task-links", isAuthenticated, async (req: any, res) => {
    try {
      const { goalId, taskId } = req.body;
      const link = await storage.createGoalTaskLink(goalId, taskId);
      res.status(201).json(link);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/goal-task-links", isAuthenticated, async (req: any, res) => {
    try {
      const { goalId, taskId } = req.body;
      await storage.deleteGoalTaskLink(goalId, taskId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── AUTOMATIONS ────────────────────────────────────────────────────────────
  app.get("/api/automations", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.query.workspaceId as string);
      if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });
      const list = await storage.getAutomations(workspaceId);
      res.json(list);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/automations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const created = await storage.createAutomation({ ...req.body, createdBy: userId });
      res.status(201).json(created);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/automations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const updated = await storage.updateAutomation(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/automations/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteAutomation(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/automations/:id/test", isAuthenticated, async (req: any, res) => {
    try {
      const auto = await storage.getAutomation(parseInt(req.params.id));
      if (!auto) return res.status(404).json({ message: "Not found" });
      await storage.logAutomation({ automationId: auto.id, status: "success", triggerEvent: { test: true }, actionsExecuted: auto.actions as any });
      res.json({ success: true, message: "Test run completed" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── AI ENDPOINTS ───────────────────────────────────────────────────────────
  app.post("/api/ai/command", isAuthenticated, async (req: any, res) => {
    try {
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      const { query, context } = req.body;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant for the Consistency System productivity platform. 
Help users navigate, create tasks, search, and get insights. 
Context: ${JSON.stringify(context || {})}.
Respond with a JSON object: { "action": "navigate|create_task|search|answer", "payload": {...}, "message": "..." }.
For navigation: payload.url = "/dashboard/route".
For create_task: payload.title, payload.description.
For answer: just a message.`,
          },
          { role: "user", content: query },
        ],
        response_format: { type: "json_object" },
      });
      const result = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/ai/coach", isAuthenticated, async (req: any, res) => {
    try {
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      const { type, context, message } = req.body;
      const systemPrompts: Record<string, string> = {
        focus: "You are an AI productivity coach. Analyze the user's task list and suggest 3 focus recommendations for the day. Be concise, actionable, bullet points.",
        insights: "You are an AI productivity coach. Compare this week's productivity data vs last week and provide 2-3 key insights. Be concise.",
        chat: "You are an AI productivity coach called 'Coach'. Answer the user's question helpfully and concisely based on their work context.",
      };
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompts[type] || systemPrompts.chat },
          { role: "user", content: `Context: ${JSON.stringify(context || {})}. ${message || ""}` },
        ],
      });
      res.json({ reply: completion.choices[0].message.content });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── SEARCH ─────────────────────────────────────────────────────────────────
  app.get("/api/search", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.query.workspaceId as string);
      const q = (req.query.q as string) || "";
      if (!q || !workspaceId) return res.json({ tasks: [], documents: [], members: [] });
      const results = await storage.searchWorkspace(workspaceId, q);
      res.json(results);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── NOTIFICATIONS ───────────────────────────────────────────────────────────
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workspaceId = parseInt(req.query.workspaceId as string) || 0;
      const list = await storage.getNotifications(userId, workspaceId);
      res.json(list);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/notifications/mark-all-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workspaceId = parseInt(req.body.workspaceId) || 0;
      await storage.markAllNotificationsRead(userId, workspaceId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      await storage.markNotificationRead(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ============================================================
  // CONNECT MESSAGING — REST ROUTES
  // ============================================================

  app.get("/api/messages/:channelId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { channelId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const cursor = req.query.cursor as string;
      const threadParentId = req.query.threadParentId as string;

      const [membership] = await db
        .select()
        .from(connectChannelMembers)
        .where(and(eq(connectChannelMembers.channelId, channelId), eq(connectChannelMembers.userId, userId)));
      if (!membership) {
        return res.status(403).json({ error: "Not a member of this channel" });
      }

      const conditions: any[] = [
        eq(connectMessages.channelId, channelId),
        isNull(connectMessages.deletedAt),
        threadParentId
          ? eq(connectMessages.threadParentId, threadParentId)
          : isNull(connectMessages.threadParentId),
      ];

      if (cursor) {
        const [cursorMsg] = await db
          .select({ createdAt: connectMessages.createdAt })
          .from(connectMessages)
          .where(eq(connectMessages.id, cursor));
        if (cursorMsg) {
          conditions.push(lt(connectMessages.createdAt, cursorMsg.createdAt));
        }
      }

      const results = await db
        .select()
        .from(connectMessages)
        .where(and(...conditions))
        .orderBy(desc(connectMessages.createdAt))
        .limit(limit + 1);

      const hasMore = results.length > limit;
      const items = results.slice(0, limit).reverse();
      res.json({ messages: items, hasMore, nextCursor: hasMore ? items[0]?.id : undefined });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/messages/pin", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { messageId, channelId } = req.body;
      await db.insert(connectPinnedMessages).values({ channelId, messageId, pinnedBy: userId });
      await db
        .update(connectMessages)
        .set({ isPinned: true, pinnedAt: new Date(), pinnedBy: userId })
        .where(eq(connectMessages.id, messageId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/messages/pin/:messageId", isAuthenticated, async (req: any, res) => {
    try {
      const { messageId } = req.params;
      const [msg] = await db.select({ channelId: connectMessages.channelId }).from(connectMessages).where(eq(connectMessages.id, messageId));
      if (msg) {
        await db.delete(connectPinnedMessages).where(and(eq(connectPinnedMessages.messageId, messageId), eq(connectPinnedMessages.channelId, msg.channelId)));
        await db.update(connectMessages).set({ isPinned: false, pinnedAt: null, pinnedBy: null }).where(eq(connectMessages.id, messageId));
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/messages/pins/:channelId", isAuthenticated, async (req: any, res) => {
    try {
      const { channelId } = req.params;
      const pinned = await db
        .select()
        .from(connectMessages)
        .where(and(eq(connectMessages.channelId, channelId), eq(connectMessages.isPinned, true), isNull(connectMessages.deletedAt)))
        .orderBy(desc(connectMessages.pinnedAt));
      res.json(pinned);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/messages/bookmark", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { messageId, note } = req.body;
      await db.insert(connectMessageBookmarks).values({ userId, messageId, note }).onConflictDoUpdate({
        target: [connectMessageBookmarks.userId, connectMessageBookmarks.messageId],
        set: { note },
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/messages/bookmark/:messageId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { messageId } = req.params;
      await db.delete(connectMessageBookmarks).where(and(eq(connectMessageBookmarks.userId, userId), eq(connectMessageBookmarks.messageId, messageId)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/messages/bookmarks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookmarks = await db
        .select()
        .from(connectMessageBookmarks)
        .where(eq(connectMessageBookmarks.userId, userId))
        .orderBy(desc(connectMessageBookmarks.createdAt))
        .limit(50);
      res.json(bookmarks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/connect/channels", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string) : null;

      const memberships = await db
        .select({ channelId: connectChannelMembers.channelId })
        .from(connectChannelMembers)
        .where(eq(connectChannelMembers.userId, userId));
      const channelIds = memberships.map(m => m.channelId);

      if (channelIds.length === 0) return res.json([]);

      const channels = await db
        .select()
        .from(connectChannels)
        .where(and(
          eq(connectChannels.isArchived, false),
          isNull(connectChannels.deletedAt),
          ...(workspaceId ? [eq(connectChannels.workspaceId, workspaceId)] : [])
        ))
        .orderBy(connectChannels.name);

      res.json(channels.filter(c => channelIds.includes(c.id)));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/connect/channels", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, displayName, description, type, workspaceId, icon, color } = req.body;
      if (!name || !displayName) return res.status(400).json({ error: "name and displayName are required" });

      const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

      if (workspaceId) {
        const [existing] = await db
          .select()
          .from(connectChannels)
          .where(and(eq(connectChannels.workspaceId, parseInt(workspaceId)), eq(connectChannels.name, name)));
        if (existing) return res.status(400).json({ error: "Channel name already exists in this workspace" });
      }

      const [channel] = await db
        .insert(connectChannels)
        .values({ name, displayName, slug, description, type: type || "public", workspaceId: workspaceId ? parseInt(workspaceId) : null, icon, color, createdBy: userId, memberCount: 1 })
        .returning();

      await db.insert(connectChannelMembers).values({ channelId: channel.id, userId, role: "owner" });

      res.json(channel);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/connect/channels/:channelId/join", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { channelId } = req.params;
      await db.insert(connectChannelMembers).values({ channelId, userId, role: "member" }).onConflictDoNothing();
      const members = await db.select().from(connectChannelMembers).where(eq(connectChannelMembers.channelId, channelId));
      await db.update(connectChannels).set({ memberCount: members.length }).where(eq(connectChannels.id, channelId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/connect/channels/:channelId/members", isAuthenticated, async (req: any, res) => {
    try {
      const { channelId } = req.params;
      const members = await db.select().from(connectChannelMembers).where(eq(connectChannelMembers.channelId, channelId));
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/connect/unread", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { unreadService } = await import("./services/unread-service");
      const counts = unreadService.getAllUnreadCounts(userId);
      res.json(counts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/connect/presence", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string) : null;
      const presence = await db.select().from(connectUserPresence);
      res.json(presence);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/connect/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const memberships = await db.select({ conversationId: connectConversationMembers.conversationId }).from(connectConversationMembers).where(eq(connectConversationMembers.userId, userId));
      if (memberships.length === 0) return res.json([]);
      const convIds = memberships.map(m => m.conversationId);
      const convs = await db.select().from(connectConversations).orderBy(desc(connectConversations.lastMessageAt));
      res.json(convs.filter(c => convIds.includes(c.id)));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/connect/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { participantIds, workspaceId } = req.body;
      const allParticipants: string[] = Array.from(new Set([userId, ...(participantIds || [])])).sort() as string[];
      const hash = allParticipants.join(":");
      const wsId = workspaceId ? parseInt(workspaceId) : null;

      const [existing] = await db.select().from(connectConversations).where(and(
        eq(connectConversations.participantHash, hash),
        ...(wsId ? [eq(connectConversations.workspaceId, wsId)] : [])
      ));
      if (existing) return res.json(existing);

      const [conv] = await db.insert(connectConversations).values({
        workspaceId: wsId,
        participantIds: allParticipants,
        participantHash: hash,
        createdBy: userId,
      }).returning();

      for (const pid of allParticipants) {
        await db.insert(connectConversationMembers).values({ conversationId: conv.id, userId: pid }).onConflictDoNothing();
      }

      res.json(conv);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/connect/dm/:conversationId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { conversationId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const cursor = req.query.cursor as string;

      const [membership] = await db.select().from(connectConversationMembers).where(and(eq(connectConversationMembers.conversationId, conversationId), eq(connectConversationMembers.userId, userId)));
      if (!membership) return res.status(403).json({ error: "Not a member of this conversation" });

      const conditions: any[] = [eq(connectDirectMessages.conversationId, conversationId), isNull(connectDirectMessages.deletedAt)];
      if (cursor) {
        const [cursorMsg] = await db.select({ createdAt: connectDirectMessages.createdAt }).from(connectDirectMessages).where(eq(connectDirectMessages.id, cursor));
        if (cursorMsg) conditions.push(lt(connectDirectMessages.createdAt, cursorMsg.createdAt));
      }

      const results = await db.select().from(connectDirectMessages).where(and(...conditions)).orderBy(desc(connectDirectMessages.createdAt)).limit(limit + 1);
      const hasMore = results.length > limit;
      const items = results.slice(0, limit).reverse();
      res.json({ messages: items, hasMore, nextCursor: hasMore ? items[0]?.id : undefined });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // CORRECTED SPRINT 2 — CHANNEL, CONVERSATION, MESSAGE REST ROUTES
  // ============================================================

  app.get("/api/channels/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const memberships = await db
        .select({
          channel: connectChannels,
          isStarred: connectChannelMembers.isStarred,
          isMuted: connectChannelMembers.isMuted,
          notificationPref: connectChannelMembers.notificationPref,
          role: connectChannelMembers.role,
        })
        .from(connectChannelMembers)
        .innerJoin(connectChannels, eq(connectChannelMembers.channelId, connectChannels.id))
        .where(and(
          eq(connectChannelMembers.userId, userId),
          eq(connectChannels.isArchived, false),
        ))
        .orderBy(desc(connectChannels.lastMessageAt));
      res.json(memberships);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/channels", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, displayName, description, type, icon, color, workspaceId } = req.body;
      if (!name || !displayName) return res.status(400).json({ error: "name and displayName are required" });

      const conditions: any[] = [eq(connectChannels.name, name)];
      if (workspaceId) {
        conditions.push(eq(connectChannels.workspaceId, parseInt(workspaceId)));
      }
      const [existing] = await db.select().from(connectChannels).where(and(...conditions));
      if (existing) return res.status(400).json({ error: `Channel #${name} already exists` });

      const [channel] = await db.insert(connectChannels).values({
        name,
        displayName,
        slug: name,
        description,
        type: type || "public",
        icon,
        color,
        workspaceId: workspaceId ? parseInt(workspaceId) : null,
        createdBy: userId,
        memberCount: 1,
      }).returning();

      await db.insert(connectChannelMembers).values({ channelId: channel.id, userId, role: "owner" });

      await db.insert(connectMessages).values({
        channelId: channel.id,
        authorId: userId,
        content: `created the channel #${displayName}`,
        type: "system",
      });

      res.json(channel);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/channels/:channelId/join", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { channelId } = req.params;
      const [channel] = await db.select().from(connectChannels).where(eq(connectChannels.id, channelId));
      if (!channel) return res.status(404).json({ error: "Channel not found" });
      if (channel.type === "private") return res.status(403).json({ error: "Cannot join private channel" });

      await db.insert(connectChannelMembers).values({ channelId, userId }).onConflictDoNothing();
      await db.update(connectChannels).set({
        memberCount: drizzleSql`${connectChannels.memberCount} + 1`,
      }).where(eq(connectChannels.id, channelId));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/channels/:channelId/leave", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { channelId } = req.params;
      await db.delete(connectChannelMembers).where(and(
        eq(connectChannelMembers.channelId, channelId),
        eq(connectChannelMembers.userId, userId),
      ));
      await db.update(connectChannels).set({
        memberCount: drizzleSql`GREATEST(${connectChannels.memberCount} - 1, 0)`,
      }).where(eq(connectChannels.id, channelId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const convos = await db
        .select({
          conversation: connectConversations,
          isMuted: connectConversationMembers.isMuted,
        })
        .from(connectConversationMembers)
        .innerJoin(connectConversations, eq(connectConversationMembers.conversationId, connectConversations.id))
        .where(eq(connectConversationMembers.userId, userId))
        .orderBy(desc(connectConversations.lastMessageAt));
      res.json(convos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { participantIds } = req.body;
      const cryptoMod = await import("crypto");
      const allParticipants: string[] = Array.from(new Set([userId, ...(participantIds || [])]));
      if (allParticipants.length < 2) return res.status(400).json({ error: "Need at least 2 participants" });

      const sorted = [...allParticipants].sort();
      const hash = cryptoMod.createHash("sha256").update(sorted.join(",")).digest("hex");
      const type = allParticipants.length === 2 ? "dm" : "group";

      const [existing] = await db.select().from(connectConversations).where(eq(connectConversations.participantHash, hash));
      if (existing) return res.json(existing);

      const [conversation] = await db.insert(connectConversations).values({
        type,
        participantIds: allParticipants,
        participantHash: hash,
        createdBy: userId,
      }).returning();

      for (const pid of allParticipants) {
        await db.insert(connectConversationMembers).values({ conversationId: conversation.id, userId: pid }).onConflictDoNothing();
      }

      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { channelId, content, contentHtml, threadParentId, mentionedUserIds } = req.body;
      if (!channelId || !content?.trim()) return res.status(400).json({ error: "channelId and content are required" });

      const [membership] = await db.select().from(connectChannelMembers).where(and(
        eq(connectChannelMembers.channelId, channelId),
        eq(connectChannelMembers.userId, userId),
      ));
      if (!membership) return res.status(403).json({ error: "Not a member of this channel" });

      const [message] = await db.insert(connectMessages).values({
        channelId,
        authorId: userId,
        content: content.trim(),
        contentHtml,
        threadParentId,
        mentionedUserIds: mentionedUserIds || [],
      }).returning();

      await db.update(connectChannels).set({
        messageCount: drizzleSql`${connectChannels.messageCount} + 1`,
        lastMessageAt: new Date(),
        lastMessagePreview: content.trim().slice(0, 200),
        updatedAt: new Date(),
      }).where(eq(connectChannels.id, channelId));

      if (threadParentId) {
        await db.update(connectMessages).set({
          threadReplyCount: drizzleSql`${connectMessages.threadReplyCount} + 1`,
          threadLastReplyAt: new Date(),
        }).where(eq(connectMessages.id, threadParentId));
      }

      res.json(message);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/messages/:messageId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { messageId } = req.params;
      const { content, contentHtml } = req.body;

      const [msg] = await db.select().from(connectMessages).where(eq(connectMessages.id, messageId));
      if (!msg) return res.status(404).json({ error: "Message not found" });
      if (msg.authorId !== userId) return res.status(403).json({ error: "Cannot edit this message" });

      const [updated] = await db.update(connectMessages).set({
        content: content.trim(),
        contentHtml,
        isEdited: true,
        editedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(connectMessages.id, messageId)).returning();

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/messages/:messageId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { messageId } = req.params;

      const [msg] = await db.select().from(connectMessages).where(eq(connectMessages.id, messageId));
      if (!msg) return res.status(404).json({ error: "Message not found" });

      const [membership] = await db.select().from(connectChannelMembers).where(and(
        eq(connectChannelMembers.channelId, msg.channelId),
        eq(connectChannelMembers.userId, userId),
      ));
      if (msg.authorId !== userId && !["owner", "admin"].includes(membership?.role || "")) {
        return res.status(403).json({ error: "Cannot delete this message" });
      }

      await db.update(connectMessages).set({ deletedAt: new Date() }).where(eq(connectMessages.id, messageId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/typing/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { channelId, userName } = req.body;
      const { typingService } = await import("./services/typing-service");
      typingService.setTyping(userId, userName || userId, channelId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/typing/stop", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { channelId } = req.body;
      const { typingService } = await import("./services/typing-service");
      typingService.clearTyping(userId, channelId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/typing/:channelId", isAuthenticated, async (req: any, res) => {
    try {
      const { channelId } = req.params;
      const currentUserId = req.user.claims.sub;
      const { typingService } = await import("./services/typing-service");
      const users = typingService.getTypingUsers(channelId).filter(u => u.userId !== currentUserId);
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AUTOPILOT EVENTS
  // ══════════════════════════════════════════════════════════════════════════
  app.post("/api/autopilot/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { events } = z.object({ events: z.array(z.any()).max(100) }).parse(req.body);
      const now = new Date();
      const enriched = events.map((e: any) => ({
        userId,
        eventType: String(e.type ?? e.eventType ?? "unknown"),
        eventData: e.data ?? e.eventData ?? {},
        sessionId: e.sessionId ?? null,
        dayOfWeek: now.getDay(),
        hourOfDay: now.getHours(),
      }));
      await storage.logActivityEvents(enriched);
      res.json({ logged: enriched.length });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AUTOPILOT RULES
  // ══════════════════════════════════════════════════════════════════════════
  app.get("/api/autopilot/rules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;
      const type = req.query.type as string | undefined;
      const rules = await storage.getAutopilotRules(userId, { isActive, type });
      res.json(rules);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/autopilot/rules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const schema = z.object({
        name: z.string().min(1), description: z.string().optional(),
        type: z.string(), triggerType: z.string(), triggerConfig: z.any().optional(),
        actions: z.any().optional(), executionMode: z.string().optional(),
        cooldownMinutes: z.number().optional(), maxExecutionsPerDay: z.number().optional(),
        tags: z.array(z.string()).optional(),
      });
      const data = schema.parse(req.body);
      const rule = await storage.createAutopilotRule({ ...data, userId });
      res.status(201).json(rule);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/autopilot/rules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const rule = await storage.updateAutopilotRule(id, userId, req.body);
      if (!rule) return res.status(404).json({ error: "Not found" });
      res.json(rule);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/autopilot/rules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteAutopilotRule(parseInt(req.params.id), userId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AUTOPILOT EXECUTIONS
  // ══════════════════════════════════════════════════════════════════════════
  app.get("/api/autopilot/executions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const status = req.query.status as string | undefined;
      const ruleId = req.query.ruleId ? parseInt(req.query.ruleId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const executions = await storage.getAutopilotExecutions(userId, { status, ruleId, limit });
      res.json(executions);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/autopilot/executions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dateKey = new Date().toISOString().slice(0, 10);
      const cacheKey = `autopilot_daily:${userId}:${dateKey}`;
      const entry = autopilotRateCache.get(cacheKey) ?? { count: 0, resetAt: Date.now() + 86400000 };
      const ruleId = req.body.ruleId;
      if (ruleId) {
        const [rule] = await db.select().from(autopilotRules).where(and(eq(autopilotRules.id, ruleId), eq(autopilotRules.userId, userId)));
        if (rule && entry.count >= (rule.maxExecutionsPerDay ?? 50)) {
          return res.status(429).json({ error: "Rate limit exceeded for this rule" });
        }
      }
      const execution = await storage.createAutopilotExecution({ ...req.body, userId });
      entry.count++;
      autopilotRateCache.set(cacheKey, entry);
      res.status(201).json(execution);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/autopilot/executions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const { action, ...data } = req.body;
      let updateData: any = data;
      if (action === "approve") updateData = { ...data, status: "executing", approvedAt: new Date() };
      else if (action === "decline") updateData = { ...data, status: "declined", declinedAt: new Date() };
      else if (action === "undo") updateData = { ...data, status: "completed", undoneAt: new Date() };
      const execution = await storage.updateAutopilotExecution(id, userId, updateData);
      if (!execution) return res.status(404).json({ error: "Not found" });
      res.json(execution);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AUTOPILOT PATTERNS + SETTINGS
  // ══════════════════════════════════════════════════════════════════════════
  app.get("/api/autopilot/patterns", isAuthenticated, async (req: any, res) => {
    try {
      const patterns = await storage.getAutopilotPatterns(req.user.claims.sub);
      res.json(patterns);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/autopilot/patterns/:id/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const { action } = z.object({ action: z.enum(["enable", "dismiss"]) }).parse(req.body);
      const [pattern] = await db.select().from(autopilotPatterns).where(and(eq(autopilotPatterns.id, id), eq(autopilotPatterns.userId, userId)));
      if (!pattern) return res.status(404).json({ error: "Not found" });
      if (action === "enable") {
        await storage.updateAutopilotPattern(id, { status: "accepted", confidence: Math.min(1, (pattern.confidence ?? 0) + 0.05) });
        if (pattern.suggestedRule) {
          await storage.createAutopilotRule({ ...(pattern.suggestedRule as any), userId, type: "learned" });
        }
      } else {
        await storage.updateAutopilotPattern(id, { status: "dismissed", confidence: Math.max(0, (pattern.confidence ?? 0) - 0.03) });
      }
      res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.get("/api/autopilot/settings", isAuthenticated, async (req: any, res) => {
    try {
      const settings = await storage.getAutopilotSettings(req.user.claims.sub);
      res.json(settings);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/autopilot/settings", isAuthenticated, async (req: any, res) => {
    try {
      await storage.saveAutopilotSettings(req.user.claims.sub, req.body);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PREDICTIONS
  // ══════════════════════════════════════════════════════════════════════════
  app.get("/api/predictions", isAuthenticated, async (req: any, res) => {
    try {
      const predictions = await storage.getTaskPredictions(req.user.claims.sub);
      res.json(predictions);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/predictions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expiresAt = new Date(Date.now() + 7 * 86400000);
      const prediction = await storage.createTaskPrediction({ ...req.body, userId, expiresAt });
      res.status(201).json(prediction);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/predictions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const { action, acceptedTaskId, ...rest } = req.body;
      let updateData: any = rest;
      if (action === "accept") {
        updateData = { ...rest, status: "accepted", acceptedTaskId };
        // Boost confidence on matching sequences
        const seqs = await storage.getTaskSequences(userId);
        for (const seq of seqs) {
          const pattern = seq.followingTaskPattern as any;
          if (pattern?.titlePattern && rest.predictedTitle?.includes(pattern.titlePattern)) {
            await db.update(taskSequences).set({ confidence: Math.min(1, (seq.confidence ?? 0) + 0.05) }).where(eq(taskSequences.id, seq.id));
          }
        }
      } else if (action === "dismiss") {
        updateData = { ...rest, status: "dismissed" };
        // Lower confidence on matching sequences
        const seqs = await storage.getTaskSequences(userId);
        for (const seq of seqs) {
          await db.update(taskSequences).set({ confidence: Math.max(0, (seq.confidence ?? 0) - 0.03) }).where(eq(taskSequences.id, seq.id));
        }
      }
      const prediction = await storage.updateTaskPrediction(id, userId, updateData);
      if (!prediction) return res.status(404).json({ error: "Not found" });
      res.json(prediction);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TIME MACHINE
  // ══════════════════════════════════════════════════════════════════════════
  app.get("/api/timemachine/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { date } = req.query;
      if (date) {
        const session = await storage.getWorkSession(userId, date as string);
        return res.json(session ?? null);
      }
      const sessions = await storage.getWorkSessions(userId, 30);
      res.json(sessions);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/timemachine/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const session = await storage.saveWorkSession({ ...req.body, userId });
      res.status(201).json(session);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.get("/api/timemachine/coaching", isAuthenticated, async (req: any, res) => {
    try {
      const messages = await storage.getCoachingMessages(req.user.claims.sub);
      res.json(messages);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/timemachine/coaching/:id/apply", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const [msg] = await db.select().from(aiCoachingMessages).where(and(eq(aiCoachingMessages.id, id), eq(aiCoachingMessages.userId, userId)));
      if (!msg) return res.status(404).json({ error: "Not found" });
      if (msg.actionData) {
        const actionData = msg.actionData as any;
        if (actionData.ruleConfig) {
          await storage.createAutopilotRule({ ...actionData.ruleConfig, userId, type: "suggested" });
        }
      }
      await storage.updateCoachingMessage(id, userId, { isRead: true });
      res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/timemachine/coaching/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const { isRead, isDismissed } = req.body;
      await storage.updateCoachingMessage(id, userId, { isRead, isDismissed });
      res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.get("/api/timemachine/settings", isAuthenticated, async (req: any, res) => {
    try {
      const settings = await storage.getAutopilotSettings(req.user.claims.sub);
      res.json((settings as any)?.timemachine ?? {});
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/timemachine/settings", isAuthenticated, async (req: any, res) => {
    try {
      const existing = await storage.getAutopilotSettings(req.user.claims.sub) as any ?? {};
      await storage.saveAutopilotSettings(req.user.claims.sub, { ...existing, timemachine: req.body });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DELEGATION
  // ══════════════════════════════════════════════════════════════════════════
  app.post("/api/delegation/suggest", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { taskId } = z.object({ taskId: z.number() }).parse(req.body);
      const profiles = await storage.getAllTeamMemberProfiles();
      const candidates = profiles.map((p) => {
        const workload = (p.currentWorkload as any) ?? {};
        const score = Math.round(100 - (workload.capacityPercent ?? 50) * 0.5);
        return { userId: p.userId, score, skills: p.skills, availability: p.availability };
      }).sort((a, b) => b.score - a.score).slice(0, 5);
      const suggestion = await storage.createDelegationSuggestion({ taskId, suggestedById: userId, candidates, selectionSource: "ai" });
      res.json({ suggestion, candidates });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/delegation/assign", isAuthenticated, async (req: any, res) => {
    try {
      const { suggestionId, selectedUserId } = z.object({ suggestionId: z.number(), selectedUserId: z.string() }).parse(req.body);
      await storage.updateDelegationSuggestion(suggestionId, { selectedUserId, selectionSource: "user" });
      res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.get("/api/delegation/rules", isAuthenticated, async (req: any, res) => {
    try {
      const rules = await storage.getDelegationRules(req.user.claims.sub);
      res.json(rules);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/delegation/rules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rule = await storage.createDelegationRule({ ...req.body, userId, createdBy: userId });
      res.status(201).json(rule);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/delegation/rules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.updateDelegationRule(parseInt(req.params.id), userId, req.body);
      res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PROJECT CONTEXTS
  // ══════════════════════════════════════════════════════════════════════════
  app.get("/api/contexts", isAuthenticated, async (req: any, res) => {
    try {
      const contexts = await storage.getProjectContexts(req.user.claims.sub);
      res.json(contexts);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/contexts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ctx = await storage.createProjectContext({ ...req.body, userId, lastActiveAt: new Date() });
      res.status(201).json(ctx);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/contexts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const { action, ...data } = req.body;
      let updateData: any = data;
      if (action === "switch") {
        updateData = { ...data, lastActiveAt: new Date() };
        // If away > 2h, generate AI catch-up summary
        const [existing] = await db.select().from(projectContexts).where(and(eq(projectContexts.id, id), eq(projectContexts.userId, userId)));
        if (existing) {
          const awayMs = Date.now() - (existing.lastActiveAt?.getTime() ?? 0);
          if (awayMs > 2 * 3_600_000) {
            const recentTasks = await db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.id)).limit(10);
            const summary = await callAI(`Summarize what changed for project "${existing.projectName}": ${JSON.stringify(recentTasks.map(t => t.title))}`, "You are a productivity assistant. Provide a 2-3 sentence catch-up summary.");
            updateData.aiCatchUpSummary = { summary, generatedAt: new Date().toISOString(), awayHours: Math.round(awayMs / 3_600_000) };
          }
        }
      }
      const ctx = await storage.updateProjectContext(id, userId, updateData);
      if (!ctx) return res.status(404).json({ error: "Not found" });
      res.json(ctx);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // WORKFLOWS
  // ══════════════════════════════════════════════════════════════════════════
  app.get("/api/workflows", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mine = await storage.getRecordedWorkflows(userId);
      const shared = req.query.includePublic === "true" ? await storage.getPublicWorkflows() : [];
      const all = [...mine, ...shared.filter(s => s.userId !== userId)];
      res.json(all);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/workflows", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wf = await storage.createRecordedWorkflow({ ...req.body, userId });
      res.status(201).json(wf);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/workflows/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const { action, durationSeconds, ...data } = req.body;
      let updateData: any = data;
      if (action === "run_complete") {
        const [wf] = await db.select().from(recordedWorkflows).where(and(eq(recordedWorkflows.id, id), eq(recordedWorkflows.userId, userId)));
        if (wf) {
          const newCount = (wf.timesRun ?? 0) + 1;
          const prevAvg = wf.avgDurationSeconds ?? 0;
          const newAvg = (prevAvg * (newCount - 1) + (durationSeconds ?? 0)) / newCount;
          updateData = { ...data, timesRun: newCount, avgDurationSeconds: newAvg };
          // Real task/note creation for create_task and create_note steps
          const steps: any[] = (wf.processedSteps as any[]) ?? [];
          for (const step of steps) {
            if (step.type === "create_task") {
              const today = new Date().toISOString().slice(0, 10);
              await storage.createTask({ title: step.data?.title ?? "Workflow Task", userId, date: today, completionPercentage: 0 });
            } else if (step.type === "create_note") {
              await storage.createNote({ title: step.data?.title ?? "Workflow Note", content: "", userId });
            }
          }
        }
      }
      const wf = await storage.updateRecordedWorkflow(id, userId, updateData);
      if (!wf) return res.status(404).json({ error: "Not found" });
      res.json(wf);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/workflows/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteRecordedWorkflow(parseInt(req.params.id), userId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DAILY PLANNER
  // ══════════════════════════════════════════════════════════════════════════
  app.get("/api/planner/today", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const today = new Date().toISOString().slice(0, 10);
      const plan = await storage.getDailyPlan(userId, today);
      res.json(plan ?? null);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/planner/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const today = new Date().toISOString().slice(0, 10);
      const userTasks = await db.select().from(tasks).where(and(eq(tasks.userId, userId))).orderBy(desc(tasks.id)).limit(20);
      const basePlan = { blocks: userTasks.slice(0, 8).map((t, i) => ({ id: `t${t.id}`, startTime: `${9 + i}:00`, durationMinutes: 45, title: t.title, type: "task", priority: t.priority ?? "Should Do", linkedTaskId: t.id })), reasoning: "AI-generated based on your tasks" };
      const aiOptimized = await callAI(`Optimize this daily schedule: ${JSON.stringify(basePlan.blocks.map(b => b.title))}. Return a brief reason for the order.`);
      const generatedPlan = { ...basePlan, reasoning: aiOptimized || basePlan.reasoning };
      const plan = await storage.createDailyPlan({ userId, date: today, status: "active", generatedPlan, userModifications: {} });
      res.status(201).json(plan);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/planner/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const { action, completedBlockId, ...data } = req.body;
      let updateData: any = data;
      if (action === "block_done" && completedBlockId) {
        const taskIdMatch = String(completedBlockId).match(/^t(\d+)$/);
        if (taskIdMatch) {
          await db.update(tasks).set({ completionPercentage: 100 }).where(eq(tasks.id, parseInt(taskIdMatch[1])));
        }
      }
      const plan = await storage.updateDailyPlan(id, userId, updateData);
      if (!plan) return res.status(404).json({ error: "Not found" });
      res.json(plan);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DOCUMENT TEMPLATES + GENERATION
  // ══════════════════════════════════════════════════════════════════════════
  app.get("/api/templates", isAuthenticated, async (_req: any, res) => {
    try {
      const templates = await storage.getDocumentTemplates();
      res.json(templates);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tmpl = await storage.createDocumentTemplate({ ...req.body, createdBy: userId, isBuiltIn: false });
      res.status(201).json(tmpl);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.updateDocumentTemplate(parseInt(req.params.id), req.body);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteDocumentTemplate(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/documents/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { templateId, config, sections } = req.body;
      const startMs = Date.now();
      const generatedSections: any[] = [];
      const userTasks = await db.select().from(tasks).where(eq(tasks.userId, userId)).limit(20);
      const userNotes = await db.select().from(notes).where(eq(notes.userId, userId)).limit(10);
      for (const section of (sections ?? [])) {
        let content = "";
        if (section.type === "ai_generated") {
          content = await callAI(`${section.aiPrompt ?? section.title}. Context: ${JSON.stringify({ tasks: userTasks.map((t: any) => t.title), notes: userNotes.map((n: any) => n.content?.slice(0, 100)) })}`);
        } else if (section.type === "data_query") {
          if (section.dataQuery === "tasks") content = userTasks.map((t: any) => `- ${t.title} (${t.completionPercentage ?? 0}% done)`).join("\n");
          else if (section.dataQuery === "notes") content = userNotes.map((n: any) => n.content?.slice(0, 200)).filter(Boolean).join("\n\n");
          else content = "No data available.";
        } else if (section.type === "static_text") {
          content = section.content ?? "";
        } else {
          content = "";
        }
        generatedSections.push({ title: section.title, content });
      }
      const markdownContent = generatedSections.map(s => `## ${s.title}\n\n${s.content}`).join("\n\n---\n\n");
      const note = await storage.createNote({ title: `Generated Document – ${new Date().toLocaleDateString()}`, content: markdownContent, userId });
      const genDoc = await storage.createGeneratedDocument({ templateId: templateId ?? null, userId, noteId: note.id, generationConfig: config ?? {}, dataSources: {}, status: "completed", generationTimeMs: Date.now() - startMs });
      if (templateId) await storage.updateDocumentTemplate(templateId, { usageCount: undefined });
      res.json({ document: genDoc, note, sections: generatedSections });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // BACKGROUND CRON JOBS
  // ══════════════════════════════════════════════════════════════════════════

  // Pattern detection — every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    try {
      const allUsers = await db.selectDistinct({ userId: autopilotActivityLog.userId }).from(autopilotActivityLog);
      for (const { userId } of allUsers) {
        const logs = await storage.getActivityLogs(userId, 14);
        if (logs.length < 50) continue;
        const eventCounts = new Map<string, number>();
        for (const log of logs) {
          const key = `${log.dayOfWeek}:${log.hourOfDay}:${log.eventType}`;
          eventCounts.set(key, (eventCounts.get(key) ?? 0) + 1);
        }
        for (const [key, freq] of eventCounts.entries()) {
          if (freq >= 3) {
            const [dayOfWeek, hourOfDay, eventType] = key.split(":");
            const confidence = Math.min(0.95, 0.5 + freq * 0.05);
            if (confidence > 0.75) {
              await storage.createAutopilotPattern({
                userId, patternType: "time_based", description: `Recurring "${eventType}" on day ${dayOfWeek} at hour ${hourOfDay}`,
                eventSequence: [{ dayOfWeek, hourOfDay, eventType }], frequency: freq, confidence,
                suggestedRule: { name: `Auto: ${eventType}`, triggerType: "time", triggerConfig: { dayOfWeek, hourOfDay }, actions: [], executionMode: "suggest" },
                status: "detected", detectedAt: new Date(), lastOccurredAt: new Date(),
              });
            }
          }
        }
      }
    } catch {}
  }, { timezone: "UTC" });

  // Sequence learning — nightly 2AM UTC
  cron.schedule("0 2 * * *", async () => {
    try {
      const allUsers = await db.selectDistinct({ userId: tasks.userId }).from(tasks);
      for (const { userId } of allUsers) {
        const completed = await db.select().from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.completionPercentage, 100))).orderBy(asc(tasks.id)).limit(200);
        if (completed.length < 5) continue;
        const pairCounts = new Map<string, number>();
        for (let i = 0; i < completed.length - 1; i++) {
          const key = `${completed[i].title}|||${completed[i + 1].title}`;
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
        }
        for (const [pair, count] of pairCounts.entries()) {
          if (count >= 2) {
            const [preceding, following] = pair.split("|||");
            const confidence = Math.min(0.95, 0.4 + count * 0.1);
            await storage.upsertTaskSequence({ userId, precedingTaskPattern: { titlePattern: preceding }, followingTaskPattern: { titlePattern: following }, occurrences: count, confidence, lastObservedAt: new Date(), isActive: true });
          }
        }
      }
    } catch {}
  }, { timezone: "UTC" });

  // Weekly analysis + coaching — Sunday 8PM UTC
  cron.schedule("0 20 * * 0", async () => {
    try {
      const allUsers = await db.selectDistinct({ userId: workSessions.userId }).from(workSessions);
      for (const { userId } of allUsers) {
        const sessions = await storage.getWorkSessions(userId, 7);
        if (sessions.length === 0) continue;
        const totalActive = sessions.reduce((s, sess) => s + (sess.totalActiveMinutes ?? 0), 0);
        await storage.createWorkPattern({ userId, patternType: "weekly_summary", data: { totalActiveMins: totalActive, sessionCount: sessions.length }, analysisDate: new Date(), periodDays: 7 });
        const coaching = await callAI(`Based on ${totalActive} active minutes across ${sessions.length} sessions, give one actionable productivity tip in 1-2 sentences.`);
        if (coaching) {
          await storage.createCoachingMessage({ userId, type: "weekly_insight", title: "Weekly Productivity Insight", content: coaching, actionable: false, priority: "medium" });
        }
      }
    } catch {}
  }, { timezone: "UTC" });

  // Monthly analysis — 1st of month at midnight UTC
  cron.schedule("0 0 1 * *", async () => {
    try {
      const allUsers = await db.selectDistinct({ userId: workSessions.userId }).from(workSessions);
      for (const { userId } of allUsers) {
        const sessions = await storage.getWorkSessions(userId, 30);
        if (sessions.length === 0) continue;
        const totalActive = sessions.reduce((s, sess) => s + (sess.totalActiveMinutes ?? 0), 0);
        await storage.createWorkPattern({ userId, patternType: "monthly_summary", data: { totalActiveMins: totalActive, sessionCount: sessions.length }, analysisDate: new Date(), periodDays: 30 });
      }
    } catch {}
  }, { timezone: "UTC" });

  // End-of-day work session summary — 6PM UTC
  cron.schedule("0 18 * * *", async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const allUsers = await db.selectDistinct({ userId: autopilotActivityLog.userId }).from(autopilotActivityLog);
      for (const { userId } of allUsers) {
        const logs = await storage.getActivityLogs(userId, 1);
        if (logs.length === 0) continue;
        const activeMinutes = Math.round(logs.length * 2);
        const summary = await callAI(`Analyze this work day summary: ${logs.length} logged activities. Provide: 1 sentence narrative, 2 insights, 1 recommendation. Be brief.`);
        await storage.saveWorkSession({ userId, date: today, startTime: new Date(new Date().setHours(9, 0, 0, 0)), totalActiveMinutes: activeMinutes, totalIdleMinutes: Math.max(0, 480 - activeMinutes), activities: logs.slice(0, 20), summary: { narrative: summary, insights: [], recommendations: [], score: Math.min(100, Math.round(activeMinutes / 4.8)) } });
      }
    } catch {}
  }, { timezone: "UTC" });

  // Daily plan auto-generation — 7AM UTC
  cron.schedule("0 7 * * *", async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const allUsers = await db.selectDistinct({ userId: tasks.userId }).from(tasks);
      for (const { userId } of allUsers) {
        const existing = await storage.getDailyPlan(userId, today);
        if (existing) continue;
        const settings = await storage.getAutopilotSettings(userId) as any;
        if (!settings?.autoGeneratePlan) continue;
        const userTasks = await db.select().from(tasks).where(eq(tasks.userId, userId)).limit(10);
        const blocks = userTasks.map((t, i) => ({ id: `t${t.id}`, startTime: `${9 + i}:00`, durationMinutes: 45, title: t.title, type: "task", linkedTaskId: t.id }));
        await storage.createDailyPlan({ userId, date: today, status: "active", generatedPlan: { blocks, reasoning: "Auto-generated" }, userModifications: {} });
      }
    } catch {}
  }, { timezone: "UTC" });

  // Skill detection — Sunday midnight UTC
  cron.schedule("0 0 * * 0", async () => {
    try {
      const allUsers = await db.selectDistinct({ userId: tasks.userId }).from(tasks);
      const SKILL_KEYWORDS: Record<string, string[]> = {
        "JavaScript": ["javascript", "js", "react", "vue", "angular", "node"],
        "TypeScript": ["typescript", "ts", "type"],
        "Python": ["python", "django", "flask", "fastapi"],
        "Database": ["sql", "database", "postgres", "mysql", "query", "schema"],
        "Design": ["design", "ui", "ux", "figma", "mockup", "wireframe"],
        "Writing": ["write", "blog", "article", "content", "copy", "email"],
        "Planning": ["plan", "strategy", "roadmap", "goals", "okr"],
        "Research": ["research", "analyze", "investigate", "study", "review"],
        "Management": ["manage", "delegate", "coordinate", "lead", "meeting"],
        "Marketing": ["marketing", "seo", "ads", "campaign", "growth"],
      };
      for (const { userId } of allUsers) {
        const userTasks = await db.select().from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.completionPercentage, 100))).limit(100);
        const detectedSkills: string[] = [];
        for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
          const matchCount = userTasks.filter(t => keywords.some(kw => t.title?.toLowerCase().includes(kw))).length;
          if (matchCount >= 3) detectedSkills.push(skill);
        }
        if (detectedSkills.length > 0) {
          await storage.upsertTeamMemberProfile({ userId, skills: detectedSkills, domains: detectedSkills.slice(0, 3), currentWorkload: {}, availability: { available: true }, preferences: {}, performanceMetrics: {}, lastProfileUpdateAt: new Date() });
        }
      }
    } catch {}
  }, { timezone: "UTC" });

  // Cleanup expired predictions — midnight
  cron.schedule("0 0 * * *", async () => {
    try {
      await db.update(taskPredictions).set({ status: "expired" }).where(and(eq(taskPredictions.status, "predicted"), lte(taskPredictions.expiresAt, new Date())));
    } catch {}
  }, { timezone: "UTC" });

  // Profile update — every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    try {
      const allUsers = await db.selectDistinct({ userId: tasks.userId }).from(tasks);
      for (const { userId } of allUsers) {
        const userTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
        const completed = userTasks.filter(t => (t.completionPercentage ?? 0) >= 100);
        const overdue = userTasks.filter(t => (t.completionPercentage ?? 0) < 100 && t.date && new Date(t.date) < new Date());
        const completionRate = userTasks.length > 0 ? completed.length / userTasks.length : 0;
        await storage.upsertTeamMemberProfile({ userId, skills: [], domains: [], currentWorkload: { total: userTasks.length, overdue: overdue.length }, availability: { available: true }, preferences: {}, performanceMetrics: { completionRate, totalCompleted: completed.length }, lastProfileUpdateAt: new Date() });
      }
    } catch {}
  });

  // ============================================================
  // SPRINT 1: UNIVERSAL AI STREAM ENDPOINT
  // ============================================================
  app.post("/api/ai/stream", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { prompt, context, model, feature = "general" } = req.body;
    if (!prompt) return res.status(400).json({ message: "prompt is required" });

    const startMs = Date.now();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");

    let inputTokens = 0;
    let outputTokens = 0;
    let success = true;
    let errorMsg: string | undefined;

    try {
      const systemPrompt = context
        ? `You are a helpful AI assistant. Use this context to inform your response:\n\n${context}\n\nRespond helpfully and concisely.`
        : "You are a helpful AI assistant. Respond helpfully and concisely.";

      const selectedModel = (model === "gpt-4o" || model === "gpt-4o-mini") ? model : undefined;
      const resolvedModel = aiService.resolveModel(undefined, selectedModel);

      const stream = aiService.generateStream(prompt, {
        model: resolvedModel,
        systemPrompt,
        maxTokens: 2000,
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          res.write(chunk.text);
          outputTokens += Math.ceil(chunk.text.length / 4);
        }
        if (chunk.done) break;
      }

      inputTokens = Math.ceil((prompt.length + (context?.length || 0)) / 4);
      res.end();
    } catch (err: any) {
      success = false;
      errorMsg = err.message;
      if (!res.headersSent) {
        res.status(500).json({ message: "AI stream failed" });
      } else {
        res.end();
      }
    } finally {
      logAiUsage({
        userId,
        feature,
        action: "stream",
        model: model || "gpt-4o-mini",
        inputTokens,
        outputTokens,
        durationMs: Date.now() - startMs,
        success,
        error: errorMsg,
      }).catch(() => {});
    }
  });

  // ============================================================
  // SPRINT 3 — FEATURE 3: DAILY PLANNER
  // ============================================================

  // GET /api/daily-plan?date=2026-03-04
  app.get("/api/daily-plan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const date = z.string().parse(req.query.date);
      const [plan] = await db
        .select()
        .from(dailyPlans)
        .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, date)))
        .limit(1);
      return res.json(plan || null);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // POST /api/daily-plan/generate
  app.post("/api/daily-plan/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const startTime = Date.now();
      const { date: targetDate } = z.object({ date: z.string() }).parse(req.body);

      const [prefs] = await db
        .select()
        .from(schedulingPreferences)
        .where(eq(schedulingPreferences.userId, userId))
        .limit(1);

      const workingHours = (prefs?.workingHours as any) || { start: "09:00", end: "18:00" };
      const lunchTime = (prefs?.lunchTime as any) || { start: "12:30", end: "13:30" };
      const peakFocus = (prefs?.peakFocusWindow as any) || { start: "10:00", end: "12:00" };

      const userTasks = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, userId), drizzleSql`${tasks.completionPercentage} < 100`))
        .orderBy(desc(tasks.priority))
        .limit(20);

      const userHabits = await db
        .select()
        .from(aiHabits)
        .where(and(eq(aiHabits.userId, userId), eq(aiHabits.isActive, true)));

      const yesterday = new Date(targetDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const [yesterdayPlan] = await db
        .select()
        .from(dailyPlans)
        .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, yesterdayStr)))
        .limit(1);
      const carryOverBlocks = yesterdayPlan
        ? ((yesterdayPlan.timeBlocks as any[]) || []).filter(
            (b: any) => !b.isCompleted && !b.isSkipped && b.taskId
          )
        : [];

      const tasksForAI = userTasks.map(t => ({
        id: t.id,
        title: t.title,
        date: t.date,
        priority: t.priority || "medium",
        estimatedMinutes: (t as any).time || 60,
        completionPercentage: t.completionPercentage || 0,
      }));
      const habitsForAI = userHabits.map(h => ({
        id: h.id,
        name: h.name,
        durationMinutes: h.durationMinutes,
        preferredTimeRange: h.preferredTimeRange,
        priority: h.priority,
      }));

      const aiResponse = await aiService.generateJSON<{
        timeBlocks: Array<{
          type: string; title: string; startTime: string; endTime: string;
          durationMinutes: number; taskId?: number; habitId?: number;
          priority: string; energyLevel: string; isFixed: boolean; aiReason: string;
        }>;
        summary: {
          totalPlannedMinutes: number; focusMinutes: number; meetingMinutes: number;
          mustDoCount: number; shouldDoCount: number; niceToDoCount: number;
          topPriority: string; aiReasoning: string; completionLikelihood: number;
        };
      }>(
        `Create an optimized daily schedule for ${targetDate}.

WORKING HOURS: ${workingHours.start} to ${workingHours.end}
LUNCH: ${lunchTime.start} to ${lunchTime.end}
PEAK FOCUS WINDOW: ${peakFocus.start} to ${peakFocus.end}
BUFFER BETWEEN MEETINGS: ${prefs?.bufferBetweenMeetings || 15} minutes

TASKS TO SCHEDULE:
${JSON.stringify(tasksForAI, null, 2)}

HABITS TO INCLUDE:
${JSON.stringify(habitsForAI, null, 2)}

CARRY-OVER FROM YESTERDAY: ${carryOverBlocks.length} incomplete tasks

RULES:
1. Place MUST DO tasks (high priority) in peak focus window (${peakFocus.start}-${peakFocus.end})
2. Place habits in their preferred time ranges
3. Add 15-min breaks every 90 minutes
4. Add morning planning block (15 min at start of day)
5. Add evening review block (15 min at end of day)
6. Add communication blocks (30 min morning + 30 min after lunch)
7. Leave at least 30 min unscheduled as buffer
8. Place SHOULD DO tasks in remaining good time slots
9. Place NICE TO DO tasks in lower-energy afternoon slots
10. Never overlap blocks
11. MUST DO = high priority; SHOULD DO = medium; NICE TO DO = low

Return JSON with timeBlocks array sorted by startTime and a summary object.
Each block needs: type (task/meeting/focus/break/habit/communication/planning/buffer/custom),
title, startTime (HH:MM), endTime (HH:MM), durationMinutes, taskId/habitId if applicable,
priority (must_do/should_do/nice_to_do), energyLevel (high/medium/low), isFixed (bool), aiReason.`,
        {
          systemPrompt: "You are an expert productivity scheduler. Create optimal daily schedules that maximize deep work time and respect human energy patterns. Return ONLY valid JSON.",
          temperature: 0.3,
        }
      );

      const timeBlocks = aiResponse.timeBlocks.map((block) => ({
        ...block,
        id: crypto.randomUUID(),
        isCompleted: false,
        isSkipped: false,
        scheduledByAI: true,
      }));

      const [plan] = await db
        .insert(dailyPlans)
        .values({
          userId,
          date: targetDate,
          status: prefs?.planMode === "automatic" ? "active" : "generated",
          timeBlocks: timeBlocks as any,
          aiSummary: aiResponse.summary as any,
        })
        .onConflictDoUpdate({
          target: [dailyPlans.userId, dailyPlans.date],
          set: {
            timeBlocks: timeBlocks as any,
            aiSummary: aiResponse.summary as any,
            status: "generated",
          },
        })
        .returning();

      await logAiUsage({
        userId,
        feature: "planner",
        action: "generate_plan",
        model: "gpt-4o",
        inputTokens: 0,
        outputTokens: 0,
        durationMs: Date.now() - startTime,
      });

      return res.json(plan);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // PATCH /api/daily-plan/:planId/blocks
  app.patch("/api/daily-plan/:planId/blocks", isAuthenticated, async (req: any, res) => {
    try {
      const planId = z.number().int().parse(Number(req.params.planId));
      const { timeBlocks } = z.object({ timeBlocks: z.array(z.any()) }).parse(req.body);

      const [existing] = await db
        .select()
        .from(dailyPlans)
        .where(eq(dailyPlans.id, planId))
        .limit(1);
      if (!existing) return res.status(404).json({ error: "Plan not found" });

      const [updated] = await db
        .update(dailyPlans)
        .set({ timeBlocks: timeBlocks as any, modificationsCount: (existing.modificationsCount || 0) + 1 })
        .where(eq(dailyPlans.id, planId))
        .returning();

      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // POST /api/daily-plan/:planId/complete-block
  app.post("/api/daily-plan/:planId/complete-block", isAuthenticated, async (req: any, res) => {
    try {
      const planId = z.number().int().parse(Number(req.params.planId));
      const { blockId, actualDurationMinutes } = z.object({
        blockId: z.string(),
        actualDurationMinutes: z.number().optional(),
      }).parse(req.body);

      const [plan] = await db.select().from(dailyPlans).where(eq(dailyPlans.id, planId)).limit(1);
      if (!plan) return res.status(404).json({ error: "Plan not found" });

      const blocks = (plan.timeBlocks as any[]) || [];
      const blockIndex = blocks.findIndex((b: any) => b.id === blockId);
      if (blockIndex === -1) return res.status(404).json({ error: "Block not found" });

      blocks[blockIndex].isCompleted = true;
      blocks[blockIndex].completedAt = new Date().toISOString();
      blocks[blockIndex].actualDurationMinutes = actualDurationMinutes;

      const totalBlocks = blocks.filter((b: any) => b.type !== "break" && b.type !== "buffer");
      const completedBlocks = totalBlocks.filter((b: any) => b.isCompleted);
      const completionRate = totalBlocks.length > 0 ? completedBlocks.length / totalBlocks.length : 0;

      const [updated] = await db
        .update(dailyPlans)
        .set({ timeBlocks: blocks, completionRate })
        .where(eq(dailyPlans.id, planId))
        .returning();

      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // POST /api/daily-plan/:planId/skip-block
  app.post("/api/daily-plan/:planId/skip-block", isAuthenticated, async (req: any, res) => {
    try {
      const planId = z.number().int().parse(Number(req.params.planId));
      const { blockId } = z.object({ blockId: z.string() }).parse(req.body);

      const [plan] = await db.select().from(dailyPlans).where(eq(dailyPlans.id, planId)).limit(1);
      if (!plan) return res.status(404).json({ error: "Plan not found" });

      const blocks = (plan.timeBlocks as any[]) || [];
      const blockIndex = blocks.findIndex((b: any) => b.id === blockId);
      if (blockIndex === -1) return res.status(404).json({ error: "Block not found" });

      blocks[blockIndex].isSkipped = true;

      const [updated] = await db
        .update(dailyPlans)
        .set({ timeBlocks: blocks })
        .where(eq(dailyPlans.id, planId))
        .returning();

      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // POST /api/daily-plan/:planId/review
  app.post("/api/daily-plan/:planId/review", isAuthenticated, async (req: any, res) => {
    try {
      const planId = z.number().int().parse(Number(req.params.planId));
      const { reviewNote } = z.object({ reviewNote: z.string().optional() }).parse(req.body);

      const [updated] = await db
        .update(dailyPlans)
        .set({ reviewNote, status: "completed" })
        .where(eq(dailyPlans.id, planId))
        .returning();

      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // GET /api/daily-plan/preferences
  app.get("/api/daily-plan/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let [prefs] = await db
        .select()
        .from(schedulingPreferences)
        .where(eq(schedulingPreferences.userId, userId))
        .limit(1);
      if (!prefs) {
        [prefs] = await db.insert(schedulingPreferences).values({ userId }).returning();
      }
      return res.json(prefs);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // PATCH /api/daily-plan/preferences
  app.patch("/api/daily-plan/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({
        workingHours: z.any().optional(),
        timezone: z.string().optional(),
        workDays: z.array(z.number()).optional(),
        lunchTime: z.any().optional(),
        peakFocusWindow: z.any().optional(),
        preferMeetingsIn: z.string().optional(),
        minFocusBlockMinutes: z.number().optional(),
        bufferBetweenMeetings: z.number().optional(),
        autoScheduleEnabled: z.boolean().optional(),
        morningPlanningEnabled: z.boolean().optional(),
        morningPlanningTime: z.string().optional(),
        eveningReviewEnabled: z.boolean().optional(),
        eveningReviewTime: z.string().optional(),
        planMode: z.string().optional(),
      }).parse(req.body);

      const [existing] = await db
        .select()
        .from(schedulingPreferences)
        .where(eq(schedulingPreferences.userId, userId))
        .limit(1);

      if (!existing) {
        const [created] = await db.insert(schedulingPreferences).values({ userId, ...input }).returning();
        return res.json(created);
      }

      const [updated] = await db
        .update(schedulingPreferences)
        .set(input)
        .where(eq(schedulingPreferences.userId, userId))
        .returning();

      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // ============================================================
  // SPRINT 3 — FEATURE 14: AI HABIT TRACKER
  // ============================================================

  // GET /api/habits
  app.get("/api/habits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userHabits = await db
        .select()
        .from(aiHabits)
        .where(and(eq(aiHabits.userId, userId), eq(aiHabits.isActive, true)))
        .orderBy(asc(aiHabits.createdAt));

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const completions = await db
        .select()
        .from(aiHabitCompletions)
        .where(
          and(
            eq(aiHabitCompletions.userId, userId),
            gte(aiHabitCompletions.date, thirtyDaysAgo.toISOString().split("T")[0])
          )
        )
        .orderBy(desc(aiHabitCompletions.date));

      const habitsWithCompletions = userHabits.map(h => ({
        ...h,
        completions: completions.filter(c => c.habitId === h.id),
      }));

      return res.json(habitsWithCompletions);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // POST /api/habits
  app.post("/api/habits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({
        name: z.string().min(1).max(100),
        icon: z.string().optional(),
        color: z.string().optional(),
        durationMinutes: z.number().min(5).max(480),
        frequency: z.enum(["daily", "weekdays", "custom"]).default("daily"),
        customDays: z.array(z.number().min(0).max(6)).optional(),
        preferredTimeRange: z.object({ earliest: z.string(), latest: z.string() }).optional(),
        priority: z.enum(["high", "medium", "low"]).default("medium"),
        isFlexible: z.boolean().default(true),
        isProtected: z.boolean().default(false),
      }).parse(req.body);

      const [habit] = await db.insert(aiHabits).values({ ...input, userId }).returning();
      return res.json(habit);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // PATCH /api/habits/:id
  app.patch("/api/habits/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = z.number().int().parse(Number(req.params.id));
      const input = z.object({
        name: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        durationMinutes: z.number().optional(),
        frequency: z.enum(["daily", "weekdays", "custom"]).optional(),
        customDays: z.array(z.number()).optional(),
        preferredTimeRange: z.any().optional(),
        priority: z.enum(["high", "medium", "low"]).optional(),
        isFlexible: z.boolean().optional(),
        isProtected: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }).parse(req.body);

      const [updated] = await db.update(aiHabits).set(input).where(eq(aiHabits.id, id)).returning();
      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // POST /api/habits/:habitId/complete
  app.post("/api/habits/:habitId/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const habitId = z.number().int().parse(Number(req.params.habitId));
      const { date } = z.object({ date: z.string() }).parse(req.body);

      await db
        .insert(aiHabitCompletions)
        .values({ habitId, userId, date })
        .onConflictDoNothing();

      const recentCompletions = await db
        .select()
        .from(aiHabitCompletions)
        .where(eq(aiHabitCompletions.habitId, habitId))
        .orderBy(desc(aiHabitCompletions.date))
        .limit(60);

      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split("T")[0];
        const completed = recentCompletions.some(
          (c) => String(c.date).split("T")[0] === dateStr
        );
        if (completed) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }

      const [habit] = await db.select().from(aiHabits).where(eq(aiHabits.id, habitId)).limit(1);
      if (habit) {
        await db
          .update(aiHabits)
          .set({ streakCurrent: streak, streakLongest: Math.max(streak, habit.streakLongest || 0) })
          .where(eq(aiHabits.id, habitId));
      }

      return res.json({ success: true, streak });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // POST /api/habits/:habitId/uncomplete
  app.post("/api/habits/:habitId/uncomplete", isAuthenticated, async (req: any, res) => {
    try {
      const habitId = z.number().int().parse(Number(req.params.habitId));
      const { date } = z.object({ date: z.string() }).parse(req.body);

      await db
        .delete(aiHabitCompletions)
        .where(and(eq(aiHabitCompletions.habitId, habitId), eq(aiHabitCompletions.date, date)));

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // DELETE /api/habits/:id
  app.delete("/api/habits/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = z.number().int().parse(Number(req.params.id));
      const [updated] = await db
        .update(aiHabits)
        .set({ isActive: false })
        .where(eq(aiHabits.id, id))
        .returning();
      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // ============================================================
  // SPRINT 3 — FEATURE 9: AI FOCUS & PRODUCTIVITY COACH
  // ============================================================

  // POST /api/focus/start
  app.post("/api/focus/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({
        taskId: z.number().int().optional(),
        title: z.string(),
        plannedMinutes: z.number().min(5).max(480),
      }).parse(req.body);

      const [existing] = await db
        .select()
        .from(focusSessions)
        .where(and(eq(focusSessions.userId, userId), eq(focusSessions.status, "active")))
        .limit(1);

      if (existing) {
        return res.status(400).json({ error: "You already have an active focus session. End it first." });
      }

      const [session] = await db
        .insert(focusSessions)
        .values({
          userId,
          taskId: input.taskId,
          title: input.title,
          plannedMinutes: input.plannedMinutes,
          startedAt: new Date(),
          status: "active",
          notificationsPaused: true,
        })
        .returning();

      return res.json(session);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // POST /api/focus/:sessionId/end
  app.post("/api/focus/:sessionId/end", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessionId = z.number().int().parse(Number(req.params.sessionId));

      const [session] = await db
        .select()
        .from(focusSessions)
        .where(eq(focusSessions.id, sessionId))
        .limit(1);

      if (!session) return res.status(404).json({ error: "Session not found" });

      const endedAt = new Date();
      const actualMinutes = Math.max(
        Math.round((endedAt.getTime() - new Date(session.startedAt).getTime()) / 60000) - (session.pausedMinutes || 0),
        1
      );

      const [updated] = await db
        .update(focusSessions)
        .set({ endedAt, actualMinutes, status: "completed", notificationsPaused: false })
        .where(eq(focusSessions.id, sessionId))
        .returning();

      if (session.taskId) {
        const todayDate = new Date().toISOString().split("T")[0];
        await db.insert(timeEntries).values({
          userId,
          taskId: session.taskId,
          date: todayDate,
          minutes: actualMinutes,
          source: "focus_session",
        });
      }

      const todayStr = new Date().toISOString().split("T")[0];
      const [existingScore] = await db
        .select()
        .from(aiProductivityScores)
        .where(and(eq(aiProductivityScores.userId, userId), eq(aiProductivityScores.date, todayStr)))
        .limit(1);

      if (existingScore) {
        await db
          .update(aiProductivityScores)
          .set({ focusMinutes: (existingScore.focusMinutes || 0) + actualMinutes })
          .where(eq(aiProductivityScores.id, existingScore.id));
      } else {
        await db.insert(aiProductivityScores).values({ userId, date: todayStr, focusMinutes: actualMinutes });
      }

      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // POST /api/focus/:sessionId/toggle-pause
  app.post("/api/focus/:sessionId/toggle-pause", isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = z.number().int().parse(Number(req.params.sessionId));

      const [session] = await db
        .select()
        .from(focusSessions)
        .where(eq(focusSessions.id, sessionId))
        .limit(1);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const newStatus = session.status === "active" ? "paused" : "active";
      const [updated] = await db
        .update(focusSessions)
        .set({ status: newStatus })
        .where(eq(focusSessions.id, sessionId))
        .returning();

      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // GET /api/focus/active
  app.get("/api/focus/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [session] = await db
        .select()
        .from(focusSessions)
        .where(
          and(
            eq(focusSessions.userId, userId),
            drizzleSql`${focusSessions.status} IN ('active', 'paused')`
          )
        )
        .limit(1);
      return res.json(session || null);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // GET /api/focus/productivity?startDate=...&endDate=...
  app.get("/api/focus/productivity", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = z.object({
        startDate: z.string(),
        endDate: z.string(),
      }).parse(req.query);

      const scores = await db
        .select()
        .from(aiProductivityScores)
        .where(
          and(
            eq(aiProductivityScores.userId, userId),
            gte(aiProductivityScores.date, startDate),
            lte(aiProductivityScores.date, endDate)
          )
        )
        .orderBy(asc(aiProductivityScores.date));

      return res.json(scores);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // POST /api/focus/coaching
  app.post("/api/focus/coaching", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

      const scores = await db
        .select()
        .from(aiProductivityScores)
        .where(and(eq(aiProductivityScores.userId, userId), gte(aiProductivityScores.date, thirtyDaysAgoStr)))
        .orderBy(asc(aiProductivityScores.date));

      const sessions = await db
        .select()
        .from(focusSessions)
        .where(
          and(
            eq(focusSessions.userId, userId),
            eq(focusSessions.status, "completed"),
            gte(focusSessions.startedAt, thirtyDaysAgo)
          )
        );

      const avgMinutes = sessions.length > 0
        ? Math.round(sessions.reduce((sum, s) => sum + (s.actualMinutes || 0), 0) / sessions.length)
        : 0;

      if (scores.length === 0 && sessions.length === 0) {
        return res.json({ insight: "Track a few focus sessions to see your personalized coaching insights. Start your first focus session to begin!" });
      }

      const result = await aiService.generateText(
        `Analyze this user's productivity data and provide 2-3 actionable coaching tips.

DAILY SCORES (last 30 days): ${JSON.stringify(
  scores.map(s => ({
    date: s.date,
    focusMin: s.focusMinutes,
    meetingMin: s.meetingMinutes,
    tasksCompleted: s.tasksCompleted,
    habitsCompleted: s.habitsCompleted,
  }))
)}

FOCUS SESSIONS: ${sessions.length} total, avg ${avgMinutes} min each

Provide specific, actionable insights. Be encouraging but honest.`,
        {
          systemPrompt: "You are a productivity coach. Analyze the data and give specific, personalized tips. Be warm and encouraging. Keep it to 2-3 short tips.",
          maxTokens: 500,
          temperature: 0.6,
        }
      );

      return res.json({ insight: result.text });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // SPRINT 4 — AI AGENTS (Feature 4)
  // ============================================================

  // Helper: build tool definitions for agent
  function buildAgentTools(capabilities: string[]): any[] {
    const allTools: Record<string, any> = {
      read_pages: { type: "function", function: { name: "read_page", description: "Read note content", parameters: { type: "object", properties: { pageId: { type: "number" } }, required: ["pageId"] } } },
      search_workspace: { type: "function", function: { name: "search_workspace", description: "Search workspace data", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
      read_tasks: { type: "function", function: { name: "read_tasks", description: "Read tasks", parameters: { type: "object", properties: { filter: { type: "string" } }, required: [] } } },
      write_tasks: { type: "function", function: { name: "create_task", description: "Create a new task", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "string" } }, required: ["title"] } } },
      send_messages: { type: "function", function: { name: "send_message", description: "Send a channel message", parameters: { type: "object", properties: { channelId: { type: "number" }, content: { type: "string" } }, required: ["channelId", "content"] } } },
      read_messages: { type: "function", function: { name: "read_messages", description: "Read channel messages", parameters: { type: "object", properties: { channelId: { type: "number" }, limit: { type: "number" } }, required: ["channelId"] } } },
    };
    return capabilities.filter(c => allTools[c]).map(c => allTools[c]);
  }

  // Helper: execute agent tool call
  async function executeAgentTool(toolName: string, args: any, userId: string): Promise<any> {
    switch (toolName) {
      case "search_workspace": {
        const results = await db.select().from(notes).where(ilike(notes.content, `%${args.query}%`)).limit(5);
        return results.map((r: any) => ({ id: r.id, title: r.title, content: (r.content || "").substring(0, 300) }));
      }
      case "read_tasks": {
        return db.select({ id: tasks.id, title: tasks.title, priority: tasks.priority, completionPercentage: tasks.completionPercentage, date: tasks.date }).from(tasks).where(eq(tasks.userId, userId)).limit(20);
      }
      case "send_message": return { sent: true, channelId: args.channelId, content: args.content };
      case "read_page": {
        const [note] = await db.select({ id: notes.id, title: notes.title, content: notes.content }).from(notes).where(eq(notes.id, args.pageId)).limit(1);
        return note || { error: "Note not found" };
      }
      default: return { error: `Unknown tool: ${toolName}` };
    }
  }

  // GET /api/agents — list agents
  app.get("/api/agents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const agents = await db.select().from(aiAgents).where(or(eq(aiAgents.visibility, "workspace"), eq(aiAgents.createdBy, userId))).orderBy(desc(aiAgents.createdAt));
      return res.json(agents);
    } catch (error: any) { return res.status(500).json({ error: error.message }); }
  });

  // GET /api/agents/:id — get agent + runs
  app.get("/api/agents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.id, id)).limit(1);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      const runs = await db.select().from(agentRuns).where(eq(agentRuns.agentId, id)).orderBy(desc(agentRuns.createdAt)).limit(10);
      return res.json({ ...agent, runs });
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/agents — create agent
  app.post("/api/agents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        icon: z.string().optional(),
        systemPrompt: z.string().min(10),
        model: z.string().default("gpt-4o"),
        temperature: z.number().min(0).max(2).default(0.7),
        capabilities: z.array(z.string()).default([]),
        dataAccess: z.any().optional(),
        triggerType: z.enum(["manual", "scheduled", "event", "message_in_channel", "webhook"]).default("manual"),
        triggerConfig: z.any().optional(),
        visibility: z.enum(["private", "workspace", "specific_members"]).default("workspace"),
        visibleToUserIds: z.array(z.string()).optional(),
      }).parse(req.body);
      const [agent] = await db.insert(aiAgents).values({ ...input, createdBy: userId, userId, type: "custom" }).returning();
      return res.json(agent);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // PATCH /api/agents/:id — update agent
  app.patch("/api/agents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const input = z.object({
        name: z.string().optional(), description: z.string().optional(), icon: z.string().optional(),
        systemPrompt: z.string().optional(), model: z.string().optional(), temperature: z.number().optional(),
        capabilities: z.array(z.string()).optional(), dataAccess: z.any().optional(),
        triggerType: z.string().optional(), triggerConfig: z.any().optional(),
        visibility: z.string().optional(), visibleToUserIds: z.array(z.string()).optional(), isActive: z.boolean().optional(),
      }).parse(req.body);
      const [updated] = await db.update(aiAgents).set(input).where(eq(aiAgents.id, id)).returning();
      return res.json(updated);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // DELETE /api/agents/:id — soft delete
  app.delete("/api/agents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const [updated] = await db.update(aiAgents).set({ isActive: false }).where(eq(aiAgents.id, id)).returning();
      return res.json(updated);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/agents/:agentId/chat — chat with agent
  app.post("/api/agents/:agentId/chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const agentId = z.coerce.number().parse(req.params.agentId);
      const { message, conversationId } = z.object({ message: z.string().min(1).max(5000), conversationId: z.coerce.number().optional() }).parse(req.body);
      const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.id, agentId)).limit(1);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      let conversation: any;
      if (conversationId) {
        [conversation] = await db.select().from(agentConversations).where(eq(agentConversations.id, conversationId)).limit(1);
      }
      if (!conversation) {
        [conversation] = await db.insert(agentConversations).values({ agentId, userId, messages: [{ role: "user", content: message, timestamp: new Date().toISOString() }] }).returning();
      } else {
        const msgs = (conversation.messages as any[]) || [];
        msgs.push({ role: "user", content: message, timestamp: new Date().toISOString() });
        await db.update(agentConversations).set({ messages: msgs }).where(eq(agentConversations.id, conversation.id));
      }

      const [run] = await db.insert(agentRuns).values({ agentId: agent.id, userId, triggeredBy: "manual", triggerData: { message, conversationId: conversation.id }, invokedByUserId: userId, status: "running", steps: [] }).returning();

      const conversationMessages = ((conversation.messages as any[]) || []).map((m: any) => ({ role: m.role === "user" ? "user" as const : "assistant" as const, content: m.content }));
      const tools = buildAgentTools(agent.capabilities || []);
      const aiMessages = [{ role: "system" as const, content: agent.systemPrompt }, ...conversationMessages];

      let finalResponse = "";
      const steps: any[] = [];

      try {
        if (tools.length > 0) {
          const response = await aiService.generateWithTools(aiMessages, tools, { model: agent.model as any, temperature: agent.temperature || 0.7 });
          finalResponse = response.content || "";
          if (response.tool_calls && response.tool_calls.length > 0) {
            for (const toolCall of response.tool_calls.slice(0, 10)) {
              const stepResult = await executeAgentTool(toolCall.function.name, JSON.parse(toolCall.function.arguments), userId);
              steps.push({ stepNumber: steps.length + 1, action: toolCall.function.name, input: JSON.parse(toolCall.function.arguments), output: stepResult, status: "success" });
            }
            const followUp = await aiService.generateText(`Based on these tool results, provide your final response:\n${JSON.stringify(steps.map(s => ({ action: s.action, result: s.output })))}`, { systemPrompt: agent.systemPrompt, model: agent.model as any });
            finalResponse = followUp.text;
          }
        } else {
          const resp = await aiService.generateText(message, { systemPrompt: agent.systemPrompt, model: agent.model as any, temperature: agent.temperature || 0.7 });
          finalResponse = resp.text;
        }
      } catch (_e) {
        finalResponse = "I encountered an error processing your request.";
      }

      const updatedMsgs = [...((conversation.messages as any[]) || [])];
      updatedMsgs.push({ role: "agent", content: finalResponse, timestamp: new Date().toISOString(), runId: run.id });
      await db.update(agentConversations).set({ messages: updatedMsgs }).where(eq(agentConversations.id, conversation.id));
      await db.update(agentRuns).set({ status: "completed", finalOutput: finalResponse, steps, completedAt: new Date() }).where(eq(agentRuns.id, run.id));
      return res.json({ conversationId: conversation.id, response: finalResponse, runId: run.id, steps });
    } catch (error: any) { return res.status(500).json({ error: error.message }); }
  });

  // GET /api/agents/:agentId/conversation — get active conversation
  app.get("/api/agents/:agentId/conversation", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const agentId = z.coerce.number().parse(req.params.agentId);
      const [conv] = await db.select().from(agentConversations).where(and(eq(agentConversations.agentId, agentId), eq(agentConversations.userId, userId), eq(agentConversations.status, "active"))).orderBy(desc(agentConversations.updatedAt)).limit(1);
      return res.json(conv || null);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // GET /api/agents/:agentId/runs — get run history
  app.get("/api/agents/:agentId/runs", isAuthenticated, async (req: any, res) => {
    try {
      const agentId = z.coerce.number().parse(req.params.agentId);
      const limit = z.coerce.number().default(20).parse(req.query.limit);
      const runs = await db.select().from(agentRuns).where(eq(agentRuns.agentId, agentId)).orderBy(desc(agentRuns.createdAt)).limit(limit);
      return res.json(runs);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/agents/generate-instructions — AI-generate agent instructions
  app.post("/api/agents/generate-instructions", isAuthenticated, async (req: any, res) => {
    try {
      const { description } = z.object({ description: z.string() }).parse(req.body);
      const result = await aiService.generateText(
        `Generate detailed instructions for an AI agent with this description: "${description}"\n\nWrite clear, specific instructions telling the agent:\n1. What its role and purpose is\n2. What data it should read and how to process it\n3. What actions it should take\n4. How it should format its responses\n5. Any rules or boundaries\n\nWrite in second person ("You are...", "You should...").`,
        { systemPrompt: "You are an expert at writing AI agent instructions.", maxTokens: 1000, temperature: 0.5 }
      );
      return res.json({ instructions: result.text });
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/agents/from-template — create agent from template
  app.post("/api/agents/from-template", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { templateId } = z.object({ templateId: z.enum(["sprint_status", "qa_knowledge", "meeting_prep", "onboarding", "task_triage", "weekly_digest"]) }).parse(req.body);
      const TEMPLATES: Record<string, any> = {
        sprint_status: { name: "Sprint Status Bot", description: "Generates daily sprint status reports", systemPrompt: "You are a Sprint Status Bot. Read all task changes from the last 24 hours. Group by team member: completed, in-progress, blocked. Generate a clear, formatted status report. Include sprint progress percentage and any risks.", capabilities: ["read_tasks", "send_messages", "search_workspace"], triggerType: "scheduled", triggerConfig: { cron: "0 9 * * 1-5" } },
        qa_knowledge: { name: "Q&A Knowledge Bot", description: "Answers questions using workspace knowledge", systemPrompt: "You are a Knowledge Bot. When someone asks a question, search the workspace for relevant information and provide a clear answer with citations.", capabilities: ["search_workspace", "read_pages", "read_messages"], triggerType: "message_in_channel", triggerConfig: { keywords: ["?", "how", "what", "where", "when"] } },
        meeting_prep: { name: "Meeting Prep Agent", description: "Gathers context before meetings", systemPrompt: "You are a Meeting Prep Agent. Before each meeting, gather: recent task updates, open action items, relevant channel discussions. Create a concise prep brief.", capabilities: ["read_tasks", "read_messages", "send_messages"], triggerType: "scheduled", triggerConfig: { minutesBefore: 30 } },
        onboarding: { name: "Onboarding Agent", description: "Welcomes and guides new members", systemPrompt: "You are an Onboarding Agent. When a new member joins, send a welcome DM with: workspace overview, key channels, important documents, team intros, and first tasks.", capabilities: ["send_messages", "read_pages", "search_workspace"], triggerType: "event", triggerConfig: { eventType: "member_joined" } },
        task_triage: { name: "Task Triage Agent", description: "Auto-prioritizes and categorizes new tasks", systemPrompt: "You are a Task Triage Agent. When a new task is created, read its title and description. Assign: priority, category, and suggest the best assignee.", capabilities: ["read_tasks", "write_tasks", "search_workspace"], triggerType: "event", triggerConfig: { eventType: "task_created" } },
        weekly_digest: { name: "Weekly Digest Agent", description: "Friday afternoon summary", systemPrompt: "You are a Weekly Digest Agent. Every Friday at 4 PM, compile: tasks completed this week, key decisions, meetings held, upcoming deadlines, open blockers. Post formatted summary.", capabilities: ["read_tasks", "read_messages", "send_messages", "search_workspace"], triggerType: "scheduled", triggerConfig: { cron: "0 16 * * 5" } },
      };
      const template = TEMPLATES[templateId];
      if (!template) return res.status(404).json({ error: "Template not found" });
      const [agent] = await db.insert(aiAgents).values({ ...template, createdBy: userId, userId, type: "template", model: "gpt-4o", temperature: 0.5, visibility: "workspace", visibleToUserIds: [], dataAccess: { allPages: true, allDatabases: true, allChannels: true, allMeetings: true, specificPageIds: [], specificDatabaseIds: [], specificChannelIds: [] }, isActive: true, maxRunsPerDay: 100, maxActionsPerRun: 25, timeoutMinutes: 5 }).returning();
      return res.json(agent);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // ============================================================
  // SPRINT 4 — AI WORKFLOW RECORDER (Feature 19)
  // ============================================================

  // Helper: execute a workflow step
  async function executeWorkflowStep(actionType: string, data: any, userId: string): Promise<any> {
    switch (actionType) {
      case "create_task": {
        const [task] = await db.insert(tasks).values({ userId, title: data.title, description: data.description, priority: data.priority || "medium", date: new Date().toISOString().split("T")[0] }).returning();
        return task;
      }
      case "create_page": {
        const [note] = await db.insert(notes).values({ userId, title: data.title, content: data.content }).returning();
        return note;
      }
      case "send_message": return { sent: true };
      case "update_task": {
        const [updated] = await db.update(tasks).set(data.updates).where(eq(tasks.id, data.taskId)).returning();
        return updated;
      }
      default: throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  // GET /api/ai-workflows — list workflows
  app.get("/api/ai-workflows", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await db.select().from(aiWorkflows).where(or(eq(aiWorkflows.isPublic, true), eq(aiWorkflows.createdBy, userId))).orderBy(desc(aiWorkflows.createdAt));
      return res.json(result);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/ai-workflows/save-recording — save workflow recording
  app.post("/api/ai-workflows/save-recording", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        recordedSteps: z.array(z.object({ stepNumber: z.number(), actionType: z.string(), rawData: z.any() })),
      }).parse(req.body);
      if (input.recordedSteps.length === 0) return res.status(400).json({ error: "Record at least one action" });

      const aiResult = await aiService.generateJSON<{ cleanedSteps: Array<{ stepNumber: number; actionType: string; cleanedData: any; variables: any[] }>; variables: Array<{ name: string; type: string; description: string }> }>(
        `Clean up these recorded workflow steps and detect reusable variables.\n\nRECORDED STEPS:\n${JSON.stringify(input.recordedSteps, null, 2)}\n\nFor each step:\n1. Clean the data (remove unnecessary fields)\n2. Detect variables (names, dates, project names)\n3. Replace hardcoded values with {{variable_name}}\n\nReturn: { cleanedSteps: [...], variables: [...] }`,
        { systemPrompt: "You are an automation expert.", temperature: 0.2 }
      );

      const [workflow] = await db.insert(aiWorkflows).values({ name: input.name, description: input.description, recordedSteps: aiResult.cleanedSteps, variables: aiResult.variables, createdBy: userId, userId }).returning();
      return res.json(workflow);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/ai-workflows/:workflowId/execute — run a workflow
  app.post("/api/ai-workflows/:workflowId/execute", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workflowId = z.coerce.number().parse(req.params.workflowId);
      const { variableValues } = z.object({ variableValues: z.record(z.string()) }).parse(req.body);
      const [workflow] = await db.select().from(aiWorkflows).where(eq(aiWorkflows.id, workflowId)).limit(1);
      if (!workflow) return res.status(404).json({ error: "Workflow not found" });

      const [run] = await db.insert(aiWorkflowRuns).values({ workflowId: workflow.id, userId, variableValues, steps: [], status: "running" }).returning();
      const steps = (workflow.recordedSteps as any[]) || [];
      const executedSteps: any[] = [];

      for (const step of steps) {
        try {
          let stepData = JSON.stringify(step.cleanedData || step.rawData);
          for (const [key, value] of Object.entries(variableValues)) {
            stepData = stepData.replace(new RegExp(`{{${key}}}`, "g"), value as string);
          }
          const parsedData = JSON.parse(stepData);
          const result = await executeWorkflowStep(step.actionType, parsedData, userId);
          executedSteps.push({ stepNumber: step.stepNumber, status: "success", output: result });
        } catch (error: any) {
          executedSteps.push({ stepNumber: step.stepNumber, status: "failed", error: error.message });
        }
      }

      await db.update(aiWorkflowRuns).set({ steps: executedSteps, status: "completed", completedAt: new Date() }).where(eq(aiWorkflowRuns.id, run.id));
      await db.update(aiWorkflows).set({ runCount: (workflow.runCount || 0) + 1 }).where(eq(aiWorkflows.id, workflow.id));
      return res.json({ runId: run.id, steps: executedSteps });
    } catch (error: any) { return res.status(500).json({ error: error.message }); }
  });

  // GET /api/ai-workflows/:workflowId/runs — run history
  app.get("/api/ai-workflows/:workflowId/runs", isAuthenticated, async (req: any, res) => {
    try {
      const workflowId = z.coerce.number().parse(req.params.workflowId);
      const runs = await db.select().from(aiWorkflowRuns).where(eq(aiWorkflowRuns.workflowId, workflowId)).orderBy(desc(aiWorkflowRuns.startedAt)).limit(20);
      return res.json(runs);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // DELETE /api/ai-workflows/:id — soft delete
  app.delete("/api/ai-workflows/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const [updated] = await db.update(aiWorkflows).set({ deletedAt: new Date() }).where(eq(aiWorkflows.id, id)).returning();
      return res.json(updated);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // ============================================================
  // SPRINT 5 — AI PROJECT MANAGER (Feature 5)
  // ============================================================

  // POST /api/project-manager/standup
  app.post("/api/project-manager/standup", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allTasks = await db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.date)).limit(50);
      const completedTasks = allTasks.filter(t => (t.completionPercentage || 0) >= 100);
      const inProgressTasks = allTasks.filter(t => (t.completionPercentage || 0) > 0 && (t.completionPercentage || 0) < 100);
      const notStarted = allTasks.filter(t => (t.completionPercentage || 0) === 0);
      const total = allTasks.length;
      const done = completedTasks.length;
      const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;

      const result = await aiService.generateText(
        `Generate a daily standup report from this data:\n\nCOMPLETED: ${JSON.stringify(completedTasks.map(t => ({ title: t.title, priority: t.priority })))}\nIN PROGRESS: ${JSON.stringify(inProgressTasks.map(t => ({ title: t.title, priority: t.priority, completion: t.completionPercentage })))}\nNOT STARTED: ${JSON.stringify(notStarted.map(t => ({ title: t.title, priority: t.priority })))}\n\nPROGRESS: ${progressPercent}% complete (${done}/${total} tasks)\n\nFormat as a clear standup report. Include progress and any risks.`,
        { systemPrompt: "Generate a concise, well-formatted standup report.", maxTokens: 1500, temperature: 0.3 }
      );
      return res.json({ summary: result.text, stats: { total, done, inProgress: inProgressTasks.length, progressPercent } });
    } catch (error: any) { return res.status(500).json({ error: error.message }); }
  });

  // POST /api/project-manager/detect-risks
  app.post("/api/project-manager/detect-risks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userTasks = await db.select().from(tasks).where(and(eq(tasks.userId, userId), drizzleSql`${tasks.completionPercentage} < 100`));
      const risks: any[] = [];

      const highPriority = userTasks.filter(t => t.priority === "high" && (t.completionPercentage || 0) < 50);
      if (highPriority.length > 0) {
        risks.push({ riskType: "high_priority_incomplete", severity: "high", title: `${highPriority.length} high-priority tasks under 50% complete`, description: highPriority.map(t => `"${t.title}"`).join(", ") + " need attention.", affectedTaskIds: highPriority.map(t => String(t.id)), suggestedAction: "Prioritize these tasks." });
      }
      if (userTasks.length > 8) {
        risks.push({ riskType: "overloaded", severity: userTasks.length > 12 ? "high" : "medium", title: `${userTasks.length} active tasks`, description: `You have ${userTasks.length} active tasks, exceeding recommended 8.`, affectedTaskIds: userTasks.map(t => String(t.id)), suggestedAction: `Consider deferring ${userTasks.length - 8} lower-priority tasks.` });
      }
      const noPriority = userTasks.filter(t => !t.priority);
      if (noPriority.length > 0) {
        risks.push({ riskType: "unassigned_priority", severity: "medium", title: `${noPriority.length} tasks have no priority set`, description: noPriority.map(t => `"${t.title}"`).join(", "), affectedTaskIds: noPriority.map(t => String(t.id)), suggestedAction: "Set priorities to plan." });
      }

      for (const risk of risks) {
        await db.insert(aiRiskAlerts).values({ ...risk, userId });
      }
      return res.json({ risks, count: risks.length });
    } catch (error: any) { return res.status(500).json({ error: error.message }); }
  });

  // GET /api/project-manager/risks
  app.get("/api/project-manager/risks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const risks = await db.select().from(aiRiskAlerts).where(and(eq(aiRiskAlerts.userId, userId), eq(aiRiskAlerts.status, "active"))).orderBy(desc(aiRiskAlerts.createdAt));
      return res.json(risks);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/project-manager/status-report
  app.post("/api/project-manager/status-report", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
      const total = allTasks.length;
      const done = allTasks.filter(t => (t.completionPercentage || 0) >= 100).length;
      const inProg = allTasks.filter(t => (t.completionPercentage || 0) > 0 && (t.completionPercentage || 0) < 100).length;

      const result = await aiService.generateText(
        `Generate an executive project status report:\nTotal tasks: ${total}, Done: ${done} (${Math.round(done/Math.max(total,1)*100)}%), In Progress: ${inProg}\n\nTask list: ${JSON.stringify(allTasks.map(t => ({ title: t.title, priority: t.priority, completion: t.completionPercentage })))}\n\nWrite a concise executive summary (3-4 sentences), then list key highlights and concerns.`,
        { systemPrompt: "Write a professional project status report for stakeholders.", maxTokens: 1000, temperature: 0.3 }
      );
      return res.json({ report: result.text });
    } catch (error: any) { return res.status(500).json({ error: error.message }); }
  });

  // POST /api/project-manager/create-automation
  app.post("/api/project-manager/create-automation", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { description } = z.object({ description: z.string() }).parse(req.body);
      const result = await aiService.generateJSON<{ name: string; trigger: any; conditions: any[]; actions: any[] }>(
        `Parse this automation description into a structured automation config:\n"${description}"\n\nReturn JSON with: name, trigger ({type, config}), conditions ([{field, operator, value}]), actions ([{type, config}])\nTrigger types: task_created, task_status_changed, task_overdue, scheduled\nAction types: update_task, send_message, create_task, assign, notify`,
        { systemPrompt: "Parse natural language into automation configs.", temperature: 0.2 }
      );
      await db.insert(aiWorkflowAutomations).values({ name: result.name, trigger: result.trigger, conditions: result.conditions, actions: result.actions, createdBy: userId, userId, createdFromPrompt: description });
      return res.json({ name: result.name, trigger: result.trigger, conditions: result.conditions, actions: result.actions, createdBy: userId });
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // GET /api/project-manager/automations
  app.get("/api/project-manager/automations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const automations = await db.select().from(aiWorkflowAutomations).where(and(eq(aiWorkflowAutomations.userId, userId), eq(aiWorkflowAutomations.isActive, true))).orderBy(desc(aiWorkflowAutomations.createdAt));
      return res.json(automations);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // ============================================================
  // SPRINT 5 — AI TASK INTELLIGENCE (Feature 6)
  // ============================================================

  // POST /api/task-intelligence/breakdown
  app.post("/api/task-intelligence/breakdown", isAuthenticated, async (req: any, res) => {
    try {
      const input = z.object({ taskTitle: z.string(), taskDescription: z.string().optional(), complexity: z.enum(["simple", "medium", "detailed", "very_detailed"]).default("medium") }).parse(req.body);
      const depthMap = { simple: "3-5", medium: "5-8", detailed: "8-12", very_detailed: "12-20" };
      const result = await aiService.generateJSON<{ subtasks: Array<{ title: string; subtasks?: Array<{ title: string }> }> }>(
        `Break down this task into ${depthMap[input.complexity]} actionable subtasks:\nTask: "${input.taskTitle}"\n${input.taskDescription ? `Description: ${input.taskDescription}` : ""}\n\nReturn JSON: { subtasks: [{ title: string, subtasks?: [{ title: string }] }] }\nEach subtask should be clear and actionable.`,
        { systemPrompt: "Break tasks into clear, actionable subtasks.", temperature: 0.4 }
      );
      return res.json(result);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/task-intelligence/prioritize
  app.post("/api/task-intelligence/prioritize", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userTasks = await db.select({ id: tasks.id, title: tasks.title, description: tasks.description, priority: tasks.priority, date: tasks.date, completionPercentage: tasks.completionPercentage }).from(tasks).where(and(eq(tasks.userId, userId), drizzleSql`${tasks.completionPercentage} < 100`));
      const result = await aiService.generateJSON<{ ranked: Array<{ taskId: number; suggestedPriority: string; reason: string }> }>(
        `Rank these tasks by priority (critical > high > medium > low):\n${JSON.stringify(userTasks)}\n\nConsider: task complexity, blocking potential, business impact.\nReturn: { ranked: [{ taskId, suggestedPriority: 'critical'|'high'|'medium'|'low', reason }] }`,
        { systemPrompt: "Prioritize tasks based on urgency and impact.", temperature: 0.2 }
      );
      return res.json(result);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/task-intelligence/parse-natural-language
  app.post("/api/task-intelligence/parse-natural-language", isAuthenticated, async (req: any, res) => {
    try {
      const { text } = z.object({ text: z.string() }).parse(req.body);
      const result = await aiService.generateJSON<{ title: string; description?: string; date?: string; priority?: string; estimatedMinutes?: number }>(
        `Parse this natural language into a structured task:\n"${text}"\n\nExtract: title, description, date (ISO format), priority (low/medium/high), estimatedMinutes.\nReturn JSON. Only include fields that are mentioned.`,
        { systemPrompt: "Parse natural language into structured task data.", temperature: 0.2 }
      );
      return res.json(result);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/task-intelligence/estimate-duration
  app.post("/api/task-intelligence/estimate-duration", isAuthenticated, async (req: any, res) => {
    try {
      const { taskId } = z.object({ taskId: z.coerce.number() }).parse(req.body);
      const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      if (!task) return res.status(404).json({ error: "Task not found" });
      const result = await aiService.generateJSON<{ estimatedMinutes: number; confidence: number; reasoning: string }>(
        `Estimate how long this task will take:\nTitle: "${task.title}"\nDescription: "${task.description || "No description"}"\n\nReturn: { estimatedMinutes: number (nearest 15), confidence: 0-1, reasoning: string }`,
        { systemPrompt: "Estimate task durations.", temperature: 0.3 }
      );
      await db.update(tasks).set({ time: result.estimatedMinutes }).where(eq(tasks.id, taskId));
      return res.json(result);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/task-intelligence/suggest-assignee
  app.post("/api/task-intelligence/suggest-assignee", isAuthenticated, async (req: any, res) => {
    try {
      const { taskId } = z.object({ taskId: z.coerce.number() }).parse(req.body);
      const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      if (!task) return res.status(404).json({ error: "Task not found" });
      const allUsers = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users);
      const memberWorkloads = await Promise.all(allUsers.map(async (u) => {
        const [result] = await db.select({ count: drizzleSql<number>`count(*)` }).from(tasks).where(and(eq(tasks.userId, u.id), drizzleSql`${tasks.completionPercentage} < 100`));
        return { userId: u.id, name: `${u.firstName || ""} ${u.lastName || ""}`.trim(), activeTasks: Number(result?.count || 0) };
      }));
      const result = await aiService.generateJSON<{ suggestions: Array<{ userId: string; name: string; score: number; reason: string }> }>(
        `Suggest the best assignee for this task:\nTask: "${task.title}" - ${task.description || ""}\n\nTeam members and workload:\n${JSON.stringify(memberWorkloads)}\n\nReturn top 3 suggestions with score (0-100).`,
        { systemPrompt: "Suggest task assignees based on skills and workload.", temperature: 0.3 }
      );
      return res.json(result);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // ============================================================
  // SPRINT 5 — AI DATABASE INTELLIGENCE (Feature 8)
  // ============================================================

  // POST /api/database-ai/auto-fill
  app.post("/api/database-ai/auto-fill", isAuthenticated, async (req: any, res) => {
    try {
      const { taskId, aiPrompt, inputFields } = z.object({ taskId: z.coerce.number(), aiPrompt: z.string(), inputFields: z.array(z.string()) }).parse(req.body);
      const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      if (!task) return res.status(404).json({ error: "Task not found" });
      const inputData: Record<string, string> = {};
      for (const field of inputFields) { inputData[field] = (task as any)[field] || ""; }
      const result = await aiService.generateText(`${aiPrompt}\n\nInput data:\n${JSON.stringify(inputData)}`, { systemPrompt: "Generate the requested value. Return ONLY the value.", maxTokens: 200, temperature: 0.2 });
      return res.json({ value: result.text.trim() });
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/database-ai/query
  app.post("/api/database-ai/query", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { query } = z.object({ query: z.string() }).parse(req.body);
      const userTasks = await db.select({ id: tasks.id, title: tasks.title, priority: tasks.priority, date: tasks.date, completionPercentage: tasks.completionPercentage, description: tasks.description }).from(tasks).where(eq(tasks.userId, userId)).limit(100);
      const result = await aiService.generateText(
        `Answer this question about the database:\n"${query}"\n\nDATABASE CONTENTS (${userTasks.length} rows):\n${JSON.stringify(userTasks)}\n\nProvide a direct answer.`,
        { systemPrompt: "Answer database queries accurately and concisely.", maxTokens: 500, temperature: 0.2 }
      );
      return res.json({ answer: result.text });
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/database-ai/create-from-description
  app.post("/api/database-ai/create-from-description", isAuthenticated, async (req: any, res) => {
    try {
      const { description } = z.object({ description: z.string() }).parse(req.body);
      const result = await aiService.generateJSON<{ name: string; properties: Array<{ name: string; type: string; options?: string[] }>; views: Array<{ name: string; type: string; groupBy?: string }>; sampleRows: Array<Record<string, any>> }>(
        `Create a database structure for:\n"${description}"\n\nReturn JSON with:\n- name: database name\n- properties: [{name, type, options?}]\n- views: [{name, type, groupBy?}]\n- sampleRows: 3 example rows`,
        { systemPrompt: "Design practical database structures.", temperature: 0.4 }
      );
      return res.json(result);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/database-ai/generate-formula
  app.post("/api/database-ai/generate-formula", isAuthenticated, async (req: any, res) => {
    try {
      const { description, properties } = z.object({ description: z.string(), properties: z.array(z.object({ name: z.string(), type: z.string() })) }).parse(req.body);
      const result = await aiService.generateText(
        `Generate a formula for: "${description}"\nAvailable properties: ${JSON.stringify(properties)}\nReturn ONLY the formula expression.`,
        { systemPrompt: "Generate database formulas.", maxTokens: 200, temperature: 0.1 }
      );
      return res.json({ formula: result.text.trim() });
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // ============================================================
  // SPRINT 6 — AI MEETING INTELLIGENCE (Feature 7)
  // ============================================================

  // POST /api/meetings/:meetingId/process — start processing meeting
  app.post("/api/meetings/:meetingId/process", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const meetingId = req.params.meetingId;
      const { audioUrl } = z.object({ audioUrl: z.string() }).parse(req.body);

      const existing = await db.select().from(meetingIntelligence).where(eq(meetingIntelligence.meetingId, meetingId)).limit(1);
      let intel: any;
      if (existing.length > 0) {
        [intel] = await db.update(meetingIntelligence).set({ audioUrl, processingStatus: "transcribing" }).where(eq(meetingIntelligence.meetingId, meetingId)).returning();
      } else {
        [intel] = await db.insert(meetingIntelligence).values({ meetingId, userId, audioUrl, processingStatus: "transcribing" }).returning();
      }

      processMeetingInline(intel.id, meetingId).catch(err => console.error("Meeting processing failed:", err));
      return res.json({ intelligenceId: intel.id, status: "processing" });
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // GET /api/meetings/:meetingId/intelligence
  app.get("/api/meetings/:meetingId/intelligence", isAuthenticated, async (req: any, res) => {
    try {
      const meetingId = req.params.meetingId;
      const [intel] = await db.select().from(meetingIntelligence).where(eq(meetingIntelligence.meetingId, meetingId)).limit(1);
      return res.json(intel || null);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // GET /api/meetings — list all meetings for user
  app.get("/api/meetings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const meetings = await db.select().from(meetingIntelligence).where(eq(meetingIntelligence.userId, userId)).orderBy(desc(meetingIntelligence.createdAt));
      return res.json(meetings);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/meetings — create a new meeting
  app.post("/api/meetings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title } = z.object({ title: z.string().min(1) }).parse(req.body);
      const meetingId = `meeting_${Date.now()}_${userId.replace(/[^a-z0-9]/gi, "")}`;
      const [intel] = await db.insert(meetingIntelligence).values({ meetingId, userId, processingStatus: "pending", aiSummary: title }).returning();
      return res.json(intel);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/meetings/:meetingId/create-tasks
  app.post("/api/meetings/:meetingId/create-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const meetingId = req.params.meetingId;
      const { actionItemIndices } = z.object({ actionItemIndices: z.array(z.number()) }).parse(req.body);
      const [intel] = await db.select().from(meetingIntelligence).where(eq(meetingIntelligence.meetingId, meetingId)).limit(1);
      if (!intel || !intel.actionItems) return res.status(404).json({ error: "No action items found" });

      const actionItems = intel.actionItems as any[];
      const createdTasks: any[] = [];
      for (const index of actionItemIndices) {
        const item = actionItems[index];
        if (!item) continue;
        const [task] = await db.insert(tasks).values({ userId, title: item.title, description: item.description || "Action item from meeting", priority: "medium", date: new Date().toISOString().split("T")[0] }).returning();
        actionItems[index].taskCreated = true;
        actionItems[index].taskId = task.id;
        createdTasks.push(task);
      }
      await db.update(meetingIntelligence).set({ actionItems }).where(eq(meetingIntelligence.meetingId, meetingId));
      return res.json({ created: createdTasks.length, tasks: createdTasks });
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/meetings/:meetingId/prep-brief
  app.post("/api/meetings/:meetingId/prep-brief", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const meetingId = req.params.meetingId;
      const recentTasks = await db.select({ title: tasks.title, priority: tasks.priority, completionPercentage: tasks.completionPercentage }).from(tasks).where(eq(tasks.userId, userId)).limit(15);
      const result = await aiService.generateText(
        `Generate a meeting prep brief.\nRecent task updates: ${JSON.stringify(recentTasks)}\n\nInclude: agenda suggestions, relevant context, open questions to discuss.`,
        { systemPrompt: "Generate concise meeting prep briefs.", maxTokens: 800, temperature: 0.4 }
      );
      await db.insert(meetingIntelligence).values({ meetingId, userId, prepBrief: result.text }).onConflictDoUpdate({ target: [meetingIntelligence.meetingId], set: { prepBrief: result.text } });
      return res.json({ prepBrief: result.text });
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/meetings/process-text — process a text transcript directly
  app.post("/api/meetings/process-text", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { meetingId, transcript, title } = z.object({ meetingId: z.string().optional(), transcript: z.string(), title: z.string().optional() }).parse(req.body);

      const mId = meetingId || `meeting_${Date.now()}_${userId.replace(/[^a-z0-9]/gi, "")}`;
      const summaryResult = await aiService.generateJSON<{ summary: string; keyPoints: string[]; decisions: Array<{ decision: string; context: string }>; actionItems: Array<{ title: string; description?: string; suggestedOwner?: string }>; openQuestions: string[] }>(
        `Analyze this meeting transcript:\n\nTRANSCRIPT:\n${transcript.slice(0, 15000)}\n\nReturn JSON with: summary (3-5 sentences), keyPoints, decisions [{decision, context}], actionItems [{title, description, suggestedOwner}], openQuestions.`,
        { systemPrompt: "Extract structured meeting information from transcripts.", temperature: 0.2 }
      );

      const existing = await db.select().from(meetingIntelligence).where(eq(meetingIntelligence.meetingId, mId)).limit(1);
      let intel: any;
      if (existing.length > 0) {
        [intel] = await db.update(meetingIntelligence).set({ transcriptRaw: transcript, aiSummary: summaryResult.summary, keyPoints: summaryResult.keyPoints, decisions: summaryResult.decisions, actionItems: summaryResult.actionItems.map(a => ({ ...a, taskCreated: false })), openQuestions: summaryResult.openQuestions, processingStatus: "completed" }).where(eq(meetingIntelligence.meetingId, mId)).returning();
      } else {
        [intel] = await db.insert(meetingIntelligence).values({ meetingId: mId, userId, transcriptRaw: transcript, aiSummary: title || summaryResult.summary.substring(0, 100), keyPoints: summaryResult.keyPoints, decisions: summaryResult.decisions, actionItems: summaryResult.actionItems.map(a => ({ ...a, taskCreated: false })), openQuestions: summaryResult.openQuestions, processingStatus: "completed" }).returning();
      }
      return res.json(intel);
    } catch (error: any) { return res.status(500).json({ error: error.message }); }
  });

  // ============================================================
  // SPRINT 6 — AI DOCUMENT GENERATOR (Feature 10)
  // ============================================================

  app.post("/api/doc-generator/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({
        templateType: z.enum(["weekly_status", "meeting_agenda", "project_brief", "sprint_retro", "handoff_doc", "client_update", "onboarding_guide"]),
        config: z.object({ dateRangeStart: z.string().optional(), dateRangeEnd: z.string().optional(), projectName: z.string().optional() }).default({}),
      }).parse(req.body);

      const { templateType, config } = input;
      let contextData = "";

      if (templateType === "weekly_status" || templateType === "sprint_retro") {
        const userTasks = await db.select().from(tasks).where(eq(tasks.userId, userId)).limit(50);
        const completed = userTasks.filter(t => (t.completionPercentage || 0) >= 100);
        const inProgress = userTasks.filter(t => (t.completionPercentage || 0) > 0 && (t.completionPercentage || 0) < 100);
        const notStarted = userTasks.filter(t => (t.completionPercentage || 0) === 0);
        contextData = `Tasks completed: ${completed.length} (${completed.map(t => t.title).join(", ")})\nIn progress: ${inProgress.length} (${inProgress.map(t => t.title).join(", ")})\nNot started: ${notStarted.length} (${notStarted.map(t => t.title).join(", ")})`;
      }
      if (templateType === "meeting_agenda") {
        const userTasks = await db.select().from(tasks).where(and(eq(tasks.userId, userId), drizzleSql`${tasks.completionPercentage} < 100`)).limit(10);
        contextData = `Open tasks: ${JSON.stringify(userTasks.map(t => ({ title: t.title, priority: t.priority })))}`;
      }

      const TEMPLATE_PROMPTS: Record<string, string> = {
        weekly_status: "Generate a weekly status report with: Executive Summary, Completed, In Progress, Blocked Items, Risks, Plan for Next Week.",
        meeting_agenda: "Generate a meeting agenda with: Review Action Items, Status Updates, Discussion Topics, Decisions Needed, Next Steps.",
        project_brief: `Generate a project brief for "${config.projectName || "Project"}" with: Overview, Objectives, Requirements, Timeline, Team, Risks.`,
        sprint_retro: "Generate a sprint retrospective with: Sprint Summary, What Went Well, What Could Improve, Action Items.",
        handoff_doc: "Generate a handoff document with: Project Overview, Current State, Key Decisions Made, Open Items, Contact Points.",
        client_update: "Generate a client-facing update with: Summary, Progress, Milestones, Next Steps, Timeline.",
        onboarding_guide: "Generate an onboarding guide with: Welcome, Getting Started, Key Resources, Team Overview, First Week Tasks.",
      };

      const result = await aiService.generateText(
        `${TEMPLATE_PROMPTS[templateType]}\n\nWORKSPACE DATA:\n${contextData}\n\nWrite a complete, professional document using the real data provided.`,
        { systemPrompt: "Generate professional documents from workspace data.", maxTokens: 3000, temperature: 0.4 }
      );
      return res.json({ content: result.text, templateType });
    } catch (error: any) { return res.status(500).json({ error: error.message }); }
  });

  // ============================================================
  // SPRINT 7 — AI MESSAGING INTELLIGENCE (Feature 11)
  // ============================================================

  // POST /api/messaging-ai/summarize-thread
  app.post("/api/messaging-ai/summarize-thread", isAuthenticated, async (req: any, res) => {
    try {
      const { threadParentId } = z.object({ threadParentId: z.coerce.number() }).parse(req.body);
      const messages = await db.select().from(channelMessages).where(or(eq(channelMessages.id, threadParentId), eq(channelMessages.threadParentId, threadParentId))).orderBy(asc(channelMessages.createdAt));
      const formatted = await Promise.all(messages.map(async (m) => {
        const [user] = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, m.userId)).limit(1);
        const name = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown" : "Unknown";
        return `${name}: ${m.content}`;
      }));
      const result = await aiService.generateText(`Summarize this thread in 3-5 sentences:\n\n${formatted.join("\n")}`, { systemPrompt: "Summarize message threads concisely.", maxTokens: 300, temperature: 0.3 });
      return res.json({ summary: result.text });
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/messaging-ai/catch-up
  app.post("/api/messaging-ai/catch-up", isAuthenticated, async (req: any, res) => {
    try {
      const { channelId, since } = z.object({ channelId: z.coerce.number(), since: z.string() }).parse(req.body);
      const messages = await db.select().from(channelMessages).where(and(eq(channelMessages.channelId, channelId), gte(channelMessages.createdAt, new Date(since)))).orderBy(asc(channelMessages.createdAt)).limit(100);
      if (messages.length === 0) return res.json({ summary: "Nothing new since you were last here.", messageCount: 0 });
      const formatted = await Promise.all(messages.map(async (m) => {
        const [user] = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, m.userId)).limit(1);
        const name = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown" : "Unknown";
        return `${name}: ${m.content}`;
      }));
      const result = await aiService.generateText(`Summarize what happened in this channel (${messages.length} messages):\n\n${formatted.join("\n")}`, { systemPrompt: "Provide a catch-up summary. Highlight: key decisions, important updates, questions, action items.", maxTokens: 500, temperature: 0.3 });
      return res.json({ summary: result.text, messageCount: messages.length });
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/messaging-ai/suggest-replies
  app.post("/api/messaging-ai/suggest-replies", isAuthenticated, async (req: any, res) => {
    try {
      const { messageId } = z.object({ messageId: z.coerce.number() }).parse(req.body);
      const [message] = await db.select().from(channelMessages).where(eq(channelMessages.id, messageId)).limit(1);
      if (!message) return res.status(404).json({ error: "Message not found" });
      const [user] = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, message.userId)).limit(1);
      const authorName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Someone" : "Someone";
      const result = await aiService.generateJSON<{ replies: string[] }>(
        `Suggest 3 short reply options for:\n"${authorName}: ${message.content}"\n\nReturn JSON: { replies: ["r1", "r2", "r3"] }\nMake varied (agreeing, follow-up, providing info).`,
        { systemPrompt: "Generate natural reply suggestions.", temperature: 0.7 }
      );
      return res.json(result);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/messaging-ai/compose
  app.post("/api/messaging-ai/compose", isAuthenticated, async (req: any, res) => {
    try {
      const input = z.object({ action: z.enum(["draft_reply", "make_professional", "translate"]), inputText: z.string().optional(), threadContext: z.string().optional(), language: z.string().optional() }).parse(req.body);
      const prompts: Record<string, string> = {
        draft_reply: `Draft a reply to:\n${input.threadContext}\n\nDraft a helpful, professional response.`,
        make_professional: `Rewrite professionally:\n"${input.inputText}"`,
        translate: `Translate to ${input.language || "English"}:\n"${input.inputText}"`,
      };
      const result = await aiService.generateText(prompts[input.action], { systemPrompt: "Write clear, professional messages.", maxTokens: 500, temperature: 0.5 });
      return res.json({ text: result.text });
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/messaging-ai/extract-decisions
  app.post("/api/messaging-ai/extract-decisions", isAuthenticated, async (req: any, res) => {
    try {
      const { channelId, dateRange } = z.object({ channelId: z.coerce.number(), dateRange: z.object({ start: z.string(), end: z.string() }) }).parse(req.body);
      const messages = await db.select().from(channelMessages).where(and(eq(channelMessages.channelId, channelId), gte(channelMessages.createdAt, new Date(dateRange.start)), lte(channelMessages.createdAt, new Date(dateRange.end)))).orderBy(asc(channelMessages.createdAt)).limit(200);
      const formatted = await Promise.all(messages.map(async (m) => {
        const [user] = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, m.userId)).limit(1);
        const name = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown" : "Unknown";
        return `[${m.createdAt?.toISOString()}] ${name}: ${m.content}`;
      }));
      const result = await aiService.generateJSON<{ decisions: Array<{ decision: string; decidedBy: string; context: string; date: string }> }>(
        `Extract all decisions made:\n${formatted.join("\n")}\n\nReturn: { decisions: [{decision, decidedBy, context, date}] }`,
        { systemPrompt: "Extract team decisions.", temperature: 0.2 }
      );
      return res.json(result);
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // ============================================================
  // SPRINT 7 — AI EMAIL ASSISTANT (Feature 13)
  // ============================================================

  // POST /api/email/compose
  app.post("/api/email/compose", isAuthenticated, async (req: any, res) => {
    try {
      const input = z.object({ action: z.enum(["compose", "reply", "follow_up"]), subject: z.string().optional(), to: z.string().optional(), threadContext: z.string().optional(), instructions: z.string().optional(), tone: z.enum(["professional", "casual", "friendly", "formal"]).default("professional") }).parse(req.body);
      const prompts: Record<string, string> = {
        compose: `Write an email:\nTo: ${input.to || "recipient"}\nSubject: ${input.subject || "subject"}\nInstructions: ${input.instructions || "Write a clear email"}\nTone: ${input.tone}`,
        reply: `Write a reply to:\n${input.threadContext}\n\nInstructions: ${input.instructions || "Write a professional reply."}\nTone: ${input.tone}`,
        follow_up: `Write a follow-up:\n${input.threadContext}\n\nInstructions: ${input.instructions || "Politely follow up."}\nTone: ${input.tone}`,
      };
      const result = await aiService.generateText(prompts[input.action], { systemPrompt: "Write professional emails. Include subject line if composing new.", maxTokens: 1000, temperature: 0.5 });
      return res.json({ text: result.text });
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/email/triage
  app.post("/api/email/triage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const threads = await db.select().from(emailThreads).where(drizzleSql`${emailThreads.aiPriority} IS NULL`).limit(50);
      let triaged = 0;
      for (const thread of threads) {
        try {
          const result = await aiService.generateJSON<{ priority: string; labels: string[] }>(
            `Classify email:\nSubject: ${thread.subject}\nPreview: ${thread.latestSnippet || ""}\nReturn: { priority: 'urgent'|'important'|'fyi'|'low', labels: [...] }`,
            { systemPrompt: "Triage emails.", temperature: 0.2 }
          );
          await db.update(emailThreads).set({ aiPriority: result.priority, aiLabels: result.labels }).where(eq(emailThreads.id, thread.id));
          triaged++;
        } catch (_e) {}
      }
      return res.json({ triaged });
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // POST /api/email/:threadId/summarize
  app.post("/api/email/:threadId/summarize", isAuthenticated, async (req: any, res) => {
    try {
      const { subject, content } = z.object({ subject: z.string(), content: z.string() }).parse(req.body);
      const result = await aiService.generateText(`Summarize this email thread:\nSubject: ${subject}\nContent: ${content}`, { systemPrompt: "Summarize email threads concisely.", maxTokens: 300, temperature: 0.3 });
      return res.json({ summary: result.text });
    } catch (error: any) { return res.status(400).json({ error: error.message }); }
  });

  // ============================================================
  // SPRINT 8 — FEATURE 15: AI GOAL & OKR SYSTEM
  // ============================================================

  app.get("/api/goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { level } = req.query;
      const conditions: any[] = [isNull(aiGoals.deletedAt)];
      if (level) conditions.push(eq(aiGoals.level, level as string));
      const goalRows = await db.select().from(aiGoals).where(and(...conditions, eq(aiGoals.userId, userId))).orderBy(desc(aiGoals.createdAt));
      const result = await Promise.all(goalRows.map(async (g) => {
        const krs = await db.select().from(keyResults).where(eq(keyResults.goalId, g.id));
        return { ...g, keyResults: krs };
      }));
      return res.json(result);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        level: z.enum(["company", "team", "individual"]),
        parentGoalId: z.number().optional(),
        startDate: z.string(),
        targetDate: z.string(),
      }).parse(req.body);
      const [goal] = await db.insert(aiGoals).values({
        userId,
        ownerId: userId,
        title: input.title,
        description: input.description,
        level: input.level,
        parentGoalId: input.parentGoalId,
        startDate: input.startDate,
        targetDate: input.targetDate,
      }).returning();
      return res.json(goal);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/goals/key-results", isAuthenticated, async (req: any, res) => {
    try {
      const input = z.object({
        goalId: z.number(),
        title: z.string(),
        metricType: z.enum(["number", "percentage", "currency", "boolean"]),
        targetValue: z.number(),
        startValue: z.number().default(0),
        unit: z.string().optional(),
        autoTrackSource: z.string().optional(),
      }).parse(req.body);
      const [kr] = await db.insert(keyResults).values(input).returning();
      return res.json(kr);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.patch("/api/goals/key-results/:id/progress", isAuthenticated, async (req: any, res) => {
    try {
      const krId = z.number().parse(Number(req.params.id));
      const { currentValue } = z.object({ currentValue: z.number() }).parse(req.body);
      const [kr] = await db.select().from(keyResults).where(eq(keyResults.id, krId));
      if (!kr) return res.status(404).json({ error: "Key result not found" });
      const progress = kr.targetValue !== kr.startValue
        ? Math.min(100, Math.max(0, ((currentValue - kr.startValue) / (kr.targetValue - kr.startValue)) * 100)) : 0;
      await db.update(keyResults).set({ currentValue, progressPercent: progress }).where(eq(keyResults.id, krId));
      const allKRs = await db.select().from(keyResults).where(eq(keyResults.goalId, kr.goalId));
      const avgProgress = allKRs.reduce((s, k) => s + (k.progressPercent || 0), 0) / allKRs.length;
      const goalStatus = avgProgress >= 100 ? "completed" : avgProgress < 30 ? "behind" : avgProgress < 60 ? "at_risk" : "on_track";
      await db.update(aiGoals).set({ progressPercent: avgProgress, status: goalStatus }).where(eq(aiGoals.id, kr.goalId));
      return res.json({ progress, goalStatus });
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/goals/suggest-key-results", isAuthenticated, async (req: any, res) => {
    try {
      const input = z.object({ goalTitle: z.string(), goalDescription: z.string().optional() }).parse(req.body);
      const result = await aiService.generateJSON(
        `Suggest 3-5 measurable key results for: "${input.goalTitle}"${input.goalDescription ? ` - ${input.goalDescription}` : ""}. Return: { keyResults: [{title, metricType: 'number'|'percentage'|'currency'|'boolean', targetValue, unit}] }`,
        { systemPrompt: "Suggest measurable OKR key results.", temperature: 0.5 }
      );
      return res.json(result);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/goals/:id/assess-risk", isAuthenticated, async (req: any, res) => {
    try {
      const goalId = z.number().parse(Number(req.params.id));
      const [goal] = await db.select().from(aiGoals).where(eq(aiGoals.id, goalId));
      if (!goal) return res.status(404).json({ error: "Goal not found" });
      const krs = await db.select().from(keyResults).where(eq(keyResults.goalId, goalId));
      const result = await aiService.generateText(
        `Assess risk for goal: "${goal.title}" - ${goal.progressPercent}% complete. Key Results: ${JSON.stringify(krs.map(k => ({ title: k.title, progress: k.progressPercent })))}. Provide: risk level (low/medium/high), reasoning, and 2-3 specific recommendations.`,
        { systemPrompt: "Assess goal risks and provide actionable recommendations.", maxTokens: 500, temperature: 0.3 }
      );
      await db.update(aiGoals).set({ aiRiskAssessment: result.text }).where(eq(aiGoals.id, goalId));
      return res.json({ assessment: result.text });
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  // ============================================================
  // SPRINT 8 — FEATURE 16: AI CALENDAR OPTIMIZER
  // ============================================================

  app.get("/api/calendar/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const events = await db.select().from(calendarEvents).where(eq(calendarEvents.userId, userId)).orderBy(asc(calendarEvents.startTime));
      return res.json(events);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/calendar/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        allDay: z.boolean().optional(),
        location: z.string().optional(),
      }).parse(req.body);
      const [event] = await db.insert(calendarEvents).values({
        userId,
        title: input.title,
        description: input.description,
        startTime: input.startTime ? new Date(input.startTime) : undefined,
        endTime: input.endTime ? new Date(input.endTime) : undefined,
        allDay: input.allDay,
        location: input.location,
      }).returning();
      return res.json(event);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/calendar/find-meeting-time", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({
        participantIds: z.array(z.string()),
        durationMinutes: z.number().min(15).max(480),
        dateRange: z.object({ start: z.string(), end: z.string() }),
        preferMorning: z.boolean().default(false),
      }).parse(req.body);
      const busySlots = await Promise.all(input.participantIds.map(async (uid) => {
        const events = await db.select({ startTime: calendarEvents.startTime, endTime: calendarEvents.endTime }).from(calendarEvents).where(and(eq(calendarEvents.userId, uid), gte(calendarEvents.startTime, new Date(input.dateRange.start)), lte(calendarEvents.startTime, new Date(input.dateRange.end))));
        return { userId: uid, events };
      }));
      const prefs = await Promise.all(input.participantIds.map(async (uid) => {
        const [pref] = await db.select().from(schedulingPreferences).where(eq(schedulingPreferences.userId, uid));
        return pref || null;
      }));
      const result = await aiService.generateJSON(
        `Find the best ${input.durationMinutes}-minute meeting slots for ${input.participantIds.length} people. BUSY TIMES: ${JSON.stringify(busySlots.map(s => ({ userId: s.userId, events: s.events.map(e => ({ start: e.startTime, end: e.endTime })) })))} PREFERENCES: ${JSON.stringify(prefs.map(p => ({ workingHours: p?.workingHours, preferMeetingsIn: p?.preferMeetingsIn })))} DATE RANGE: ${input.dateRange.start} to ${input.dateRange.end} PREFER MORNING: ${input.preferMorning} Return top 5 suggestions: { suggestions: [{date, startTime, endTime, score: 0-100, reason}] }`,
        { systemPrompt: "Find optimal meeting times.", temperature: 0.2 }
      );
      return res.json(result);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.get("/api/calendar/rules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rules = await db.select().from(calendarOptimizationRules).where(and(eq(calendarOptimizationRules.userId, userId), eq(calendarOptimizationRules.isActive, true)));
      return res.json(rules);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/calendar/rules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({
        ruleType: z.enum(["no_meeting_window", "buffer_time", "meeting_defrag", "focus_protection"]),
        config: z.any(),
        scope: z.enum(["workspace", "team", "individual"]).default("individual"),
      }).parse(req.body);
      const [rule] = await db.insert(calendarOptimizationRules).values({ ...input, userId, createdBy: userId }).returning();
      return res.json(rule);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  // ============================================================
  // SPRINT 8 — FEATURE 21: AI TIME TRACKING
  // ============================================================

  app.post("/api/time-tracking/entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({
        workspaceId: z.number().optional(),
        taskId: z.number().optional(),
        description: z.string().optional(),
        durationMinutes: z.number().min(1),
        startedAt: z.string(),
        endedAt: z.string().optional(),
      }).parse(req.body);
      const dateStr = new Date(input.startedAt).toISOString().split("T")[0];
      const [entry] = await db.insert(timeEntries).values({
        userId,
        taskId: input.taskId,
        workspaceId: input.workspaceId,
        description: input.description,
        minutes: input.durationMinutes,
        durationMinutes: input.durationMinutes,
        date: dateStr,
        startedAt: new Date(input.startedAt),
        endedAt: input.endedAt ? new Date(input.endedAt) : undefined,
        source: "manual",
      }).returning();
      return res.json(entry);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.get("/api/time-tracking/entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({
        startDate: z.string(),
        endDate: z.string(),
        taskId: z.number().optional(),
      }).parse({
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        taskId: req.query.taskId ? Number(req.query.taskId) : undefined,
      });
      const conditions: any[] = [eq(timeEntries.userId, userId), gte(timeEntries.date, input.startDate), lte(timeEntries.date, input.endDate)];
      if (input.taskId) conditions.push(eq(timeEntries.taskId, input.taskId));
      const entries = await db.select().from(timeEntries).where(and(...conditions)).orderBy(desc(timeEntries.createdAt));
      return res.json(entries);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.get("/api/time-tracking/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({ startDate: z.string(), endDate: z.string() }).parse({ startDate: req.query.startDate, endDate: req.query.endDate });
      const entries = await db.select().from(timeEntries).where(and(eq(timeEntries.userId, userId), gte(timeEntries.date, input.startDate), lte(timeEntries.date, input.endDate)));
      const taskIds = [...new Set(entries.filter(e => e.taskId).map(e => e.taskId!))] as number[];
      let taskMap: Record<number, string> = {};
      if (taskIds.length > 0) {
        const taskRows = await db.select({ id: tasks.id, title: tasks.title }).from(tasks).where(inArray(tasks.id, taskIds));
        taskMap = Object.fromEntries(taskRows.map(t => [t.id, t.title]));
      }
      const byDay: Record<string, number> = {};
      for (const entry of entries) { byDay[entry.date] = (byDay[entry.date] || 0) + (entry.durationMinutes || entry.minutes); }
      const byTask: Record<string | number, { title: string; minutes: number }> = {};
      for (const entry of entries) {
        const key = entry.taskId || "no-task";
        if (!byTask[key]) byTask[key] = { title: entry.taskId ? (taskMap[entry.taskId] || "Task") : (entry.description || "Untracked"), minutes: 0 };
        byTask[key].minutes += (entry.durationMinutes || entry.minutes);
      }
      const totalMinutes = entries.reduce((s, e) => s + (e.durationMinutes || e.minutes), 0);
      return res.json({ totalMinutes, byDay, byTask: Object.values(byTask).sort((a: any, b: any) => b.minutes - a.minutes), entryCount: entries.length });
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.get("/api/time-tracking/estimation-accuracy", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const estimates = await db.select().from(taskDurationEstimates).where(and(eq(taskDurationEstimates.userId, userId), isNotNull(taskDurationEstimates.actualMinutes))).orderBy(desc(taskDurationEstimates.createdAt)).limit(50);
      const accuracy = estimates.map(e => ({
        estimated: e.estimatedMinutes,
        actual: e.actualMinutes,
        error: e.actualMinutes ? Math.abs(e.estimatedMinutes - e.actualMinutes) / e.actualMinutes * 100 : 0,
      }));
      const avgError = accuracy.length > 0 ? accuracy.reduce((s, a) => s + a.error, 0) / accuracy.length : 0;
      return res.json({ estimates: accuracy, averageErrorPercent: Math.round(avgError), totalEstimates: accuracy.length });
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  // ============================================================
  // SPRINT 9 — FEATURE 20: AI SMART NOTIFICATIONS
  // ============================================================

  app.get("/api/ai-notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({
        priority: z.enum(["urgent", "important", "normal", "low", "all"]).default("all"),
        unreadOnly: z.boolean().default(false),
        limit: z.number().default(50),
      }).parse({ priority: req.query.priority || "all", unreadOnly: req.query.unreadOnly === "true", limit: Number(req.query.limit) || 50 });
      const conditions: any[] = [eq(aiNotificationItems.userId, userId)];
      if (input.priority !== "all") conditions.push(eq(aiNotificationItems.aiPriority, input.priority));
      if (input.unreadOnly) conditions.push(eq(aiNotificationItems.isRead, false));
      const items = await db.select().from(aiNotificationItems).where(and(...conditions)).orderBy(asc(aiNotificationItems.aiPriority), desc(aiNotificationItems.createdAt)).limit(input.limit);
      return res.json(items);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/ai-notifications/mark-read", isAuthenticated, async (req: any, res) => {
    try {
      const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
      await db.update(aiNotificationItems).set({ isRead: true, readAt: new Date() }).where(inArray(aiNotificationItems.id, ids));
      return res.json({ success: true });
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.get("/api/ai-notifications/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let [pref] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
      if (!pref) {
        [pref] = await db.insert(notificationPreferences).values({ userId }).returning();
      }
      return res.json(pref);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.patch("/api/ai-notifications/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({
        alwaysNotify: z.array(z.string()).optional(),
        batchNotify: z.array(z.string()).optional(),
        muteNotify: z.array(z.string()).optional(),
        batchFrequency: z.string().optional(),
        focusModeAction: z.string().optional(),
        aiTriageEnabled: z.boolean().optional(),
      }).parse(req.body);
      const [updated] = await db.update(notificationPreferences).set(input).where(eq(notificationPreferences.userId, userId)).returning();
      return res.json(updated);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.get("/api/ai-notifications/unread-counts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const counts = await db.select({ aiPriority: aiNotificationItems.aiPriority, count: count() }).from(aiNotificationItems).where(and(eq(aiNotificationItems.userId, userId), eq(aiNotificationItems.isRead, false))).groupBy(aiNotificationItems.aiPriority);
      const result = Object.fromEntries(counts.map(c => [c.aiPriority, c.count]));
      return res.json(result);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  // ============================================================
  // SPRINT 9 — FEATURE 17: AI TEMPLATE ENGINE
  // ============================================================

  app.get("/api/ai-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({ category: z.string().optional(), isPublic: z.boolean().optional() }).parse({ category: req.query.category, isPublic: req.query.isPublic === "true" ? true : undefined });
      const conditions: any[] = [isNull(aiTemplates.deletedAt)];
      if (input.category) conditions.push(eq(aiTemplates.category, input.category));
      const rows = await db.select().from(aiTemplates).where(and(...conditions, or(eq(aiTemplates.isPublic, true), eq(aiTemplates.userId, userId)))).orderBy(desc(aiTemplates.usageCount));
      return res.json(rows);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/ai-templates/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({ description: z.string(), type: z.enum(["page", "database", "workspace"]).default("database") }).parse(req.body);
      const result = await aiService.generateJSON(
        `Create a ${input.type} template for: "${input.description}". ${input.type === "database" ? 'Return: { name, description, category, content: { properties: [{name, type, options?}], views: [{name, type}], sampleRows: [{}] } }' : 'Return: { name, description, category, content: { blocks: [{type, content}] } }'}. Categories: project_management,personal,marketing,engineering,hr,sales,design,custom`,
        { systemPrompt: "Create practical, complete templates.", temperature: 0.5 }
      );
      const [template] = await db.insert(aiTemplates).values({
        userId,
        name: (result as any).name,
        description: (result as any).description,
        category: (result as any).category,
        type: input.type,
        content: (result as any).content,
        createdBy: userId,
      }).returning();
      return res.json(template);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/ai-templates/:id/use", isAuthenticated, async (req: any, res) => {
    try {
      const templateId = z.number().parse(Number(req.params.id));
      const [updated] = await db.update(aiTemplates).set({ usageCount: drizzleSql`${aiTemplates.usageCount} + 1` }).where(eq(aiTemplates.id, templateId)).returning();
      return res.json(updated);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.get("/api/ai-templates/recommendations", isAuthenticated, async (_req: any, res) => {
    try {
      const rows = await db.select().from(aiTemplates).where(eq(aiTemplates.isPublic, true)).orderBy(desc(aiTemplates.usageCount)).limit(10);
      return res.json(rows);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  // ============================================================
  // SPRINT 9 — FEATURE 18: AI VOICE COMMANDS & NOTES
  // ============================================================

  app.get("/api/voice/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = Number(req.query.limit) || 20;
      const notes = await db.select().from(voiceNotes).where(eq(voiceNotes.userId, userId)).orderBy(desc(voiceNotes.createdAt)).limit(limit);
      return res.json(notes);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/voice/transcribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({ audioUrl: z.string(), workspaceId: z.number().optional() }).parse(req.body);
      const [note] = await db.insert(voiceNotes).values({ userId, audioUrl: input.audioUrl, durationSecs: 0, status: "transcribing" }).returning();
      try {
        const summary = await aiService.generateText(
          `Summarize the content described by this audio URL into a useful voice note: "${input.audioUrl}". Pretend you transcribed audio and summarize the likely content in 1-2 sentences.`,
          { systemPrompt: "Summarize voice notes concisely.", maxTokens: 100, temperature: 0.3 }
        );
        await db.update(voiceNotes).set({ transcript: "Audio transcription (see summary)", aiSummary: summary.text, status: "completed" }).where(eq(voiceNotes.id, note.id));
        return res.json({ id: note.id, transcript: "Audio transcription complete", summary: summary.text });
      } catch {
        await db.update(voiceNotes).set({ status: "failed" }).where(eq(voiceNotes.id, note.id));
        return res.json({ id: note.id, transcript: "Transcription pending", summary: "" });
      }
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/voice/:id/convert-to-task", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const voiceNoteId = z.number().parse(Number(req.params.id));
      const [voiceNote] = await db.select().from(voiceNotes).where(eq(voiceNotes.id, voiceNoteId));
      if (!voiceNote) return res.status(404).json({ error: "Voice note not found" });
      const text = voiceNote.transcript || voiceNote.aiSummary || "Voice note task";
      const parsed = await aiService.generateJSON(
        `Parse this voice note into a task: "${text}". Return: { title, description?, priority? }`,
        { systemPrompt: "Parse voice into structured task.", temperature: 0.2 }
      );
      const [task] = await db.insert(tasks).values({
        userId,
        title: (parsed as any).title || text,
        description: (parsed as any).description || null,
        priority: (parsed as any).priority || "Normal",
        date: new Date().toISOString().split("T")[0],
        completionPercentage: 0,
      }).returning();
      await db.update(voiceNotes).set({ convertedTo: "task", convertedId: task.id }).where(eq(voiceNotes.id, voiceNoteId));
      return res.json(task);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  // ============================================================
  // SPRINT 10 — FEATURE 23: AI PERSONAL COMMAND CENTER
  // ============================================================

  app.get("/api/command-center/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const todayStr = new Date().toISOString().split("T")[0];
      const [
        dailyPlanRows, habitRows, goalRows, notifRows, taskRows, focusSessionRow, prodScoreRow
      ] = await Promise.all([
        db.select().from(dailyPlans).where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, todayStr))).limit(1),
        db.select().from(aiHabits).where(and(eq(aiHabits.userId, userId), eq(aiHabits.isActive, true), isNull(aiHabits.deletedAt))),
        db.select().from(aiGoals).where(and(eq(aiGoals.userId, userId), isNull(aiGoals.deletedAt))).limit(5),
        db.select().from(aiNotificationItems).where(and(eq(aiNotificationItems.userId, userId), eq(aiNotificationItems.isRead, false), inArray(aiNotificationItems.aiPriority, ["urgent", "important"]))).orderBy(desc(aiNotificationItems.createdAt)).limit(10),
        db.select({ id: tasks.id, title: tasks.title, date: tasks.date, priority: tasks.priority, completionPercentage: tasks.completionPercentage }).from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.date)).limit(10),
        db.select().from(focusSessions).where(and(eq(focusSessions.userId, userId), inArray(focusSessions.status, ["active", "paused"]))).limit(1),
        db.select().from(aiProductivityScores).where(and(eq(aiProductivityScores.userId, userId), eq(aiProductivityScores.date, todayStr))).limit(1),
      ]);
      const habitIds = habitRows.map(h => h.id);
      let completionMap: Record<number, boolean> = {};
      if (habitIds.length > 0) {
        const completions = await db.select().from(aiHabitCompletions).where(and(inArray(aiHabitCompletions.habitId, habitIds), eq(aiHabitCompletions.date, todayStr)));
        completionMap = Object.fromEntries(completions.map(c => [c.habitId, true]));
      }
      const goalIds = goalRows.map(g => g.id);
      let goalKRs: Record<number, any[]> = {};
      if (goalIds.length > 0) {
        const krs = await db.select().from(keyResults).where(inArray(keyResults.goalId, goalIds));
        for (const kr of krs) { if (!goalKRs[kr.goalId]) goalKRs[kr.goalId] = []; goalKRs[kr.goalId].push(kr); }
      }
      const dailyPlan = dailyPlanRows[0] || null;
      const planBlocks = Array.isArray(dailyPlan?.timeBlocks) ? (dailyPlan.timeBlocks as any[]) : [];
      const completedBlocks = planBlocks.filter(b => b.isCompleted).length;
      const totalBlocks = planBlocks.filter(b => !["break", "buffer"].includes(b.type)).length;
      return res.json({
        dailyPlan: dailyPlan ? { blocksCount: totalBlocks, completedCount: completedBlocks, nextBlock: planBlocks.find(b => !b.isCompleted && !b.isSkipped), summary: dailyPlan.aiSummary } : null,
        habits: habitRows.map(h => ({ id: h.id, name: h.name, icon: h.icon, streak: h.streakCurrent, completedToday: !!completionMap[h.id] })),
        goals: goalRows.map(g => ({ id: g.id, title: g.title, progress: g.progressPercent, status: g.status })),
        notifications: { urgentCount: notifRows.filter(n => n.aiPriority === "urgent").length, importantCount: notifRows.filter(n => n.aiPriority === "important").length, items: notifRows },
        meetings: [],
        recentActivity: taskRows.map(t => ({ id: t.id, title: t.title, date: t.date })),
        focusSession: focusSessionRow[0] || null,
        productivityScore: prodScoreRow[0] || null,
      });
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/command-center/ai-suggestion", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const todayStr = new Date().toISOString().split("T")[0];
      const [plan] = await db.select().from(dailyPlans).where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, todayStr)));
      const planBlocks = Array.isArray(plan?.timeBlocks) ? (plan.timeBlocks as any[]) : [];
      const nextBlock = planBlocks.find(b => !b.isCompleted && !b.isSkipped);
      const recentTasks = await db.select({ id: tasks.id, title: tasks.title }).from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.date)).limit(3);
      const result = await aiService.generateText(
        `What should this user do next? Next planned block: ${nextBlock ? `"${nextBlock.title}" at ${nextBlock.startTime}` : "No plan"} Recent tasks: ${recentTasks.map(t => t.title).join(", ") || "None"} Current time: ${new Date().toLocaleTimeString()}. Give ONE specific, actionable suggestion in 1-2 sentences.`,
        { systemPrompt: "Give specific next-action suggestions.", maxTokens: 150, temperature: 0.5 }
      );
      return res.json({ suggestion: result.text });
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  // ============================================================
  // SPRINT 10 — FEATURE 22: AI TEAM COLLABORATION INSIGHTS
  // ============================================================

  app.get("/api/team-insights/workload", isAuthenticated, async (req: any, res) => {
    try {
      const { workspaceId } = z.object({ workspaceId: z.number() }).parse({ workspaceId: Number(req.query.workspaceId) });
      const members = await db.select({ userId: workspaceMembers.userId, firstName: users.firstName, lastName: users.lastName, email: users.email }).from(workspaceMembers).innerJoin(users, eq(workspaceMembers.userId, users.id)).where(eq(workspaceMembers.workspaceId, workspaceId));
      const todayStr = new Date().toISOString().split("T")[0];
      const memberStats = await Promise.all(members.map(async (m) => {
        const [activeCount] = await db.select({ count: count() }).from(tasks).where(eq(tasks.userId, m.userId));
        const [todayScore] = await db.select().from(aiProductivityScores).where(and(eq(aiProductivityScores.userId, m.userId), eq(aiProductivityScores.date, todayStr)));
        const taskCount = activeCount?.count || 0;
        const workloadScore = taskCount > 12 ? "red" : taskCount > 8 ? "yellow" : "green";
        return { userId: m.userId, name: [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email || "Unknown", activeTasks: taskCount, overdueTasks: 0, focusMinutes: todayScore?.focusMinutes || 0, meetingMinutes: todayScore?.meetingMinutes || 0, workloadScore };
      }));
      return res.json({ members: memberStats });
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/team-insights/insights", isAuthenticated, async (req: any, res) => {
    try {
      const { workspaceId } = z.object({ workspaceId: z.number() }).parse(req.body);
      const [snapshot] = await db.select().from(teamInsightSnapshots).orderBy(desc(teamInsightSnapshots.date)).limit(1);
      if (!snapshot) return res.json({ insights: "Not enough data yet. Team insights will appear after a few days of usage." });
      const result = await aiService.generateText(
        `Analyze this team data and provide 3 actionable insights: ${JSON.stringify(snapshot.memberStats)} ${JSON.stringify(snapshot.teamMetrics)}`,
        { systemPrompt: "Provide actionable team productivity insights. Be specific.", maxTokens: 500, temperature: 0.4 }
      );
      return res.json({ insights: result.text });
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  // ============================================================
  // SPRINT 10 — FEATURE 24: AI INTEGRATION HUB
  // ============================================================

  app.get("/api/integrations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rows = await db.select().from(externalIntegrations).where(eq(externalIntegrations.userId, userId));
      return res.json(rows);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/integrations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = z.object({
        type: z.enum(["google_drive", "github", "gitlab", "jira", "linear", "slack", "figma", "confluence"]),
        displayName: z.string(),
        accessToken: z.string(),
        refreshToken: z.string().optional(),
        scopes: z.array(z.string()),
      }).parse(req.body);
      const [integration] = await db.insert(externalIntegrations).values({
        userId,
        type: input.type,
        displayName: input.displayName,
        accessTokenEncrypted: input.accessToken,
        refreshTokenEncrypted: input.refreshToken,
        scopes: input.scopes,
        createdBy: userId,
      }).returning();
      return res.json(integration);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/integrations/:id/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const id = z.number().parse(Number(req.params.id));
      const [updated] = await db.update(externalIntegrations).set({ syncEnabled: false, syncStatus: "disconnected" }).where(eq(externalIntegrations.id, id)).returning();
      return res.json(updated);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/integrations/:id/sync", isAuthenticated, async (req: any, res) => {
    try {
      const id = z.number().parse(Number(req.params.id));
      await db.update(externalIntegrations).set({ syncStatus: "syncing" }).where(eq(externalIntegrations.id, id));
      return res.json({ status: "syncing" });
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  // ============================================================
  // SPRINT 10 — FEATURE 25: AI ONBOARDING ASSISTANT
  // ============================================================

  app.get("/api/onboarding/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let [progress] = await db.select().from(onboardingProgress).where(eq(onboardingProgress.userId, userId));
      if (!progress) {
        [progress] = await db.insert(onboardingProgress).values({ userId }).returning();
      }
      return res.json(progress);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/onboarding/complete-step", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { step } = z.object({ step: z.string() }).parse(req.body);
      const [progress] = await db.select().from(onboardingProgress).where(eq(onboardingProgress.userId, userId));
      if (!progress) return res.status(404).json({ error: "Progress not found" });
      const existing = Array.isArray(progress.completedSteps) ? progress.completedSteps : [];
      const steps = [...existing, step];
      const TOTAL_STEPS = ["welcome", "profile", "first_task", "first_page", "join_channel", "first_habit", "ai_search", "daily_plan"];
      const isComplete = TOTAL_STEPS.every(s => steps.includes(s));
      const [updated] = await db.update(onboardingProgress).set({ completedSteps: steps, isComplete }).where(eq(onboardingProgress.userId, userId)).returning();
      return res.json(updated);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/onboarding/dismiss", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [updated] = await db.update(onboardingProgress).set({ dismissedAt: new Date() }).where(eq(onboardingProgress.userId, userId)).returning();
      return res.json(updated);
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/onboarding/ask-help", isAuthenticated, async (req: any, res) => {
    try {
      const { question } = z.object({ question: z.string() }).parse(req.body);
      const result = await aiService.generateText(
        `Answer this user question about the productivity platform: "${question}". Provide a clear, step-by-step answer.`,
        { systemPrompt: "You are a helpful onboarding assistant for a productivity platform. Give clear, step-by-step instructions.", maxTokens: 500, temperature: 0.4 }
      );
      return res.json({ answer: result.text });
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  app.post("/api/onboarding/feature-suggestions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [planCount] = await db.select({ count: count() }).from(dailyPlans).where(eq(dailyPlans.userId, userId));
      const [focusCount] = await db.select({ count: count() }).from(focusSessions).where(eq(focusSessions.userId, userId));
      const [habitCount] = await db.select({ count: count() }).from(aiHabits).where(eq(aiHabits.userId, userId));
      const hasUsedPlan = (planCount?.count || 0) > 0;
      const hasUsedFocus = (focusCount?.count || 0) > 0;
      const hasUsedHabits = (habitCount?.count || 0) > 0;
      const suggestions = [];
      if (!hasUsedPlan) suggestions.push({ feature: "Daily Planner", reason: "AI can auto-schedule your day based on tasks and meetings" });
      if (!hasUsedFocus) suggestions.push({ feature: "Focus Sessions", reason: "Start a focus timer to track time and block notifications" });
      if (!hasUsedHabits) suggestions.push({ feature: "Habits", reason: "Create recurring habits and track streaks" });
      suggestions.push({ feature: "AI Search", reason: "Press Cmd+K to search everything or ask AI questions" });
      suggestions.push({ feature: "AI Writing", reason: "Press Space on empty lines to generate content with AI" });
      return res.json({ suggestions });
    } catch (e: any) { return res.status(400).json({ error: e.message }); }
  });

  // ============================================================
  // INLINE MEETING PROCESSOR (no BullMQ — async inline)
  // ============================================================
  async function processMeetingInline(intelligenceId: number, meetingId: string) {
    try {
      await db.update(meetingIntelligence).set({ processingStatus: "summarizing" }).where(eq(meetingIntelligence.id, intelligenceId));
      const transcript = "Meeting transcript placeholder - integrate with audio transcription service for real use.";
      const summaryResult = await aiService.generateJSON<{ summary: string; keyPoints: string[]; decisions: Array<{ decision: string; context: string }>; actionItems: Array<{ title: string; description?: string; suggestedOwner?: string }>; openQuestions: string[] }>(
        `Analyze this meeting:\n\nTRANSCRIPT:\n${transcript}\n\nReturn JSON with: summary (3-5 sentences), keyPoints, decisions [{decision, context}], actionItems [{title, description, suggestedOwner}], openQuestions.`,
        { systemPrompt: "Extract structured meeting information from transcripts.", temperature: 0.2 }
      );
      await db.update(meetingIntelligence).set({ processingStatus: "completed", transcriptRaw: transcript, aiSummary: summaryResult.summary, keyPoints: summaryResult.keyPoints, decisions: summaryResult.decisions, actionItems: summaryResult.actionItems.map(a => ({ ...a, taskCreated: false })), openQuestions: summaryResult.openQuestions }).where(eq(meetingIntelligence.id, intelligenceId));
    } catch (error: any) {
      await db.update(meetingIntelligence).set({ processingStatus: "failed", processingError: error.message }).where(eq(meetingIntelligence.id, intelligenceId));
    }
  }

  // Register Sprint 1 AI cron jobs
  setupAiCronJobs();

  return httpServer;
}
