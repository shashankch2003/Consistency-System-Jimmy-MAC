import { db } from "./db";
import { eq, and, asc, like, desc } from "drizzle-orm";
import {
  yearlyGoals, monthlyOverviewGoals, monthlyDynamicGoals,
  tasks, goodHabits, goodHabitEntries, badHabits, badHabitEntries, hourlyEntries, payments, taskBankItems, dailyReasons, notes,
  userLevels, groupMessages, adminInbox, monthlyEvaluations,
  journalEntries, customDayTypes, dayTypeUsage, userStreaks,
} from "@shared/schema";
import { authStorage, type IAuthStorage } from "./replit_integrations/auth/storage";

type InsertYearlyGoal = typeof yearlyGoals.$inferInsert;
type InsertMonthlyOverviewGoal = typeof monthlyOverviewGoals.$inferInsert;
type InsertMonthlyDynamicGoal = typeof monthlyDynamicGoals.$inferInsert;
type InsertTask = typeof tasks.$inferInsert;
type InsertGoodHabit = typeof goodHabits.$inferInsert;
type InsertGoodHabitEntry = typeof goodHabitEntries.$inferInsert;
type InsertBadHabit = typeof badHabits.$inferInsert;
type InsertBadHabitEntry = typeof badHabitEntries.$inferInsert;
type InsertHourlyEntry = typeof hourlyEntries.$inferInsert;
type InsertPayment = typeof payments.$inferInsert;
type InsertTaskBankItem = typeof taskBankItems.$inferInsert;
type InsertDailyReason = typeof dailyReasons.$inferInsert;
type InsertNote = typeof notes.$inferInsert;
type InsertGroupMessage = typeof groupMessages.$inferInsert;
type InsertAdminInbox = typeof adminInbox.$inferInsert;
type InsertJournalEntry = typeof journalEntries.$inferInsert;
type InsertCustomDayType = typeof customDayTypes.$inferInsert;
type InsertDayTypeUsage = typeof dayTypeUsage.$inferInsert;

export interface IStorage extends IAuthStorage {
  getYearlyGoals(userId: string, year?: number): Promise<(typeof yearlyGoals.$inferSelect)[]>;
  createYearlyGoal(goal: InsertYearlyGoal): Promise<typeof yearlyGoals.$inferSelect>;
  updateYearlyGoal(id: number, updates: Partial<InsertYearlyGoal>): Promise<typeof yearlyGoals.$inferSelect>;
  deleteYearlyGoal(id: number): Promise<void>;

  getMonthlyOverviewGoals(userId: string, year?: number): Promise<(typeof monthlyOverviewGoals.$inferSelect)[]>;
  upsertMonthlyOverviewGoal(goal: InsertMonthlyOverviewGoal): Promise<typeof monthlyOverviewGoals.$inferSelect>;

  getMonthlyDynamicGoals(userId: string, year?: number, month?: number): Promise<(typeof monthlyDynamicGoals.$inferSelect)[]>;
  createMonthlyDynamicGoal(goal: InsertMonthlyDynamicGoal): Promise<typeof monthlyDynamicGoals.$inferSelect>;
  updateMonthlyDynamicGoal(id: number, updates: Partial<InsertMonthlyDynamicGoal>): Promise<typeof monthlyDynamicGoals.$inferSelect>;
  deleteMonthlyDynamicGoal(id: number): Promise<void>;

  getTasks(userId: string, date?: string): Promise<(typeof tasks.$inferSelect)[]>;
  getTasksByMonth(userId: string, month: string): Promise<(typeof tasks.$inferSelect)[]>;
  getTasksByYear(userId: string, year: number): Promise<(typeof tasks.$inferSelect)[]>;
  createTask(task: InsertTask): Promise<typeof tasks.$inferSelect>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<typeof tasks.$inferSelect>;
  deleteTask(id: number): Promise<void>;

