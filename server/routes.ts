import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";

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

  return httpServer;
}
