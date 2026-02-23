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
  description: text("description"),
  completionPercentage: integer("completion_percentage").default(0),
  time: text("time"), // optional HH:MM
  priority: text("priority").default("Normal"), // Very Important, Important, Normal
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

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  parentId: integer("parent_id"),
  title: text("title").notNull().default("Untitled"),
  content: text("content").default(""),
  icon: text("icon").default("📄"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const LEVELS = ["Unproductive", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Elite"] as const;
export type Level = typeof LEVELS[number];

export const LEVEL_INDEX: Record<string, number> = {
  Unproductive: 0, Bronze: 1, Silver: 2, Gold: 3, Platinum: 4, Diamond: 5, Elite: 6,
};

export const LEVEL_REQUIREMENTS: Record<string, { percent: number; days: number; consecutiveMonths: number }> = {
  Unproductive: { percent: 0, days: 0, consecutiveMonths: 0 },
  Bronze: { percent: 60, days: 25, consecutiveMonths: 1 },
  Silver: { percent: 70, days: 25, consecutiveMonths: 2 },
  Gold: { percent: 80, days: 25, consecutiveMonths: 2 },
  Platinum: { percent: 90, days: 25, consecutiveMonths: 2 },
  Diamond: { percent: 90, days: 26, consecutiveMonths: 3 },
  Elite: { percent: 95, days: 0, consecutiveMonths: 3 },
};

export const INTERACTIVE_LEVELS = ["Platinum", "Diamond", "Elite"];

export const userLevels = pgTable("user_levels", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  level: text("level").notNull().default("Unproductive"),
  consecutiveMonths: integer("consecutive_months").notNull().default(0),
  lastEvaluatedMonth: text("last_evaluated_month"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const monthlyEvaluations = pgTable("monthly_evaluations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  month: text("month").notNull(),
  qualifyingDays: integer("qualifying_days").notNull().default(0),
  highestQualifiedLevel: text("highest_qualified_level").notNull().default("Unproductive"),
  avgTaskCompletion: integer("avg_task_completion").default(0),
  avgGoodHabits: integer("avg_good_habits").default(0),
  avgHourlyCompletion: integer("avg_hourly_completion").default(0),
  badHabitDays: integer("bad_habit_days").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupMessages = pgTable("group_messages", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(),
  content: text("content").notNull(),
  createdBy: varchar("created_by").notNull(),
  senderName: varchar("sender_name"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminInbox = pgTable("admin_inbox", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserLevelSchema = createInsertSchema(userLevels).omit({ id: true, updatedAt: true });
export const insertMonthlyEvaluationSchema = createInsertSchema(monthlyEvaluations).omit({ id: true, createdAt: true });
export const insertGroupMessageSchema = createInsertSchema(groupMessages).omit({ id: true, createdAt: true });
export const insertAdminInboxSchema = createInsertSchema(adminInbox).omit({ id: true, createdAt: true, status: true });

// Journaling System
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  dayTypeId: integer("day_type_id"),
  customDayName: text("custom_day_name"),
  emoji: text("emoji"),
  journalText: text("journal_text").default(""),
  imageUrls: text("image_urls").array().default([]),
  extractedText: text("extracted_text"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const DAY_TYPE_CATEGORIES = [
  "Focus & Productivity",
  "Positive & Stable",
  "Business & Learning",
  "Peak Positive",
  "Neutral / Mixed",
  "Negative",
] as const;

export const DEFAULT_DAY_TYPES: { name: string; emoji: string; category: string }[] = [
  // Focus & Productivity
  { name: "Deep Focus Day", emoji: "🎯", category: "Focus & Productivity" },
  { name: "High Productivity Day", emoji: "🚀", category: "Focus & Productivity" },
  { name: "Disciplined Execution Day", emoji: "⚡", category: "Focus & Productivity" },
  { name: "Very Focused Day", emoji: "🔬", category: "Focus & Productivity" },
  { name: "Slightly Distracted Day", emoji: "😐", category: "Focus & Productivity" },
  { name: "Unfocused / Scattered Day", emoji: "🌀", category: "Focus & Productivity" },
  // Positive & Stable
  { name: "Happy Day", emoji: "😊", category: "Positive & Stable" },
  { name: "Peaceful Day", emoji: "🕊️", category: "Positive & Stable" },
  { name: "Productive Day", emoji: "✅", category: "Positive & Stable" },
  { name: "Motivated Day", emoji: "💪", category: "Positive & Stable" },
  { name: "Connected Day", emoji: "🤝", category: "Positive & Stable" },
  { name: "Grateful Day", emoji: "🙏", category: "Positive & Stable" },
  // Business & Learning
  { name: "Massive Learning Day", emoji: "📚", category: "Business & Learning" },
  { name: "Strategic Thinking Day", emoji: "🧠", category: "Business & Learning" },
  { name: "Skill-Building Day", emoji: "🛠️", category: "Business & Learning" },
  { name: "Breakthrough Business Day", emoji: "💡", category: "Business & Learning" },
  { name: "Slow Progress Day", emoji: "🐢", category: "Business & Learning" },
  { name: "Stagnant Business Day", emoji: "📉", category: "Business & Learning" },
  // Peak Positive
  { name: "Best Ever Day", emoji: "🏆", category: "Peak Positive" },
  { name: "Life Achievement Day", emoji: "🎖️", category: "Peak Positive" },
  { name: "Dream Come True Day", emoji: "🌟", category: "Peak Positive" },
  { name: "Very Happy Day", emoji: "😄", category: "Peak Positive" },
  { name: "Unforgettable Day", emoji: "💎", category: "Peak Positive" },
  { name: "Special Day", emoji: "✨", category: "Peak Positive" },
  { name: "Proud of Myself Day", emoji: "😎", category: "Peak Positive" },
  { name: "Victory Day", emoji: "🏅", category: "Peak Positive" },
  // Neutral / Mixed
  { name: "Normal Day", emoji: "😶", category: "Neutral / Mixed" },
  { name: "Confusing Day", emoji: "🤔", category: "Neutral / Mixed" },
  { name: "Overthinking Day", emoji: "🧐", category: "Neutral / Mixed" },
  { name: "Tiring Day", emoji: "😩", category: "Neutral / Mixed" },
  // Negative
  { name: "Sad Day", emoji: "😢", category: "Negative" },
  { name: "Very Sad Day", emoji: "😭", category: "Negative" },
  { name: "Regretful Day", emoji: "😞", category: "Negative" },
  { name: "Worst Day", emoji: "💔", category: "Negative" },
  { name: "Emotionally Drained Day", emoji: "😵", category: "Negative" },
];

export const customDayTypes = pgTable("custom_day_types", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("📝"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dayTypeUsage = pgTable("day_type_usage", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  dayTypeName: text("day_type_name").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  lastUsed: timestamp("last_used").defaultNow(),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomDayTypeSchema = createInsertSchema(customDayTypes).omit({ id: true, createdAt: true });
export const insertDayTypeUsageSchema = createInsertSchema(dayTypeUsage).omit({ id: true });

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
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, createdAt: true, updatedAt: true });
