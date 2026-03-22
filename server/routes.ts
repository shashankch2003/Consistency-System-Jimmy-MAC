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

const ADMIN_USER_ID = process.env.ADMIN_USER_ID || "";

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
  app.post(api.hourlyEntries.createOrUpdate.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.hourlyEntries.createOrUpdate.input.parse(req.body);
      const entry = await storage.upsertHourlyEntry({ ...input, userId: req.user.claims.sub });
      res.json(entry);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

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
      const teamSnaps = await storage.getTeamSnapshots(workspaceId, today);
      res.json({ snapshots: teamSnaps, date: today });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/productivity/performers", isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.query.workspaceId as string) || 0;
      const today = new Date().toISOString().split("T")[0];
      const snaps = workspaceId ? await storage.getTeamSnapshots(workspaceId, today) : [];
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

  return httpServer;
}
