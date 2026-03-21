import { db } from "../../db";
import { teamDailySnapshots, teamAiInsights, teamAlerts } from "@shared/schema";
import {
  calculateTaskCompletionRate,
  calculateFocusScore,
  calculateConsistencyScore,
  calculateExecutionScore,
  calculateCollaborationScore,
  calculateProductivityScore,
} from "../../../shared/lib/team-intelligence/scoring";

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

type Personality = 'high_performer' | 'steady' | 'improving' | 'struggling';

function getPersonality(idx: number, total: number): Personality {
  const quarter = total / 4;
  if (idx < quarter) return 'high_performer';
  if (idx < quarter * 2) return 'steady';
  if (idx < quarter * 3) return 'improving';
  return 'struggling';
}

function generateDay(personality: Personality, dayIndex: number, totalDays: number) {
  let activeTimeMinutes: number, deepWorkMinutes: number, meetingTimeMinutes: number;
  let tasksAssigned: number, tasksCompleted: number, tasksOverdue: number;
  let contextSwitches: number, avgFocusSession: number;

  switch (personality) {
    case 'high_performer':
      activeTimeMinutes = rand(420, 510);
      deepWorkMinutes = rand(180, 240);
      meetingTimeMinutes = rand(30, 90);
      tasksAssigned = rand(6, 12);
      tasksCompleted = rand(Math.max(2, tasksAssigned - 2), tasksAssigned);
      tasksOverdue = rand(0, 1);
      contextSwitches = rand(3, 10);
      avgFocusSession = rand(40, 55);
      break;
    case 'steady':
      activeTimeMinutes = rand(360, 450);
      deepWorkMinutes = rand(120, 180);
      meetingTimeMinutes = rand(60, 120);
      tasksAssigned = rand(5, 9);
      tasksCompleted = rand(Math.max(2, tasksAssigned - 3), tasksAssigned);
      tasksOverdue = rand(0, 2);
      contextSwitches = rand(8, 18);
      avgFocusSession = rand(25, 40);
      break;
    case 'improving': {
      const progress = dayIndex / totalDays;
      activeTimeMinutes = rand(300 + Math.floor(progress * 100), 400 + Math.floor(progress * 80));
      deepWorkMinutes = rand(60 + Math.floor(progress * 120), 120 + Math.floor(progress * 100));
      meetingTimeMinutes = rand(60, 130);
      tasksAssigned = rand(4, 10);
      tasksCompleted = rand(Math.max(2, Math.floor(tasksAssigned * (0.5 + progress * 0.4))), tasksAssigned);
      tasksOverdue = rand(0, Math.max(0, 3 - Math.floor(progress * 3)));
      contextSwitches = rand(Math.max(3, 20 - Math.floor(progress * 12)), 25 - Math.floor(progress * 10));
      avgFocusSession = rand(15 + Math.floor(progress * 20), 30 + Math.floor(progress * 20));
      break;
    }
    case 'struggling':
      activeTimeMinutes = rand(300, 400);
      deepWorkMinutes = rand(60, 120);
      meetingTimeMinutes = rand(90, 150);
      tasksAssigned = rand(3, 8);
      tasksCompleted = rand(2, Math.max(2, tasksAssigned - 2));
      tasksOverdue = rand(1, 3);
      contextSwitches = rand(15, 25);
      avgFocusSession = rand(15, 30);
      break;
  }

  const shallowWorkMinutes = Math.max(0, activeTimeMinutes - deepWorkMinutes - meetingTimeMinutes);
  const focusSessionMinutes = Math.floor(deepWorkMinutes * randFloat(0.6, 0.9));
  const longestFocusSession = avgFocusSession + rand(10, 30);
  const tasksInProgress = Math.max(0, tasksAssigned - tasksCompleted);

  const taskCompletion = calculateTaskCompletionRate(tasksCompleted, tasksAssigned);
  const focus = calculateFocusScore(deepWorkMinutes, avgFocusSession, contextSwitches);
  const deadlineAdherence = tasksAssigned > 0 ? Math.min(100, Math.round(((tasksAssigned - tasksOverdue) / tasksAssigned) * 100)) : 100;
  const execution = calculateExecutionScore(deadlineAdherence, rand(50, 95), rand(55, 90));
  const collaboration = calculateCollaborationScore(rand(50, 95), rand(40, 90), rand(45, 85));
  const consistency = 70;
  const scores = calculateProductivityScore({ taskCompletion, focus, deadlineAdherence, consistency, execution, collaboration });

  return {
    activeTimeMinutes,
    deepWorkMinutes,
    shallowWorkMinutes,
    meetingTimeMinutes,
    focusSessionMinutes,
    tasksAssigned,
    tasksCompleted,
    tasksOverdue,
    tasksInProgress,
    contextSwitches,
    avgFocusSession,
    longestFocusSession,
    productivityScore: String(scores.total),
    focusScore: String(focus),
    consistencyScore: String(consistency),
    executionScore: String(execution),
    collaborationScore: String(collaboration),
  };
}

