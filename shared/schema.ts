import { pgTable, text, serial, integer, boolean, timestamp, varchar, uuid, jsonb, numeric, date, uniqueIndex, index, pgEnum, real } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
export * from "./models/auth";
export * from "./models/chat";

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
  priority: text("priority").default("Medium"), // ASAP, High, Medium, Low, custom
  status: text("status").default("To Do"), // "To Do" | "In Progress" | "Done"
  duration: text("duration"), // "15 min" | "30 min" | "1 hr" | ...
  customDuration: text("custom_duration"),
  schedule: jsonb("schedule"), // { preset, startTime, endTime, preferredStartTime }
  notificationSettings: jsonb("notification_settings"),
  repeatSettings: jsonb("repeat_settings"),
  flagged: boolean("flagged").default(false),
  reviewLater: boolean("review_later").default(false),
  assignedTo: text("assigned_to"),
  executionScore: integer("execution_score"),
  customFields: jsonb("custom_fields"),
  boardColumn: text("board_column").default("To Do"),
});

export const userSchedules = pgTable("user_schedules", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  emoji: text("emoji").default("⏰"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  preferredStartTime: text("preferred_start_time"),
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
  sessionType: text("session_type").default("other"), // deep_focus | meeting | shallow_work | learning | break | daily_task | other
  startTime: text("start_time"), // HH:MM e.g. "09:15"
  endTime: text("end_time"),     // HH:MM e.g. "09:45"
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
  description: text("description"),
  priority: text("priority"),
  tags: text("tags").array(),
  status: text("status").default("Not started"),
  dueDate: text("due_date"),
  dueTime: text("due_time"),
  workingOn: text("working_on"),
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

export const dayTypeEmojiOverrides = pgTable("day_type_emoji_overrides", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  dayTypeName: text("day_type_name").notNull(),
  emoji: text("emoji").notNull(),
});

export const dayTypeUsage = pgTable("day_type_usage", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  dayTypeName: text("day_type_name").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  lastUsed: timestamp("last_used").defaultNow(),
});

// Streaks
export const userStreaks = pgTable("user_streaks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  totalStreakDays: integer("total_streak_days").notNull().default(0),
  lastStreakUpdateDate: text("last_streak_update_date"),
});