  getGoodHabits(userId: string): Promise<(typeof goodHabits.$inferSelect)[]>;
  createGoodHabit(habit: InsertGoodHabit): Promise<typeof goodHabits.$inferSelect>;
  updateGoodHabit(id: number, name: string): Promise<typeof goodHabits.$inferSelect>;
  deleteGoodHabit(id: number): Promise<void>;
  getGoodHabitEntries(habitIds: number[], month?: string): Promise<(typeof goodHabitEntries.$inferSelect)[]>;
  upsertGoodHabitEntry(entry: InsertGoodHabitEntry): Promise<typeof goodHabitEntries.$inferSelect>;

  getBadHabits(userId: string): Promise<(typeof badHabits.$inferSelect)[]>;
  createBadHabit(habit: InsertBadHabit): Promise<typeof badHabits.$inferSelect>;
  updateBadHabit(id: number, name: string): Promise<typeof badHabits.$inferSelect>;
  deleteBadHabit(id: number): Promise<void>;
  getBadHabitEntries(habitIds: number[], month?: string): Promise<(typeof badHabitEntries.$inferSelect)[]>;
  upsertBadHabitEntry(entry: InsertBadHabitEntry): Promise<typeof badHabitEntries.$inferSelect>;

  getHourlyEntries(userId: string, date?: string): Promise<(typeof hourlyEntries.$inferSelect)[]>;
  getHourlyEntriesByMonth(userId: string, month: string): Promise<(typeof hourlyEntries.$inferSelect)[]>;
  upsertHourlyEntry(entry: InsertHourlyEntry): Promise<typeof hourlyEntries.$inferSelect>;

  createPayment(payment: InsertPayment): Promise<typeof payments.$inferSelect>;

  getTaskBankItems(userId: string): Promise<(typeof taskBankItems.$inferSelect)[]>;
  createTaskBankItem(item: InsertTaskBankItem): Promise<typeof taskBankItems.$inferSelect>;
  deleteTaskBankItem(id: number, userId: string): Promise<void>;

  getDailyReason(userId: string, date: string): Promise<(typeof dailyReasons.$inferSelect) | undefined>;
  upsertDailyReason(reason: InsertDailyReason): Promise<typeof dailyReasons.$inferSelect>;

  getNotes(userId: string): Promise<(typeof notes.$inferSelect)[]>;
  getNote(id: number, userId: string): Promise<(typeof notes.$inferSelect) | undefined>;
  createNote(note: InsertNote): Promise<typeof notes.$inferSelect>;
  updateNote(id: number, userId: string, updates: Partial<InsertNote>): Promise<typeof notes.$inferSelect>;
  deleteNote(id: number, userId: string): Promise<void>;

  getUserLevel(userId: string): Promise<(typeof userLevels.$inferSelect) | undefined>;
  getAllUserLevels(): Promise<(typeof userLevels.$inferSelect)[]>;

  getGroupMessages(level: string): Promise<(typeof groupMessages.$inferSelect)[]>;
  createGroupMessage(msg: InsertGroupMessage): Promise<typeof groupMessages.$inferSelect>;
  deleteGroupMessage(id: number): Promise<void>;

  getAdminInbox(): Promise<(typeof adminInbox.$inferSelect)[]>;
  createAdminInboxMessage(msg: InsertAdminInbox): Promise<typeof adminInbox.$inferSelect>;
  updateAdminInboxStatus(id: number, status: string): Promise<typeof adminInbox.$inferSelect>;

  getMonthlyEvaluations(userId: string): Promise<(typeof monthlyEvaluations.$inferSelect)[]>;

  getJournalEntry(userId: string, date: string): Promise<(typeof journalEntries.$inferSelect) | undefined>;
  getJournalEntriesByMonth(userId: string, yearMonth: string): Promise<(typeof journalEntries.$inferSelect)[]>;
  getJournalEntriesByYear(userId: string, year: number): Promise<(typeof journalEntries.$inferSelect)[]>;
  upsertJournalEntry(entry: InsertJournalEntry): Promise<typeof journalEntries.$inferSelect>;
  deleteJournalEntry(id: number, userId: string): Promise<void>;

