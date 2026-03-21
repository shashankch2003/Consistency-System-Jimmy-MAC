import type { DetectedPattern, DailySnapshotData } from "../../../shared/lib/team-intelligence/types";

export function detectPatterns(snapshots: DailySnapshotData[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  if (snapshots.length < 2) return patterns;

  const recent3 = snapshots.slice(0, Math.min(3, snapshots.length));
  const previous3 = snapshots.slice(3, Math.min(6, snapshots.length));

  if (recent3.length >= 3 && previous3.length >= 3) {
    const recentAvg = recent3.reduce((s, d) => s + d.productivityScore, 0) / recent3.length;
    const previousAvg = previous3.reduce((s, d) => s + d.productivityScore, 0) / previous3.length;
    if (previousAvg > 0) {
      const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;
      if (changePercent >= 5) {
        patterns.push({
          type: 'improvement',
          severity: 'info',
          data: { recentAvg: Math.round(recentAvg), previousAvg: Math.round(previousAvg), changePercent: Math.round(changePercent) },
          message: 'Productivity trending upward',
        });
      }
      if (changePercent <= -5) {
        patterns.push({
          type: 'decline',
          severity: 'warning',
          data: { recentAvg: Math.round(recentAvg), previousAvg: Math.round(previousAvg), changePercent: Math.round(changePercent) },
          message: 'Productivity trending downward',
        });
      }
    }
  }

  const last7 = snapshots.slice(0, Math.min(7, snapshots.length));
  if (last7.length >= 2) {
    const avgFocus = last7.reduce((s, d) => s + d.deepWorkMinutes, 0) / last7.length;
    const todayFocus = snapshots[0].deepWorkMinutes;
    if (avgFocus > 0) {
      const percentAbove = ((todayFocus - avgFocus) / avgFocus) * 100;
      if (percentAbove >= 20) {
        patterns.push({
          type: 'strong_focus',
          severity: 'info',
          data: { todayFocus, avgFocus: Math.round(avgFocus), percentAbove: Math.round(percentAbove) },
          message: 'Focus time significantly above average',
        });
      }
    }
  }

  if (snapshots.length >= 2) {
    const todayOverdue = snapshots[0].tasksOverdue;
    const yesterdayOverdue = snapshots[1].tasksOverdue;
    if (todayOverdue > yesterdayOverdue) {
      patterns.push({
        type: 'deadline_risk',
        severity: 'warning',
        data: { todayOverdue, yesterdayOverdue },
        message: 'Overdue tasks increasing',
      });
    }
  }

  const streakDays = calculateStreak(snapshots, 60);
  if (streakDays >= 5) {
    patterns.push({
      type: 'streak',
      severity: 'info',
      data: { streakDays },
      message: 'Strong consistency streak',
    });
  }

  const last5 = snapshots.slice(0, Math.min(5, snapshots.length));
  if (last5.length >= 3) {
    let daysOverloaded = 0;
    let totalMeetingPercent = 0;
    for (const d of last5) {
      if (d.activeTimeMinutes > 0 && d.meetingTimeMinutes / d.activeTimeMinutes > 0.5) {
        daysOverloaded++;
      }
      totalMeetingPercent += d.activeTimeMinutes > 0 ? (d.meetingTimeMinutes / d.activeTimeMinutes) * 100 : 0;
    }
    if (daysOverloaded >= 3) {
      patterns.push({
        type: 'meeting_overload',
        severity: 'warning',
        data: { daysOverloaded, avgMeetingPercent: Math.round(totalMeetingPercent / last5.length) },
        message: 'High meeting load detected',
      });
    }
  }

  if (snapshots[0].tasksCompleted === 0 && snapshots[0].activeTimeMinutes > 60) {
    patterns.push({
      type: 'low_output',
      severity: 'warning',
      data: { activeTime: snapshots[0].activeTimeMinutes },
      message: 'Active time with zero task completions',
    });
  }

  return patterns;
}

export function calculateStreak(snapshots: DailySnapshotData[], threshold: number = 60): number {
  let streak = 0;
  for (const snap of snapshots) {
    if (snap.productivityScore >= threshold) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
