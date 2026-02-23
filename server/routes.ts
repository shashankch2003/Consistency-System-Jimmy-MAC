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
      let goodHabitScore = 0;
      if (gHabits.length > 0) {
        const gEntries = await storage.getGoodHabitEntries(gHabits.map(h => h.id));
        const dayGoodEntries = gEntries.filter(e => e.date === date);
        const completedCount = dayGoodEntries.filter(e => e.completed).length;
        goodHabitScore = (completedCount / gHabits.length) * 100;
      }

      const bHabits = await storage.getBadHabits(userId);
      let badHabitScore = 100;
      if (bHabits.length > 0) {
        const bEntries = await storage.getBadHabitEntries(bHabits.map(h => h.id));
        const dayBadEntries = bEntries.filter(e => e.date === date);
        const occurredCount = dayBadEntries.filter(e => e.occurred).length;
        badHabitScore = ((bHabits.length - occurredCount) / bHabits.length) * 100;
      }

      const hEntries = await storage.getHourlyEntries(userId, date);
      const hourlyScore = hEntries.length > 0
        ? Math.min((hEntries.reduce((sum, e) => sum + e.productivityScore, 0) / hEntries.length) * 10, 100)
        : 0;

      const weights = { task: 0.3, goodHabit: 0.25, badHabit: 0.2, hourly: 0.25 };
      const activeSections: string[] = [];
      if (dayTasks.length > 0) activeSections.push('task');
      if (gHabits.length > 0) activeSections.push('goodHabit');
      if (bHabits.length > 0) activeSections.push('badHabit');
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

        let goodHabitScore = 0;
        if (gHabits.length > 0) {
          const dayGoodEntries = allGoodEntries.filter(e => e.date === dateStr);
          goodHabitScore = (dayGoodEntries.filter(e => e.completed).length / gHabits.length) * 100;
        }

        let badHabitScore = 100;
        if (bHabits.length > 0) {
          const dayBadEntries = allBadEntries.filter(e => e.date === dateStr);
          badHabitScore = ((bHabits.length - dayBadEntries.filter(e => e.occurred).length) / bHabits.length) * 100;
        }

        const hEntries = await storage.getHourlyEntries(userId, dateStr);
        const hourlyScore = hEntries.length > 0 ? Math.min((hEntries.reduce((sum, e) => sum + e.productivityScore, 0) / hEntries.length) * 10, 100) : 0;

        const weights = { task: 0.3, goodHabit: 0.25, badHabit: 0.2, hourly: 0.25 };
        const activeSections: string[] = [];
        if (dayTasks.length > 0) activeSections.push('task');
        if (gHabits.length > 0) activeSections.push('goodHabit');
        if (bHabits.length > 0) activeSections.push('badHabit');
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
      let goodHabitScore = 0;
      if (gHabits.length > 0) {
        const gEntries = await storage.getGoodHabitEntries(gHabits.map(h => h.id));
        const dayGoodEntries = gEntries.filter((e: any) => e.date === date);
        goodHabitScore = (dayGoodEntries.filter((e: any) => e.completed).length / gHabits.length) * 100;
      }

      const bHabits = await storage.getBadHabits(userId);
      let badHabitScore = 100;
      if (bHabits.length > 0) {
        const bEntries = await storage.getBadHabitEntries(bHabits.map(h => h.id));
        const dayBadEntries = bEntries.filter((e: any) => e.date === date);
        badHabitScore = ((bHabits.length - dayBadEntries.filter((e: any) => e.occurred).length) / bHabits.length) * 100;
      }

      const hEntries = await storage.getHourlyEntries(userId, date);
      const hourlyScore = hEntries.length > 0
        ? Math.min((hEntries.reduce((sum: number, e: any) => sum + e.productivityScore, 0) / hEntries.length) * 10, 100)
        : 0;

      const weights = { task: 0.3, goodHabit: 0.25, badHabit: 0.2, hourly: 0.25 };
      const activeSections: string[] = [];
      if (dayTasks.length > 0) activeSections.push('task');
      if (gHabits.length > 0) activeSections.push('goodHabit');
      if (bHabits.length > 0) activeSections.push('badHabit');
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
      const [customTypes, usageData] = await Promise.all([
        storage.getCustomDayTypes(userId),
        storage.getDayTypeUsage(userId),
      ]);
      const { DEFAULT_DAY_TYPES } = await import("@shared/schema");
      const usageMap = new Map(usageData.map(u => [u.dayTypeName, u.usageCount]));
      const allTypes = [
        ...DEFAULT_DAY_TYPES.map(dt => ({ ...dt, isCustom: false, usageCount: usageMap.get(dt.name) || 0 })),
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

        let goodHabitScore = 0;
        if (gHabits.length > 0) {
          const dayGE = allGoodEntries.filter(e => e.date === dateStr);
          goodHabitScore = (dayGE.filter(e => e.completed).length / gHabits.length) * 100;
        }

        let badHabitScore = 100;
        if (bHabits.length > 0) {
          const dayBE = allBadEntries.filter(e => e.date === dateStr);
          badHabitScore = ((bHabits.length - dayBE.filter(e => e.occurred).length) / bHabits.length) * 100;
        }

        const hEntries = hourlyByDate[dateStr] || [];
        const hourlyScore = hEntries.length > 0 ? Math.min((hEntries.reduce((sum, e) => sum + e.productivityScore, 0) / hEntries.length) * 10, 100) : 0;

        const weights = { task: 0.3, goodHabit: 0.25, badHabit: 0.2, hourly: 0.25 };
        const active: string[] = [];
        if (dayTasks.length > 0) active.push('task');
        if (gHabits.length > 0) active.push('goodHabit');
        if (bHabits.length > 0) active.push('badHabit');
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

  // OCR: extract text from image
  app.post("/api/ocr", isAuthenticated, upload.single("image"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No image provided" });
      const Tesseract = await import("tesseract.js");
      const result = await Tesseract.recognize(req.file.path, "eng");
      const text = result.data.text.trim();
      res.json({ text, imageUrl: `/uploads/${req.file.filename}` });
    } catch (e: any) { res.status(500).json({ message: "OCR failed: " + e.message }); }
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

  return httpServer;
}
