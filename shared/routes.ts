import { z } from 'zod';
import { 
  insertPaymentSchema, insertYearlyGoalSchema, insertMonthlyOverviewGoalSchema, insertMonthlyDynamicGoalSchema,
  insertTaskSchema, insertGoodHabitSchema, insertGoodHabitEntrySchema, 
  insertBadHabitSchema, insertBadHabitEntrySchema, insertHourlyEntrySchema, insertTaskBankItemSchema, insertDailyReasonSchema, insertNoteSchema,
  insertExpenseSchema, insertExpenseCategorySchema, insertBudgetSchema, insertSubscriptionSchema, insertBillSchema, insertCreditCardSchema, insertSavingsGoalSchema,
  payments, yearlyGoals, monthlyOverviewGoals, monthlyDynamicGoals, tasks, goodHabits, goodHabitEntries, badHabits, badHabitEntries, hourlyEntries, taskBankItems, dailyReasons, notes,
  expenses, expenseCategories, budgets, subscriptions, bills, creditCards, savingsGoals, moneySettings,
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  yearlyGoals: {
    list: {
      method: 'GET' as const, path: '/api/yearly-goals' as const,
      input: z.object({ year: z.coerce.number().optional() }).optional(),
      responses: { 200: z.array(z.custom<typeof yearlyGoals.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const, path: '/api/yearly-goals' as const,
      input: insertYearlyGoalSchema.omit({ userId: true }),
      responses: { 201: z.custom<typeof yearlyGoals.$inferSelect>(), 400: errorSchemas.validation }
    },
    update: {
      method: 'PUT' as const, path: '/api/yearly-goals/:id' as const,
      input: insertYearlyGoalSchema.omit({ userId: true }).partial(),
      responses: { 200: z.custom<typeof yearlyGoals.$inferSelect>(), 400: errorSchemas.validation, 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const, path: '/api/yearly-goals/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  monthlyOverviewGoals: {
    list: {
      method: 'GET' as const, path: '/api/monthly-overview-goals' as const,
      input: z.object({ year: z.coerce.number().optional() }).optional(),
      responses: { 200: z.array(z.custom<typeof monthlyOverviewGoals.$inferSelect>()) }
    },
    upsert: {
      method: 'POST' as const, path: '/api/monthly-overview-goals' as const,
      input: insertMonthlyOverviewGoalSchema.omit({ userId: true }),
      responses: { 200: z.custom<typeof monthlyOverviewGoals.$inferSelect>(), 400: errorSchemas.validation }
    }
  },
  monthlyDynamicGoals: {
    list: {
      method: 'GET' as const, path: '/api/monthly-dynamic-goals' as const,
      input: z.object({ year: z.coerce.number().optional(), month: z.coerce.number().optional() }).optional(),
      responses: { 200: z.array(z.custom<typeof monthlyDynamicGoals.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const, path: '/api/monthly-dynamic-goals' as const,
      input: insertMonthlyDynamicGoalSchema.omit({ userId: true }),
      responses: { 201: z.custom<typeof monthlyDynamicGoals.$inferSelect>(), 400: errorSchemas.validation }
    },
    update: {
      method: 'PUT' as const, path: '/api/monthly-dynamic-goals/:id' as const,
      input: insertMonthlyDynamicGoalSchema.omit({ userId: true }).partial(),
      responses: { 200: z.custom<typeof monthlyDynamicGoals.$inferSelect>(), 400: errorSchemas.validation, 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const, path: '/api/monthly-dynamic-goals/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  tasks: {
    list: {
      method: 'GET' as const, path: '/api/tasks' as const,
      input: z.object({ date: z.string().optional(), month: z.string().optional(), year: z.coerce.number().optional() }).optional(),
      responses: { 200: z.array(z.custom<typeof tasks.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const, path: '/api/tasks' as const,
      input: insertTaskSchema.omit({ userId: true }),
      responses: { 201: z.custom<typeof tasks.$inferSelect>(), 400: errorSchemas.validation }
    },
    update: {
      method: 'PUT' as const, path: '/api/tasks/:id' as const,
      input: insertTaskSchema.partial(),
      responses: { 200: z.custom<typeof tasks.$inferSelect>(), 400: errorSchemas.validation, 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const, path: '/api/tasks/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  goodHabits: {
    list: {
      method: 'GET' as const, path: '/api/good-habits' as const,
      responses: { 200: z.array(z.custom<typeof goodHabits.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const, path: '/api/good-habits' as const,
      input: insertGoodHabitSchema.omit({ userId: true }),
      responses: { 201: z.custom<typeof goodHabits.$inferSelect>(), 400: errorSchemas.validation }
    },
    update: {
      method: 'PUT' as const, path: '/api/good-habits/:id' as const,
      input: z.object({ name: z.string().min(1) }),
      responses: { 200: z.custom<typeof goodHabits.$inferSelect>(), 400: errorSchemas.validation }
    },
    delete: {
      method: 'DELETE' as const, path: '/api/good-habits/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  goodHabitEntries: {
    list: {
      method: 'GET' as const, path: '/api/good-habit-entries' as const,
      input: z.object({ month: z.string().optional() }).optional(),
      responses: { 200: z.array(z.custom<typeof goodHabitEntries.$inferSelect>()) }
    },
    createOrUpdate: {
      method: 'POST' as const, path: '/api/good-habit-entries' as const,
      input: insertGoodHabitEntrySchema,
      responses: { 200: z.custom<typeof goodHabitEntries.$inferSelect>(), 400: errorSchemas.validation }
    }
  },
  badHabits: {
    list: {
      method: 'GET' as const, path: '/api/bad-habits' as const,
      responses: { 200: z.array(z.custom<typeof badHabits.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const, path: '/api/bad-habits' as const,
      input: insertBadHabitSchema.omit({ userId: true }),
      responses: { 201: z.custom<typeof badHabits.$inferSelect>(), 400: errorSchemas.validation }
    },
    update: {
      method: 'PUT' as const, path: '/api/bad-habits/:id' as const,
      input: z.object({ name: z.string().min(1) }),
      responses: { 200: z.custom<typeof badHabits.$inferSelect>(), 400: errorSchemas.validation }
    },
    delete: {
      method: 'DELETE' as const, path: '/api/bad-habits/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  badHabitEntries: {
    list: {
      method: 'GET' as const, path: '/api/bad-habit-entries' as const,
      input: z.object({ month: z.string().optional() }).optional(),
      responses: { 200: z.array(z.custom<typeof badHabitEntries.$inferSelect>()) }
    },
    createOrUpdate: {
      method: 'POST' as const, path: '/api/bad-habit-entries' as const,
      input: insertBadHabitEntrySchema,
      responses: { 200: z.custom<typeof badHabitEntries.$inferSelect>(), 400: errorSchemas.validation }
    }
  },
  hourlyEntries: {
    list: {
      method: 'GET' as const, path: '/api/hourly-entries' as const,
      input: z.object({ date: z.string().optional(), month: z.string().optional() }).optional(),
      responses: { 200: z.array(z.custom<typeof hourlyEntries.$inferSelect>()) }
    },
    createOrUpdate: {
      method: 'POST' as const, path: '/api/hourly-entries' as const,
      input: insertHourlyEntrySchema.omit({ userId: true }),
      responses: { 200: z.custom<typeof hourlyEntries.$inferSelect>(), 400: errorSchemas.validation }
    }
  },
  dailyScore: {
    get: {
      method: 'GET' as const, path: '/api/daily-score' as const,
      input: z.object({ date: z.string() }),
      responses: { 200: z.object({
        date: z.string(),
        taskScore: z.number(),
        goodHabitScore: z.number(),
        badHabitScore: z.number(),
        hourlyScore: z.number(),
        totalScore: z.number(),
        taskCount: z.number(),
        goodHabitCount: z.number(),
        badHabitCount: z.number(),
        hourlyCount: z.number(),
      }) }
    },
    range: {
      method: 'GET' as const, path: '/api/daily-score/range' as const,
      input: z.object({ startDate: z.string(), endDate: z.string() }),
      responses: { 200: z.array(z.object({
        date: z.string(),
        totalScore: z.number(),
      })) }
    }
  },
  dailyReasons: {
    get: {
      method: 'GET' as const, path: '/api/daily-reasons' as const,
      input: z.object({ date: z.string() }),
      responses: { 200: z.custom<typeof dailyReasons.$inferSelect | null>() }
    },
    upsert: {
      method: 'POST' as const, path: '/api/daily-reasons' as const,
      input: insertDailyReasonSchema.omit({ userId: true }),
      responses: { 200: z.custom<typeof dailyReasons.$inferSelect>(), 400: errorSchemas.validation }
    }
  },
  taskBank: {
    list: {
      method: 'GET' as const, path: '/api/task-bank' as const,
      responses: { 200: z.array(z.custom<typeof taskBankItems.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const, path: '/api/task-bank' as const,
      input: insertTaskBankItemSchema.omit({ userId: true }),
      responses: { 201: z.custom<typeof taskBankItems.$inferSelect>(), 400: errorSchemas.validation }
    },
    delete: {
      method: 'DELETE' as const, path: '/api/task-bank/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    },
    assign: {
      method: 'POST' as const, path: '/api/task-bank/:id/assign' as const,
      input: z.object({ date: z.string() }),
      responses: { 201: z.custom<typeof tasks.$inferSelect>(), 400: errorSchemas.validation }
    }
  },
  notes: {
    list: {
      method: 'GET' as const, path: '/api/notes' as const,
      responses: { 200: z.array(z.custom<typeof notes.$inferSelect>()) }
    },
    get: {
      method: 'GET' as const, path: '/api/notes/:id' as const,
      responses: { 200: z.custom<typeof notes.$inferSelect>(), 404: errorSchemas.notFound }
    },
    create: {
      method: 'POST' as const, path: '/api/notes' as const,
      input: insertNoteSchema.omit({ userId: true }).partial(),
      responses: { 201: z.custom<typeof notes.$inferSelect>(), 400: errorSchemas.validation }
    },
    update: {
      method: 'PUT' as const, path: '/api/notes/:id' as const,
      input: z.object({ title: z.string().optional(), content: z.string().optional(), icon: z.string().optional(), parentId: z.number().nullable().optional() }),
      responses: { 200: z.custom<typeof notes.$inferSelect>(), 400: errorSchemas.validation }
    },
    delete: {
      method: 'DELETE' as const, path: '/api/notes/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  payments: {
    createOrder: {
      method: 'POST' as const, path: '/api/payments/create-order' as const,
      responses: { 200: z.object({ orderId: z.string(), amount: z.number() }) }
    },
    verify: {
      method: 'POST' as const, path: '/api/payments/verify' as const,
      input: z.object({ razorpayPaymentId: z.string(), razorpayOrderId: z.string(), razorpaySignature: z.string() }),
      responses: { 200: z.object({ success: z.boolean() }) }
    }
  },
  settings: {
    get: {
      method: 'GET' as const, path: '/api/settings' as const,
      responses: { 200: z.custom<typeof import("@shared/schema").userSettings.$inferSelect>() }
    },
    update: {
      method: 'PUT' as const, path: '/api/settings' as const,
      input: z.record(z.any()),
      responses: { 200: z.custom<typeof import("@shared/schema").userSettings.$inferSelect>() }
    }
  },
  comparisonStats: {
    get: {
      method: 'GET' as const, path: '/api/comparison-stats' as const,
      responses: { 200: z.object({
        dailyScores: z.array(z.object({ date: z.string(), score: z.number() })),
        weeklyAverages: z.array(z.object({ weekStart: z.string(), average: z.number(), days: z.number() })),
        monthlyAverages: z.array(z.object({ month: z.string(), average: z.number(), days: z.number() })),
        lifetime: z.object({
          average: z.number(),
          totalDays: z.number(),
          highestDaily: z.number(),
          lowestDaily: z.number(),
          bestWeek: z.object({ weekStart: z.string(), average: z.number(), days: z.number() }).nullable(),
          bestMonth: z.object({ month: z.string(), average: z.number(), days: z.number() }).nullable(),
        }),
      }) }
    }
  },

  // ===== MONEY TRACKING API =====
  moneySettings: {
    get: { method: 'GET' as const, path: '/api/money/settings' as const, responses: { 200: z.custom<typeof moneySettings.$inferSelect>() } },
    update: { method: 'PUT' as const, path: '/api/money/settings' as const, input: z.record(z.any()), responses: { 200: z.custom<typeof moneySettings.$inferSelect>() } },
  },
  moneyCategories: {
    list: { method: 'GET' as const, path: '/api/money/categories' as const, responses: { 200: z.array(z.custom<typeof expenseCategories.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/money/categories' as const, input: insertExpenseCategorySchema.omit({ userId: true }), responses: { 201: z.custom<typeof expenseCategories.$inferSelect>() } },
    update: { method: 'PUT' as const, path: '/api/money/categories/:id' as const, input: insertExpenseCategorySchema.partial(), responses: { 200: z.custom<typeof expenseCategories.$inferSelect>() } },
    delete: { method: 'DELETE' as const, path: '/api/money/categories/:id' as const, responses: { 204: z.void() } },
  },
  moneyExpenses: {
    list: { method: 'GET' as const, path: '/api/money/expenses' as const, responses: { 200: z.array(z.custom<typeof expenses.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/money/expenses' as const, input: insertExpenseSchema.omit({ userId: true }), responses: { 201: z.custom<typeof expenses.$inferSelect>() } },
    update: { method: 'PUT' as const, path: '/api/money/expenses/:id' as const, input: insertExpenseSchema.omit({ userId: true }).partial(), responses: { 200: z.custom<typeof expenses.$inferSelect>() } },
    delete: { method: 'DELETE' as const, path: '/api/money/expenses/:id' as const, responses: { 204: z.void() } },
  },
  moneyBudgets: {
    list: { method: 'GET' as const, path: '/api/money/budgets' as const, responses: { 200: z.array(z.custom<typeof budgets.$inferSelect>()) } },
    upsert: { method: 'POST' as const, path: '/api/money/budgets' as const, input: insertBudgetSchema.omit({ userId: true }), responses: { 200: z.custom<typeof budgets.$inferSelect>() } },
    delete: { method: 'DELETE' as const, path: '/api/money/budgets/:id' as const, responses: { 204: z.void() } },
  },
  moneySubscriptions: {
    list: { method: 'GET' as const, path: '/api/money/subscriptions' as const, responses: { 200: z.array(z.custom<typeof subscriptions.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/money/subscriptions' as const, input: insertSubscriptionSchema.omit({ userId: true }), responses: { 201: z.custom<typeof subscriptions.$inferSelect>() } },
    update: { method: 'PUT' as const, path: '/api/money/subscriptions/:id' as const, input: insertSubscriptionSchema.omit({ userId: true }).partial(), responses: { 200: z.custom<typeof subscriptions.$inferSelect>() } },
    delete: { method: 'DELETE' as const, path: '/api/money/subscriptions/:id' as const, responses: { 204: z.void() } },
  },
  moneyBills: {
    list: { method: 'GET' as const, path: '/api/money/bills' as const, responses: { 200: z.array(z.custom<typeof bills.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/money/bills' as const, input: insertBillSchema.omit({ userId: true }), responses: { 201: z.custom<typeof bills.$inferSelect>() } },
    update: { method: 'PUT' as const, path: '/api/money/bills/:id' as const, input: insertBillSchema.omit({ userId: true }).partial(), responses: { 200: z.custom<typeof bills.$inferSelect>() } },
    delete: { method: 'DELETE' as const, path: '/api/money/bills/:id' as const, responses: { 204: z.void() } },
  },
  moneyCreditCards: {
    list: { method: 'GET' as const, path: '/api/money/credit-cards' as const, responses: { 200: z.array(z.custom<typeof creditCards.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/money/credit-cards' as const, input: insertCreditCardSchema.omit({ userId: true }), responses: { 201: z.custom<typeof creditCards.$inferSelect>() } },
    update: { method: 'PUT' as const, path: '/api/money/credit-cards/:id' as const, input: insertCreditCardSchema.omit({ userId: true }).partial(), responses: { 200: z.custom<typeof creditCards.$inferSelect>() } },
    delete: { method: 'DELETE' as const, path: '/api/money/credit-cards/:id' as const, responses: { 204: z.void() } },
  },
  moneySavingsGoals: {
    list: { method: 'GET' as const, path: '/api/money/savings-goals' as const, responses: { 200: z.array(z.custom<typeof savingsGoals.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/money/savings-goals' as const, input: insertSavingsGoalSchema.omit({ userId: true }), responses: { 201: z.custom<typeof savingsGoals.$inferSelect>() } },
    update: { method: 'PUT' as const, path: '/api/money/savings-goals/:id' as const, input: insertSavingsGoalSchema.omit({ userId: true }).partial(), responses: { 200: z.custom<typeof savingsGoals.$inferSelect>() } },
    delete: { method: 'DELETE' as const, path: '/api/money/savings-goals/:id' as const, responses: { 204: z.void() } },
  },
  moneyDashboard: {
    get: { method: 'GET' as const, path: '/api/money/dashboard' as const, responses: { 200: z.any() } },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