// Successful Fundamentals
export const successfulFundamentals = pgTable("successful_fundamentals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  fundamentalKey: text("fundamental_key").notNull(),
  customTitle: text("custom_title"),
  content: text("content"),
  completed: boolean("completed").notNull().default(false),
  sortOrder: integer("sort_order"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSuccessfulFundamentalSchema = createInsertSchema(successfulFundamentals).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSuccessfulFundamental = z.infer<typeof insertSuccessfulFundamentalSchema>;
export type SuccessfulFundamental = typeof successfulFundamentals.$inferSelect;

export const FUNDAMENTALS_LIST = [
  { key: "what-is-your-why", title: "What Is Your Why?", description: "Clearly define the emotional and logical reason behind your ambition. This should be strong enough to push you during difficult times." },
  { key: "problem-you-are-solving", title: "Problem You Are Solving", description: "What real-world problem are you addressing? Be specific about the pain point you're solving for your audience." },
  { key: "your-usp", title: "Your USP", description: "What makes you different from everyone else? Define your unique selling proposition that sets you apart." },
  { key: "target-audience", title: "Target Audience", description: "Who are you serving? Define your ideal customer or audience with clarity and specificity." },
  { key: "long-term-vision", title: "Long-Term Vision", description: "Where do you see yourself and your work in the next 10–20 years? Paint the big picture." },
  { key: "goals", title: "Goals", description: "Write down your goals for different timeframes — 1 year, 2 years, 5 years, 10 years. Be clear and measurable." },
  { key: "year-execution-plan", title: "Year - Year Execution Plan", description: "Break down your vision into yearly execution milestones. What will you accomplish each year?" },
  { key: "daily-non-negotiables", title: "Daily Non-Negotiables", description: "What are the 3–5 things you must do every single day no matter what? These are your foundational habits." },
  { key: "fixed-routine", title: "Fixed Routine", description: "Design your ideal daily schedule. What does your productive day look like from morning to night?" },
  { key: "skill-stack", title: "Skill Stack", description: "List the key skills you need to develop and master to achieve your goals. Prioritize them." },
  { key: "core-strengths", title: "Core Strengths", description: "Identify your natural abilities and strengths. How can you leverage them more effectively?" },
  { key: "weaknesses-blind-spots", title: "Weaknesses & Blind Spots", description: "Be honest about your weaknesses and areas where you lack awareness. How will you address them?" },
  { key: "value-creation-model", title: "Value Creation Model", description: "How do you create and deliver value to others? Map out your value chain." },
  { key: "revenue-model", title: "Revenue Model", description: "How does your work generate income? Define your revenue streams and pricing strategy." },
  { key: "cost-structure-awareness", title: "Cost Structure Awareness", description: "Understand all your costs — time, money, energy. Where are you spending resources?" },
  { key: "personal-brand-positioning", title: "Personal Brand Positioning", description: "How do you want to be perceived? Define your personal brand identity and messaging." },
  { key: "competitive-advantage", title: "Competitive Advantage", description: "What gives you an edge over competitors? Identify your sustainable competitive advantages." },
  { key: "network-relationships-strategy", title: "Network & Relationships Strategy", description: "Plan how you'll build and maintain valuable professional and personal relationships." },
  { key: "learning-system", title: "Learning System", description: "How do you learn and grow? Design a system for continuous learning and skill development." },
  { key: "decision-making-framework", title: "Decision-Making Framework", description: "What framework do you use to make important decisions? Define your decision criteria." },
  { key: "risk-tolerance-strategy", title: "Risk Tolerance Strategy", description: "How much risk can you handle? Define your approach to taking calculated risks." },
  { key: "discipline-system", title: "Discipline System", description: "What systems keep you disciplined? Design accountability mechanisms and rules." },
  { key: "energy-management-plan", title: "Energy Management Plan", description: "How do you manage your physical and mental energy throughout the day and week?" },
  { key: "time-allocation-system", title: "Time Allocation System", description: "How do you allocate your time across different priorities? Design your time management approach." },
  { key: "focus-strategy", title: "Focus Strategy", description: "How do you maintain deep focus? Define your strategies for eliminating distractions." },
  { key: "feedback-system", title: "Feedback System", description: "How do you collect and act on feedback? Create a system for continuous improvement." },
  { key: "execution-system", title: "Execution System", description: "How do you turn plans into action? Design your workflow for consistent execution." },
  { key: "habit-architecture", title: "Habit Architecture", description: "Design the habit stack that supports your goals. What habits will you build and how?" },
  { key: "environment-design", title: "Environment Design", description: "How is your physical and digital environment set up to support your success?" },
  { key: "financial-discipline-plan", title: "Financial Discipline Plan", description: "How do you manage money? Define your saving, investing, and spending rules." },
  { key: "failure-recovery-strategy", title: "Failure Recovery Strategy", description: "How do you bounce back from failures and setbacks? Design your recovery process." },
  { key: "long-term-legacy-vision", title: "Long-Term Legacy Vision", description: "What legacy do you want to leave behind? Think beyond your lifetime." },
] as const;

// User Settings
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),

  // Appearance
  themeMode: text("theme_mode").notNull().default("dark"), // "dark" | "light" | "system"

  // Productivity Tracking
  hourlyTrackingEnabled: boolean("hourly_tracking_enabled").notNull().default(true),
  autoLockTime: text("auto_lock_time").notNull().default("00:00"), // HH:MM format
  goodHabitStrictMode: boolean("good_habit_strict_mode").notNull().default(false),
  badHabitStrictZero: boolean("bad_habit_strict_zero").notNull().default(false),

  // Level & Progress
  performanceDisplayMode: text("performance_display_mode").notNull().default("percentages"), // "percentages" | "points" | "minimal"
  levelDowngradeWarning: boolean("level_downgrade_warning").notNull().default(true),
  resetConfirmation: boolean("reset_confirmation").notNull().default(true),

  // Group Settings
  groupNotifications: text("group_notifications").notNull().default("all"), // "all" | "admin_only" | "mentions" | "off"
  showLevelPublicly: boolean("show_level_publicly").notNull().default(true),
  showMonthlyScore: boolean("show_monthly_score").notNull().default(true),
  showStreakPublicly: boolean("show_streak_publicly").notNull().default(true),
  allowDirectMessages: boolean("allow_direct_messages").notNull().default(true),
  showOnlineStatus: boolean("show_online_status").notNull().default(true),

  // Notifications
  dailyReminder: boolean("daily_reminder").notNull().default(true),
  dailyReminderTime: text("daily_reminder_time").notNull().default("21:00"),
  weeklyPerformanceSummary: boolean("weekly_performance_summary").notNull().default(true),
  monthlyLevelNotification: boolean("monthly_level_notification").notNull().default(true),
  streakBreakAlert: boolean("streak_break_alert").notNull().default(true),
  groupAchievementAlerts: boolean("group_achievement_alerts").notNull().default(true),

  // Gamification
  motivationMode: text("motivation_mode").notNull().default("competitive"), // "competitive" | "private"
  streakVisibility: text("streak_visibility").notNull().default("public"), // "public" | "private"

  // Data & Privacy
  dataExportFormat: text("data_export_format").notNull().default("csv"), // "csv" | "json"

  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({ id: true, updatedAt: true });
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

// ===== MONEY TRACKING TABLES =====

export const DEFAULT_EXPENSE_CATEGORIES = [
  { key: "food-dining", name: "Food & Dining", emoji: "🍔", color: "#FF6B6B" },
  { key: "groceries", name: "Groceries", emoji: "🛒", color: "#4ECDC4" },
  { key: "transportation", name: "Transportation", emoji: "🚗", color: "#45B7D1" },
  { key: "housing-rent", name: "Housing & Rent", emoji: "🏠", color: "#96CEB4" },
  { key: "utilities", name: "Utilities", emoji: "💡", color: "#FFEAA7" },
  { key: "mobile-internet", name: "Mobile & Internet", emoji: "📱", color: "#DDA0DD" },
  { key: "healthcare", name: "Healthcare", emoji: "🏥", color: "#FF7675" },
  { key: "pharmacy", name: "Pharmacy", emoji: "💊", color: "#E17055" },
  { key: "shopping", name: "Shopping", emoji: "👗", color: "#A29BFE" },
  { key: "entertainment", name: "Entertainment", emoji: "🎬", color: "#FD79A8" },
  { key: "education", name: "Education", emoji: "🎓", color: "#6C5CE7" },
  { key: "travel", name: "Travel", emoji: "✈️", color: "#00B894" },
  { key: "business", name: "Business", emoji: "💼", color: "#636E72" },
  { key: "pets", name: "Pets", emoji: "🐾", color: "#FDCB6E" },
  { key: "family", name: "Family", emoji: "👶", color: "#E84393" },
  { key: "gifts-donations", name: "Gifts & Donations", emoji: "🎁", color: "#D63031" },
  { key: "savings", name: "Savings", emoji: "💰", color: "#00B894" },
  { key: "credit-card-payment", name: "Credit Card Payment", emoji: "💳", color: "#0984E3" },
  { key: "subscriptions", name: "Subscriptions", emoji: "🔔", color: "#6C5CE7" },
  { key: "health-fitness", name: "Health & Fitness", emoji: "🏋️", color: "#00CEC9" },
  { key: "other", name: "Other", emoji: "📦", color: "#B2BEC3" },
] as const;

export const moneySettings = pgTable("money_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  currency: text("currency").notNull().default("INR"),
  currencySymbol: text("currency_symbol").notNull().default("₹"),
  monthlyIncome: integer("monthly_income").notNull().default(0),
  thousandsSeparator: text("thousands_separator").notNull().default(","),
  decimalPlaces: integer("decimal_places").notNull().default(0),
  symbolPosition: text("symbol_position").notNull().default("before"),
  rolloverBudget: boolean("rollover_budget").notNull().default(false),
  overallMonthlyBudget: integer("overall_monthly_budget").default(0),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  budgetAlerts: boolean("budget_alerts").notNull().default(true),
  billReminders: boolean("bill_reminders").notNull().default(true),
  subscriptionReminders: boolean("subscription_reminders").notNull().default(true),
  reminderDaysBefore: text("reminder_days_before").notNull().default("1,3,7"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("📦"),
  color: text("color").notNull().default("#B2BEC3"),
  sortOrder: integer("sort_order").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  amount: integer("amount").notNull(),
  date: text("date").notNull(),
  categoryKey: text("category_key").notNull(),
  merchant: text("merchant").notNull().default(""),
  paymentMethod: text("payment_method").notNull().default("cash"),
  creditCardId: integer("credit_card_id"),
  notes: text("notes").default(""),
  tags: text("tags").array().default([]),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringFrequency: text("recurring_frequency"),
  recurringEndDate: text("recurring_end_date"),
  foreignCurrency: text("foreign_currency"),
  foreignAmount: integer("foreign_amount"),
  exchangeRate: text("exchange_rate"),
  sourceType: text("source_type").default("manual"),
  sourceId: integer("source_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  categoryKey: text("category_key").notNull(),
  monthlyLimit: integer("monthly_limit").notNull().default(0),
  isEnabled: boolean("is_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  serviceName: text("service_name").notNull(),
  category: text("category").notNull().default("other"),
  amount: integer("amount").notNull(),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  nextDueDate: text("next_due_date").notNull(),
  autoRenews: boolean("auto_renews").notNull().default(true),
  paymentMethod: text("payment_method").default(""),
  notes: text("notes").default(""),
  icon: text("icon").default(""),
  status: text("status").notNull().default("active"),
  cancelledDate: text("cancelled_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
  amountMax: integer("amount_max"),
  dueDate: text("due_date").notNull(),
  frequency: text("frequency").notNull().default("monthly"),
  categoryKey: text("category_key").notNull().default("utilities"),
  paymentMethod: text("payment_method").default(""),
  autoPay: boolean("auto_pay").notNull().default(false),
  notes: text("notes").default(""),
  status: text("status").notNull().default("pending"),
  lastPaidDate: text("last_paid_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const creditCards = pgTable("credit_cards", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  nickname: text("nickname").notNull(),
  cardType: text("card_type").notNull().default("visa"),
  lastFourDigits: text("last_four_digits").notNull(),
  creditLimit: integer("credit_limit").notNull().default(0),
  statementDate: integer("statement_date").notNull().default(1),
  dueDate: integer("due_date").notNull().default(15),
  currentBalance: integer("current_balance").notNull().default(0),
  minimumDue: integer("minimum_due").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const savingsGoals = pgTable("savings_goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  targetAmount: integer("target_amount").notNull(),
  currentAmount: integer("current_amount").notNull().default(0),
  targetDate: text("target_date"),
  monthlyContribution: integer("monthly_contribution").default(0),
  icon: text("icon").default("🎯"),
  status: text("status").notNull().default("active"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Know More - Videos
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").default(""),
  category: text("category").notNull().default("general"),
  youtubeUrl: text("youtube_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: text("duration").default(""),
  videoProvider: text("video_provider").notNull().default("youtube"),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const videoFeedback = pgTable("video_feedback", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull(),
  userId: varchar("user_id").notNull(),
  feedbackType: text("feedback_type").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  adminReply: text("admin_reply"),
  adminRepliedAt: timestamp("admin_replied_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===== GROW TOGETHER TABLES =====

// Friends / Connections
export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  requesterId: varchar("requester_id").notNull(),
  addresseeId: varchar("addressee_id").notNull(),
  status: text("status").notNull().default("pending"), // pending / accepted / rejected / blocked
  createdAt: timestamp("created_at").defaultNow(),
});

// Friend invite links (for sharing)
export const friendInvites = pgTable("friend_invites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  token: text("token").notNull().unique(),
  usedBy: varchar("used_by"),
  status: text("status").notNull().default("active"), // active / used / expired
  createdAt: timestamp("created_at").defaultNow(),
});

// Comparison privacy settings per user
export const comparisonPrivacy = pgTable("comparison_privacy", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  shareDailyScore: boolean("share_daily_score").notNull().default(true),
  shareWeeklyAverage: boolean("share_weekly_average").notNull().default(true),
  shareMonthlyAverage: boolean("share_monthly_average").notNull().default(true),
  shareStreak: boolean("share_streak").notNull().default(true),
  shareHabitDetails: boolean("share_habit_details").notNull().default(true),
  shareDailyBreakdown: boolean("share_daily_breakdown").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cached daily stats for comparison (avoids recalculating)
export const dailyStatsCache = pgTable("daily_stats_cache", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  taskPct: integer("task_pct").notNull().default(0),
  goodHabitPct: integer("good_habit_pct").notNull().default(0),
  badHabitPct: integer("bad_habit_pct").notNull().default(0),
  hourlyPct: integer("hourly_pct").notNull().default(0),
  overallPct: integer("overall_pct").notNull().default(0),
  totalTasks: integer("total_tasks").notNull().default(0),
  completedTasks: integer("completed_tasks").notNull().default(0),
  computedAt: timestamp("computed_at").defaultNow(),
});

// Grow Together Groups (paid feature)
export const growGroups = pgTable("grow_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  isPublic: boolean("is_public").notNull().default(true),
  createdBy: varchar("created_by").notNull(),
  icon: text("icon").default("👥"),
  rules: text("rules").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Group Members
export const growGroupMembers = pgTable("grow_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull().default("member"), // owner / admin / member
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Group Messages
export const growGroupMessages = pgTable("grow_group_messages", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: varchar("user_id").notNull(),
  senderName: varchar("sender_name"),
  content: text("content").notNull(),
  replyToId: integer("reply_to_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  editedAt: timestamp("edited_at"),
});

export const insertFriendSchema = createInsertSchema(friends).omit({ id: true, createdAt: true });
export type InsertFriend = z.infer<typeof insertFriendSchema>;
export type Friend = typeof friends.$inferSelect;

export const insertFriendInviteSchema = createInsertSchema(friendInvites).omit({ id: true, createdAt: true });
export type InsertFriendInvite = z.infer<typeof insertFriendInviteSchema>;
export type FriendInvite = typeof friendInvites.$inferSelect;

export const insertComparisonPrivacySchema = createInsertSchema(comparisonPrivacy).omit({ id: true, updatedAt: true });
export type InsertComparisonPrivacy = z.infer<typeof insertComparisonPrivacySchema>;
export type ComparisonPrivacy = typeof comparisonPrivacy.$inferSelect;

export const insertDailyStatsCacheSchema = createInsertSchema(dailyStatsCache).omit({ id: true, computedAt: true });
export type InsertDailyStatsCache = z.infer<typeof insertDailyStatsCacheSchema>;
export type DailyStatsCache = typeof dailyStatsCache.$inferSelect;

export const insertGrowGroupSchema = createInsertSchema(growGroups).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrowGroup = z.infer<typeof insertGrowGroupSchema>;
export type GrowGroup = typeof growGroups.$inferSelect;

export const insertGrowGroupMemberSchema = createInsertSchema(growGroupMembers).omit({ id: true, joinedAt: true });
export type InsertGrowGroupMember = z.infer<typeof insertGrowGroupMemberSchema>;
export type GrowGroupMember = typeof growGroupMembers.$inferSelect;

export const insertGrowGroupMessageSchema = createInsertSchema(growGroupMessages).omit({ id: true, createdAt: true, editedAt: true });
export type InsertGrowGroupMessage = z.infer<typeof insertGrowGroupMessageSchema>;
export type GrowGroupMessage = typeof growGroupMessages.$inferSelect;

export const insertVideoSchema = createInsertSchema(videos).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

export const insertVideoFeedbackSchema = createInsertSchema(videoFeedback).omit({ id: true, createdAt: true });
export type InsertVideoFeedback = z.infer<typeof insertVideoFeedbackSchema>;
export type VideoFeedback = typeof videoFeedback.$inferSelect;

export const insertMoneySettingsSchema = createInsertSchema(moneySettings).omit({ id: true, updatedAt: true });
export type InsertMoneySettings = z.infer<typeof insertMoneySettingsSchema>;
export type MoneySettings = typeof moneySettings.$inferSelect;

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({ id: true, createdAt: true });
export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;

export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export const insertBudgetSchema = createInsertSchema(budgets).omit({ id: true, updatedAt: true });
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export const insertBillSchema = createInsertSchema(bills).omit({ id: true, createdAt: true });
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;

export const insertCreditCardSchema = createInsertSchema(creditCards).omit({ id: true, createdAt: true });
export type InsertCreditCard = z.infer<typeof insertCreditCardSchema>;
export type CreditCard = typeof creditCards.$inferSelect;

export const insertSavingsGoalSchema = createInsertSchema(savingsGoals).omit({ id: true, createdAt: true, completedAt: true });
export type InsertSavingsGoal = z.infer<typeof insertSavingsGoalSchema>;
export type SavingsGoal = typeof savingsGoals.$inferSelect;

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomDayTypeSchema = createInsertSchema(customDayTypes).omit({ id: true, createdAt: true });
export const insertDayTypeUsageSchema = createInsertSchema(dayTypeUsage).omit({ id: true });

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertYearlyGoalSchema = createInsertSchema(yearlyGoals).omit({ id: true, createdAt: true });
export const insertMonthlyOverviewGoalSchema = createInsertSchema(monthlyOverviewGoals).omit({ id: true, createdAt: true });
export const insertMonthlyDynamicGoalSchema = createInsertSchema(monthlyDynamicGoals).omit({ id: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const insertUserScheduleSchema = createInsertSchema(userSchedules).omit({ id: true });
export type UserSchedule = typeof userSchedules.$inferSelect;
export const insertGoodHabitSchema = createInsertSchema(goodHabits).omit({ id: true });
export const insertGoodHabitEntrySchema = createInsertSchema(goodHabitEntries).omit({ id: true });
export const insertBadHabitSchema = createInsertSchema(badHabits).omit({ id: true });
export const insertBadHabitEntrySchema = createInsertSchema(badHabitEntries).omit({ id: true });
export const insertHourlyEntrySchema = createInsertSchema(hourlyEntries).omit({ id: true });
export const insertDailyReasonSchema = createInsertSchema(dailyReasons).omit({ id: true });
export const insertTaskBankItemSchema = createInsertSchema(taskBankItems).omit({ id: true, createdAt: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, createdAt: true, updatedAt: true });

export const teamDailySnapshots = pgTable("team_daily_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  date: date("date").notNull(),
  activeTimeMinutes: integer("active_time_minutes").default(0).notNull(),
  deepWorkMinutes: integer("deep_work_minutes").default(0).notNull(),
  shallowWorkMinutes: integer("shallow_work_minutes").default(0).notNull(),
  meetingTimeMinutes: integer("meeting_time_minutes").default(0).notNull(),
  focusSessionMinutes: integer("focus_session_minutes").default(0).notNull(),
  tasksAssigned: integer("tasks_assigned").default(0).notNull(),
  tasksCompleted: integer("tasks_completed").default(0).notNull(),
  tasksOverdue: integer("tasks_overdue").default(0).notNull(),
  tasksInProgress: integer("tasks_in_progress").default(0).notNull(),
  contextSwitches: integer("context_switches").default(0).notNull(),
  avgFocusSession: integer("avg_focus_session").default(0).notNull(),
  longestFocusSession: integer("longest_focus_session").default(0).notNull(),
  productivityScore: numeric("productivity_score", { precision: 5, scale: 2 }).default("0").notNull(),
  focusScore: numeric("focus_score", { precision: 5, scale: 2 }).default("0").notNull(),
  consistencyScore: numeric("consistency_score", { precision: 5, scale: 2 }).default("0").notNull(),
  executionScore: numeric("execution_score", { precision: 5, scale: 2 }).default("0").notNull(),
  collaborationScore: numeric("collaboration_score", { precision: 5, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("team_daily_snapshots_user_workspace_date_idx").on(t.userId, t.workspaceId, t.date),
  index("team_daily_snapshots_user_date_idx").on(t.userId, t.date),
  index("team_daily_snapshots_workspace_date_idx").on(t.workspaceId, t.date),
]);

export const teamAiInsights = pgTable("team_ai_insights", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  targetUserId: text("target_user_id"),
  roleContext: text("role_context").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  confidence: text("confidence").default("medium").notNull(),
  dataContext: jsonb("data_context"),
  isRead: boolean("is_read").default(false).notNull(),
  isDismissed: boolean("is_dismissed").default(false).notNull(),
  isSaved: boolean("is_saved").default(false).notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("team_ai_insights_user_workspace_read_idx").on(t.userId, t.workspaceId, t.isRead),
  index("team_ai_insights_user_role_idx").on(t.userId, t.roleContext),
]);

export const teamAiSettings = pgTable("team_ai_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  insightsEnabled: boolean("insights_enabled").default(true).notNull(),
  morningBriefEnabled: boolean("morning_brief_enabled").default(true).notNull(),
  morningBriefTime: text("morning_brief_time").default("07:30").notNull(),
  categoriesEnabled: jsonb("categories_enabled").$defaultFn(() => ["achievement", "warning", "suggestion", "pattern", "coaching"]).notNull(),
  frequency: text("frequency").default("daily").notNull(),
  intensity: text("intensity").default("moderate").notNull(),
  mutedCategories: jsonb("muted_categories").$defaultFn(() => []).notNull(),
  notificationChannel: text("notification_channel").default("in_app").notNull(),
  weekendInsights: boolean("weekend_insights").default(false).notNull(),
  tonePreference: text("tone_preference").default("encouraging").notNull(),
  teamBriefEnabled: boolean("team_brief_enabled").default(true).notNull(),
  teamBriefDay: integer("team_brief_day").default(1).notNull(),
  riskAlerts: text("risk_alerts").default("daily_digest").notNull(),
  coachingSuggestions: boolean("coaching_suggestions").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("team_ai_settings_user_workspace_idx").on(t.userId, t.workspaceId),
]);

export const teamManagerAssignments = pgTable("team_manager_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  managerUserId: text("manager_user_id").notNull(),
  employeeUserId: text("employee_user_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  teamId: text("team_id"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  unassignedAt: timestamp("unassigned_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("team_manager_assignments_unique_idx").on(t.managerUserId, t.employeeUserId, t.workspaceId),
  index("team_manager_assignments_manager_idx").on(t.managerUserId, t.workspaceId),
  index("team_manager_assignments_employee_idx").on(t.employeeUserId, t.workspaceId),
]);

export const teamAlerts = pgTable("team_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  targetUserId: text("target_user_id").notNull(),
  visibleToRole: text("visible_to_role").notNull(),
  alertType: text("alert_type").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  dataContext: jsonb("data_context"),
  isAcknowledged: boolean("is_acknowledged").default(false).notNull(),
  acknowledgedBy: text("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  isSnoozed: boolean("is_snoozed").default(false).notNull(),
  snoozedUntil: timestamp("snoozed_until"),
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("team_alerts_workspace_role_ack_idx").on(t.workspaceId, t.visibleToRole, t.isAcknowledged),
  index("team_alerts_target_user_idx").on(t.targetUserId),
]);

// ─── Projects & Tasks Tables ─────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  name: text("name").notNull(),
  description: text("description"),
  teamId: integer("team_id"),
  status: text("status").default("Planning"),
  priority: text("priority").default("Medium"),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  ownerId: text("owner_id"),
  template: text("template"),
  visibility: text("visibility").default("public"),
  progress: integer("progress").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teamTasks = pgTable("team_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("Not Started"),
  priority: text("priority").default("Medium"),
  assigneeId: text("assignee_id"),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  estimatedMinutes: integer("estimated_minutes"),
  actualMinutes: integer("actual_minutes").default(0),
  tags: jsonb("tags").$defaultFn(() => []),
  sortOrder: integer("sort_order").default(0),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const subtasks = pgTable("subtasks", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => teamTasks.id),
  title: text("title").notNull(),
  isCompleted: boolean("is_completed").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskDependencies = pgTable("task_dependencies", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => teamTasks.id),
  dependsOnTaskId: integer("depends_on_task_id").references(() => teamTasks.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueDep: uniqueIndex("unique_task_dep").on(table.taskId, table.dependsOnTaskId),
}));

// ─── Workspace Platform Tables ───────────────────────────────────────────────

export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry"),
  companySize: text("company_size"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  name: text("name").notNull(),
  teamType: text("team_type").notNull(),
  department: text("department"),
  description: text("description"),
  parentTeamId: integer("parent_team_id"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  memberCount: integer("member_count").default(0),
});

export const workspaceMembers = pgTable("workspace_members", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  userId: text("user_id"),
  email: text("email").notNull(),
  displayName: text("display_name"),
  role: text("role").notNull().default("Member"),
  teamId: integer("team_id").references(() => teams.id),
  status: text("status").default("invited"),
  invitedBy: text("invited_by"),
  invitedAt: timestamp("invited_at").defaultNow(),
  joinedAt: timestamp("joined_at"),
  preferredView: text("preferred_view").default("board"),
  weeklyCapacityHours: integer("weekly_capacity_hours").default(40),
});

export const teamOrgSettings = pgTable("team_org_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: text("workspace_id").unique().notNull(),
  managerSeesIndividualFocus: boolean("manager_sees_individual_focus").default(true).notNull(),
  managerSeesIndividualIdle: boolean("manager_sees_individual_idle").default(false).notNull(),
  managerSeesAppUsage: text("manager_sees_app_usage").default("none").notNull(),
  managerSeesScreenTime: boolean("manager_sees_screen_time").default(false).notNull(),
  scoringWeights: jsonb("scoring_weights"),
  minDataDaysForScoring: integer("min_data_days_for_scoring").default(7).notNull(),
  newEmployeeRampDays: integer("new_employee_ramp_days").default(30).notNull(),
  standardWorkStart: text("standard_work_start").default("09:00").notNull(),
  standardWorkEnd: text("standard_work_end").default("17:00").notNull(),
  workDays: jsonb("work_days").$defaultFn(() => [1, 2, 3, 4, 5]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Collaboration Tables ─────────────────────────────────────────────────────

export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"),
  name: text("name").notNull(),
  type: text("type").notNull().default("team"),
  projectId: integer("project_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const channelMessages = pgTable("channel_messages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id"),
  senderId: text("sender_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id"),
  authorId: text("author_id").notNull(),
  content: text("content").notNull(),
  parentCommentId: integer("parent_comment_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"),
  title: text("title").notNull().default("Untitled"),
  content: text("content").default(""),
  createdBy: text("created_by").notNull(),
  isWiki: boolean("is_wiki").default(false),
  parentDocumentId: integer("parent_document_id"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Time Tracking Tables ─────────────────────────────────────────────────────

export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  taskId: integer("task_id"),
  projectId: integer("project_id"),
  workspaceId: integer("workspace_id"),
  date: date("date").notNull(),
  minutes: integer("minutes").notNull(),
  durationMinutes: integer("duration_minutes"),
  description: text("description"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: integer("workspace_id"),
  weekStart: date("week_start").notNull(),
  status: text("status").notNull().default("draft"),
  submittedAt: timestamp("submitted_at"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
});

// ─── Productivity Tables ──────────────────────────────────────────────────────

export const productivitySnapshots = pgTable(
  "productivity_snapshots",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    workspaceId: integer("workspace_id"),
    date: date("date").notNull(),
    overallScore: integer("overall_score"),
    taskCompletionRate: integer("task_completion_rate"),
    qualityScore: integer("quality_score"),
    estimationAccuracy: integer("estimation_accuracy"),
    collaborationScore: integer("collaboration_score"),
    initiativeScore: integer("initiative_score"),
    consistencyScore: integer("consistency_score"),
    impactWeight: integer("impact_weight"),
    tasksCompleted: integer("tasks_completed"),
    hoursWorked: integer("hours_worked"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueSnapshot: uniqueIndex("unique_user_date_snapshot").on(table.userId, table.date),
  })
);

// ── PROMPT 6: OKR GOALS + AUTOMATIONS + AI + NOTIFICATIONS ──────────────────

export const okrGoals = pgTable("okr_goals", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"),
  title: text("title").notNull(),
  description: text("description"),
  goalType: text("goal_type").default("individual"),
  parentGoalId: integer("parent_goal_id"),
  ownerId: text("owner_id"),
  teamId: integer("team_id"),
  period: text("period"),
  targetValue: numeric("target_value", { precision: 10, scale: 2 }),
  currentValue: numeric("current_value", { precision: 10, scale: 2 }).default("0"),
  measurementUnit: text("measurement_unit"),
  confidence: text("confidence").default("on_track"),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOkrGoalSchema = createInsertSchema(okrGoals).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOkrGoal = z.infer<typeof insertOkrGoalSchema>;
export type OkrGoal = typeof okrGoals.$inferSelect;

export const goalTaskLinks = pgTable("goal_task_links", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").references(() => okrGoals.id),
  taskId: integer("task_id").references(() => teamTasks.id),
});

export const automations = pgTable("automations", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"),
  name: text("name").notNull(),
  triggerType: text("trigger_type"),
  triggerConfig: jsonb("trigger_config").$defaultFn(() => ({})),
  conditions: jsonb("conditions").$defaultFn(() => []),
  actions: jsonb("actions").$defaultFn(() => []),
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  lastTriggeredAt: timestamp("last_triggered_at"),
  triggerCount: integer("trigger_count").default(0),
});

export const insertAutomationSchema = createInsertSchema(automations).omit({ id: true, createdAt: true });
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type Automation = typeof automations.$inferSelect;

export const automationLogs = pgTable("automation_logs", {
  id: serial("id").primaryKey(),
  automationId: integer("automation_id"),
  triggeredAt: timestamp("triggered_at").defaultNow(),
  triggerEvent: jsonb("trigger_event").$defaultFn(() => ({})),
  actionsExecuted: jsonb("actions_executed").$defaultFn(() => []),
  status: text("status").default("success"),
  errorMessage: text("error_message"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: integer("related_entity_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export const memberAvailability = pgTable("member_availability", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: date("date").notNull(),
  type: text("type").notNull().default("pto"),
  notes: text("notes"),
  workspaceId: integer("workspace_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMemberAvailabilitySchema = createInsertSchema(memberAvailability).omit({ id: true, createdAt: true });
export type InsertMemberAvailability = z.infer<typeof insertMemberAvailabilitySchema>;
export type MemberAvailability = typeof memberAvailability.$inferSelect;

export const savedReports = pgTable("saved_reports", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"),
  name: text("name").notNull(),
  configuration: jsonb("configuration").$defaultFn(() => ({})),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  schedule: text("schedule"),
});

export const insertSavedReportSchema = createInsertSchema(savedReports).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSavedReport = z.infer<typeof insertSavedReportSchema>;
export type SavedReport = typeof savedReports.$inferSelect;

// ============================================================
// CONNECT MESSAGING SYSTEM — ALL TABLES
// ============================================================

export const channelTypeEnum = pgEnum("channel_type", [
  "public", "private", "project", "team", "announcement", "social",
]);

export const connectChannels = pgTable("connect_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: integer("workspace_id"),
  name: varchar("name", { length: 80 }).notNull(),
  displayName: varchar("display_name", { length: 80 }).notNull(),
  slug: varchar("slug").notNull(),
  description: varchar("description", { length: 500 }),
  topic: varchar("topic", { length: 250 }),
  type: channelTypeEnum("type").default("public").notNull(),
  icon: varchar("icon"),
  color: varchar("color"),
  isDefault: boolean("is_default").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  linkedProjectId: uuid("linked_project_id"),
  linkedTeamId: uuid("linked_team_id"),
  postingPermission: varchar("posting_permission", { length: 30 }).default("everyone").notNull(),
  memberCount: integer("member_count").default(0).notNull(),
  messageCount: integer("message_count").default(0).notNull(),
  lastMessageAt: timestamp("last_message_at"),
  lastMessagePreview: varchar("last_message_preview", { length: 200 }),
  retentionDays: integer("retention_days"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  workspaceNameUnique: uniqueIndex("cch_ws_name_idx").on(table.workspaceId, table.name),
  workspaceTypeIdx: index("cch_ws_type_idx").on(table.workspaceId, table.type),
}));

export const connectChannelMembers = pgTable("connect_channel_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: uuid("channel_id").notNull().references(() => connectChannels.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: varchar("role", { length: 20 }).default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
  lastReadMessageId: uuid("last_read_message_id"),
  notificationPref: varchar("notification_pref", { length: 20 }).default("all").notNull(),
  isMuted: boolean("is_muted").default(false).notNull(),
  isStarred: boolean("is_starred").default(false).notNull(),
  sidebarSection: varchar("sidebar_section"),
}, (table) => ({
  channelUserUnique: uniqueIndex("ccm_ch_user_idx").on(table.channelId, table.userId),
  userStarredIdx: index("ccm_user_starred_idx").on(table.userId, table.isStarred),
}));

export const connectMessages = pgTable("connect_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: uuid("channel_id").notNull().references(() => connectChannels.id),
  authorId: text("author_id").notNull(),
  content: text("content").notNull(),
  contentHtml: text("content_html"),
  contentBlocks: jsonb("content_blocks"),
  type: varchar("type", { length: 20 }).default("user").notNull(),
  threadParentId: uuid("thread_parent_id"),
  threadReplyCount: integer("thread_reply_count").default(0).notNull(),
  threadLastReplyAt: timestamp("thread_last_reply_at"),
  threadParticipantIds: text("thread_participant_ids").array().default(sql`ARRAY[]::text[]`),
  isEdited: boolean("is_edited").default(false).notNull(),
  editedAt: timestamp("edited_at"),
  isPinned: boolean("is_pinned").default(false).notNull(),
  pinnedAt: timestamp("pinned_at"),
  pinnedBy: text("pinned_by"),
  isBookmarked: boolean("is_bookmarked").default(false).notNull(),
  scheduledFor: timestamp("scheduled_for"),
  metadata: jsonb("metadata"),
  mentionedUserIds: text("mentioned_user_ids").array().default(sql`ARRAY[]::text[]`),
  mentionedChannelIds: uuid("mentioned_channel_ids").array().default(sql`ARRAY[]::uuid[]`),
  hasAttachments: boolean("has_attachments").default(false).notNull(),
  reactionSummary: jsonb("reaction_summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  channelCreatedIdx: index("msg_ch_created_idx").on(table.channelId, table.createdAt),
  channelThreadIdx: index("msg_ch_thread_idx").on(table.channelId, table.threadParentId),
  authorCreatedIdx: index("msg_author_created_idx").on(table.authorId, table.createdAt),
}));

export const connectMessageReactions = pgTable("connect_message_reactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id").notNull().references(() => connectMessages.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  emoji: varchar("emoji").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueReaction: uniqueIndex("cmr_unique_idx").on(table.messageId, table.userId, table.emoji),
  messageIdx: index("cmr_message_idx").on(table.messageId),
}));

export const connectMessageAttachments = pgTable("connect_message_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id").notNull().references(() => connectMessages.id, { onDelete: "cascade" }),
  fileName: varchar("file_name").notNull(),
  fileUrl: varchar("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  thumbnailUrl: varchar("thumbnail_url"),
  width: integer("width"),
  height: integer("height"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  messageIdx: index("cma_message_idx").on(table.messageId),
}));

export const connectPinnedMessages = pgTable("connect_pinned_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: uuid("channel_id").notNull().references(() => connectChannels.id, { onDelete: "cascade" }),
  messageId: uuid("message_id").notNull(),
  pinnedBy: text("pinned_by").notNull(),
  pinnedAt: timestamp("pinned_at").defaultNow().notNull(),
}, (table) => ({
  channelMessageUnique: uniqueIndex("cpm_ch_msg_idx").on(table.channelId, table.messageId),
}));

export const connectConversations = pgTable("connect_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: integer("workspace_id"),
  type: varchar("type", { length: 10 }).default("dm").notNull(),
  name: varchar("name"),
  icon: varchar("icon"),
  participantIds: text("participant_ids").array().default(sql`ARRAY[]::text[]`),
  participantHash: varchar("participant_hash").notNull(),
  lastMessageAt: timestamp("last_message_at"),
  lastMessagePreview: varchar("last_message_preview", { length: 200 }),
  messageCount: integer("message_count").default(0).notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  wsHashUnique: uniqueIndex("cconv_ws_hash_idx").on(table.workspaceId, table.participantHash),
}));

export const connectConversationMembers = pgTable("connect_conversation_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => connectConversations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
  lastReadMessageId: uuid("last_read_message_id"),
  isMuted: boolean("is_muted").default(false).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => ({
  convUserUnique: uniqueIndex("ccvm_conv_user_idx").on(table.conversationId, table.userId),
  userIdx: index("ccvm_user_idx").on(table.userId),
}));

export const connectDirectMessages = pgTable("connect_direct_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => connectConversations.id),
  authorId: text("author_id").notNull(),
  content: text("content").notNull(),
  contentHtml: text("content_html"),
  type: varchar("type", { length: 20 }).default("user").notNull(),
  threadParentId: uuid("thread_parent_id"),
  threadReplyCount: integer("thread_reply_count").default(0).notNull(),
  isEdited: boolean("is_edited").default(false).notNull(),
  editedAt: timestamp("edited_at"),
  mentionedUserIds: text("mentioned_user_ids").array().default(sql`ARRAY[]::text[]`),
  hasAttachments: boolean("has_attachments").default(false).notNull(),
  reactionSummary: jsonb("reaction_summary"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  convCreatedIdx: index("cdm_conv_created_idx").on(table.conversationId, table.createdAt),
}));

export const connectDmAttachments = pgTable("connect_dm_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id").notNull().references(() => connectDirectMessages.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").notNull(),
  fileName: varchar("file_name").notNull(),
  fileUrl: varchar("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  thumbnailUrl: varchar("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  messageIdx: index("cdma_message_idx").on(table.messageId),
  convIdx: index("cdma_conv_idx").on(table.conversationId),
}));

export const connectDmReactions = pgTable("connect_dm_reactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id").notNull().references(() => connectDirectMessages.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  emoji: varchar("emoji").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueReaction: uniqueIndex("cdmr_unique_idx").on(table.messageId, table.userId, table.emoji),
}));

export const connectUserPresence = pgTable("connect_user_presence", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").unique().notNull(),
  workspaceId: integer("workspace_id"),
  status: varchar("status", { length: 20 }).default("offline").notNull(),
  customText: varchar("custom_text", { length: 100 }),
  customEmoji: varchar("custom_emoji"),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  autoStatus: boolean("auto_status").default(true).notNull(),
  dndUntil: timestamp("dnd_until"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const connectHuddles = pgTable("connect_huddles", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: uuid("channel_id").notNull(),
  workspaceId: integer("workspace_id"),
  startedBy: text("started_by").notNull(),
  status: varchar("status", { length: 10 }).default("active").notNull(),
  participantIds: text("participant_ids").array().default(sql`ARRAY[]::text[]`),
  maxParticipants: integer("max_participants").default(50).notNull(),
  isRecording: boolean("is_recording").default(false).notNull(),
  recordingUrl: varchar("recording_url"),
  liveCaption: boolean("live_caption").default(true).notNull(),
  transcript: text("transcript"),
  aiSummary: text("ai_summary"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
}, (table) => ({
  channelStatusIdx: index("ch_status_idx").on(table.channelId, table.status),
}));

export const connectMessageBookmarks = pgTable("connect_message_bookmarks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  messageId: uuid("message_id").notNull(),
  messageType: varchar("message_type", { length: 10 }).default("channel").notNull(),
  note: varchar("note", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userMessageUnique: uniqueIndex("cmb_user_msg_idx").on(table.userId, table.messageId),
}));

export const connectCustomEmoji = pgTable("connect_custom_emoji", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: integer("workspace_id"),
  name: varchar("name").notNull(),
  imageUrl: varchar("image_url").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  wsNameUnique: uniqueIndex("cce_ws_name_idx").on(table.workspaceId, table.name),
}));

export const connectSlashCommands = pgTable("connect_slash_commands", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: integer("workspace_id"),
  name: varchar("name").notNull(),
  description: varchar("description").notNull(),
  handler: varchar("handler").notNull(),
  isBuiltIn: boolean("is_built_in").default(false).notNull(),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  wsNameUnique: uniqueIndex("csc_ws_name_idx").on(table.workspaceId, table.name),
}));

