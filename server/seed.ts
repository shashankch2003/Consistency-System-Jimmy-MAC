import { db } from "./db";
import {
  autopilotRules,
  autopilotPatterns,
  userAutopilotSettings,
  taskSequences,
  workPatterns,
  aiCoachingMessages,
  teamMemberProfiles,
  delegationRules,
  projectContexts,
  recordedWorkflows,
  dailyPlans,
  documentTemplatesAi,
} from "../shared/schema";

const SEED_USER_ID = process.env.SEED_USER_ID || "55050238";

async function main() {
  console.log("🌱 Seeding AI features data for user:", SEED_USER_ID);

  // ── Autopilot Settings ───────────────────────────────────────────────────
  await db
    .insert(userAutopilotSettings)
    .values({
      userId: SEED_USER_ID,
      isEnabled: true,
      executionMode: "suggest",
      maxDailyActions: 50,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      enabledRuleTypes: ["time_based", "sequence", "learned"],
      notificationPrefs: { email: false, inApp: true },
      autoGeneratePlan: true,
    })
    .onConflictDoNothing();
  console.log("✅ Autopilot settings seeded");

  // ── Autopilot Rules ──────────────────────────────────────────────────────
  await db
    .insert(autopilotRules)
    .values([
      {
        userId: SEED_USER_ID,
        name: "Morning Focus Block",
        description: "Automatically suggest deep work tasks between 9-11 AM",
        type: "time_based",
        triggerType: "time",
        triggerConfig: { dayOfWeek: [1, 2, 3, 4, 5], hourStart: 9, hourEnd: 11 },
        actions: [{ type: "suggest_focus", data: { taskPriority: ["Very Important", "Important"] } }],
        executionMode: "suggest",
        isActive: true,
        cooldownMinutes: 60,
        maxExecutionsPerDay: 5,
        tags: ["focus", "morning"],
        totalExecutions: 12,
        successfulExecutions: 11,
      },
      {
        userId: SEED_USER_ID,
        name: "End-of-Day Review",
        description: "Trigger a daily review at 5 PM on weekdays",
        type: "time_based",
        triggerType: "time",
        triggerConfig: { dayOfWeek: [1, 2, 3, 4, 5], hourStart: 17, hourEnd: 18 },
        actions: [{ type: "remind", data: { message: "Time for your daily review!" } }],
        executionMode: "auto",
        isActive: true,
        cooldownMinutes: 1440,
        maxExecutionsPerDay: 1,
        tags: ["review", "evening"],
        totalExecutions: 8,
        successfulExecutions: 8,
      },
      {
        userId: SEED_USER_ID,
        name: "Task Completion Celebration",
        description: "Log an activity when 5+ tasks are completed in a day",
        type: "threshold",
        triggerType: "event",
        triggerConfig: { event: "task_completed", count: 5, period: "day" },
        actions: [{ type: "log", data: { message: "Productivity milestone reached!" } }],
        executionMode: "auto",
        isActive: true,
        tags: ["motivation"],
        totalExecutions: 4,
        successfulExecutions: 4,
      },
    ])
    .onConflictDoNothing();
  console.log("✅ Autopilot rules seeded");

  // ── Autopilot Patterns ───────────────────────────────────────────────────
  await db
    .insert(autopilotPatterns)
    .values([
      {
        userId: SEED_USER_ID,
        patternType: "time_based",
        description: "You often start deep work sessions on Monday mornings at 9 AM",
        eventSequence: [{ dayOfWeek: 1, hourOfDay: 9, eventType: "focus_start" }],
        frequency: 8,
        confidence: 0.88,
        status: "detected",
        suggestedRule: { name: "Auto: Monday Morning Focus", triggerType: "time", triggerConfig: { dayOfWeek: [1], hourStart: 9, hourEnd: 11 }, actions: [], executionMode: "suggest" },
        detectedAt: new Date(),
        lastOccurredAt: new Date(),
      },
      {
        userId: SEED_USER_ID,
        patternType: "sequence",
        description: "After completing planning tasks, you typically start a focused coding session",
        eventSequence: [{ type: "task_complete", titlePattern: "plan" }, { type: "focus_start" }],
        frequency: 6,
        confidence: 0.82,
        status: "detected",
        suggestedRule: { name: "Auto: Post-Planning Focus", triggerType: "sequence", triggerConfig: { precedingPattern: "plan" }, actions: [], executionMode: "suggest" },
        detectedAt: new Date(),
        lastOccurredAt: new Date(),
      },
    ])
    .onConflictDoNothing();
  console.log("✅ Autopilot patterns seeded");

  // ── Task Sequences ───────────────────────────────────────────────────────
  await db
    .insert(taskSequences)
    .values([
      {
        userId: SEED_USER_ID,
        precedingTaskPattern: { titlePattern: "plan", matchType: "contains" },
        followingTaskPattern: { titlePattern: "implement", matchType: "contains" },
        occurrences: 5,
        confidence: 0.8,
        lastObservedAt: new Date(),
        isActive: true,
      },
      {
        userId: SEED_USER_ID,
        precedingTaskPattern: { titlePattern: "research", matchType: "contains" },
        followingTaskPattern: { titlePattern: "write", matchType: "contains" },
        occurrences: 4,
        confidence: 0.75,
        lastObservedAt: new Date(),
        isActive: true,
      },
      {
        userId: SEED_USER_ID,
        precedingTaskPattern: { titlePattern: "review", matchType: "contains" },
        followingTaskPattern: { titlePattern: "update", matchType: "contains" },
        occurrences: 3,
        confidence: 0.72,
        lastObservedAt: new Date(),
        isActive: true,
      },
    ])
    .onConflictDoNothing();
  console.log("✅ Task sequences seeded");

  // ── Work Patterns ────────────────────────────────────────────────────────
  await db
    .insert(workPatterns)
    .values([
      {
        userId: SEED_USER_ID,
        patternType: "weekly_summary",
        data: { totalActiveMins: 1840, sessionCount: 5, avgSessionMins: 368, peakHour: 10 },
        analysisDate: new Date(),
        periodDays: 7,
      },
      {
        userId: SEED_USER_ID,
        patternType: "monthly_summary",
        data: { totalActiveMins: 7200, sessionCount: 22, avgSessionMins: 327, peakDay: 2 },
        analysisDate: new Date(),
        periodDays: 30,
      },
    ])
    .onConflictDoNothing();
  console.log("✅ Work patterns seeded");

  // ── AI Coaching Messages ─────────────────────────────────────────────────
  await db
    .insert(aiCoachingMessages)
    .values([
      {
        userId: SEED_USER_ID,
        type: "weekly_insight",
        title: "Weekly Productivity Insight",
        content: "You averaged 6.1 hours of deep work this week — 23% above your monthly average. Your best sessions happen on Tuesdays between 9–11 AM. Consider blocking that time permanently.",
        actionable: true,
        priority: "medium",
        actionData: { ruleConfig: { name: "Tuesday Morning Block", triggerType: "time", triggerConfig: { dayOfWeek: [2], hourStart: 9, hourEnd: 11 }, actions: [], executionMode: "suggest" } },
        isRead: false,
      },
      {
        userId: SEED_USER_ID,
        type: "pattern_detected",
        title: "Pattern Detected: Context Switching",
        content: "You tend to switch tasks frequently on Friday afternoons. This costs roughly 20 minutes of re-focus time per switch. Try batching smaller tasks before 3 PM on Fridays.",
        actionable: false,
        priority: "low",
        isRead: false,
      },
      {
        userId: SEED_USER_ID,
        type: "goal_alert",
        title: "At Risk: Monthly Goal",
        content: "You're 40% through the month but have only completed 22% of your monthly tasks. To stay on track, aim to complete at least 3 tasks per day for the next two weeks.",
        actionable: false,
        priority: "high",
        isRead: false,
      },
    ])
    .onConflictDoNothing();
  console.log("✅ AI coaching messages seeded");

  // ── Team Member Profile ──────────────────────────────────────────────────
  await db
    .insert(teamMemberProfiles)
    .values({
      userId: SEED_USER_ID,
      skills: ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL"],
      domains: ["Frontend", "Backend", "Database"],
      currentWorkload: { total: 12, overdue: 1, capacityPercent: 65 },
      availability: { available: true, hoursPerWeek: 40, timezone: "Asia/Kolkata" },
      preferences: { prefersMorningWork: true, preferredTaskDuration: 45 },
      performanceMetrics: { completionRate: 0.87, avgTaskDurationMins: 52, totalCompleted: 143 },
      lastProfileUpdateAt: new Date(),
    })
    .onConflictDoNothing();
  console.log("✅ Team member profile seeded");

  // ── Delegation Rules ─────────────────────────────────────────────────────
  await db
    .insert(delegationRules)
    .values([
      {
        userId: SEED_USER_ID,
        name: "Delegate design tasks",
        conditions: { taskTitleContains: ["design", "ui", "mockup"], taskPriority: ["Normal"] },
        preferredDelegateId: null,
        requiredSkills: ["Design", "Figma"],
        isActive: true,
        createdBy: SEED_USER_ID,
      },
      {
        userId: SEED_USER_ID,
        name: "Delegate low-priority research",
        conditions: { taskTitleContains: ["research", "investigate", "explore"], taskPriority: ["Normal"] },
        preferredDelegateId: null,
        requiredSkills: [],
        isActive: true,
        createdBy: SEED_USER_ID,
      },
    ])
    .onConflictDoNothing();
  console.log("✅ Delegation rules seeded");

  // ── Project Contexts ─────────────────────────────────────────────────────
  await db
    .insert(projectContexts)
    .values([
      {
        userId: SEED_USER_ID,
        projectName: "Consistency System",
        projectId: null,
        recentFiles: ["server/routes.ts", "client/src/App.tsx", "shared/schema.ts"],
        openTabs: ["Dashboard", "Tasks", "Autopilot"],
        lastTasks: ["Add AI routes", "Seed data", "Fix schema"],
        notes: "Main SaaS platform — React + Express + PostgreSQL",
        color: "#6366f1",
        icon: "🚀",
        lastActiveAt: new Date(),
        aiCatchUpSummary: null,
      },
      {
        userId: SEED_USER_ID,
        projectName: "Marketing Website",
        projectId: null,
        recentFiles: ["public/index.html", "src/pages/landing.tsx"],
        openTabs: ["Landing Page", "Pricing"],
        lastTasks: ["Update hero copy", "Add testimonials"],
        notes: "Public-facing marketing site for conversions",
        color: "#f59e0b",
        icon: "🌐",
        lastActiveAt: new Date(Date.now() - 2 * 86400000),
        aiCatchUpSummary: null,
      },
    ])
    .onConflictDoNothing();
  console.log("✅ Project contexts seeded");

  // ── Recorded Workflows ───────────────────────────────────────────────────
  await db
    .insert(recordedWorkflows)
    .values([
      {
        userId: SEED_USER_ID,
        name: "Daily Standup Prep",
        description: "Create today's standup note, check outstanding tasks, and update status",
        steps: [
          { action: "navigate", target: "/dashboard/tasks", label: "Open Tasks" },
          { action: "navigate", target: "/dashboard/notes", label: "Open Notes" },
          { action: "create_note", label: "Create standup note" },
        ],
        processedSteps: [
          { type: "navigate", data: { path: "/dashboard/tasks" }, label: "Open Tasks" },
          { type: "create_note", data: { title: `Standup – ${new Date().toLocaleDateString()}` }, label: "Create standup note" },
        ],
        triggerType: "manual",
        isPublic: false,
        category: "meetings",
        tags: ["standup", "daily"],
        timesRun: 14,
        avgDurationSeconds: 45,
        lastRunAt: new Date(),
        icon: "☀️",
      },
      {
        userId: SEED_USER_ID,
        name: "Weekly Review",
        description: "Review completed tasks, update goals, and plan next week",
        steps: [
          { action: "navigate", target: "/dashboard/tasks", label: "Review Tasks" },
          { action: "navigate", target: "/dashboard/yearly-goals", label: "Update Goals" },
          { action: "create_task", label: "Plan next week tasks" },
        ],
        processedSteps: [
          { type: "navigate", data: { path: "/dashboard/yearly-goals" }, label: "Update Goals" },
          { type: "create_task", data: { title: "Next week planning" }, label: "Plan tasks" },
        ],
        triggerType: "scheduled",
        isPublic: true,
        category: "planning",
        tags: ["weekly", "review", "planning"],
        timesRun: 6,
        avgDurationSeconds: 180,
        lastRunAt: new Date(Date.now() - 7 * 86400000),
        icon: "📋",
      },
      {
        userId: SEED_USER_ID,
        name: "Project Kickoff",
        description: "Set up a new project: create tasks, notes, and set initial goals",
        steps: [
          { action: "create_task", label: "Create initial tasks" },
          { action: "create_note", label: "Project brief note" },
          { action: "navigate", target: "/dashboard/yearly-goals", label: "Set project goals" },
        ],
        processedSteps: [
          { type: "create_task", data: { title: "Project kickoff task" }, label: "Create initial task" },
          { type: "create_note", data: { title: "Project Brief" }, label: "Project brief note" },
        ],
        triggerType: "manual",
        isPublic: true,
        category: "project_management",
        tags: ["kickoff", "project", "setup"],
        timesRun: 3,
        avgDurationSeconds: 120,
        lastRunAt: new Date(Date.now() - 14 * 86400000),
        icon: "🎯",
      },
    ])
    .onConflictDoNothing();
  console.log("✅ Recorded workflows seeded");

  // ── Daily Plan ───────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  await db
    .insert(dailyPlans)
    .values({
      userId: SEED_USER_ID,
      date: today,
      status: "active",
      generatedPlan: {
        blocks: [
          { id: "b1", startTime: "09:00", durationMinutes: 90, title: "Deep Work: Priority Tasks", type: "focus", priority: "Very Important" },
          { id: "b2", startTime: "10:30", durationMinutes: 30, title: "Email & Messages", type: "communication", priority: "Important" },
          { id: "b3", startTime: "11:00", durationMinutes: 60, title: "Project Development", type: "task", priority: "Important" },
          { id: "b4", startTime: "12:00", durationMinutes: 60, title: "Lunch Break", type: "break", priority: "Normal" },
          { id: "b5", startTime: "13:00", durationMinutes: 90, title: "Meetings & Collaboration", type: "meeting", priority: "Important" },
          { id: "b6", startTime: "14:30", durationMinutes: 60, title: "Creative Work", type: "focus", priority: "Should Do" },
          { id: "b7", startTime: "15:30", durationMinutes: 30, title: "Admin Tasks", type: "task", priority: "Normal" },
          { id: "b8", startTime: "16:00", durationMinutes: 30, title: "Daily Review & Planning", type: "review", priority: "Important" },
        ],
        reasoning: "Schedule optimized for your peak hours (9-11 AM deep work) based on your historical patterns. Administrative tasks placed in low-energy afternoon slots.",
        totalFocusMinutes: 240,
        totalBreakMinutes: 60,
      },
      userModifications: {},
      aiInsights: {
        peakHour: "10:00",
        recommendation: "Your historical data shows 40% higher productivity when you start deep work before 9:30 AM.",
        riskBlocks: ["b7"],
      },
    })
    .onConflictDoNothing();
  console.log("✅ Daily plan seeded");

  // ── Document Templates ───────────────────────────────────────────────────
  await db
    .insert(documentTemplatesAi)
    .values([
      {
        name: "Weekly Status Report",
        description: "Generate a comprehensive weekly status report with task completion stats, highlights, and next steps",
        category: "reports",
        icon: "📊",
        isBuiltIn: true,
        sections: [
          { title: "Executive Summary", type: "ai_generated", aiPrompt: "Write a 2-3 sentence executive summary of this week's productivity and accomplishments" },
          { title: "Completed Tasks", type: "data_query", dataQuery: "tasks" },
          { title: "Key Wins This Week", type: "ai_generated", aiPrompt: "Identify the 3 most impactful completed tasks and explain their value" },
          { title: "Blockers & Challenges", type: "static_text", content: "[Add any blockers or challenges you faced this week]" },
          { title: "Next Week Plan", type: "ai_generated", aiPrompt: "Based on current tasks and patterns, suggest the top 5 priorities for next week" },
        ],
        variables: [{ name: "weekStart", label: "Week Start Date", type: "date" }, { name: "weekEnd", label: "Week End Date", type: "date" }],
        outputFormat: "markdown",
        estimatedTokens: 800,
        usageCount: 0,
        createdBy: SEED_USER_ID,
      },
      {
        name: "Project Kickoff Brief",
        description: "Create a structured project kickoff document with goals, scope, and action plan",
        category: "project_management",
        icon: "🚀",
        isBuiltIn: true,
        sections: [
          { title: "Project Overview", type: "static_text", content: "[Describe the project vision and why it matters]" },
          { title: "Goals & Success Metrics", type: "ai_generated", aiPrompt: "Based on current active goals, draft 3 SMART goals for this project" },
          { title: "Scope & Deliverables", type: "static_text", content: "[List what is in and out of scope]" },
          { title: "Action Plan", type: "ai_generated", aiPrompt: "Create a phased action plan with milestones for the next 4 weeks" },
          { title: "Risks & Mitigation", type: "ai_generated", aiPrompt: "Identify 3 potential risks and suggest mitigation strategies" },
        ],
        variables: [{ name: "projectName", label: "Project Name", type: "text" }],
        outputFormat: "markdown",
        estimatedTokens: 700,
        usageCount: 0,
        createdBy: SEED_USER_ID,
      },
      {
        name: "Personal Productivity Review",
        description: "Monthly reflection on habits, productivity metrics, and growth areas",
        category: "personal",
        icon: "🌟",
        isBuiltIn: true,
        sections: [
          { title: "Month in Review", type: "ai_generated", aiPrompt: "Write a reflective summary of this month's productivity journey" },
          { title: "Habit Performance", type: "ai_generated", aiPrompt: "Analyze habit consistency and identify the strongest and weakest habits" },
          { title: "Task Statistics", type: "data_query", dataQuery: "tasks" },
          { title: "Insights & Patterns", type: "ai_generated", aiPrompt: "What are the key productivity patterns and what do they reveal?" },
          { title: "Goals for Next Month", type: "ai_generated", aiPrompt: "Based on this month's performance, suggest 3 improvement goals for next month" },
        ],
        variables: [{ name: "month", label: "Month", type: "text" }],
        outputFormat: "markdown",
        estimatedTokens: 900,
        usageCount: 0,
        createdBy: SEED_USER_ID,
      },
      {
        name: "Meeting Notes Template",
        description: "Structured meeting notes with action items and follow-ups",
        category: "meetings",
        icon: "📝",
        isBuiltIn: true,
        sections: [
          { title: "Meeting Details", type: "static_text", content: "**Date**: \n**Attendees**: \n**Purpose**: " },
          { title: "Agenda", type: "static_text", content: "1. \n2. \n3. " },
          { title: "Discussion Points", type: "static_text", content: "[Key points discussed]" },
          { title: "Decisions Made", type: "static_text", content: "- \n- " },
          { title: "Action Items", type: "static_text", content: "| Task | Owner | Due Date |\n|------|-------|----------|\n|  |  |  |" },
          { title: "Follow-up Summary", type: "ai_generated", aiPrompt: "Generate a brief summary of key decisions and next steps from the meeting" },
        ],
        variables: [{ name: "meetingTitle", label: "Meeting Title", type: "text" }],
        outputFormat: "markdown",
        estimatedTokens: 400,
        usageCount: 0,
        createdBy: SEED_USER_ID,
      },
      {
        name: "Goal Setting Worksheet",
        description: "Structured template for setting and planning quarterly goals",
        category: "planning",
        icon: "🎯",
        isBuiltIn: true,
        sections: [
          { title: "Vision Statement", type: "ai_generated", aiPrompt: "Based on existing goals, craft an inspiring vision statement for this quarter" },
          { title: "Current Goals Overview", type: "data_query", dataQuery: "notes" },
          { title: "SMART Goals", type: "static_text", content: "**Goal 1**: \n- Specific: \n- Measurable: \n- Achievable: \n- Relevant: \n- Time-bound: \n\n**Goal 2**: \n\n**Goal 3**: " },
          { title: "Key Actions", type: "ai_generated", aiPrompt: "For each goal area, list 3 concrete actions to take this week" },
          { title: "Accountability Plan", type: "static_text", content: "**Check-in frequency**: \n**Success metric**: \n**Accountability partner**: " },
        ],
        variables: [{ name: "quarter", label: "Quarter (e.g. Q2 2026)", type: "text" }],
        outputFormat: "markdown",
        estimatedTokens: 600,
        usageCount: 0,
        createdBy: SEED_USER_ID,
      },
    ])
    .onConflictDoNothing();
  console.log("✅ Document templates seeded");

  console.log("\n🎉 Seed complete! All AI features data has been inserted.");
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
