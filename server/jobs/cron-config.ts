// server/jobs/cron-config.ts
// node-cron scheduled jobs for all 25 AI features (NO BullMQ, NO Redis)

import cron from "node-cron";

// ============================================================
// RECURRING JOB SCHEDULES
// ============================================================

export function setupAiCronJobs() {
  // Feature 2: Full knowledge reindex — every Sunday 2 AM
  cron.schedule("0 2 * * 0", async () => {
    try {
      const { db } = await import("../db");
      const { knowledgeIndex } = await import("../../shared/schema");
      const { sql } = await import("drizzle-orm");
      await db.update(knowledgeIndex).set({ isStale: true, updatedAt: new Date() });
    } catch (err) {
      // silent — don't crash the server
    }
  });

  // Feature 2: Index new content — every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      // Placeholder: index recently created tasks and notes
    } catch (err) {
      // silent
    }
  });

  // Feature 3: Generate daily plans — 7 AM daily
  cron.schedule("0 7 * * *", async () => {
    try {
      // Placeholder: trigger daily plan generation for active users
    } catch (err) {
      // silent
    }
  });

  // Feature 5: Risk detection scan — every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    try {
      // Placeholder: scan all projects for risks
    } catch (err) {
      // silent
    }
  });

  // Feature 9: Update productivity scores — daily at midnight
  cron.schedule("0 0 * * *", async () => {
    try {
      // Placeholder: calculate daily productivity scores for all users
    } catch (err) {
      // silent
    }
  });

  // Feature 14: Update habit streaks — daily at midnight
  cron.schedule("0 0 * * *", async () => {
    try {
      // Placeholder: check habit completions and update streaks
    } catch (err) {
      // silent
    }
  });

  // Feature 16: Calendar optimization — every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      // Placeholder: apply calendar optimization rules
    } catch (err) {
      // silent
    }
  });

  // Feature 20: Process notification batches — 3x daily (9am, 1pm, 5pm UTC)
  cron.schedule("0 9,13,17 * * *", async () => {
    try {
      // Placeholder: batch and deliver queued notifications
    } catch (err) {
      // silent
    }
  });

  // Feature 22: Team insight snapshots — daily at 11 PM
  cron.schedule("0 23 * * *", async () => {
    try {
      // Placeholder: generate team insight snapshots
    } catch (err) {
      // silent
    }
  });
}