// ─── AI FEATURES: 18 NEW TABLES ───────────────────────────────────────────

export const autopilotRules = pgTable("autopilot_rules", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // learned/user_created/suggested/template
  triggerType: text("trigger_type").notNull(),
  triggerConfig: jsonb("trigger_config").$defaultFn(() => ({})),
  actions: jsonb("actions").$defaultFn(() => []),
  executionMode: text("execution_mode").default("suggest"), // auto/suggest/confirm
  isActive: boolean("is_active").default(true),
  confidence: real("confidence"),
  timesTriggered: integer("times_triggered").default(0),
  timesExecuted: integer("times_executed").default(0),
  timesDeclined: integer("times_declined").default(0),
  lastTriggeredAt: timestamp("last_triggered_at"),
  lastExecutedAt: timestamp("last_executed_at"),
  cooldownMinutes: integer("cooldown_minutes").default(0),
  maxExecutionsPerDay: integer("max_executions_per_day").default(50),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userActiveTypeIdx: index("ar_user_active_type_idx").on(t.userId, t.isActive, t.triggerType),
}));

export const autopilotExecutions = pgTable("autopilot_executions", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").references(() => autopilotRules.id),
  userId: text("user_id").notNull(),
  triggerEvent: jsonb("trigger_event").$defaultFn(() => ({})),
  actions: jsonb("actions").$defaultFn(() => []),
  status: text("status").notNull().default("pending_approval"), // pending_approval/approved/executing/completed/failed/declined/expired
  executionMode: text("execution_mode").notNull().default("suggest"),
  approvedAt: timestamp("approved_at"),
  declinedAt: timestamp("declined_at"),
  completedAt: timestamp("completed_at"),
  error: text("error"),
  undoneAt: timestamp("undone_at"),
  undoData: jsonb("undo_data"),
  creditsUsed: integer("credits_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autopilotActivityLog = pgTable("autopilot_activity_log", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data").$defaultFn(() => ({})),
  sessionId: text("session_id"),
  timestamp: timestamp("timestamp").defaultNow(),
  dayOfWeek: integer("day_of_week").notNull(),
  hourOfDay: integer("hour_of_day").notNull(),
}, (t) => ({
  userTimestampIdx: index("aal_user_ts_idx").on(t.userId, t.timestamp),
  userEventTimestampIdx: index("aal_user_event_ts_idx").on(t.userId, t.eventType, t.timestamp),
}));