  getCustomDayTypes(userId: string): Promise<(typeof customDayTypes.$inferSelect)[]>;
  createCustomDayType(dt: InsertCustomDayType): Promise<typeof customDayTypes.$inferSelect>;
  deleteCustomDayType(id: number, userId: string): Promise<void>;

  getDayTypeUsage(userId: string): Promise<(typeof dayTypeUsage.$inferSelect)[]>;
  incrementDayTypeUsage(userId: string, dayTypeName: string): Promise<void>;

  getUserStreak(userId: string): Promise<(typeof userStreaks.$inferSelect) | undefined>;
  upsertUserStreak(userId: string, data: { currentStreak: number; longestStreak: number; totalStreakDays: number; lastStreakUpdateDate: string }): Promise<typeof userStreaks.$inferSelect>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string) { return authStorage.getUser(id); }
  async upsertUser(user: any) { return authStorage.upsertUser(user); }

  async getYearlyGoals(userId: string, year?: number) {
    if (year) {
      return await db.select().from(yearlyGoals).where(and(eq(yearlyGoals.userId, userId), eq(yearlyGoals.year, year))).orderBy(asc(yearlyGoals.id));
    }
    return await db.select().from(yearlyGoals).where(eq(yearlyGoals.userId, userId)).orderBy(asc(yearlyGoals.id));
  }
  async createYearlyGoal(goal: InsertYearlyGoal) {
    const [created] = await db.insert(yearlyGoals).values(goal).returning();
    return created;
  }
  async updateYearlyGoal(id: number, updates: Partial<InsertYearlyGoal>) {
    const [updated] = await db.update(yearlyGoals).set(updates).where(eq(yearlyGoals.id, id)).returning();
    return updated;
  }
  async deleteYearlyGoal(id: number) {
    await db.delete(yearlyGoals).where(eq(yearlyGoals.id, id));
  }

  async getMonthlyOverviewGoals(userId: string, year?: number) {
    if (year) {
      return await db.select().from(monthlyOverviewGoals).where(and(eq(monthlyOverviewGoals.userId, userId), eq(monthlyOverviewGoals.year, year))).orderBy(asc(monthlyOverviewGoals.month));
    }
    return await db.select().from(monthlyOverviewGoals).where(eq(monthlyOverviewGoals.userId, userId)).orderBy(asc(monthlyOverviewGoals.month));
  }
  async upsertMonthlyOverviewGoal(goal: InsertMonthlyOverviewGoal) {
    const existing = await db.select().from(monthlyOverviewGoals).where(
      and(eq(monthlyOverviewGoals.userId, goal.userId), eq(monthlyOverviewGoals.year, goal.year), eq(monthlyOverviewGoals.month, goal.month))
    );
    if (existing.length > 0) {
      const updates: Record<string, any> = {};
      if (goal.mainGoal !== undefined) updates.mainGoal = goal.mainGoal;
      if (goal.rating !== undefined) updates.rating = goal.rating;
      if (goal.description !== undefined) updates.description = goal.description;
      const [updated] = await db.update(monthlyOverviewGoals).set(updates).where(eq(monthlyOverviewGoals.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(monthlyOverviewGoals).values(goal).returning();
    return created;
  }

  async getMonthlyDynamicGoals(userId: string, year?: number, month?: number) {
    const conditions = [eq(monthlyDynamicGoals.userId, userId)];
    if (year) conditions.push(eq(monthlyDynamicGoals.year, year));
    if (month) conditions.push(eq(monthlyDynamicGoals.month, month));
    return await db.select().from(monthlyDynamicGoals).where(and(...conditions)).orderBy(asc(monthlyDynamicGoals.id));
  }
  async createMonthlyDynamicGoal(goal: InsertMonthlyDynamicGoal) {
    const [created] = await db.insert(monthlyDynamicGoals).values(goal).returning();
    return created;
  }
  async updateMonthlyDynamicGoal(id: number, updates: Partial<InsertMonthlyDynamicGoal>) {
    const [updated] = await db.update(monthlyDynamicGoals).set(updates).where(eq(monthlyDynamicGoals.id, id)).returning();
    return updated;
  }
  async deleteMonthlyDynamicGoal(id: number) {
    await db.delete(monthlyDynamicGoals).where(eq(monthlyDynamicGoals.id, id));
  }

  async getTasks(userId: string, date?: string) {
    if (date) {
      return await db.select().from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.date, date))).orderBy(asc(tasks.id));
    }
    return await db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(asc(tasks.id));
  }
  async getTasksByMonth(userId: string, month: string) {
    return await db.select().from(tasks).where(and(eq(tasks.userId, userId), like(tasks.date, `${month}%`))).orderBy(asc(tasks.date), asc(tasks.id));
  }
  async getTasksByYear(userId: string, year: number) {
    return await db.select().from(tasks).where(and(eq(tasks.userId, userId), like(tasks.date, `${year}-%`))).orderBy(asc(tasks.date), asc(tasks.id));
  }
  async createTask(task: InsertTask) {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }
  async updateTask(id: number, updates: Partial<InsertTask>) {
    const [updated] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    return updated;
  }
  async deleteTask(id: number) {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getGoodHabits(userId: string) {
    return await db.select().from(goodHabits).where(eq(goodHabits.userId, userId));
  }
  async createGoodHabit(habit: InsertGoodHabit) {
    const [created] = await db.insert(goodHabits).values(habit).returning();
    return created;
  }
  async updateGoodHabit(id: number, name: string) {
    const [updated] = await db.update(goodHabits).set({ name }).where(eq(goodHabits.id, id)).returning();
    return updated;
  }
  async deleteGoodHabit(id: number) {
    await db.delete(goodHabitEntries).where(eq(goodHabitEntries.habitId, id));
    await db.delete(goodHabits).where(eq(goodHabits.id, id));
  }
  async getGoodHabitEntries(habitIds: number[], month?: string) {
    if (habitIds.length === 0) return [];
    const all = await db.select().from(goodHabitEntries);
    let filtered = all.filter(e => habitIds.includes(e.habitId));
    if (month) filtered = filtered.filter(e => e.date.startsWith(month));
    return filtered;
  }
  async upsertGoodHabitEntry(entry: InsertGoodHabitEntry) {
    const existing = await db.select().from(goodHabitEntries).where(and(eq(goodHabitEntries.habitId, entry.habitId), eq(goodHabitEntries.date, entry.date)));
    if (existing.length > 0) {
      const [updated] = await db.update(goodHabitEntries).set({ completed: entry.completed }).where(eq(goodHabitEntries.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(goodHabitEntries).values(entry).returning();
    return created;
  }

  async getBadHabits(userId: string) {
    return await db.select().from(badHabits).where(eq(badHabits.userId, userId));
  }
  async createBadHabit(habit: InsertBadHabit) {
    const [created] = await db.insert(badHabits).values(habit).returning();
    return created;
  }
  async updateBadHabit(id: number, name: string) {
    const [updated] = await db.update(badHabits).set({ name }).where(eq(badHabits.id, id)).returning();
    return updated;
  }
  async deleteBadHabit(id: number) {
    await db.delete(badHabitEntries).where(eq(badHabitEntries.habitId, id));
    await db.delete(badHabits).where(eq(badHabits.id, id));
  }
  async getBadHabitEntries(habitIds: number[], month?: string) {
    if (habitIds.length === 0) return [];
    const all = await db.select().from(badHabitEntries);
    let filtered = all.filter(e => habitIds.includes(e.habitId));
    if (month) filtered = filtered.filter(e => e.date.startsWith(month));
    return filtered;
  }
  async upsertBadHabitEntry(entry: InsertBadHabitEntry) {
    const existing = await db.select().from(badHabitEntries).where(and(eq(badHabitEntries.habitId, entry.habitId), eq(badHabitEntries.date, entry.date)));
    if (existing.length > 0) {
      const [updated] = await db.update(badHabitEntries).set({ occurred: entry.occurred }).where(eq(badHabitEntries.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(badHabitEntries).values(entry).returning();
    return created;
  }

  async getHourlyEntries(userId: string, date?: string) {
    if (date) {
      return await db.select().from(hourlyEntries).where(and(eq(hourlyEntries.userId, userId), eq(hourlyEntries.date, date)));
    }
    return await db.select().from(hourlyEntries).where(eq(hourlyEntries.userId, userId));
  }
  async getHourlyEntriesByMonth(userId: string, month: string) {
    return await db.select().from(hourlyEntries).where(and(eq(hourlyEntries.userId, userId), like(hourlyEntries.date, `${month}%`))).orderBy(asc(hourlyEntries.date));
  }
  async upsertHourlyEntry(entry: InsertHourlyEntry) {
    const existing = await db.select().from(hourlyEntries).where(and(eq(hourlyEntries.userId, entry.userId), eq(hourlyEntries.date, entry.date), eq(hourlyEntries.hour, entry.hour)));
    if (existing.length > 0) {
      const [updated] = await db.update(hourlyEntries).set({ taskDescription: entry.taskDescription, productivityScore: entry.productivityScore }).where(eq(hourlyEntries.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(hourlyEntries).values(entry).returning();
    return created;
  }

  async createPayment(payment: InsertPayment) {
    const [created] = await db.insert(payments).values(payment).returning();
    return created;
  }

  async getTaskBankItems(userId: string) {
    return await db.select().from(taskBankItems).where(eq(taskBankItems.userId, userId)).orderBy(asc(taskBankItems.id));
  }
  async createTaskBankItem(item: InsertTaskBankItem) {
    const [created] = await db.insert(taskBankItems).values(item).returning();
    return created;
  }
  async deleteTaskBankItem(id: number, userId: string) {
    await db.delete(taskBankItems).where(and(eq(taskBankItems.id, id), eq(taskBankItems.userId, userId)));
  }

  async getDailyReason(userId: string, date: string) {
    const [reason] = await db.select().from(dailyReasons).where(and(eq(dailyReasons.userId, userId), eq(dailyReasons.date, date)));
    return reason;
  }
  async upsertDailyReason(reason: InsertDailyReason) {
    const existing = await db.select().from(dailyReasons).where(and(eq(dailyReasons.userId, reason.userId), eq(dailyReasons.date, reason.date)));
    if (existing.length > 0) {
      const [updated] = await db.update(dailyReasons).set({ reason: reason.reason }).where(eq(dailyReasons.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(dailyReasons).values(reason).returning();
    return created;
  }
  async getNotes(userId: string) {
    return await db.select().from(notes).where(eq(notes.userId, userId)).orderBy(asc(notes.id));
  }
  async getNote(id: number, userId: string) {
    const [note] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
    return note;
  }
  async createNote(note: InsertNote) {
    const [created] = await db.insert(notes).values(note).returning();
    return created;
  }
  async updateNote(id: number, userId: string, updates: Partial<InsertNote>) {
    const [updated] = await db.update(notes).set({ ...updates, updatedAt: new Date() }).where(and(eq(notes.id, id), eq(notes.userId, userId))).returning();
    return updated;
  }
  async deleteNote(id: number, userId: string) {
    await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
  }

  async getUserLevel(userId: string) {
    const [level] = await db.select().from(userLevels).where(eq(userLevels.userId, userId));
    return level;
  }
  async getAllUserLevels() {
    return await db.select().from(userLevels).orderBy(asc(userLevels.userId));
  }

  async getGroupMessages(level: string) {
    return await db.select().from(groupMessages).where(eq(groupMessages.level, level)).orderBy(desc(groupMessages.createdAt));
  }
  async createGroupMessage(msg: InsertGroupMessage) {
    const [created] = await db.insert(groupMessages).values(msg).returning();
    return created;
  }
  async deleteGroupMessage(id: number) {
    await db.delete(groupMessages).where(eq(groupMessages.id, id));
  }

  async getAdminInbox() {
    return await db.select().from(adminInbox).orderBy(desc(adminInbox.createdAt));
  }
  async createAdminInboxMessage(msg: InsertAdminInbox) {
    const [created] = await db.insert(adminInbox).values(msg).returning();
    return created;
  }
  async updateAdminInboxStatus(id: number, status: string) {
    const [updated] = await db.update(adminInbox).set({ status }).where(eq(adminInbox.id, id)).returning();
    return updated;
  }

  async getMonthlyEvaluations(userId: string) {
    return await db.select().from(monthlyEvaluations).where(eq(monthlyEvaluations.userId, userId)).orderBy(desc(monthlyEvaluations.month));
  }

  async getJournalEntry(userId: string, date: string) {
    const [entry] = await db.select().from(journalEntries).where(and(eq(journalEntries.userId, userId), eq(journalEntries.date, date)));
    return entry;
  }
  async getJournalEntriesByMonth(userId: string, yearMonth: string) {
    return await db.select().from(journalEntries).where(and(eq(journalEntries.userId, userId), like(journalEntries.date, `${yearMonth}%`))).orderBy(asc(journalEntries.date));
  }
  async getJournalEntriesByYear(userId: string, year: number) {
    return await db.select().from(journalEntries).where(and(eq(journalEntries.userId, userId), like(journalEntries.date, `${year}-%`))).orderBy(asc(journalEntries.date));
  }
  async upsertJournalEntry(entry: InsertJournalEntry) {
    const existing = await db.select().from(journalEntries).where(and(eq(journalEntries.userId, entry.userId), eq(journalEntries.date, entry.date)));
    if (existing.length > 0) {
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (entry.dayTypeId !== undefined) updates.dayTypeId = entry.dayTypeId;
      if (entry.customDayName !== undefined) updates.customDayName = entry.customDayName;
      if (entry.emoji !== undefined) updates.emoji = entry.emoji;
      if (entry.journalText !== undefined) updates.journalText = entry.journalText;
      if (entry.imageUrls !== undefined) updates.imageUrls = entry.imageUrls;
      if (entry.extractedText !== undefined) updates.extractedText = entry.extractedText;
      const [updated] = await db.update(journalEntries).set(updates).where(eq(journalEntries.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(journalEntries).values(entry).returning();
    return created;
  }
  async deleteJournalEntry(id: number, userId: string) {
    await db.delete(journalEntries).where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)));
  }

  async getCustomDayTypes(userId: string) {
    return await db.select().from(customDayTypes).where(eq(customDayTypes.userId, userId)).orderBy(asc(customDayTypes.id));
  }
  async createCustomDayType(dt: InsertCustomDayType) {
    const [created] = await db.insert(customDayTypes).values(dt).returning();
    return created;
  }
  async deleteCustomDayType(id: number, userId: string) {
    await db.delete(customDayTypes).where(and(eq(customDayTypes.id, id), eq(customDayTypes.userId, userId)));
  }

  async getDayTypeUsage(userId: string) {
    return await db.select().from(dayTypeUsage).where(eq(dayTypeUsage.userId, userId)).orderBy(desc(dayTypeUsage.usageCount));
  }
  async incrementDayTypeUsage(userId: string, dayTypeName: string) {
    const existing = await db.select().from(dayTypeUsage).where(and(eq(dayTypeUsage.userId, userId), eq(dayTypeUsage.dayTypeName, dayTypeName)));
    if (existing.length > 0) {
      await db.update(dayTypeUsage).set({ usageCount: existing[0].usageCount + 1, lastUsed: new Date() }).where(eq(dayTypeUsage.id, existing[0].id));
    } else {
      await db.insert(dayTypeUsage).values({ userId, dayTypeName, usageCount: 1, lastUsed: new Date() });
    }
  }

  async getUserStreak(userId: string) {
    const [streak] = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId));
    return streak;
  }
  async upsertUserStreak(userId: string, data: { currentStreak: number; longestStreak: number; totalStreakDays: number; lastStreakUpdateDate: string }) {
    const existing = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId));
    if (existing.length > 0) {
      const [updated] = await db.update(userStreaks).set(data).where(eq(userStreaks.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(userStreaks).values({ userId, ...data }).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
