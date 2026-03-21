export type RiskLevel = 'on_track' | 'needs_attention' | 'at_risk';
export type TrendDirection = 'up' | 'down' | 'stable';
export type InsightCategory = 'achievement' | 'warning' | 'suggestion' | 'pattern' | 'coaching' | 'risk';
export type InsightConfidence = 'high' | 'medium' | 'low';
export type RoleContext = 'employee' | 'manager' | 'admin';

export interface ScoreBreakdown {
  taskCompletion: number;
  focus: number;
  deadlineAdherence: number;
  consistency: number;
  execution: number;
  collaboration: number;
  total: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DailySnapshotData {
  date: string;
  activeTimeMinutes: number;
  deepWorkMinutes: number;
  shallowWorkMinutes: number;
  meetingTimeMinutes: number;
  focusSessionMinutes: number;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksOverdue: number;
  tasksInProgress: number;
  contextSwitches: number;
  avgFocusSession: number;
  longestFocusSession: number;
  productivityScore: number;
  focusScore: number;
  consistencyScore: number;
  executionScore: number;
  collaborationScore: number;
}

export interface TeamMemberSummary {
  userId: string;
  name: string;
  avatar: string | null;
  role: string;
  productivityScore: number;
  trend: TrendDirection;
  trendDelta: number;
  tasksCompleted: number;
  overdueCount: number;
  focusTimeMinutes: number;
  riskLevel: RiskLevel;
  statusBadge: string;
}

export interface ComparisonResult {
  metric: string;
  periodAValue: number;
  periodBValue: number;
  deltaPercent: number;
  direction: TrendDirection;
}

export interface DetectedPattern {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  data: Record<string, number>;
  message: string;
}

export interface GeneratedInsight {
  category: InsightCategory;
  title: string;
  message: string;
  confidence: InsightConfidence;
}

export interface EmployeeDashboardData {
  currentScores: ScoreBreakdown;
  todaySnapshot: DailySnapshotData | null;
  recentSnapshots: DailySnapshotData[];
  streak: number;
  insights: GeneratedInsight[];
  alerts: any[];
}

export interface ManagerDashboardData {
  teamName: string;
  memberCount: number;
  teamScore: number;
  teamTrend: TrendDirection;
  totalTasksCompleted: number;
  totalOverdue: number;
  teamHealth: RiskLevel;
  members: TeamMemberSummary[];
  alerts: any[];
}

export interface AdminDashboardData {
  orgScore: number;
  orgTrend: TrendDirection;
  totalEmployees: number;
  totalTasksCompleted: number;
  deadlineAdherenceRate: number;
  avgFocusMinutes: number;
  teams: Array<{
    teamId: string;
    teamName: string;
    managerName: string;
    memberCount: number;
    score: number;
    velocity: number;
    overduePercent: number;
    health: RiskLevel;
  }>;
  riskDistribution: {
    onTrack: number;
    needsAttention: number;
    atRisk: number;
  };
}