export const autopilotPatterns = pgTable("autopilot_patterns", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  patternType: text("pattern_type").notNull(),
  description: text("description").notNull(),
  eventSequence: jsonb("event_sequence").$defaultFn(() => []),
  frequency: integer("frequency").notNull(),
  confidence: real("confidence").notNull(),
  suggestedRule: jsonb("suggested_rule"),
  status: text("status").notNull().default("detected"), // detected/suggested/accepted/dismissed/expired
  detectedAt: timestamp("detected_at").notNull(),
  lastOccurredAt: timestamp("last_occurred_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskPredictions = pgTable("task_predictions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  predictedTitle: text("predicted_title").notNull(),
  predictedDescription: text("predicted_description"),
  predictedProperties: jsonb("predicted_properties").$defaultFn(() => ({})),
  triggerTaskId: integer("trigger_task_id"),
  triggerEvent: text("trigger_event").notNull(),
  confidence: real("confidence").notNull(),
  reasoning: text("reasoning").notNull(),
  status: text("status").notNull().default("predicted"), // predicted/accepted/modified_and_accepted/dismissed/expired/auto_created
  acceptedTaskId: integer("accepted_task_id"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskSequences = pgTable("task_sequences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  precedingTaskPattern: jsonb("preceding_task_pattern").$defaultFn(() => ({})),
  followingTaskPattern: jsonb("following_task_pattern").$defaultFn(() => ({})),
  occurrences: integer("occurrences").notNull(),
  confidence: real("confidence").notNull(),
  lastObservedAt: timestamp("last_observed_at").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectTemplatesLearned = pgTable("project_templates_learned", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  taskSequence: jsonb("task_sequence").$defaultFn(() => []),
  sourceProjectNames: text("source_project_names").array(),
  usageCount: integer("usage_count").default(0),
  confidence: real("confidence").notNull(),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workSessions = pgTable("work_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  totalActiveMinutes: integer("total_active_minutes").notNull().default(0),
  totalIdleMinutes: integer("total_idle_minutes").notNull().default(0),
  activities: jsonb("activities").$defaultFn(() => []),
  summary: jsonb("summary"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userDateUnique: uniqueIndex("ws_user_date_unique").on(t.userId, t.date),
}));

export const workPatterns = pgTable("work_patterns", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  patternType: text("pattern_type").notNull(),
  data: jsonb("data").$defaultFn(() => ({})),
  analysisDate: timestamp("analysis_date").notNull(),
  periodDays: integer("period_days").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiCoachingMessages = pgTable("ai_coaching_messages", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  actionable: boolean("actionable").notNull().default(false),
  actionData: jsonb("action_data"),
  priority: text("priority").notNull().default("medium"),
  isRead: boolean("is_read").default(false),
  isDismissed: boolean("is_dismissed").default(false),
  relatedPatternId: integer("related_pattern_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teamMemberProfiles = pgTable("team_member_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  skills: jsonb("skills").$defaultFn(() => []),
  domains: text("domains").array(),
  currentWorkload: jsonb("current_workload").$defaultFn(() => ({})),
  availability: jsonb("availability").$defaultFn(() => ({})),
  preferences: jsonb("preferences").$defaultFn(() => ({})),
  performanceMetrics: jsonb("performance_metrics").$defaultFn(() => ({})),
  lastProfileUpdateAt: timestamp("last_profile_update_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userUnique: uniqueIndex("tmp_user_unique").on(t.userId),
}));

export const delegationSuggestions = pgTable("delegation_suggestions", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  suggestedById: text("suggested_by_id").notNull(),
  candidates: jsonb("candidates").$defaultFn(() => []),
  selectedUserId: text("selected_user_id"),
  selectionSource: text("selection_source").notNull().default("ai"),
  autoAssigned: boolean("auto_assigned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const delegationRules = pgTable("delegation_rules", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  conditions: jsonb("conditions").$defaultFn(() => ({})),
  strategy: text("strategy").notNull().default("best_match"),
  candidatePool: text("candidate_pool").array(),
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectContexts = pgTable("project_contexts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  projectName: text("project_name").notNull(),
  linkedNoteIds: integer("linked_note_ids").array(),
  lastActiveAt: timestamp("last_active_at").notNull().defaultNow(),
  lastActiveDuration: integer("last_active_duration").default(0),
  openItems: jsonb("open_items").$defaultFn(() => ({})),
  aiCatchUpSummary: jsonb("ai_catch_up_summary"),
  isPinned: boolean("is_pinned").default(false),
  color: text("color"),
  icon: text("icon"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userLastActiveIdx: index("pc_user_last_active_idx").on(t.userId, t.lastActiveAt),
}));

export const recordedWorkflows = pgTable("recorded_workflows", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  recordedSteps: jsonb("recorded_steps").$defaultFn(() => []),
  processedSteps: jsonb("processed_steps").$defaultFn(() => []),
  inputVariables: jsonb("input_variables").$defaultFn(() => []),
  triggerType: text("trigger_type").notNull().default("manual"), // manual/scheduled/event
  triggerConfig: jsonb("trigger_config"),
  timesRun: integer("times_run").default(0),
  avgDurationSeconds: real("avg_duration_seconds"),
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dailyPlans = pgTable("daily_plans", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull().default("draft"), // draft/active/completed/skipped
  generatedPlan: jsonb("generated_plan").$defaultFn(() => ({})),
  timeBlocks: jsonb("time_blocks").$defaultFn(() => []),
  aiSummary: jsonb("ai_summary"),
  userModifications: jsonb("user_modifications").$defaultFn(() => ({})),
  modificationsCount: integer("modifications_count").default(0),
  completionRate: real("completion_rate"),
  reviewNotes: text("review_notes"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userDateUnique: uniqueIndex("dp_user_date_unique").on(t.userId, t.date),
}));

export const documentTemplatesAi = pgTable("document_templates_ai", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  structure: jsonb("structure").$defaultFn(() => ({})),
  isBuiltIn: boolean("is_built_in").default(false),
  usageCount: integer("usage_count").default(0),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const generatedDocuments = pgTable("generated_documents", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id"),
  userId: text("user_id").notNull(),
  noteId: integer("note_id").notNull(),
  generationConfig: jsonb("generation_config").$defaultFn(() => ({})),
  dataSources: jsonb("data_sources").$defaultFn(() => ({})),
  status: text("status").notNull().default("generating"), // generating/completed/failed
  generationTimeMs: integer("generation_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userAutopilotSettings = pgTable("user_autopilot_settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  settings: jsonb("settings").$defaultFn(() => ({})),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userUnique: uniqueIndex("uas_user_unique").on(t.userId),
}));

// Insert schemas
export const insertAutopilotRuleSchema = createInsertSchema(autopilotRules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAutopilotExecutionSchema = createInsertSchema(autopilotExecutions).omit({ id: true, createdAt: true });
export const insertAutopilotActivityLogSchema = createInsertSchema(autopilotActivityLog).omit({ id: true, timestamp: true });
export const insertAutopilotPatternSchema = createInsertSchema(autopilotPatterns).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskPredictionSchema = createInsertSchema(taskPredictions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSequenceSchema = createInsertSchema(taskSequences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkSessionSchema = createInsertSchema(workSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkPatternSchema = createInsertSchema(workPatterns).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiCoachingMessageSchema = createInsertSchema(aiCoachingMessages).omit({ id: true, createdAt: true });
export const insertTeamMemberProfileSchema = createInsertSchema(teamMemberProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDelegationSuggestionSchema = createInsertSchema(delegationSuggestions).omit({ id: true, createdAt: true });
export const insertDelegationRuleSchema = createInsertSchema(delegationRules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectContextSchema = createInsertSchema(projectContexts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRecordedWorkflowSchema = createInsertSchema(recordedWorkflows).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDailyPlanSchema = createInsertSchema(dailyPlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentTemplateAiSchema = createInsertSchema(documentTemplatesAi).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGeneratedDocumentSchema = createInsertSchema(generatedDocuments).omit({ id: true, createdAt: true });

// Types
export type AutopilotRule = typeof autopilotRules.$inferSelect;
export type AutopilotExecution = typeof autopilotExecutions.$inferSelect;
export type AutopilotActivityLog = typeof autopilotActivityLog.$inferSelect;
export type AutopilotPattern = typeof autopilotPatterns.$inferSelect;
export type TaskPrediction = typeof taskPredictions.$inferSelect;
export type TaskSequence = typeof taskSequences.$inferSelect;
export type WorkSession = typeof workSessions.$inferSelect;
export type WorkPattern = typeof workPatterns.$inferSelect;
export type AiCoachingMessage = typeof aiCoachingMessages.$inferSelect;
export type TeamMemberProfile = typeof teamMemberProfiles.$inferSelect;
export type DelegationSuggestion = typeof delegationSuggestions.$inferSelect;
export type DelegationRule = typeof delegationRules.$inferSelect;
export type ProjectContext = typeof projectContexts.$inferSelect;
export type RecordedWorkflow = typeof recordedWorkflows.$inferSelect;
export type DailyPlan = typeof dailyPlans.$inferSelect;
export type DocumentTemplateAi = typeof documentTemplatesAi.$inferSelect;
export type GeneratedDocument = typeof generatedDocuments.$inferSelect;

// ============================================================
// SPRINT 1: ALL 25 AI FEATURES — NEW TABLES
// ============================================================

// ============================================================
// FEATURE 1: AI WRITING ASSISTANT
// ============================================================
export const aiWritingHistory = pgTable("ai_writing_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  pageId: text("page_id"),
  channelId: text("channel_id"),
  action: text("action").notNull(), // write,improve,shorten,lengthen,tone,grammar,translate,summarize,brainstorm,outline,continue,explain,action_items,custom
  inputText: text("input_text"),
  prompt: text("prompt").notNull(),
  outputText: text("output_text").notNull(),
  model: text("model").notNull().default("gpt-4o-mini"),
  tone: text("tone"),
  language: text("language"),
  writerRole: text("writer_role"),
  tokensUsed: integer("tokens_used").default(0),
  accepted: boolean("accepted").default(false),
  feedbackRating: integer("feedback_rating"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userCreatedIdx: index("awh_user_created_idx").on(t.userId, t.createdAt),
}));

export const brandVoice = pgTable("brand_voice", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  defaultTone: text("default_tone").default("professional"),
  styleGuideText: text("style_guide_text"),
  vocabularyRules: jsonb("vocabulary_rules"),
  formattingRules: text("formatting_rules"),
  customRoles: jsonb("custom_roles"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================
// FEATURE 2: AI KNOWLEDGE MANAGER & SEARCH
// ============================================================
export const knowledgeIndex = pgTable("knowledge_index", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  sourceType: text("source_type").notNull(), // page,task,message,meeting_transcript,meeting_summary,comment,file
  sourceId: text("source_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  contentChunks: jsonb("content_chunks"),
  embedding: jsonb("embedding"),
  metadata: jsonb("metadata"),
  accessLevel: text("access_level").default("workspace"),
  lastIndexedAt: timestamp("last_indexed_at").defaultNow(),
  isStale: boolean("is_stale").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userSourceTypeIdx: index("ki_user_source_type_idx").on(t.userId, t.sourceType),
  userLastIndexedIdx: index("ki_user_last_indexed_idx").on(t.userId, t.lastIndexedAt),
  sourceIdUnique: uniqueIndex("ki_source_id_unique").on(t.sourceId),
}));

export const knowledgeQuery = pgTable("knowledge_query", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  query: text("query").notNull(),
  queryEmbedding: jsonb("query_embedding"),
  results: jsonb("results"),
  aiAnswer: text("ai_answer"),
  citations: jsonb("citations"),
  responseTimeMs: integer("response_time_ms"),
  feedbackRating: integer("feedback_rating"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userCreatedIdx: index("kq_user_created_idx").on(t.userId, t.createdAt),
}));

export const knowledgeSuggestion = pgTable("knowledge_suggestion", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  channelId: text("channel_id"),
  messageId: text("message_id"),
  questionDetected: text("question_detected").notNull(),
  suggestedAnswer: text("suggested_answer").notNull(),
  sources: jsonb("sources"),
  confidence: real("confidence").notNull().default(0),
  status: text("status").default("suggested"), // suggested,accepted,dismissed,expired
  shownToUserId: text("shown_to_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userStatusIdx: index("ks_user_status_idx").on(t.userId, t.status),
}));

export const knowledgeItem = pgTable("knowledge_item", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(), // how_to,decision,policy,faq,reference
  title: text("title").notNull(),
  content: text("content").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  confidence: real("confidence").default(0),
  status: text("status").default("draft"), // draft,published,archived
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userCategoryIdx: index("ki2_user_category_idx").on(t.userId, t.category),
  userStatusIdx: index("ki2_user_status_idx").on(t.userId, t.status),
}));

// ============================================================
// FEATURE 3: AI AUTO-SCHEDULER & SCHEDULING PREFERENCES
// ============================================================
export const schedulingPreferences = pgTable("scheduling_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  workingHours: jsonb("working_hours").$defaultFn(() => ({ start: "09:00", end: "18:00" })),
  timezone: text("timezone").default("UTC"),
  workDays: integer("work_days").array().$defaultFn(() => [1, 2, 3, 4, 5]),
  lunchTime: jsonb("lunch_time").$defaultFn(() => ({ start: "12:30", end: "13:30" })),
  peakFocusWindow: jsonb("peak_focus_window"),
  preferMeetingsIn: text("prefer_meetings_in").default("any"),
  minFocusBlockMinutes: integer("min_focus_block_minutes").default(60),
  bufferBetweenMeetings: integer("buffer_between_meetings").default(15),
  autoScheduleEnabled: boolean("auto_schedule_enabled").default(true),
  morningPlanningEnabled: boolean("morning_planning_enabled").default(true),
  morningPlanningTime: text("morning_planning_time").default("08:30"),
  eveningReviewEnabled: boolean("evening_review_enabled").default(true),
  eveningReviewTime: text("evening_review_time").default("17:30"),
  planMode: text("plan_mode").default("suggest"), // automatic,suggest,manual
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================
// FEATURE 4: AI AUTONOMOUS AGENTS
// ============================================================
export const aiAgents = pgTable("ai_agents", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  type: text("type").default("custom"), // built_in,custom,template
  createdBy: text("created_by").notNull(),
  isShared: boolean("is_shared").default(false),
  visibility: text("visibility").default("private"), // private,workspace,specific_members
  visibleToUserIds: text("visible_to_user_ids").array().$defaultFn(() => []),
  systemPrompt: text("system_prompt").notNull(),
  model: text("model").default("gpt-4o"),
  temperature: real("temperature").default(0.7),
  capabilities: text("capabilities").array().$defaultFn(() => []),
  dataAccess: jsonb("data_access").$defaultFn(() => ({})),
  triggerType: text("trigger_type").default("manual"),
  triggerConfig: jsonb("trigger_config"),
  isActive: boolean("is_active").default(true),
  maxRunsPerDay: integer("max_runs_per_day").default(100),
  maxActionsPerRun: integer("max_actions_per_run").default(25),
  timeoutMinutes: integer("timeout_minutes").default(5),
  totalRuns: integer("total_runs").default(0),
  totalTokensUsed: integer("total_tokens_used").default(0),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  userActiveIdx: index("aa_user_active_idx").on(t.userId, t.isActive),
  userTypeIdx: index("aa_user_type_idx").on(t.userId, t.type),
}));

export const agentRuns = pgTable("agent_runs", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  userId: text("user_id").notNull(),
  triggeredBy: text("triggered_by").notNull(), // manual,schedule,event,message,form,webhook
  triggerData: jsonb("trigger_data"),
  invokedByUserId: text("invoked_by_user_id"),
  status: text("status").default("queued"), // queued,running,completed,failed,cancelled,timeout
  steps: jsonb("steps").$defaultFn(() => []),
  finalOutput: text("final_output"),
  tokensUsed: integer("tokens_used").default(0),
  durationMs: integer("duration_ms"),
  error: text("error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  agentCreatedIdx: index("ar_agent_created_idx").on(t.agentId, t.createdAt),
  statusIdx: index("ar_status_idx").on(t.status),
}));

export const agentConversations = pgTable("agent_conversations", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  userId: text("user_id").notNull(),
  messages: jsonb("messages").$defaultFn(() => []),
  status: text("status").default("active"), // active,closed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  agentUserIdx: index("ac_agent_user_idx").on(t.agentId, t.userId),
  userUpdatedIdx: index("ac_user_updated_idx").on(t.userId, t.updatedAt),
}));

// ============================================================
// FEATURE 5: AI PROJECT MANAGER
// ============================================================
export const projectStatusReports = pgTable("project_status_reports", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  projectId: integer("project_id"),
  generatedBy: text("generated_by").notNull().default("ai_on_demand"), // ai_auto,ai_on_demand,manual
  reportType: text("report_type").notNull(), // daily_standup,weekly_status,sprint_review,risk_report
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  content: jsonb("content").$defaultFn(() => ({})),
  postedToChannelId: text("posted_to_channel_id"),
  postedMessageId: text("posted_message_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userProjectIdx: index("psr_user_project_idx").on(t.userId, t.projectId),
  userReportTypeIdx: index("psr_user_report_type_idx").on(t.userId, t.reportType),
}));

export const aiRiskAlerts = pgTable("ai_risk_alerts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  projectId: integer("project_id"),
  riskType: text("risk_type").notNull(), // deadline_at_risk,team_member_overloaded,blocked_task_chain,scope_creep,velocity_declining,unassigned_urgent,dependency_conflict
  severity: text("severity").notNull(), // low,medium,high,critical
  title: text("title").notNull(),
  description: text("description").notNull(),
  affectedTaskIds: text("affected_task_ids").array().$defaultFn(() => []),
  affectedUserIds: text("affected_user_ids").array().$defaultFn(() => []),
  status: text("status").default("active"), // active,acknowledged,resolved,dismissed
  acknowledgedBy: text("acknowledged_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userStatusIdx: index("ara_user_status_idx").on(t.userId, t.status),
  userSeverityIdx: index("ara_user_severity_idx").on(t.userId, t.severity),
}));

export const aiWorkflowAutomations = pgTable("ai_workflow_automations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdFromPrompt: text("created_from_prompt"),
  trigger: jsonb("trigger").$defaultFn(() => ({})),
  conditions: jsonb("conditions").$defaultFn(() => []),
  actions: jsonb("actions").$defaultFn(() => []),
  isActive: boolean("is_active").default(true),
  runCount: integer("run_count").default(0),
  lastRunAt: timestamp("last_run_at"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  userActiveIdx: index("awa_user_active_idx").on(t.userId, t.isActive),
}));

// ============================================================
// FEATURE 7: AI MEETING INTELLIGENCE
// ============================================================
export const meetingIntelligence = pgTable("meeting_intelligence", {
  id: serial("id").primaryKey(),
  meetingId: text("meeting_id").notNull().unique(),
  userId: text("user_id").notNull(),
  audioUrl: text("audio_url"),
  audioDurationSecs: integer("audio_duration_secs"),
  transcriptRaw: text("transcript_raw"),
  speakerLabels: jsonb("speaker_labels"),
  aiSummary: text("ai_summary"),
  keyPoints: jsonb("key_points"),
  decisions: jsonb("decisions"),
  actionItems: jsonb("action_items"),
  openQuestions: jsonb("open_questions"),
  prepBrief: text("prep_brief"),
  processingStatus: text("processing_status").default("pending"), // pending,transcribing,summarizing,completed,failed
  processingError: text("processing_error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userIdx: index("mi_user_idx").on(t.userId),
  processingStatusIdx: index("mi_processing_status_idx").on(t.processingStatus),
}));

// ============================================================
// FEATURE 8: AI DATABASE INTELLIGENCE
// ============================================================
export const aiAutoFillColumns = pgTable("ai_auto_fill_columns", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  projectId: integer("project_id"),
  columnName: text("column_name").notNull(),
  aiPrompt: text("ai_prompt").notNull(),
  inputFields: text("input_fields").array().$defaultFn(() => []),
  outputType: text("output_type").default("text"), // text,select,number
  selectOptions: text("select_options").array(),
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userProjectIdx: index("aafc_user_project_idx").on(t.userId, t.projectId),
}));

// ============================================================
// FEATURE 9: AI FOCUS & PRODUCTIVITY COACH
// ============================================================
export const focusSessions = pgTable("focus_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  taskId: integer("task_id"),
  title: text("title").notNull(),
  plannedMinutes: integer("planned_minutes").notNull(),
  actualMinutes: integer("actual_minutes"),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  pausedMinutes: integer("paused_minutes").default(0),
  status: text("status").default("active"), // active,paused,completed,abandoned
  notificationsPaused: boolean("notifications_paused").default(true),
  queuedNotificationCount: integer("queued_notification_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userCreatedIdx: index("fs_user_created_idx").on(t.userId, t.createdAt),
  userStatusIdx: index("fs_user_status_idx").on(t.userId, t.status),
}));

