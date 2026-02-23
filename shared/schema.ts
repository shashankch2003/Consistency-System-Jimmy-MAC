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
