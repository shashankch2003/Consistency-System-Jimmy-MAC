import { z } from 'zod';
import { 
  insertPaymentSchema, insertYearlyGoalSchema, insertMonthlyOverviewGoalSchema, insertMonthlyDynamicGoalSchema,
  insertTaskSchema, insertGoodHabitSchema, insertGoodHabitEntrySchema, 
  insertBadHabitSchema, insertBadHabitEntrySchema, insertHourlyEntrySchema,
  payments, yearlyGoals, monthlyOverviewGoals, monthlyDynamicGoals, tasks, goodHabits, goodHabitEntries, badHabits, badHabitEntries, hourlyEntries 
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
      input: z.object({ date: z.string().optional() }).optional(),
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
      input: z.object({ date: z.string().optional() }).optional(),
      responses: { 200: z.array(z.custom<typeof hourlyEntries.$inferSelect>()) }
    },
    createOrUpdate: {
      method: 'POST' as const, path: '/api/hourly-entries' as const,
      input: insertHourlyEntrySchema.omit({ userId: true }),
      responses: { 200: z.custom<typeof hourlyEntries.$inferSelect>(), 400: errorSchemas.validation }
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
  }
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
