import { pgTable, text, serial, integer, boolean, timestamp, varchar, uuid, jsonb, numeric, date, uniqueIndex, index } from "drizzle-orm/pg-core";
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
  date: date("date").notNull(),
  minutes: integer("minutes").notNull(),
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
