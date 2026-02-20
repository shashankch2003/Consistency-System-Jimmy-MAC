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

  // Goals
  app.get(api.goals.list.path, isAuthenticated, async (req: any, res) => {
    const goals = await storage.getGoals(req.user.claims.sub);
    res.json(goals);
  });
  app.post(api.goals.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.goals.create.input.parse(req.body);
      const goal = await storage.createGoal({ ...input, userId: req.user.claims.sub });
      res.status(201).json(goal);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.put(api.goals.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.goals.update.input.parse(req.body);
      const goal = await storage.updateGoal(parseInt(req.params.id), input);
      res.json(goal);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.delete(api.goals.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteGoal(parseInt(req.params.id));
    res.status(204).end();
  });

  // Tasks
  app.get(api.tasks.list.path, isAuthenticated, async (req: any, res) => {
    const date = req.query.date as string | undefined;
    const tasks = await storage.getTasks(req.user.claims.sub, date);
    res.json(tasks);
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
    const entries = await storage.getHourlyEntries(req.user.claims.sub, date);
    res.json(entries);
  });
  app.post(api.hourlyEntries.createOrUpdate.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.hourlyEntries.createOrUpdate.input.parse(req.body);
      const entry = await storage.upsertHourlyEntry({ ...input, userId: req.user.claims.sub });
      res.json(entry);
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