export const focusTimeBlocks = pgTable("focus_time_blocks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: date("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  calendarEventId: text("calendar_event_id"),
  isProtected: boolean("is_protected").default(true),
  source: text("source").default("ai"), // ai,manual
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userDateIdx: index("ftb_user_date_idx").on(t.userId, t.date),
}));

export const aiProductivityScores = pgTable("ai_productivity_scores", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: date("date").notNull(),
  focusMinutes: integer("focus_minutes").default(0),
  meetingMinutes: integer("meeting_minutes").default(0),
  tasksCompleted: integer("tasks_completed").default(0),
  tasksPlanned: integer("tasks_planned").default(0),
  habitsCompleted: integer("habits_completed").default(0),
  habitsPlanned: integer("habits_planned").default(0),
  interruptionCount: integer("interruption_count").default(0),
  productivityScore: real("productivity_score"),
  aiInsight: text("ai_insight"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userDateUnique: uniqueIndex("aps_user_date_unique").on(t.userId, t.date),
  userDateIdx: index("aps_user_date_idx").on(t.userId, t.date),
}));

// ============================================================
// FEATURE 13: AI EMAIL ASSISTANT
// ============================================================
export const emailAccounts = pgTable("email_accounts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(), // gmail,outlook
  email: text("email").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  syncEnabled: boolean("sync_enabled").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userEmailUnique: uniqueIndex("ea_user_email_unique").on(t.userId, t.email),
}));

