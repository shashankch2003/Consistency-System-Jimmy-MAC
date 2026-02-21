import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
export * from "./models/auth";

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  razorpayPaymentId: text("razorpay_payment_id"),
  amount: integer("amount").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// TABLE 1 & 2: Yearly and Monthly Overview Goals
export const yearlyGoals = pgTable("yearly_goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  year: integer("year").notNull(),
  goalName: text("goal_name").notNull(),
  description: text("description"),
  rating: integer("rating").default(0), // 0-10
  createdAt: timestamp("created_at").defaultNow(),
});

export const monthlyOverviewGoals = pgTable("monthly_overview_goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  mainGoal: text("main_goal").notNull(),
  description: text("description"),
  rating: integer("rating").default(0), // 0-10
  createdAt: timestamp("created_at").defaultNow(),
});

// TABLE 3: Dynamic Current Month Goals
export const monthlyDynamicGoals = pgTable("monthly_dynamic_goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  title: text("title").notNull(),
  description: text("description"),
  rating: integer("rating").default(0), // 0-10
  status: text("status").default("Not Started"), // Not Started / In Progress / Completed
  createdAt: timestamp("created_at").defaultNow(),
});

// Legacy goals table (to be removed from UI but kept in schema for safety if needed, 
// though user asked to "remove the first section", we'll migrate to new tables)
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: text("target_date"),
  progressPercentage: integer("progress_percentage").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  title: text("title").notNull(),
  completionPercentage: integer("completion_percentage").default(0),
});

export const goodHabits = pgTable("good_habits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
});

export const goodHabitEntries = pgTable("good_habit_entries", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  completed: boolean("completed").default(false),
});

export const badHabits = pgTable("bad_habits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  monthlyLimit: integer("monthly_limit"),
});

export const badHabitEntries = pgTable("bad_habit_entries", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  occurred: boolean("occurred").default(false),
});

export const hourlyEntries = pgTable("hourly_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  hour: integer("hour").notNull(),
  taskDescription: text("task_description").notNull(),
  productivityScore: integer("productivity_score").notNull(),
});

export const dailyReasons = pgTable("daily_reasons", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: text("date").notNull(),
  reason: text("reason").notNull(),
});

export const taskBankItems = pgTable("task_bank_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertYearlyGoalSchema = createInsertSchema(yearlyGoals).omit({ id: true, createdAt: true });
export const insertMonthlyOverviewGoalSchema = createInsertSchema(monthlyOverviewGoals).omit({ id: true, createdAt: true });
export const insertMonthlyDynamicGoalSchema = createInsertSchema(monthlyDynamicGoals).omit({ id: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const insertGoodHabitSchema = createInsertSchema(goodHabits).omit({ id: true });
export const insertGoodHabitEntrySchema = createInsertSchema(goodHabitEntries).omit({ id: true });
export const insertBadHabitSchema = createInsertSchema(badHabits).omit({ id: true });
export const insertBadHabitEntrySchema = createInsertSchema(badHabitEntries).omit({ id: true });
export const insertHourlyEntrySchema = createInsertSchema(hourlyEntries).omit({ id: true });
export const insertDailyReasonSchema = createInsertSchema(dailyReasons).omit({ id: true });
export const insertTaskBankItemSchema = createInsertSchema(taskBankItems).omit({ id: true, createdAt: true });