const insightTemplates = [
  { category: 'achievement', title: 'Task Completion Streak', message: 'You completed all assigned tasks for 3 consecutive days. Keep it up!' },
  { category: 'achievement', title: 'Focus Champion', message: 'Your deep work time exceeded the team average by 40% this week.' },
  { category: 'warning', title: 'Increasing Overdue Tasks', message: 'Your overdue task count has risen from 1 to 3 over the past week.' },
  { category: 'warning', title: 'Meeting Overload', message: 'Meetings consumed over 50% of your active time on 3 of the last 5 days.' },
  { category: 'suggestion', title: 'Try Time Blocking', message: 'Based on your focus patterns, scheduling 2-hour deep work blocks in the morning could boost your productivity score.' },
  { category: 'suggestion', title: 'Reduce Context Switches', message: 'Your context switches are 35% above team average. Try batching similar tasks together.' },
  { category: 'pattern', title: 'Afternoon Productivity Dip', message: 'Your task completion rate drops by 30% after 2 PM consistently.' },
  { category: 'coaching', title: 'Build on Your Momentum', message: 'Your scores have improved 15% over the last two weeks. Setting slightly higher daily targets could accelerate growth.' },
];

const alertTemplates = [
  { alertType: 'risk', severity: 'critical', title: 'Productivity Score Below Threshold', message: 'Score has been below 40 for 5+ consecutive days.' },
  { alertType: 'warning', severity: 'warning', title: 'Declining Performance Trend', message: 'Productivity has declined 12% over the past two weeks.' },
  { alertType: 'info', severity: 'info', title: 'Achievement Milestone', message: 'Maintained a productivity streak of 10+ days.' },
  { alertType: 'risk', severity: 'warning', title: 'Overdue Tasks Accumulating', message: '4 tasks are past their deadline.' },
  { alertType: 'info', severity: 'info', title: 'Focus Time Improvement', message: 'Deep work minutes increased by 25% compared to last week.' },
];

export async function seedTeamIntelligenceData(workspaceId: string, userIds: string[]): Promise<void> {
  const now = new Date();

  for (let userIdx = 0; userIdx < userIds.length; userIdx++) {
    const userId = userIds[userIdx];
    const personality = getPersonality(userIdx, userIds.length);
    const snapshotRows: any[] = [];
    const dailyScores: number[] = [];

    let dayCount = 0;
    for (let d = 29; d >= 0; d--) {
      const dateObj = new Date(now);
      dateObj.setDate(dateObj.getDate() - d);
      const dayOfWeek = dateObj.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dayData = generateDay(personality, dayCount, 22);
      dailyScores.push(Number(dayData.productivityScore));
      dayCount++;

      const dateStr = dateObj.toISOString().split('T')[0];
      snapshotRows.push({
        userId,
        workspaceId,
        date: dateStr,
        ...dayData,
      });
    }

    if (dailyScores.length >= 3) {
      const consistencyVal = calculateConsistencyScore(dailyScores);
      for (const row of snapshotRows) {
        row.consistencyScore = String(consistencyVal);
      }
    }

    for (const row of snapshotRows) {
      await db.insert(teamDailySnapshots).values(row)
        .onConflictDoUpdate({
          target: [teamDailySnapshots.userId, teamDailySnapshots.workspaceId, teamDailySnapshots.date],
          set: {
            activeTimeMinutes: row.activeTimeMinutes,
            deepWorkMinutes: row.deepWorkMinutes,
            shallowWorkMinutes: row.shallowWorkMinutes,
            meetingTimeMinutes: row.meetingTimeMinutes,
            focusSessionMinutes: row.focusSessionMinutes,
            tasksAssigned: row.tasksAssigned,
            tasksCompleted: row.tasksCompleted,
            tasksOverdue: row.tasksOverdue,
            tasksInProgress: row.tasksInProgress,
            contextSwitches: row.contextSwitches,
            avgFocusSession: row.avgFocusSession,
            longestFocusSession: row.longestFocusSession,
            productivityScore: row.productivityScore,
            focusScore: row.focusScore,
            consistencyScore: row.consistencyScore,
            executionScore: row.executionScore,
            collaborationScore: row.collaborationScore,
            updatedAt: new Date(),
          },
        });
    }

    const numInsights = rand(5, 8);
    for (let i = 0; i < numInsights; i++) {
      const template = insightTemplates[i % insightTemplates.length];
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 7);
      await db.insert(teamAiInsights).values({
        userId,
        workspaceId,
        roleContext: 'employee',
        category: template.category,
        title: template.title,
        message: template.message,
        confidence: ['high', 'medium', 'low'][rand(0, 2)],
        expiresAt,
      });
    }

    const numAlerts = rand(3, 5);
    for (let i = 0; i < numAlerts; i++) {
      let template: typeof alertTemplates[number];
      if (personality === 'struggling' && i === 0) {
        template = alertTemplates[0];
      } else if (personality === 'improving' && i === 0) {
        template = alertTemplates[1];
      } else if (personality === 'high_performer' && i === 0) {
        template = alertTemplates[2];
      } else {
        template = alertTemplates[rand(0, alertTemplates.length - 1)];
      }

      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 14);
      await db.insert(teamAlerts).values({
        workspaceId,
        targetUserId: userId,
        visibleToRole: i === 0 ? 'admin' : 'employee',
        alertType: template.alertType,
        severity: template.severity,
        title: template.title,
        message: template.message,
        expiresAt,
      });
    }
  }
}