export const emailThreads = pgTable("email_threads", {
  id: serial("id").primaryKey(),
  emailAccountId: integer("email_account_id").notNull(),
  externalId: text("external_id").notNull(),
  subject: text("subject").notNull(),
  participants: jsonb("participants").$defaultFn(() => []),
  latestSnippet: text("latest_snippet"),
  messageCount: integer("message_count").default(1),
  isRead: boolean("is_read").default(false),
  aiPriority: text("ai_priority"), // urgent,important,fyi,low
  aiLabels: text("ai_labels").array(),
  aiSummary: text("ai_summary"),
  lastMessageAt: timestamp("last_message_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  accountLastMessageIdx: index("et_account_last_message_idx").on(t.emailAccountId, t.lastMessageAt),
  accountPriorityIdx: index("et_account_priority_idx").on(t.emailAccountId, t.aiPriority),
}));

// ============================================================
// FEATURE 14: AI HABIT TRACKER & STREAK ENGINE
// ============================================================
export const aiHabits = pgTable("ai_habits", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color"),
  durationMinutes: integer("duration_minutes").notNull(),
  frequency: text("frequency").default("daily"), // daily,weekdays,custom
  customDays: integer("custom_days").array().$defaultFn(() => []),
  preferredTimeRange: jsonb("preferred_time_range"),
  priority: text("priority").default("medium"), // high,medium,low
  isFlexible: boolean("is_flexible").default(true),
  isProtected: boolean("is_protected").default(false),
  streakCurrent: integer("streak_current").default(0),
  streakLongest: integer("streak_longest").default(0),
  isActive: boolean("is_active").default(true),
  goalId: text("goal_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  userActiveIdx: index("ah_user_active_idx").on(t.userId, t.isActive),
}));

export const aiHabitCompletions = pgTable("ai_habit_completions", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull(),
  userId: text("user_id").notNull(),
  date: date("date").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
}, (t) => ({
  habitDateUnique: uniqueIndex("ahc_habit_date_unique").on(t.habitId, t.date),
  userDateIdx: index("ahc_user_date_idx").on(t.userId, t.date),
}));

// ============================================================
// FEATURE 15: AI GOAL & OKR SYSTEM
// ============================================================
export const aiGoals = pgTable("ai_goals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  ownerId: text("owner_id").notNull(),
  level: text("level").notNull(), // company,team,individual
  parentGoalId: integer("parent_goal_id"),
  status: text("status").default("on_track"), // on_track,at_risk,behind,completed,cancelled
  progressPercent: real("progress_percent").default(0),
  startDate: date("start_date").notNull(),
  targetDate: date("target_date").notNull(),
  linkedProjectIds: integer("linked_project_ids").array().$defaultFn(() => []),
  aiRiskAssessment: text("ai_risk_assessment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  userLevelIdx: index("ag_user_level_idx").on(t.userId, t.level),
  userStatusIdx: index("ag_user_status_idx").on(t.userId, t.status),
  ownerIdx: index("ag_owner_idx").on(t.ownerId),
}));

export const keyResults = pgTable("key_results", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull(),
  title: text("title").notNull(),
  metricType: text("metric_type").notNull(), // number,percentage,currency,boolean
  targetValue: real("target_value").notNull(),
  currentValue: real("current_value").default(0),
  startValue: real("start_value").default(0),
  unit: text("unit"),
  progressPercent: real("progress_percent").default(0),
  autoTrackSource: text("auto_track_source"), // task_count,task_completion,habit_streak,manual
  autoTrackConfig: jsonb("auto_track_config"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  goalIdx: index("kr_goal_idx").on(t.goalId),
}));

// ============================================================
// FEATURE 16: AI CALENDAR OPTIMIZER
// ============================================================
export const calendarOptimizationRules = pgTable("calendar_optimization_rules", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  ruleType: text("rule_type").notNull(), // no_meeting_window,buffer_time,meeting_defrag,focus_protection
  config: jsonb("config").$defaultFn(() => ({})),
  scope: text("scope").default("individual"), // workspace,team,individual
  scopeId: text("scope_id"),
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userRuleTypeIdx: index("cor_user_rule_type_idx").on(t.userId, t.ruleType),
}));

// ============================================================
// FEATURE 17: AI TEMPLATE ENGINE
// ============================================================
export const aiTemplates = pgTable("ai_templates", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // project_management,personal,marketing,engineering,hr,sales,design,custom
  type: text("type").notNull(), // page,database,workspace,workflow,agent
  content: jsonb("content").$defaultFn(() => ({})),
  thumbnail: text("thumbnail"),
  isPublic: boolean("is_public").default(false),
  usageCount: integer("usage_count").default(0),
  rating: real("rating").default(0),
  tags: text("tags").array().$defaultFn(() => []),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  userIdx: index("at_user_idx").on(t.userId),
  categoryPublicIdx: index("at_category_public_idx").on(t.category, t.isPublic),
}));

// ============================================================
// FEATURE 18: AI VOICE COMMANDS & NOTES
// ============================================================
export const voiceNotes = pgTable("voice_notes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  audioUrl: text("audio_url").notNull(),
  durationSecs: integer("duration_secs").notNull(),
  transcript: text("transcript"),
  aiSummary: text("ai_summary"),
  convertedTo: text("converted_to"), // task,page,meeting_note
  convertedId: text("converted_id"),
  status: text("status").default("recording"), // recording,transcribing,completed,failed
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userCreatedIdx: index("vn_user_created_idx").on(t.userId, t.createdAt),
}));

// ============================================================
// FEATURE 19: AI WORKFLOW RECORDER
// ============================================================
export const aiWorkflows = pgTable("ai_workflows", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  recordedSteps: jsonb("recorded_steps").$defaultFn(() => []),
  variables: jsonb("variables").$defaultFn(() => []),
  isPublic: boolean("is_public").default(false),
  runCount: integer("run_count").default(0),
  triggerType: text("trigger_type").default("manual"), // manual,scheduled,event
  triggerConfig: jsonb("trigger_config"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  userIdx: index("aw_user_idx").on(t.userId),
}));

export const aiWorkflowRuns = pgTable("ai_workflow_runs", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").notNull(),
  userId: text("user_id").notNull(),
  variableValues: jsonb("variable_values").$defaultFn(() => ({})),
  steps: jsonb("steps").$defaultFn(() => []),
  status: text("status").default("running"), // running,completed,failed
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (t) => ({
  workflowStartedIdx: index("awr_workflow_started_idx").on(t.workflowId, t.startedAt),
}));

// ============================================================
// FEATURE 20: AI SMART NOTIFICATIONS
// ============================================================
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  alwaysNotify: text("always_notify").array().$defaultFn(() => ["direct_mention", "direct_message", "task_assigned", "deadline_today"]),
  batchNotify: text("batch_notify").array().$defaultFn(() => ["channel_message", "task_updated", "comment_added"]),
  muteNotify: text("mute_notify").array().$defaultFn(() => []),
  batchFrequency: text("batch_frequency").default("3_per_day"), // 2_per_day,3_per_day,hourly
  batchTimes: text("batch_times").array().$defaultFn(() => ["09:00", "13:00", "17:00"]),
  focusModeAction: text("focus_mode_action").default("queue"), // queue,urgent_only,all
  aiTriageEnabled: boolean("ai_triage_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiNotificationItems = pgTable("ai_notification_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // mention,dm,task_assigned,task_due,comment,reaction,channel_activity,agent_result,risk_alert,goal_update,system
  title: text("title").notNull(),
  body: text("body").notNull(),
  sourceType: text("source_type"), // message,task,meeting,agent,goal,system
  sourceId: text("source_id"),
  aiPriority: text("ai_priority").default("normal"), // urgent,important,normal,low
  isRead: boolean("is_read").default(false),
  isBatched: boolean("is_batched").default(false),
  batchId: text("batch_id"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userReadCreatedIdx: index("ani_user_read_created_idx").on(t.userId, t.isRead, t.createdAt),
  userPriorityIdx: index("ani_user_priority_idx").on(t.userId, t.aiPriority),
}));

// ============================================================
// FEATURE 21: AI TIME TRACKING
// ============================================================
export const taskDurationEstimates = pgTable("task_duration_estimates", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  userId: text("user_id").notNull(),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  actualMinutes: integer("actual_minutes"),
  confidence: real("confidence").default(0.5),
  estimatedByAi: boolean("estimated_by_ai").default(true),
  adjustedByUser: boolean("adjusted_by_user").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  taskIdUnique: uniqueIndex("tde_task_id_unique").on(t.taskId),
}));

// ============================================================
// FEATURE 22: AI TEAM COLLABORATION INSIGHTS
// ============================================================
export const teamInsightSnapshots = pgTable("team_insight_snapshots", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: date("date").notNull(),
  memberStats: jsonb("member_stats").$defaultFn(() => []),
  teamMetrics: jsonb("team_metrics").$defaultFn(() => ({})),
  aiInsights: jsonb("ai_insights").$defaultFn(() => []),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userDateUnique: uniqueIndex("tis_user_date_unique").on(t.userId, t.date),
  userDateIdx: index("tis_user_date_idx").on(t.userId, t.date),
}));

// ============================================================
// FEATURE 24: AI INTEGRATION HUB
// ============================================================
export const externalIntegrations = pgTable("external_integrations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // google_drive,github,gitlab,jira,linear,slack,figma,confluence
  displayName: text("display_name").notNull(),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  scopes: text("scopes").array().$defaultFn(() => []),
  syncEnabled: boolean("sync_enabled").default(true),
  syncStatus: text("sync_status").default("active"), // active,syncing,error,disconnected
  lastSyncAt: timestamp("last_sync_at"),
  documentCount: integer("document_count").default(0),
  errorMessage: text("error_message"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userTypeIdx: index("ei_user_type_idx").on(t.userId, t.type),
}));

// ============================================================
// FEATURE 25: AI ONBOARDING ASSISTANT
// ============================================================
export const onboardingProgress = pgTable("onboarding_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  completedSteps: text("completed_steps").array().$defaultFn(() => []),
  currentStep: text("current_step"),
  isComplete: boolean("is_complete").default(false),
  dismissedAt: timestamp("dismissed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================
// AI USAGE TRACKING (shared across all features)
// ============================================================
export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  feature: text("feature").notNull(), // writing,search,planner,agent,project_manager,task,meeting,database,focus,doc_gen,messaging,email,voice,template
  action: text("action").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  durationMs: integer("duration_ms"),
  success: boolean("success").default(true),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userFeatureCreatedIdx: index("aul_user_feature_created_idx").on(t.userId, t.feature, t.createdAt),
  userCreatedIdx: index("aul_user_created_idx").on(t.userId, t.createdAt),
}));

// ============================================================
// SPRINT 1 INSERT SCHEMAS & TYPES
// ============================================================
export const insertAiWritingHistorySchema = createInsertSchema(aiWritingHistory).omit({ id: true, createdAt: true });
export const insertBrandVoiceSchema = createInsertSchema(brandVoice).omit({ id: true, createdAt: true, updatedAt: true });
export const insertKnowledgeIndexSchema = createInsertSchema(knowledgeIndex).omit({ id: true, createdAt: true, updatedAt: true, lastIndexedAt: true });
export const insertKnowledgeQuerySchema = createInsertSchema(knowledgeQuery).omit({ id: true, createdAt: true });
export const insertKnowledgeSuggestionSchema = createInsertSchema(knowledgeSuggestion).omit({ id: true, createdAt: true });
export const insertKnowledgeItemSchema = createInsertSchema(knowledgeItem).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSchedulingPreferencesSchema = createInsertSchema(schedulingPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiAgentSchema = createInsertSchema(aiAgents).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertAgentRunSchema = createInsertSchema(agentRuns).omit({ id: true, createdAt: true });
export const insertAgentConversationSchema = createInsertSchema(agentConversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectStatusReportSchema = createInsertSchema(projectStatusReports).omit({ id: true, createdAt: true });
export const insertAiRiskAlertSchema = createInsertSchema(aiRiskAlerts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiWorkflowAutomationSchema = createInsertSchema(aiWorkflowAutomations).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertMeetingIntelligenceSchema = createInsertSchema(meetingIntelligence).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiAutoFillColumnSchema = createInsertSchema(aiAutoFillColumns).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFocusSessionSchema = createInsertSchema(focusSessions).omit({ id: true, createdAt: true });
export const insertFocusTimeBlockSchema = createInsertSchema(focusTimeBlocks).omit({ id: true, createdAt: true });
export const insertAiProductivityScoreSchema = createInsertSchema(aiProductivityScores).omit({ id: true, createdAt: true });
export const insertEmailAccountSchema = createInsertSchema(emailAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmailThreadSchema = createInsertSchema(emailThreads).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiHabitSchema = createInsertSchema(aiHabits).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertAiHabitCompletionSchema = createInsertSchema(aiHabitCompletions).omit({ id: true, completedAt: true });
export const insertAiGoalSchema = createInsertSchema(aiGoals).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertKeyResultSchema = createInsertSchema(keyResults).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCalendarOptimizationRuleSchema = createInsertSchema(calendarOptimizationRules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiTemplateSchema = createInsertSchema(aiTemplates).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertVoiceNoteSchema = createInsertSchema(voiceNotes).omit({ id: true, createdAt: true });
export const insertAiWorkflowSchema = createInsertSchema(aiWorkflows).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertAiWorkflowRunSchema = createInsertSchema(aiWorkflowRuns).omit({ id: true, startedAt: true });
export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiNotificationItemSchema = createInsertSchema(aiNotificationItems).omit({ id: true, createdAt: true });
export const insertTaskDurationEstimateSchema = createInsertSchema(taskDurationEstimates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTeamInsightSnapshotSchema = createInsertSchema(teamInsightSnapshots).omit({ id: true, createdAt: true });
export const insertExternalIntegrationSchema = createInsertSchema(externalIntegrations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOnboardingProgressSchema = createInsertSchema(onboardingProgress).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiUsageLogSchema = createInsertSchema(aiUsageLogs).omit({ id: true, createdAt: true });

// Types
export type AiWritingHistory = typeof aiWritingHistory.$inferSelect;
export type BrandVoice = typeof brandVoice.$inferSelect;
export type KnowledgeIndex = typeof knowledgeIndex.$inferSelect;
export type KnowledgeQuery = typeof knowledgeQuery.$inferSelect;
export type KnowledgeSuggestion = typeof knowledgeSuggestion.$inferSelect;
export type KnowledgeItem = typeof knowledgeItem.$inferSelect;
export type SchedulingPreferences = typeof schedulingPreferences.$inferSelect;
export type AiAgent = typeof aiAgents.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;
export type AgentConversation = typeof agentConversations.$inferSelect;
export type ProjectStatusReport = typeof projectStatusReports.$inferSelect;
export type AiRiskAlert = typeof aiRiskAlerts.$inferSelect;
export type AiWorkflowAutomation = typeof aiWorkflowAutomations.$inferSelect;
export type MeetingIntelligence = typeof meetingIntelligence.$inferSelect;
export type AiAutoFillColumn = typeof aiAutoFillColumns.$inferSelect;
export type FocusSession = typeof focusSessions.$inferSelect;
export type FocusTimeBlock = typeof focusTimeBlocks.$inferSelect;
export type AiProductivityScore = typeof aiProductivityScores.$inferSelect;
export type EmailAccount = typeof emailAccounts.$inferSelect;
export type EmailThread = typeof emailThreads.$inferSelect;
export type AiHabit = typeof aiHabits.$inferSelect;
export type AiHabitCompletion = typeof aiHabitCompletions.$inferSelect;
export type AiGoal = typeof aiGoals.$inferSelect;
export type KeyResult = typeof keyResults.$inferSelect;
export type CalendarOptimizationRule = typeof calendarOptimizationRules.$inferSelect;
export type AiTemplate = typeof aiTemplates.$inferSelect;
export type VoiceNote = typeof voiceNotes.$inferSelect;
export type AiWorkflow = typeof aiWorkflows.$inferSelect;
export type AiWorkflowRun = typeof aiWorkflowRuns.$inferSelect;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type AiNotificationItem = typeof aiNotificationItems.$inferSelect;
export type TaskDurationEstimate = typeof taskDurationEstimates.$inferSelect;
export type TeamInsightSnapshot = typeof teamInsightSnapshots.$inferSelect;
export type ExternalIntegration = typeof externalIntegrations.$inferSelect;
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type AiUsageLog = typeof aiUsageLogs.$inferSelect;

// ============================================================
// SPRINT 8-10: NEW TABLES
// ============================================================

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title"),
  description: text("description"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  allDay: boolean("all_day").default(false),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================
// SPRINT 8-10: CONVENIENCE ALIASES (map route imports to tables)
// ============================================================

export const notificationItems = aiNotificationItems;
export const templates = aiTemplates;
export const habits = aiHabits;
export const habitCompletions = aiHabitCompletions;
export const productivityScores = aiProductivityScores;

// ============================================================
// PM WORKSPACE — Phase 1: Pages, Blocks & Activity
// ============================================================

export const pmPages = pgTable("pm_pages", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  parentPageId: integer("parent_page_id"),
  workspaceId: integer("workspace_id"),
  title: text("title").notNull().default("Untitled"),
  icon: text("icon").default(""),
  coverImage: text("cover_image").default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  isFavorite: boolean("is_favorite").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  isTemplate: boolean("is_template").notNull().default(false),
  pageType: text("page_type").notNull().default("page"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPmPageSchema = createInsertSchema(pmPages).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPmPage = typeof pmPages.$inferInsert;
export type PmPage = typeof pmPages.$inferSelect;

export const pmBlocks = pgTable("pm_blocks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  pageId: integer("page_id").notNull(),
  parentBlockId: integer("parent_block_id"),
  type: text("type").notNull().default("paragraph"),
  content: jsonb("content").notNull().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPmBlockSchema = createInsertSchema(pmBlocks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPmBlock = typeof pmBlocks.$inferInsert;
export type PmBlock = typeof pmBlocks.$inferSelect;

export const pmPageActivity = pgTable("pm_page_activity", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  pageId: integer("page_id").notNull(),
  action: text("action").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPmPageActivitySchema = createInsertSchema(pmPageActivity).omit({ id: true, createdAt: true });
export type InsertPmPageActivity = typeof pmPageActivity.$inferInsert;
export type PmPageActivity = typeof pmPageActivity.$inferSelect;

// ============================================================
// PM WORKSPACE — Phase 2: Database Engine
// ============================================================

export const pmDatabases = pgTable("pm_databases", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  pageId: integer("page_id").notNull(),
  title: text("title").notNull().default("Untitled Database"),
  icon: text("icon").default(""),
  defaultView: text("default_view").notNull().default("table"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPmDatabaseSchema = createInsertSchema(pmDatabases).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPmDatabase = typeof pmDatabases.$inferInsert;
export type PmDatabase = typeof pmDatabases.$inferSelect;

export const pmDatabaseProperties = pgTable("pm_database_properties", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  databaseId: integer("database_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("text"),
  config: jsonb("config").notNull().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPmDatabasePropertySchema = createInsertSchema(pmDatabaseProperties).omit({ id: true, createdAt: true });
export type InsertPmDatabaseProperty = typeof pmDatabaseProperties.$inferInsert;
export type PmDatabaseProperty = typeof pmDatabaseProperties.$inferSelect;

export const pmDatabaseRows = pgTable("pm_database_rows", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  databaseId: integer("database_id").notNull(),
  linkedPageId: integer("linked_page_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPmDatabaseRowSchema = createInsertSchema(pmDatabaseRows).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPmDatabaseRow = typeof pmDatabaseRows.$inferInsert;
export type PmDatabaseRow = typeof pmDatabaseRows.$inferSelect;

export const pmDatabaseCells = pgTable("pm_database_cells", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  rowId: integer("row_id").notNull(),
  propertyId: integer("property_id").notNull(),
  value: jsonb("value").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPmDatabaseCellSchema = createInsertSchema(pmDatabaseCells).omit({ id: true, createdAt: true });
export type InsertPmDatabaseCell = typeof pmDatabaseCells.$inferInsert;
export type PmDatabaseCell = typeof pmDatabaseCells.$inferSelect;

export const pmDatabaseViews = pgTable("pm_database_views", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  databaseId: integer("database_id").notNull(),
  name: text("name").notNull().default("Default View"),
  type: text("type").notNull().default("table"),
  config: jsonb("config").notNull().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPmDatabaseViewSchema = createInsertSchema(pmDatabaseViews).omit({ id: true, createdAt: true });
export type InsertPmDatabaseView = typeof pmDatabaseViews.$inferInsert;
export type PmDatabaseView = typeof pmDatabaseViews.$inferSelect;

export const pmWorkspaces = pgTable("pm_workspaces", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull().default("My Workspace"),
  icon: text("icon").default(""),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPmWorkspaceSchema = createInsertSchema(pmWorkspaces).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPmWorkspace = typeof pmWorkspaces.$inferInsert;
export type PmWorkspace = typeof pmWorkspaces.$inferSelect;

export const pmWorkspaceMembers = pgTable("pm_workspace_members", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("member"),
  invitedBy: text("invited_by"),
  inviteEmail: text("invite_email"),
  inviteStatus: text("invite_status").notNull().default("accepted"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPmWorkspaceMemberSchema = createInsertSchema(pmWorkspaceMembers).omit({ id: true, createdAt: true });
export type InsertPmWorkspaceMember = typeof pmWorkspaceMembers.$inferInsert;
export type PmWorkspaceMember = typeof pmWorkspaceMembers.$inferSelect;

export const pmPagePermissions = pgTable("pm_page_permissions", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  accessLevel: text("access_level").notNull().default("view"),
  grantedBy: text("granted_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPmPagePermissionSchema = createInsertSchema(pmPagePermissions).omit({ id: true, createdAt: true });
export type InsertPmPagePermission = typeof pmPagePermissions.$inferInsert;
export type PmPagePermission = typeof pmPagePermissions.$inferSelect;

export const pmTemplates = pgTable("pm_templates", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: integer("workspace_id"),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").default(""),
  category: text("category").notNull().default("general"),
  pageSnapshot: jsonb("page_snapshot").notNull().default({}),
  blocksSnapshot: jsonb("blocks_snapshot").notNull().default([]),
  databaseSnapshot: jsonb("database_snapshot"),
  isSystemTemplate: boolean("is_system_template").notNull().default(false),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPmTemplateSchema = createInsertSchema(pmTemplates).omit({ id: true, createdAt: true });
export type InsertPmTemplate = typeof pmTemplates.$inferInsert;
export type PmTemplate = typeof pmTemplates.$inferSelect;

export const pmSearchIndex = pgTable("pm_search_index", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  pageId: integer("page_id").notNull(),
  blockId: integer("block_id"),
  contentType: text("content_type").notNull(),
  searchText: text("search_text").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPmSearchIndexSchema = createInsertSchema(pmSearchIndex).omit({ id: true });
export type InsertPmSearchIndex = typeof pmSearchIndex.$inferInsert;
export type PmSearchIndex = typeof pmSearchIndex.$inferSelect;
