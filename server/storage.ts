import { db } from "./db";
import { eq, and, asc, like, desc, gte, lte } from "drizzle-orm";
import {
  yearlyGoals, monthlyOverviewGoals, monthlyDynamicGoals,
  tasks, goodHabits, goodHabitEntries, badHabits, badHabitEntries, hourlyEntries, payments, taskBankItems, dailyReasons, notes,
  userLevels, groupMessages, adminInbox, monthlyEvaluations,
  journalEntries, customDayTypes, dayTypeEmojiOverrides, dayTypeUsage, userStreaks,
  successfulFundamentals, userSettings,
  moneySettings, expenseCategories, expenses, budgets, subscriptions, bills, creditCards, savingsGoals,
  videos, videoFeedback,
  friends, friendInvites, comparisonPrivacy, dailyStatsCache,
  growGroups, growGroupMembers, growGroupMessages,
  teamDailySnapshots, teamAiInsights, teamAiSettings, teamManagerAssignments, teamAlerts, teamOrgSettings,
  workspaces, teams, workspaceMembers,
  projects, teamTasks, subtasks, taskDependencies,
  channels, channelMessages, taskComments, documents,
  timeEntries, timesheets, productivitySnapshots,
  memberAvailability, savedReports,
  okrGoals, goalTaskLinks, automations, automationLogs, notifications,
  autopilotRules, autopilotExecutions, autopilotActivityLog, autopilotPatterns,
  taskPredictions, taskSequences, workSessions, workPatterns,
  aiCoachingMessages, teamMemberProfiles, delegationSuggestions, delegationRules,
  projectContexts, recordedWorkflows, dailyPlans, documentTemplatesAi, generatedDocuments,
  userAutopilotSettings,
} from "@shared/schema";
import { authStorage, type IAuthStorage } from "./replit_integrations/auth/storage";
import { or, sql, inArray } from "drizzle-orm";

type InsertYearlyGoal = typeof yearlyGoals.$inferInsert;
type InsertMonthlyOverviewGoal = typeof monthlyOverviewGoals.$inferInsert;
type InsertMonthlyDynamicGoal = typeof monthlyDynamicGoals.$inferInsert;
type InsertTask = typeof tasks.$inferInsert;
type InsertGoodHabit = typeof goodHabits.$inferInsert;
type InsertGoodHabitEntry = typeof goodHabitEntries.$inferInsert;
type InsertBadHabit = typeof badHabits.$inferInsert;
type InsertBadHabitEntry = typeof badHabitEntries.$inferInsert;
type InsertHourlyEntry = typeof hourlyEntries.$inferInsert;
type InsertPayment = typeof payments.$inferInsert;
type InsertTaskBankItem = typeof taskBankItems.$inferInsert;
type InsertDailyReason = typeof dailyReasons.$inferInsert;
type InsertNote = typeof notes.$inferInsert;
type InsertGroupMessage = typeof groupMessages.$inferInsert;
type InsertAdminInbox = typeof adminInbox.$inferInsert;
type InsertJournalEntry = typeof journalEntries.$inferInsert;
type InsertCustomDayType = typeof customDayTypes.$inferInsert;
type InsertDayTypeUsage = typeof dayTypeUsage.$inferInsert;
type InsertSuccessfulFundamental = typeof successfulFundamentals.$inferInsert;
type InsertMoneySettings = typeof moneySettings.$inferInsert;
type InsertExpenseCategory = typeof expenseCategories.$inferInsert;
type InsertExpense = typeof expenses.$inferInsert;
type InsertBudget = typeof budgets.$inferInsert;
type InsertSubscription = typeof subscriptions.$inferInsert;
type InsertBill = typeof bills.$inferInsert;
type InsertCreditCard = typeof creditCards.$inferInsert;
type InsertSavingsGoal = typeof savingsGoals.$inferInsert;
type InsertVideo = typeof videos.$inferInsert;
type InsertVideoFeedback = typeof videoFeedback.$inferInsert;
type InsertFriend = typeof friends.$inferInsert;
type InsertFriendInvite = typeof friendInvites.$inferInsert;
type InsertComparisonPrivacy = typeof comparisonPrivacy.$inferInsert;
type InsertDailyStatsCache = typeof dailyStatsCache.$inferInsert;
type InsertGrowGroup = typeof growGroups.$inferInsert;
type InsertGrowGroupMember = typeof growGroupMembers.$inferInsert;
type InsertGrowGroupMessage = typeof growGroupMessages.$inferInsert;
type InsertTeamDailySnapshot = typeof teamDailySnapshots.$inferInsert;
type InsertTeamAiInsight = typeof teamAiInsights.$inferInsert;
type InsertTeamAiSettings = typeof teamAiSettings.$inferInsert;
type InsertTeamManagerAssignment = typeof teamManagerAssignments.$inferInsert;
type InsertTeamAlert = typeof teamAlerts.$inferInsert;
type InsertTeamOrgSettings = typeof teamOrgSettings.$inferInsert;

export interface IStorage extends IAuthStorage {
  getYearlyGoals(userId: string, year?: number): Promise<(typeof yearlyGoals.$inferSelect)[]>;
  createYearlyGoal(goal: InsertYearlyGoal): Promise<typeof yearlyGoals.$inferSelect>;
  updateYearlyGoal(id: number, updates: Partial<InsertYearlyGoal>): Promise<typeof yearlyGoals.$inferSelect>;
  deleteYearlyGoal(id: number): Promise<void>;

  getMonthlyOverviewGoals(userId: string, year?: number): Promise<(typeof monthlyOverviewGoals.$inferSelect)[]>;
  upsertMonthlyOverviewGoal(goal: InsertMonthlyOverviewGoal): Promise<typeof monthlyOverviewGoals.$inferSelect>;

  getMonthlyDynamicGoals(userId: string, year?: number, month?: number): Promise<(typeof monthlyDynamicGoals.$inferSelect)[]>;
  createMonthlyDynamicGoal(goal: InsertMonthlyDynamicGoal): Promise<typeof monthlyDynamicGoals.$inferSelect>;
  updateMonthlyDynamicGoal(id: number, updates: Partial<InsertMonthlyDynamicGoal>): Promise<typeof monthlyDynamicGoals.$inferSelect>;
  deleteMonthlyDynamicGoal(id: number): Promise<void>;

  getTasks(userId: string, date?: string): Promise<(typeof tasks.$inferSelect)[]>;
  getTasksByMonth(userId: string, month: string): Promise<(typeof tasks.$inferSelect)[]>;
  getTasksByYear(userId: string, year: number): Promise<(typeof tasks.$inferSelect)[]>;
  createTask(task: InsertTask): Promise<typeof tasks.$inferSelect>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<typeof tasks.$inferSelect>;
  deleteTask(id: number): Promise<void>;

  getGoodHabits(userId: string): Promise<(typeof goodHabits.$inferSelect)[]>;
  createGoodHabit(habit: InsertGoodHabit): Promise<typeof goodHabits.$inferSelect>;
  updateGoodHabit(id: number, name: string): Promise<typeof goodHabits.$inferSelect>;
  deleteGoodHabit(id: number): Promise<void>;
  getGoodHabitEntries(habitIds: number[], month?: string): Promise<(typeof goodHabitEntries.$inferSelect)[]>;
  upsertGoodHabitEntry(entry: InsertGoodHabitEntry): Promise<typeof goodHabitEntries.$inferSelect>;

  getBadHabits(userId: string): Promise<(typeof badHabits.$inferSelect)[]>;
  createBadHabit(habit: InsertBadHabit): Promise<typeof badHabits.$inferSelect>;
  updateBadHabit(id: number, name: string): Promise<typeof badHabits.$inferSelect>;
  deleteBadHabit(id: number): Promise<void>;
  getBadHabitEntries(habitIds: number[], month?: string): Promise<(typeof badHabitEntries.$inferSelect)[]>;
  upsertBadHabitEntry(entry: InsertBadHabitEntry): Promise<typeof badHabitEntries.$inferSelect>;

  getHourlyEntries(userId: string, date?: string): Promise<(typeof hourlyEntries.$inferSelect)[]>;
  getHourlyEntriesByMonth(userId: string, month: string): Promise<(typeof hourlyEntries.$inferSelect)[]>;
  upsertHourlyEntry(entry: InsertHourlyEntry): Promise<typeof hourlyEntries.$inferSelect>;

  createPayment(payment: InsertPayment): Promise<typeof payments.$inferSelect>;

  getTaskBankItems(userId: string): Promise<(typeof taskBankItems.$inferSelect)[]>;
  createTaskBankItem(item: InsertTaskBankItem): Promise<typeof taskBankItems.$inferSelect>;
  deleteTaskBankItem(id: number, userId: string): Promise<void>;

  getDailyReason(userId: string, date: string): Promise<(typeof dailyReasons.$inferSelect) | undefined>;
  upsertDailyReason(reason: InsertDailyReason): Promise<typeof dailyReasons.$inferSelect>;

  getNotes(userId: string): Promise<(typeof notes.$inferSelect)[]>;
  getNote(id: number, userId: string): Promise<(typeof notes.$inferSelect) | undefined>;
  createNote(note: InsertNote): Promise<typeof notes.$inferSelect>;
  updateNote(id: number, userId: string, updates: Partial<InsertNote>): Promise<typeof notes.$inferSelect>;
  deleteNote(id: number, userId: string): Promise<void>;

  getUserLevel(userId: string): Promise<(typeof userLevels.$inferSelect) | undefined>;
  getAllUserLevels(): Promise<(typeof userLevels.$inferSelect)[]>;

  getGroupMessages(level: string): Promise<(typeof groupMessages.$inferSelect)[]>;
  createGroupMessage(msg: InsertGroupMessage): Promise<typeof groupMessages.$inferSelect>;
  deleteGroupMessage(id: number): Promise<void>;

  getAdminInbox(): Promise<(typeof adminInbox.$inferSelect)[]>;
  createAdminInboxMessage(msg: InsertAdminInbox): Promise<typeof adminInbox.$inferSelect>;
  updateAdminInboxStatus(id: number, status: string): Promise<typeof adminInbox.$inferSelect>;

  getMonthlyEvaluations(userId: string): Promise<(typeof monthlyEvaluations.$inferSelect)[]>;

  getJournalEntry(userId: string, date: string): Promise<(typeof journalEntries.$inferSelect) | undefined>;
  getJournalEntriesByMonth(userId: string, yearMonth: string): Promise<(typeof journalEntries.$inferSelect)[]>;
  getJournalEntriesByYear(userId: string, year: number): Promise<(typeof journalEntries.$inferSelect)[]>;
  upsertJournalEntry(entry: InsertJournalEntry): Promise<typeof journalEntries.$inferSelect>;
  deleteJournalEntry(id: number, userId: string): Promise<void>;

  getCustomDayTypes(userId: string): Promise<(typeof customDayTypes.$inferSelect)[]>;
  createCustomDayType(dt: InsertCustomDayType): Promise<typeof customDayTypes.$inferSelect>;
  updateCustomDayType(id: number, userId: string, data: { name?: string; emoji?: string }): Promise<typeof customDayTypes.$inferSelect>;
  deleteCustomDayType(id: number, userId: string): Promise<void>;

  getDayTypeEmojiOverrides(userId: string): Promise<(typeof dayTypeEmojiOverrides.$inferSelect)[]>;
  upsertDayTypeEmojiOverride(userId: string, dayTypeName: string, emoji: string): Promise<typeof dayTypeEmojiOverrides.$inferSelect>;

  getDayTypeUsage(userId: string): Promise<(typeof dayTypeUsage.$inferSelect)[]>;
  incrementDayTypeUsage(userId: string, dayTypeName: string): Promise<void>;

  getUserStreak(userId: string): Promise<(typeof userStreaks.$inferSelect) | undefined>;
  upsertUserStreak(userId: string, data: { currentStreak: number; longestStreak: number; totalStreakDays: number; lastStreakUpdateDate: string }): Promise<typeof userStreaks.$inferSelect>;

  getFundamentals(userId: string): Promise<(typeof successfulFundamentals.$inferSelect)[]>;
  getFundamental(userId: string, fundamentalKey: string): Promise<(typeof successfulFundamentals.$inferSelect) | undefined>;
  upsertFundamental(data: InsertSuccessfulFundamental): Promise<typeof successfulFundamentals.$inferSelect>;
  toggleFundamentalCompleted(id: number, userId: string, completed: boolean): Promise<typeof successfulFundamentals.$inferSelect>;
  reorderFundamentals(userId: string, orderedKeys: string[]): Promise<void>;
  deleteFundamental(id: number, userId: string): Promise<void>;

  getUserSettings(userId: string): Promise<typeof userSettings.$inferSelect | undefined>;
  upsertUserSettings(userId: string, data: Partial<typeof userSettings.$inferInsert>): Promise<typeof userSettings.$inferSelect>;

  // Money Tracking
  getMoneySettings(userId: string): Promise<(typeof moneySettings.$inferSelect) | undefined>;
  upsertMoneySettings(userId: string, data: Partial<InsertMoneySettings>): Promise<typeof moneySettings.$inferSelect>;

  getExpenseCategories(userId: string): Promise<(typeof expenseCategories.$inferSelect)[]>;
  createExpenseCategory(cat: InsertExpenseCategory): Promise<typeof expenseCategories.$inferSelect>;
  updateExpenseCategory(id: number, userId: string, updates: Partial<InsertExpenseCategory>): Promise<typeof expenseCategories.$inferSelect>;
  deleteExpenseCategory(id: number, userId: string): Promise<void>;

  getExpenses(userId: string, filters?: { dateFrom?: string; dateTo?: string; categoryKey?: string; paymentMethod?: string }): Promise<(typeof expenses.$inferSelect)[]>;
  getExpensesByMonth(userId: string, month: string): Promise<(typeof expenses.$inferSelect)[]>;
  createExpense(expense: InsertExpense): Promise<typeof expenses.$inferSelect>;
  updateExpense(id: number, userId: string, updates: Partial<InsertExpense>): Promise<typeof expenses.$inferSelect>;
  deleteExpense(id: number, userId: string): Promise<void>;

  getBudgets(userId: string): Promise<(typeof budgets.$inferSelect)[]>;
  upsertBudget(data: InsertBudget): Promise<typeof budgets.$inferSelect>;
  deleteBudget(id: number, userId: string): Promise<void>;

  getSubscriptions(userId: string): Promise<(typeof subscriptions.$inferSelect)[]>;
  createSubscription(sub: InsertSubscription): Promise<typeof subscriptions.$inferSelect>;
  updateSubscription(id: number, userId: string, updates: Partial<InsertSubscription>): Promise<typeof subscriptions.$inferSelect>;
  deleteSubscription(id: number, userId: string): Promise<void>;

  getBills(userId: string): Promise<(typeof bills.$inferSelect)[]>;
  createBill(bill: InsertBill): Promise<typeof bills.$inferSelect>;
  updateBill(id: number, userId: string, updates: Partial<InsertBill>): Promise<typeof bills.$inferSelect>;
  deleteBill(id: number, userId: string): Promise<void>;

  getCreditCards(userId: string): Promise<(typeof creditCards.$inferSelect)[]>;
  createCreditCard(card: InsertCreditCard): Promise<typeof creditCards.$inferSelect>;
  updateCreditCard(id: number, userId: string, updates: Partial<InsertCreditCard>): Promise<typeof creditCards.$inferSelect>;
  deleteCreditCard(id: number, userId: string): Promise<void>;

  getSavingsGoals(userId: string): Promise<(typeof savingsGoals.$inferSelect)[]>;
  createSavingsGoal(goal: InsertSavingsGoal): Promise<typeof savingsGoals.$inferSelect>;
  updateSavingsGoal(id: number, userId: string, updates: Partial<InsertSavingsGoal>): Promise<typeof savingsGoals.$inferSelect>;
  deleteSavingsGoal(id: number, userId: string): Promise<void>;

  // Videos
  getVideos(publishedOnly?: boolean): Promise<(typeof videos.$inferSelect)[]>;
  getVideo(id: number): Promise<(typeof videos.$inferSelect) | undefined>;
  createVideo(video: InsertVideo): Promise<typeof videos.$inferSelect>;
  updateVideo(id: number, updates: Partial<InsertVideo>): Promise<typeof videos.$inferSelect>;
  deleteVideo(id: number): Promise<void>;

  // Video Feedback
  getVideoFeedbackByUser(videoId: number, userId: string): Promise<(typeof videoFeedback.$inferSelect)[]>;
  getAllVideoFeedback(videoId?: number): Promise<(typeof videoFeedback.$inferSelect)[]>;
  createVideoFeedback(fb: InsertVideoFeedback): Promise<typeof videoFeedback.$inferSelect>;
  updateVideoFeedbackStatus(id: number, status: string): Promise<typeof videoFeedback.$inferSelect>;
  replyToVideoFeedback(id: number, adminReply: string): Promise<typeof videoFeedback.$inferSelect>;
  deleteVideoFeedback(id: number): Promise<void>;

  // Grow Together - Friends
  getFriends(userId: string): Promise<(typeof friends.$inferSelect)[]>;
  getFriendRequests(userId: string): Promise<(typeof friends.$inferSelect)[]>;
  getSentRequests(userId: string): Promise<(typeof friends.$inferSelect)[]>;
  getFriendship(userId1: string, userId2: string): Promise<(typeof friends.$inferSelect) | undefined>;
  createFriendRequest(data: InsertFriend): Promise<typeof friends.$inferSelect>;
  updateFriendStatus(id: number, status: string): Promise<typeof friends.$inferSelect>;
  deleteFriend(id: number): Promise<void>;

  // Friend Invites
  createFriendInvite(data: InsertFriendInvite): Promise<typeof friendInvites.$inferSelect>;
  getFriendInviteByToken(token: string): Promise<(typeof friendInvites.$inferSelect) | undefined>;
  updateFriendInvite(id: number, updates: Partial<InsertFriendInvite>): Promise<typeof friendInvites.$inferSelect>;

  // Comparison Privacy
  getComparisonPrivacy(userId: string): Promise<(typeof comparisonPrivacy.$inferSelect) | undefined>;
  upsertComparisonPrivacy(userId: string, data: Partial<InsertComparisonPrivacy>): Promise<typeof comparisonPrivacy.$inferSelect>;

  // Daily Stats Cache
  getDailyStats(userId: string, date: string): Promise<(typeof dailyStatsCache.$inferSelect) | undefined>;
  getDailyStatsRange(userId: string, dateFrom: string, dateTo: string): Promise<(typeof dailyStatsCache.$inferSelect)[]>;
  upsertDailyStats(data: InsertDailyStatsCache): Promise<typeof dailyStatsCache.$inferSelect>;

  // Paid membership check
  hasPaidMembership(userId: string): Promise<boolean>;

  // Grow Groups
  getGrowGroups(publicOnly?: boolean): Promise<(typeof growGroups.$inferSelect)[]>;
  getGrowGroup(id: number): Promise<(typeof growGroups.$inferSelect) | undefined>;
  getUserGrowGroups(userId: string): Promise<(typeof growGroups.$inferSelect)[]>;
  createGrowGroup(group: InsertGrowGroup): Promise<typeof growGroups.$inferSelect>;
  updateGrowGroup(id: number, updates: Partial<InsertGrowGroup>): Promise<typeof growGroups.$inferSelect>;
  deleteGrowGroup(id: number): Promise<void>;

  // Group Members
  getGroupMembers(groupId: number): Promise<(typeof growGroupMembers.$inferSelect)[]>;
  getGroupMember(groupId: number, userId: string): Promise<(typeof growGroupMembers.$inferSelect) | undefined>;
  addGroupMember(data: InsertGrowGroupMember): Promise<typeof growGroupMembers.$inferSelect>;
  updateGroupMemberRole(id: number, role: string): Promise<typeof growGroupMembers.$inferSelect>;
  removeGroupMember(groupId: number, userId: string): Promise<void>;

  // Group Messages
  getGroupMessages2(groupId: number, limit?: number, before?: number): Promise<(typeof growGroupMessages.$inferSelect)[]>;
  createGroupMessage2(msg: InsertGrowGroupMessage): Promise<typeof growGroupMessages.$inferSelect>;
  deleteGroupMessage2(id: number): Promise<void>;
  getGroupMemberCount(groupId: number): Promise<number>;

  getTeamSnapshots(userId: string, workspaceId: string, from: string, to: string): Promise<(typeof teamDailySnapshots.$inferSelect)[]>;
  getTeamSnapshotsByWorkspace(workspaceId: string, from: string, to: string): Promise<(typeof teamDailySnapshots.$inferSelect)[]>;
  getAllUsers(): Promise<any[]>;

  getTeamInsights(userId: string, workspaceId: string, opts: { limit: number; offset: number; unreadOnly: boolean }): Promise<{ items: (typeof teamAiInsights.$inferSelect)[]; total: number }>;
  updateTeamInsight(id: string, userId: string, updates: Partial<InsertTeamAiInsight>): Promise<typeof teamAiInsights.$inferSelect>;

  getTeamAiSettings(userId: string, workspaceId: string): Promise<typeof teamAiSettings.$inferSelect>;
  upsertTeamAiSettings(userId: string, workspaceId: string, data: Partial<InsertTeamAiSettings>): Promise<typeof teamAiSettings.$inferSelect>;

  getTeamOrgSettings(workspaceId: string): Promise<typeof teamOrgSettings.$inferSelect>;
  upsertTeamOrgSettings(workspaceId: string, data: Partial<InsertTeamOrgSettings>): Promise<typeof teamOrgSettings.$inferSelect>;

  getTeamAlerts(workspaceId: string, filters: { userId?: string; visibleToRoles?: string[]; acknowledgedOnly?: boolean }): Promise<(typeof teamAlerts.$inferSelect)[]>;
  updateTeamAlert(id: string, updates: Partial<InsertTeamAlert>): Promise<typeof teamAlerts.$inferSelect>;

  getManagerAssignments(workspaceId: string, managerUserId?: string): Promise<(typeof teamManagerAssignments.$inferSelect)[]>;
  createManagerAssignment(data: InsertTeamManagerAssignment): Promise<typeof teamManagerAssignments.$inferSelect>;
  softDeleteManagerAssignment(id: string): Promise<typeof teamManagerAssignments.$inferSelect>;

  // Projects
  getProjects(workspaceId: number): Promise<(typeof projects.$inferSelect)[]>;
  getProject(id: number): Promise<(typeof projects.$inferSelect) | undefined>;
  createProject(data: typeof projects.$inferInsert): Promise<typeof projects.$inferSelect>;
  updateProject(id: number, data: Partial<typeof projects.$inferInsert>): Promise<typeof projects.$inferSelect>;
  deleteProject(id: number): Promise<void>;

  // Team Tasks
  getTeamTasks(projectId: number): Promise<(typeof teamTasks.$inferSelect)[]>;
  getTeamTask(id: number): Promise<(typeof teamTasks.$inferSelect) | undefined>;
  createTeamTask(data: typeof teamTasks.$inferInsert): Promise<typeof teamTasks.$inferSelect>;
  updateTeamTask(id: number, data: Partial<typeof teamTasks.$inferInsert>): Promise<typeof teamTasks.$inferSelect>;
  deleteTeamTask(id: number): Promise<void>;

  // Subtasks
  getSubtasks(taskId: number): Promise<(typeof subtasks.$inferSelect)[]>;
  createSubtask(data: typeof subtasks.$inferInsert): Promise<typeof subtasks.$inferSelect>;
  updateSubtask(id: number, data: Partial<typeof subtasks.$inferInsert>): Promise<typeof subtasks.$inferSelect>;
  deleteSubtask(id: number): Promise<void>;

  // Task Dependencies
  getTaskDependencies(taskId: number): Promise<(typeof taskDependencies.$inferSelect)[]>;
  createTaskDependency(data: typeof taskDependencies.$inferInsert): Promise<typeof taskDependencies.$inferSelect>;
  deleteTaskDependency(taskId: number, dependsOnTaskId: number): Promise<void>;

  // Channels
  getChannels(workspaceId: number): Promise<(typeof channels.$inferSelect)[]>;
  createChannel(data: typeof channels.$inferInsert): Promise<typeof channels.$inferSelect>;

  // Channel Messages
  getChannelMessages(channelId: number): Promise<(typeof channelMessages.$inferSelect)[]>;
  createChannelMessage(data: typeof channelMessages.$inferInsert): Promise<typeof channelMessages.$inferSelect>;

  // Task Comments
  getTaskComments(taskId: number): Promise<(typeof taskComments.$inferSelect)[]>;
  createTaskComment(data: typeof taskComments.$inferInsert): Promise<typeof taskComments.$inferSelect>;

  // Documents
  getDocuments(workspaceId: number, isWiki?: boolean): Promise<(typeof documents.$inferSelect)[]>;
  getDocument(id: number): Promise<(typeof documents.$inferSelect) | undefined>;
  createDocument(data: typeof documents.$inferInsert): Promise<typeof documents.$inferSelect>;
  updateDocument(id: number, data: Partial<typeof documents.$inferInsert>): Promise<typeof documents.$inferSelect>;
  deleteDocument(id: number): Promise<void>;

  // Preferred view
  updatePreferredView(userId: string, workspaceId: number, view: string): Promise<void>;

  // Time Entries
  getTimeEntries(userId: string, filters?: { taskId?: number; projectId?: number; dateFrom?: string; dateTo?: string }): Promise<(typeof timeEntries.$inferSelect)[]>;
  createTimeEntry(data: typeof timeEntries.$inferInsert): Promise<typeof timeEntries.$inferSelect>;
  updateTimeEntry(id: number, data: Partial<typeof timeEntries.$inferInsert>): Promise<typeof timeEntries.$inferSelect>;
  deleteTimeEntry(id: number): Promise<void>;

  // Timesheets
  getTimesheets(userId: string, workspaceId?: number): Promise<(typeof timesheets.$inferSelect)[]>;
  getTimesheet(id: number): Promise<(typeof timesheets.$inferSelect) | undefined>;
  createTimesheet(data: typeof timesheets.$inferInsert): Promise<typeof timesheets.$inferSelect>;
  updateTimesheet(id: number, data: Partial<typeof timesheets.$inferInsert>): Promise<typeof timesheets.$inferSelect>;

  // Productivity Snapshots
  getProductivitySnapshots(userId: string, workspaceId?: number): Promise<(typeof productivitySnapshots.$inferSelect)[]>;
  upsertProductivitySnapshot(data: typeof productivitySnapshots.$inferInsert): Promise<typeof productivitySnapshots.$inferSelect>;
  getTeamSnapshots(workspaceId: number, date: string): Promise<(typeof productivitySnapshots.$inferSelect)[]>;

  // Workspace Platform
  getWorkspaces(userId: string): Promise<(typeof workspaces.$inferSelect)[]>;
  getWorkspace(id: number): Promise<(typeof workspaces.$inferSelect) | undefined>;
  createWorkspace(data: typeof workspaces.$inferInsert): Promise<typeof workspaces.$inferSelect>;
  getTeams(workspaceId: number): Promise<(typeof teams.$inferSelect)[]>;
  getTeam(id: number): Promise<(typeof teams.$inferSelect) | undefined>;
  createTeam(data: typeof teams.$inferInsert): Promise<typeof teams.$inferSelect>;
  getWorkspaceMembers(workspaceId: number): Promise<(typeof workspaceMembers.$inferSelect)[]>;
  createWorkspaceMember(data: typeof workspaceMembers.$inferInsert): Promise<typeof workspaceMembers.$inferSelect>;
  updateWorkspaceMemberRole(id: number, role: string): Promise<typeof workspaceMembers.$inferSelect>;
  deleteWorkspaceMember(id: number): Promise<void>;

  // OKR Goals
  getOkrGoals(workspaceId: number, period?: string): Promise<(typeof okrGoals.$inferSelect)[]>;
  getOkrGoal(id: number): Promise<(typeof okrGoals.$inferSelect) | undefined>;
  createOkrGoal(data: typeof okrGoals.$inferInsert): Promise<typeof okrGoals.$inferSelect>;
  updateOkrGoal(id: number, data: Partial<typeof okrGoals.$inferInsert>): Promise<typeof okrGoals.$inferSelect>;
  deleteOkrGoal(id: number): Promise<void>;
  createGoalTaskLink(goalId: number, taskId: number): Promise<typeof goalTaskLinks.$inferSelect>;
  deleteGoalTaskLink(goalId: number, taskId: number): Promise<void>;
  // Automations
  getAutomations(workspaceId: number): Promise<(typeof automations.$inferSelect)[]>;
  getAutomation(id: number): Promise<(typeof automations.$inferSelect) | undefined>;
  createAutomation(data: typeof automations.$inferInsert): Promise<typeof automations.$inferSelect>;
  updateAutomation(id: number, data: Partial<typeof automations.$inferInsert>): Promise<typeof automations.$inferSelect>;
  deleteAutomation(id: number): Promise<void>;
  logAutomation(data: typeof automationLogs.$inferInsert): Promise<typeof automationLogs.$inferSelect>;
  getMatchingAutomations(workspaceId: number, triggerType: string): Promise<(typeof automations.$inferSelect)[]>;
  // Notifications
  getNotifications(userId: string, workspaceId: number): Promise<(typeof notifications.$inferSelect)[]>;
  createNotification(data: typeof notifications.$inferInsert): Promise<typeof notifications.$inferSelect>;
  markNotificationRead(id: number): Promise<void>;
  markAllNotificationsRead(userId: string, workspaceId: number): Promise<void>;
  // Search
  searchWorkspace(workspaceId: number, query: string): Promise<any>;

  getWorkloadData(workspaceId: number, teamId?: number): Promise<any[]>;
  reassignTask(taskId: number, assigneeId: string): Promise<typeof teamTasks.$inferSelect>;
  getMemberAvailability(workspaceId: number, dateFrom?: string, dateTo?: string): Promise<(typeof memberAvailability.$inferSelect)[]>;
  createMemberAvailability(data: typeof memberAvailability.$inferInsert): Promise<typeof memberAvailability.$inferSelect>;
  deleteMemberAvailability(id: number): Promise<void>;
  getSavedReports(workspaceId: number): Promise<(typeof savedReports.$inferSelect)[]>;
  getSavedReport(id: number): Promise<typeof savedReports.$inferSelect | undefined>;
  createSavedReport(data: typeof savedReports.$inferInsert): Promise<typeof savedReports.$inferSelect>;
  getExecutiveSummary(workspaceId: number): Promise<any>;
  // Autopilot
  getAutopilotRules(userId: string, filters?: { isActive?: boolean; type?: string }): Promise<(typeof autopilotRules.$inferSelect)[]>;
  createAutopilotRule(data: typeof autopilotRules.$inferInsert): Promise<typeof autopilotRules.$inferSelect>;
  updateAutopilotRule(id: number, userId: string, data: Partial<typeof autopilotRules.$inferInsert>): Promise<typeof autopilotRules.$inferSelect | undefined>;
  deleteAutopilotRule(id: number, userId: string): Promise<void>;
  getAutopilotExecutions(userId: string, filters?: { status?: string; ruleId?: number; limit?: number }): Promise<(typeof autopilotExecutions.$inferSelect)[]>;
  createAutopilotExecution(data: typeof autopilotExecutions.$inferInsert): Promise<typeof autopilotExecutions.$inferSelect>;
  updateAutopilotExecution(id: number, userId: string, data: Partial<typeof autopilotExecutions.$inferInsert>): Promise<typeof autopilotExecutions.$inferSelect | undefined>;
  logActivityEvents(events: (typeof autopilotActivityLog.$inferInsert)[]): Promise<void>;
  getActivityLogs(userId: string, days: number): Promise<(typeof autopilotActivityLog.$inferSelect)[]>;
  getAutopilotPatterns(userId: string): Promise<(typeof autopilotPatterns.$inferSelect)[]>;
  createAutopilotPattern(data: typeof autopilotPatterns.$inferInsert): Promise<typeof autopilotPatterns.$inferSelect>;
  updateAutopilotPattern(id: number, data: Partial<typeof autopilotPatterns.$inferInsert>): Promise<void>;
  getAutopilotSettings(userId: string): Promise<any>;
  saveAutopilotSettings(userId: string, settings: any): Promise<void>;
  // Predictions
  getTaskPredictions(userId: string): Promise<(typeof taskPredictions.$inferSelect)[]>;
  createTaskPrediction(data: typeof taskPredictions.$inferInsert): Promise<typeof taskPredictions.$inferSelect>;
  updateTaskPrediction(id: number, userId: string, data: Partial<typeof taskPredictions.$inferInsert>): Promise<typeof taskPredictions.$inferSelect | undefined>;
  getTaskSequences(userId: string): Promise<(typeof taskSequences.$inferSelect)[]>;
  upsertTaskSequence(data: typeof taskSequences.$inferInsert): Promise<typeof taskSequences.$inferSelect>;
  // Time Machine
  getWorkSession(userId: string, date: string): Promise<typeof workSessions.$inferSelect | undefined>;
  saveWorkSession(data: typeof workSessions.$inferInsert): Promise<typeof workSessions.$inferSelect>;
  getWorkSessions(userId: string, days: number): Promise<(typeof workSessions.$inferSelect)[]>;
  getWorkPatterns(userId: string): Promise<(typeof workPatterns.$inferSelect)[]>;
  createWorkPattern(data: typeof workPatterns.$inferInsert): Promise<typeof workPatterns.$inferSelect>;
  getCoachingMessages(userId: string): Promise<(typeof aiCoachingMessages.$inferSelect)[]>;
  createCoachingMessage(data: typeof aiCoachingMessages.$inferInsert): Promise<typeof aiCoachingMessages.$inferSelect>;
  updateCoachingMessage(id: number, userId: string, data: Partial<typeof aiCoachingMessages.$inferInsert>): Promise<void>;
  // Delegation
  getTeamMemberProfile(userId: string): Promise<typeof teamMemberProfiles.$inferSelect | undefined>;
  upsertTeamMemberProfile(data: typeof teamMemberProfiles.$inferInsert): Promise<typeof teamMemberProfiles.$inferSelect>;
  getAllTeamMemberProfiles(): Promise<(typeof teamMemberProfiles.$inferSelect)[]>;
  createDelegationSuggestion(data: typeof delegationSuggestions.$inferInsert): Promise<typeof delegationSuggestions.$inferSelect>;
  updateDelegationSuggestion(id: number, data: Partial<typeof delegationSuggestions.$inferInsert>): Promise<void>;
  getDelegationRules(userId: string): Promise<(typeof delegationRules.$inferSelect)[]>;
  createDelegationRule(data: typeof delegationRules.$inferInsert): Promise<typeof delegationRules.$inferSelect>;
  updateDelegationRule(id: number, userId: string, data: Partial<typeof delegationRules.$inferInsert>): Promise<void>;
  // Contexts
  getProjectContexts(userId: string): Promise<(typeof projectContexts.$inferSelect)[]>;
  createProjectContext(data: typeof projectContexts.$inferInsert): Promise<typeof projectContexts.$inferSelect>;
  updateProjectContext(id: number, userId: string, data: Partial<typeof projectContexts.$inferInsert>): Promise<typeof projectContexts.$inferSelect | undefined>;
  // Workflows
  getRecordedWorkflows(userId: string): Promise<(typeof recordedWorkflows.$inferSelect)[]>;
  getPublicWorkflows(): Promise<(typeof recordedWorkflows.$inferSelect)[]>;
  createRecordedWorkflow(data: typeof recordedWorkflows.$inferInsert): Promise<typeof recordedWorkflows.$inferSelect>;
  updateRecordedWorkflow(id: number, userId: string, data: Partial<typeof recordedWorkflows.$inferInsert>): Promise<typeof recordedWorkflows.$inferSelect | undefined>;
  deleteRecordedWorkflow(id: number, userId: string): Promise<void>;
  // Daily Plans
  getDailyPlan(userId: string, date: string): Promise<typeof dailyPlans.$inferSelect | undefined>;
  createDailyPlan(data: typeof dailyPlans.$inferInsert): Promise<typeof dailyPlans.$inferSelect>;
  updateDailyPlan(id: number, userId: string, data: Partial<typeof dailyPlans.$inferInsert>): Promise<typeof dailyPlans.$inferSelect | undefined>;
  // Document Templates + Generated Docs
  getDocumentTemplates(): Promise<(typeof documentTemplatesAi.$inferSelect)[]>;
  createDocumentTemplate(data: typeof documentTemplatesAi.$inferInsert): Promise<typeof documentTemplatesAi.$inferSelect>;
  updateDocumentTemplate(id: number, data: Partial<typeof documentTemplatesAi.$inferInsert>): Promise<void>;
  deleteDocumentTemplate(id: number): Promise<void>;
  createGeneratedDocument(data: typeof generatedDocuments.$inferInsert): Promise<typeof generatedDocuments.$inferSelect>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string) { return authStorage.getUser(id); }
  async upsertUser(user: any) { return authStorage.upsertUser(user); }

  async getYearlyGoals(userId: string, year?: number) {
    if (year) {
      return await db.select().from(yearlyGoals).where(and(eq(yearlyGoals.userId, userId), eq(yearlyGoals.year, year))).orderBy(asc(yearlyGoals.id));
    }
    return await db.select().from(yearlyGoals).where(eq(yearlyGoals.userId, userId)).orderBy(asc(yearlyGoals.id));
  }
  async createYearlyGoal(goal: InsertYearlyGoal) {
    const [created] = await db.insert(yearlyGoals).values(goal).returning();
    return created;
  }
  async updateYearlyGoal(id: number, updates: Partial<InsertYearlyGoal>) {
    const [updated] = await db.update(yearlyGoals).set(updates).where(eq(yearlyGoals.id, id)).returning();
    return updated;
  }
  async deleteYearlyGoal(id: number) {
    await db.delete(yearlyGoals).where(eq(yearlyGoals.id, id));
  }

  async getMonthlyOverviewGoals(userId: string, year?: number) {
    if (year) {
      return await db.select().from(monthlyOverviewGoals).where(and(eq(monthlyOverviewGoals.userId, userId), eq(monthlyOverviewGoals.year, year))).orderBy(asc(monthlyOverviewGoals.month));
    }
    return await db.select().from(monthlyOverviewGoals).where(eq(monthlyOverviewGoals.userId, userId)).orderBy(asc(monthlyOverviewGoals.month));
  }
  async upsertMonthlyOverviewGoal(goal: InsertMonthlyOverviewGoal) {
    const existing = await db.select().from(monthlyOverviewGoals).where(
      and(eq(monthlyOverviewGoals.userId, goal.userId), eq(monthlyOverviewGoals.year, goal.year), eq(monthlyOverviewGoals.month, goal.month))
    );
    if (existing.length > 0) {
      const updates: Record<string, any> = {};
      if (goal.mainGoal !== undefined) updates.mainGoal = goal.mainGoal;
      if (goal.rating !== undefined) updates.rating = goal.rating;
      if (goal.description !== undefined) updates.description = goal.description;
      const [updated] = await db.update(monthlyOverviewGoals).set(updates).where(eq(monthlyOverviewGoals.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(monthlyOverviewGoals).values(goal).returning();
    return created;
  }

  async getMonthlyDynamicGoals(userId: string, year?: number, month?: number) {
    const conditions = [eq(monthlyDynamicGoals.userId, userId)];
    if (year) conditions.push(eq(monthlyDynamicGoals.year, year));
    if (month) conditions.push(eq(monthlyDynamicGoals.month, month));
    return await db.select().from(monthlyDynamicGoals).where(and(...conditions)).orderBy(asc(monthlyDynamicGoals.id));
  }
  async createMonthlyDynamicGoal(goal: InsertMonthlyDynamicGoal) {
    const [created] = await db.insert(monthlyDynamicGoals).values(goal).returning();
    return created;
  }
  async updateMonthlyDynamicGoal(id: number, updates: Partial<InsertMonthlyDynamicGoal>) {
    const [updated] = await db.update(monthlyDynamicGoals).set(updates).where(eq(monthlyDynamicGoals.id, id)).returning();
    return updated;
  }
  async deleteMonthlyDynamicGoal(id: number) {
    await db.delete(monthlyDynamicGoals).where(eq(monthlyDynamicGoals.id, id));
  }

  async getTasks(userId: string, date?: string) {
    if (date) {
      return await db.select().from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.date, date))).orderBy(asc(tasks.id));
    }
    return await db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(asc(tasks.id));
  }
  async getTasksByMonth(userId: string, month: string) {
    return await db.select().from(tasks).where(and(eq(tasks.userId, userId), like(tasks.date, `${month}%`))).orderBy(asc(tasks.date), asc(tasks.id));
  }
  async getTasksByYear(userId: string, year: number) {
    return await db.select().from(tasks).where(and(eq(tasks.userId, userId), like(tasks.date, `${year}-%`))).orderBy(asc(tasks.date), asc(tasks.id));
  }
  async createTask(task: InsertTask) {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }
  async updateTask(id: number, updates: Partial<InsertTask>) {
    const [updated] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    return updated;
  }
  async deleteTask(id: number) {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getGoodHabits(userId: string) {
    return await db.select().from(goodHabits).where(eq(goodHabits.userId, userId));
  }
  async createGoodHabit(habit: InsertGoodHabit) {
    const [created] = await db.insert(goodHabits).values(habit).returning();
    return created;
  }
  async updateGoodHabit(id: number, name: string) {
    const [updated] = await db.update(goodHabits).set({ name }).where(eq(goodHabits.id, id)).returning();
    return updated;
  }
  async deleteGoodHabit(id: number) {
    await db.delete(goodHabitEntries).where(eq(goodHabitEntries.habitId, id));
    await db.delete(goodHabits).where(eq(goodHabits.id, id));
  }
  async getGoodHabitEntries(habitIds: number[], month?: string) {
    if (habitIds.length === 0) return [];
    const all = await db.select().from(goodHabitEntries);
    let filtered = all.filter(e => habitIds.includes(e.habitId));
    if (month) filtered = filtered.filter(e => e.date.startsWith(month));
    return filtered;
  }
  async upsertGoodHabitEntry(entry: InsertGoodHabitEntry) {
    const existing = await db.select().from(goodHabitEntries).where(and(eq(goodHabitEntries.habitId, entry.habitId), eq(goodHabitEntries.date, entry.date)));
    if (existing.length > 0) {
      const [updated] = await db.update(goodHabitEntries).set({ completed: entry.completed }).where(eq(goodHabitEntries.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(goodHabitEntries).values(entry).returning();
    return created;
  }

  async getBadHabits(userId: string) {
    return await db.select().from(badHabits).where(eq(badHabits.userId, userId));
  }
  async createBadHabit(habit: InsertBadHabit) {
    const [created] = await db.insert(badHabits).values(habit).returning();
    return created;
  }
  async updateBadHabit(id: number, name: string) {
    const [updated] = await db.update(badHabits).set({ name }).where(eq(badHabits.id, id)).returning();
    return updated;
  }
  async deleteBadHabit(id: number) {
    await db.delete(badHabitEntries).where(eq(badHabitEntries.habitId, id));
    await db.delete(badHabits).where(eq(badHabits.id, id));
  }
  async getBadHabitEntries(habitIds: number[], month?: string) {
    if (habitIds.length === 0) return [];
    const all = await db.select().from(badHabitEntries);
    let filtered = all.filter(e => habitIds.includes(e.habitId));
    if (month) filtered = filtered.filter(e => e.date.startsWith(month));
    return filtered;
  }
  async upsertBadHabitEntry(entry: InsertBadHabitEntry) {
    const existing = await db.select().from(badHabitEntries).where(and(eq(badHabitEntries.habitId, entry.habitId), eq(badHabitEntries.date, entry.date)));
    if (existing.length > 0) {
      const [updated] = await db.update(badHabitEntries).set({ occurred: entry.occurred }).where(eq(badHabitEntries.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(badHabitEntries).values(entry).returning();
    return created;
  }

  async getHourlyEntries(userId: string, date?: string) {
    if (date) {
      return await db.select().from(hourlyEntries).where(and(eq(hourlyEntries.userId, userId), eq(hourlyEntries.date, date)));
    }
    return await db.select().from(hourlyEntries).where(eq(hourlyEntries.userId, userId));
  }
  async getHourlyEntriesByMonth(userId: string, month: string) {
    return await db.select().from(hourlyEntries).where(and(eq(hourlyEntries.userId, userId), like(hourlyEntries.date, `${month}%`))).orderBy(asc(hourlyEntries.date));
  }
  async upsertHourlyEntry(entry: InsertHourlyEntry) {
    const existing = await db.select().from(hourlyEntries).where(and(eq(hourlyEntries.userId, entry.userId), eq(hourlyEntries.date, entry.date), eq(hourlyEntries.hour, entry.hour)));
    if (existing.length > 0) {
      const [updated] = await db.update(hourlyEntries).set({ taskDescription: entry.taskDescription, productivityScore: entry.productivityScore }).where(eq(hourlyEntries.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(hourlyEntries).values(entry).returning();
    return created;
  }

  async createPayment(payment: InsertPayment) {
    const [created] = await db.insert(payments).values(payment).returning();
    return created;
  }

  async getTaskBankItems(userId: string) {
    return await db.select().from(taskBankItems).where(eq(taskBankItems.userId, userId)).orderBy(asc(taskBankItems.id));
  }
  async createTaskBankItem(item: InsertTaskBankItem) {
    const [created] = await db.insert(taskBankItems).values(item).returning();
    return created;
  }
  async deleteTaskBankItem(id: number, userId: string) {
    await db.delete(taskBankItems).where(and(eq(taskBankItems.id, id), eq(taskBankItems.userId, userId)));
  }

  async getDailyReason(userId: string, date: string) {
    const [reason] = await db.select().from(dailyReasons).where(and(eq(dailyReasons.userId, userId), eq(dailyReasons.date, date)));
    return reason;
  }
  async upsertDailyReason(reason: InsertDailyReason) {
    const existing = await db.select().from(dailyReasons).where(and(eq(dailyReasons.userId, reason.userId), eq(dailyReasons.date, reason.date)));
    if (existing.length > 0) {
      const [updated] = await db.update(dailyReasons).set({ reason: reason.reason }).where(eq(dailyReasons.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(dailyReasons).values(reason).returning();
    return created;
  }
  async getNotes(userId: string) {
    return await db.select().from(notes).where(eq(notes.userId, userId)).orderBy(asc(notes.id));
  }
  async getNote(id: number, userId: string) {
    const [note] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
    return note;
  }
  async createNote(note: InsertNote) {
    const [created] = await db.insert(notes).values(note).returning();
    return created;
  }
  async updateNote(id: number, userId: string, updates: Partial<InsertNote>) {
    const [updated] = await db.update(notes).set({ ...updates, updatedAt: new Date() }).where(and(eq(notes.id, id), eq(notes.userId, userId))).returning();
    return updated;
  }
  async deleteNote(id: number, userId: string) {
    await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
  }

  async getUserLevel(userId: string) {
    const [level] = await db.select().from(userLevels).where(eq(userLevels.userId, userId));
    return level;
  }
  async getAllUserLevels() {
    return await db.select().from(userLevels).orderBy(asc(userLevels.userId));
  }

  async getGroupMessages(level: string) {
    return await db.select().from(groupMessages).where(eq(groupMessages.level, level)).orderBy(desc(groupMessages.createdAt));
  }
  async createGroupMessage(msg: InsertGroupMessage) {
    const [created] = await db.insert(groupMessages).values(msg).returning();
    return created;
  }
  async deleteGroupMessage(id: number) {
    await db.delete(groupMessages).where(eq(groupMessages.id, id));
  }

  async getAdminInbox() {
    return await db.select().from(adminInbox).orderBy(desc(adminInbox.createdAt));
  }
  async createAdminInboxMessage(msg: InsertAdminInbox) {
    const [created] = await db.insert(adminInbox).values(msg).returning();
    return created;
  }
  async updateAdminInboxStatus(id: number, status: string) {
    const [updated] = await db.update(adminInbox).set({ status }).where(eq(adminInbox.id, id)).returning();
    return updated;
  }

  async getMonthlyEvaluations(userId: string) {
    return await db.select().from(monthlyEvaluations).where(eq(monthlyEvaluations.userId, userId)).orderBy(desc(monthlyEvaluations.month));
  }

  async getJournalEntry(userId: string, date: string) {
    const [entry] = await db.select().from(journalEntries).where(and(eq(journalEntries.userId, userId), eq(journalEntries.date, date)));
    return entry;
  }
  async getJournalEntriesByMonth(userId: string, yearMonth: string) {
    return await db.select().from(journalEntries).where(and(eq(journalEntries.userId, userId), like(journalEntries.date, `${yearMonth}%`))).orderBy(asc(journalEntries.date));
  }
  async getJournalEntriesByYear(userId: string, year: number) {
    return await db.select().from(journalEntries).where(and(eq(journalEntries.userId, userId), like(journalEntries.date, `${year}-%`))).orderBy(asc(journalEntries.date));
  }
  async upsertJournalEntry(entry: InsertJournalEntry) {
    const existing = await db.select().from(journalEntries).where(and(eq(journalEntries.userId, entry.userId), eq(journalEntries.date, entry.date)));
    if (existing.length > 0) {
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (entry.dayTypeId !== undefined) updates.dayTypeId = entry.dayTypeId;
      if (entry.customDayName !== undefined) updates.customDayName = entry.customDayName;
      if (entry.emoji !== undefined) updates.emoji = entry.emoji;
      if (entry.journalText !== undefined) updates.journalText = entry.journalText;
      if (entry.imageUrls !== undefined) updates.imageUrls = entry.imageUrls;
      if (entry.extractedText !== undefined) updates.extractedText = entry.extractedText;
      const [updated] = await db.update(journalEntries).set(updates).where(eq(journalEntries.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(journalEntries).values(entry).returning();
    return created;
  }
  async deleteJournalEntry(id: number, userId: string) {
    await db.delete(journalEntries).where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)));
  }

  async getCustomDayTypes(userId: string) {
    return await db.select().from(customDayTypes).where(eq(customDayTypes.userId, userId)).orderBy(asc(customDayTypes.id));
  }
  async createCustomDayType(dt: InsertCustomDayType) {
    const [created] = await db.insert(customDayTypes).values(dt).returning();
    return created;
  }
  async updateCustomDayType(id: number, userId: string, data: { name?: string; emoji?: string }) {
    const [updated] = await db.update(customDayTypes).set(data).where(and(eq(customDayTypes.id, id), eq(customDayTypes.userId, userId))).returning();
    return updated;
  }
  async deleteCustomDayType(id: number, userId: string) {
    await db.delete(customDayTypes).where(and(eq(customDayTypes.id, id), eq(customDayTypes.userId, userId)));
  }

  async getDayTypeEmojiOverrides(userId: string) {
    return await db.select().from(dayTypeEmojiOverrides).where(eq(dayTypeEmojiOverrides.userId, userId));
  }

  async upsertDayTypeEmojiOverride(userId: string, dayTypeName: string, emoji: string) {
    const existing = await db.select().from(dayTypeEmojiOverrides)
      .where(and(eq(dayTypeEmojiOverrides.userId, userId), eq(dayTypeEmojiOverrides.dayTypeName, dayTypeName)));
    if (existing.length > 0) {
      const [updated] = await db.update(dayTypeEmojiOverrides)
        .set({ emoji })
        .where(eq(dayTypeEmojiOverrides.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db.insert(dayTypeEmojiOverrides)
        .values({ userId, dayTypeName, emoji })
        .returning();
      return inserted;
    }
  }

  async getDayTypeUsage(userId: string) {
    return await db.select().from(dayTypeUsage).where(eq(dayTypeUsage.userId, userId)).orderBy(desc(dayTypeUsage.usageCount));
  }
  async incrementDayTypeUsage(userId: string, dayTypeName: string) {
    const existing = await db.select().from(dayTypeUsage).where(and(eq(dayTypeUsage.userId, userId), eq(dayTypeUsage.dayTypeName, dayTypeName)));
    if (existing.length > 0) {
      await db.update(dayTypeUsage).set({ usageCount: existing[0].usageCount + 1, lastUsed: new Date() }).where(eq(dayTypeUsage.id, existing[0].id));
    } else {
      await db.insert(dayTypeUsage).values({ userId, dayTypeName, usageCount: 1, lastUsed: new Date() });
    }
  }

  async getUserStreak(userId: string) {
    const [streak] = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId));
    return streak;
  }
  async upsertUserStreak(userId: string, data: { currentStreak: number; longestStreak: number; totalStreakDays: number; lastStreakUpdateDate: string }) {
    const existing = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId));
    if (existing.length > 0) {
      const [updated] = await db.update(userStreaks).set(data).where(eq(userStreaks.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(userStreaks).values({ userId, ...data }).returning();
    return created;
  }

  async getFundamentals(userId: string) {
    return await db.select().from(successfulFundamentals).where(eq(successfulFundamentals.userId, userId)).orderBy(asc(successfulFundamentals.id));
  }
  async getFundamental(userId: string, fundamentalKey: string) {
    const [entry] = await db.select().from(successfulFundamentals).where(and(eq(successfulFundamentals.userId, userId), eq(successfulFundamentals.fundamentalKey, fundamentalKey)));
    return entry;
  }
  async upsertFundamental(data: InsertSuccessfulFundamental) {
    const existing = await db.select().from(successfulFundamentals).where(and(eq(successfulFundamentals.userId, data.userId), eq(successfulFundamentals.fundamentalKey, data.fundamentalKey)));
    if (existing.length > 0) {
      const [updated] = await db.update(successfulFundamentals).set({ content: data.content, updatedAt: new Date() }).where(eq(successfulFundamentals.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(successfulFundamentals).values(data).returning();
    return created;
  }
  async toggleFundamentalCompleted(id: number, userId: string, completed: boolean) {
    const [updated] = await db.update(successfulFundamentals)
      .set({ completed, updatedAt: new Date() })
      .where(and(eq(successfulFundamentals.id, id), eq(successfulFundamentals.userId, userId)))
      .returning();
    return updated;
  }

  async reorderFundamentals(userId: string, orderedKeys: string[]) {
    for (let i = 0; i < orderedKeys.length; i++) {
      const existing = await db.select().from(successfulFundamentals)
        .where(and(eq(successfulFundamentals.userId, userId), eq(successfulFundamentals.fundamentalKey, orderedKeys[i])));
      if (existing.length > 0) {
        await db.update(successfulFundamentals)
          .set({ sortOrder: i })
          .where(eq(successfulFundamentals.id, existing[0].id));
      } else {
        await db.insert(successfulFundamentals)
          .values({ userId, fundamentalKey: orderedKeys[i], sortOrder: i });
      }
    }
  }

  async deleteFundamental(id: number, userId: string) {
    await db.delete(successfulFundamentals).where(and(eq(successfulFundamentals.id, id), eq(successfulFundamentals.userId, userId)));
  }

  async getUserSettings(userId: string) {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings;
  }

  async upsertUserSettings(userId: string, data: Partial<typeof userSettings.$inferInsert>) {
    const existing = await this.getUserSettings(userId);
    if (existing) {
      const [updated] = await db.update(userSettings).set({ ...data, updatedAt: new Date() }).where(eq(userSettings.userId, userId)).returning();
      return updated;
    }
    const [created] = await db.insert(userSettings).values({ ...data, userId }).returning();
    return created;
  }

  // Money Tracking Methods
  async getMoneySettings(userId: string) {
    const [settings] = await db.select().from(moneySettings).where(eq(moneySettings.userId, userId));
    return settings;
  }

  async upsertMoneySettings(userId: string, data: Partial<InsertMoneySettings>) {
    const existing = await this.getMoneySettings(userId);
    if (existing) {
      const [updated] = await db.update(moneySettings).set({ ...data, updatedAt: new Date() }).where(eq(moneySettings.userId, userId)).returning();
      return updated;
    }
    const [created] = await db.insert(moneySettings).values({ ...data, userId }).returning();
    return created;
  }

  async getExpenseCategories(userId: string) {
    return await db.select().from(expenseCategories).where(eq(expenseCategories.userId, userId)).orderBy(asc(expenseCategories.sortOrder));
  }

  async createExpenseCategory(cat: InsertExpenseCategory) {
    const [created] = await db.insert(expenseCategories).values(cat).returning();
    return created;
  }

  async updateExpenseCategory(id: number, userId: string, updates: Partial<InsertExpenseCategory>) {
    const [updated] = await db.update(expenseCategories).set(updates).where(and(eq(expenseCategories.id, id), eq(expenseCategories.userId, userId))).returning();
    return updated;
  }

  async deleteExpenseCategory(id: number, userId: string) {
    await db.delete(expenseCategories).where(and(eq(expenseCategories.id, id), eq(expenseCategories.userId, userId)));
  }

  async getExpenses(userId: string, filters?: { dateFrom?: string; dateTo?: string; categoryKey?: string; paymentMethod?: string }) {
    const conditions: any[] = [eq(expenses.userId, userId)];
    if (filters?.dateFrom) conditions.push(gte(expenses.date, filters.dateFrom));
    if (filters?.dateTo) conditions.push(lte(expenses.date, filters.dateTo));
    if (filters?.categoryKey) conditions.push(eq(expenses.categoryKey, filters.categoryKey));
    if (filters?.paymentMethod) conditions.push(eq(expenses.paymentMethod, filters.paymentMethod));
    return await db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.date));
  }

  async getExpensesByMonth(userId: string, month: string) {
    return await db.select().from(expenses).where(and(eq(expenses.userId, userId), like(expenses.date, `${month}%`))).orderBy(asc(expenses.date));
  }

  async createExpense(expense: InsertExpense) {
    const [created] = await db.insert(expenses).values(expense).returning();
    return created;
  }

  async updateExpense(id: number, userId: string, updates: Partial<InsertExpense>) {
    const [updated] = await db.update(expenses).set(updates).where(and(eq(expenses.id, id), eq(expenses.userId, userId))).returning();
    return updated;
  }

  async deleteExpense(id: number, userId: string) {
    await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  }

  async getBudgets(userId: string) {
    return await db.select().from(budgets).where(eq(budgets.userId, userId)).orderBy(asc(budgets.categoryKey));
  }

  async upsertBudget(data: InsertBudget) {
    const existing = await db.select().from(budgets).where(and(eq(budgets.userId, data.userId), eq(budgets.categoryKey, data.categoryKey)));
    if (existing.length > 0) {
      const [updated] = await db.update(budgets).set({ monthlyLimit: data.monthlyLimit, isEnabled: data.isEnabled, updatedAt: new Date() }).where(eq(budgets.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(budgets).values(data).returning();
    return created;
  }

  async deleteBudget(id: number, userId: string) {
    await db.delete(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
  }

  async getSubscriptions(userId: string) {
    return await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(asc(subscriptions.serviceName));
  }

  async createSubscription(sub: InsertSubscription) {
    const [created] = await db.insert(subscriptions).values(sub).returning();
    return created;
  }

  async updateSubscription(id: number, userId: string, updates: Partial<InsertSubscription>) {
    const [updated] = await db.update(subscriptions).set(updates).where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId))).returning();
    return updated;
  }

  async deleteSubscription(id: number, userId: string) {
    await db.delete(subscriptions).where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)));
  }

  async getBills(userId: string) {
    return await db.select().from(bills).where(eq(bills.userId, userId)).orderBy(asc(bills.name));
  }

  async createBill(bill: InsertBill) {
    const [created] = await db.insert(bills).values(bill).returning();
    return created;
  }

  async updateBill(id: number, userId: string, updates: Partial<InsertBill>) {
    const [updated] = await db.update(bills).set(updates).where(and(eq(bills.id, id), eq(bills.userId, userId))).returning();
    return updated;
  }

  async deleteBill(id: number, userId: string) {
    await db.delete(bills).where(and(eq(bills.id, id), eq(bills.userId, userId)));
  }

  async getCreditCards(userId: string) {
    return await db.select().from(creditCards).where(eq(creditCards.userId, userId)).orderBy(asc(creditCards.nickname));
  }

  async createCreditCard(card: InsertCreditCard) {
    const [created] = await db.insert(creditCards).values(card).returning();
    return created;
  }

  async updateCreditCard(id: number, userId: string, updates: Partial<InsertCreditCard>) {
    const [updated] = await db.update(creditCards).set(updates).where(and(eq(creditCards.id, id), eq(creditCards.userId, userId))).returning();
    return updated;
  }

  async deleteCreditCard(id: number, userId: string) {
    await db.delete(creditCards).where(and(eq(creditCards.id, id), eq(creditCards.userId, userId)));
  }

  async getSavingsGoals(userId: string) {
    return await db.select().from(savingsGoals).where(eq(savingsGoals.userId, userId)).orderBy(asc(savingsGoals.name));
  }

  async createSavingsGoal(goal: InsertSavingsGoal) {
    const [created] = await db.insert(savingsGoals).values(goal).returning();
    return created;
  }

  async updateSavingsGoal(id: number, userId: string, updates: Partial<InsertSavingsGoal>) {
    const [updated] = await db.update(savingsGoals).set(updates).where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId))).returning();
    return updated;
  }

  async deleteSavingsGoal(id: number, userId: string) {
    await db.delete(savingsGoals).where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)));
  }

  // Videos
  async getVideos(publishedOnly = false) {
    if (publishedOnly) {
      return await db.select().from(videos).where(eq(videos.isPublished, true)).orderBy(asc(videos.sortOrder), asc(videos.id));
    }
    return await db.select().from(videos).orderBy(asc(videos.sortOrder), asc(videos.id));
  }

  async getVideo(id: number) {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async createVideo(video: InsertVideo) {
    const [created] = await db.insert(videos).values(video).returning();
    return created;
  }

  async updateVideo(id: number, updates: Partial<InsertVideo>) {
    const [updated] = await db.update(videos).set({ ...updates, updatedAt: new Date() }).where(eq(videos.id, id)).returning();
    return updated;
  }

  async deleteVideo(id: number) {
    await db.delete(videoFeedback).where(eq(videoFeedback.videoId, id));
    await db.delete(videos).where(eq(videos.id, id));
  }

  // Video Feedback
  async getVideoFeedbackByUser(videoId: number, userId: string) {
    return await db.select().from(videoFeedback).where(and(eq(videoFeedback.videoId, videoId), eq(videoFeedback.userId, userId))).orderBy(desc(videoFeedback.createdAt));
  }

  async getAllVideoFeedback(videoId?: number) {
    if (videoId) {
      return await db.select().from(videoFeedback).where(eq(videoFeedback.videoId, videoId)).orderBy(desc(videoFeedback.createdAt));
    }
    return await db.select().from(videoFeedback).orderBy(desc(videoFeedback.createdAt));
  }

  async createVideoFeedback(fb: InsertVideoFeedback) {
    const [created] = await db.insert(videoFeedback).values(fb).returning();
    return created;
  }

  async updateVideoFeedbackStatus(id: number, status: string) {
    const [updated] = await db.update(videoFeedback).set({ status }).where(eq(videoFeedback.id, id)).returning();
    return updated;
  }

  async replyToVideoFeedback(id: number, adminReply: string) {
    const [updated] = await db.update(videoFeedback)
      .set({ adminReply, adminRepliedAt: new Date() })
      .where(eq(videoFeedback.id, id))
      .returning();
    return updated;
  }

  async deleteVideoFeedback(id: number) {
    await db.delete(videoFeedback).where(eq(videoFeedback.id, id));
  }

  // ===== GROW TOGETHER - FRIENDS =====
  async getFriends(userId: string) {
    return await db.select().from(friends).where(
      and(
        or(eq(friends.requesterId, userId), eq(friends.addresseeId, userId)),
        eq(friends.status, "accepted")
      )
    ).orderBy(desc(friends.createdAt));
  }

  async getFriendRequests(userId: string) {
    return await db.select().from(friends).where(
      and(eq(friends.addresseeId, userId), eq(friends.status, "pending"))
    ).orderBy(desc(friends.createdAt));
  }

  async getSentRequests(userId: string) {
    return await db.select().from(friends).where(
      and(eq(friends.requesterId, userId), eq(friends.status, "pending"))
    ).orderBy(desc(friends.createdAt));
  }

  async getFriendship(userId1: string, userId2: string) {
    const [f] = await db.select().from(friends).where(
      or(
        and(eq(friends.requesterId, userId1), eq(friends.addresseeId, userId2)),
        and(eq(friends.requesterId, userId2), eq(friends.addresseeId, userId1))
      )
    );
    return f;
  }

  async createFriendRequest(data: InsertFriend) {
    const [created] = await db.insert(friends).values(data).returning();
    return created;
  }

  async updateFriendStatus(id: number, status: string) {
    const [updated] = await db.update(friends).set({ status }).where(eq(friends.id, id)).returning();
    return updated;
  }

  async deleteFriend(id: number) {
    await db.delete(friends).where(eq(friends.id, id));
  }

  // Friend Invites
  async createFriendInvite(data: InsertFriendInvite) {
    const [created] = await db.insert(friendInvites).values(data).returning();
    return created;
  }

  async getFriendInviteByToken(token: string) {
    const [invite] = await db.select().from(friendInvites).where(
      and(eq(friendInvites.token, token), eq(friendInvites.status, "active"))
    );
    return invite;
  }

  async updateFriendInvite(id: number, updates: Partial<InsertFriendInvite>) {
    const [updated] = await db.update(friendInvites).set(updates).where(eq(friendInvites.id, id)).returning();
    return updated;
  }

  // Comparison Privacy
  async getComparisonPrivacy(userId: string) {
    const [privacy] = await db.select().from(comparisonPrivacy).where(eq(comparisonPrivacy.userId, userId));
    return privacy;
  }

  async upsertComparisonPrivacy(userId: string, data: Partial<InsertComparisonPrivacy>) {
    const existing = await this.getComparisonPrivacy(userId);
    if (existing) {
      const [updated] = await db.update(comparisonPrivacy).set({ ...data, updatedAt: new Date() }).where(eq(comparisonPrivacy.userId, userId)).returning();
      return updated;
    }
    const [created] = await db.insert(comparisonPrivacy).values({ ...data, userId }).returning();
    return created;
  }

  // Daily Stats Cache
  async getDailyStats(userId: string, date: string) {
    const [stats] = await db.select().from(dailyStatsCache).where(
      and(eq(dailyStatsCache.userId, userId), eq(dailyStatsCache.date, date))
    );
    return stats;
  }

  async getDailyStatsRange(userId: string, dateFrom: string, dateTo: string) {
    return await db.select().from(dailyStatsCache).where(
      and(eq(dailyStatsCache.userId, userId), gte(dailyStatsCache.date, dateFrom), lte(dailyStatsCache.date, dateTo))
    ).orderBy(asc(dailyStatsCache.date));
  }

  async upsertDailyStats(data: InsertDailyStatsCache) {
    const existing = await this.getDailyStats(data.userId, data.date);
    if (existing) {
      const [updated] = await db.update(dailyStatsCache).set({ ...data, computedAt: new Date() }).where(eq(dailyStatsCache.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(dailyStatsCache).values(data).returning();
    return created;
  }

  // Paid membership check
  async hasPaidMembership(userId: string) {
    const [payment] = await db.select().from(payments).where(
      and(eq(payments.userId, userId), eq(payments.status, "completed"))
    );
    return !!payment;
  }

  // ===== GROW GROUPS =====
  async getGrowGroups(publicOnly = false) {
    if (publicOnly) {
      return await db.select().from(growGroups).where(eq(growGroups.isPublic, true)).orderBy(desc(growGroups.createdAt));
    }
    return await db.select().from(growGroups).orderBy(desc(growGroups.createdAt));
  }

  async getGrowGroup(id: number) {
    const [group] = await db.select().from(growGroups).where(eq(growGroups.id, id));
    return group;
  }

  async getUserGrowGroups(userId: string) {
    const memberships = await db.select().from(growGroupMembers).where(eq(growGroupMembers.userId, userId));
    if (memberships.length === 0) return [];
    const groupIds = memberships.map(m => m.groupId);
    return await db.select().from(growGroups).where(inArray(growGroups.id, groupIds)).orderBy(desc(growGroups.createdAt));
  }

  async createGrowGroup(group: InsertGrowGroup) {
    const [created] = await db.insert(growGroups).values(group).returning();
    return created;
  }

  async updateGrowGroup(id: number, updates: Partial<InsertGrowGroup>) {
    const [updated] = await db.update(growGroups).set({ ...updates, updatedAt: new Date() }).where(eq(growGroups.id, id)).returning();
    return updated;
  }

  async deleteGrowGroup(id: number) {
    await db.delete(growGroupMessages).where(eq(growGroupMessages.groupId, id));
    await db.delete(growGroupMembers).where(eq(growGroupMembers.groupId, id));
    await db.delete(growGroups).where(eq(growGroups.id, id));
  }

  // Group Members
  async getGroupMembers(groupId: number) {
    return await db.select().from(growGroupMembers).where(eq(growGroupMembers.groupId, groupId)).orderBy(asc(growGroupMembers.joinedAt));
  }

  async getGroupMember(groupId: number, userId: string) {
    const [member] = await db.select().from(growGroupMembers).where(
      and(eq(growGroupMembers.groupId, groupId), eq(growGroupMembers.userId, userId))
    );
    return member;
  }

  async addGroupMember(data: InsertGrowGroupMember) {
    const [created] = await db.insert(growGroupMembers).values(data).returning();
    return created;
  }

  async updateGroupMemberRole(id: number, role: string) {
    const [updated] = await db.update(growGroupMembers).set({ role }).where(eq(growGroupMembers.id, id)).returning();
    return updated;
  }

  async removeGroupMember(groupId: number, userId: string) {
    await db.delete(growGroupMembers).where(
      and(eq(growGroupMembers.groupId, groupId), eq(growGroupMembers.userId, userId))
    );
  }

  // Group Messages
  async getGroupMessages2(groupId: number, limit = 50, before?: number) {
    const conditions: any[] = [eq(growGroupMessages.groupId, groupId), eq(growGroupMessages.isDeleted, false)];
    if (before) conditions.push(lte(growGroupMessages.id, before));
    return await db.select().from(growGroupMessages)
      .where(and(...conditions))
      .orderBy(desc(growGroupMessages.id))
      .limit(limit);
  }

  async createGroupMessage2(msg: InsertGrowGroupMessage) {
    const [created] = await db.insert(growGroupMessages).values(msg).returning();
    return created;
  }

  async deleteGroupMessage2(id: number) {
    await db.update(growGroupMessages).set({ isDeleted: true }).where(eq(growGroupMessages.id, id));
  }

  async getGroupMemberCount(groupId: number) {
    const members = await db.select().from(growGroupMembers).where(eq(growGroupMembers.groupId, groupId));
    return members.length;
  }

  async getTeamSnapshots(userId: string, workspaceId: string, from: string, to: string) {
    return await db.select().from(teamDailySnapshots)
      .where(and(
        eq(teamDailySnapshots.userId, userId),
        eq(teamDailySnapshots.workspaceId, workspaceId),
        gte(teamDailySnapshots.date, from),
        lte(teamDailySnapshots.date, to),
      ))
      .orderBy(desc(teamDailySnapshots.date));
  }

  async getTeamSnapshotsByWorkspace(workspaceId: string, from: string, to: string) {
    return await db.select().from(teamDailySnapshots)
      .where(and(
        eq(teamDailySnapshots.workspaceId, workspaceId),
        gte(teamDailySnapshots.date, from),
        lte(teamDailySnapshots.date, to),
      ))
      .orderBy(desc(teamDailySnapshots.date));
  }

  async getAllUsers() {
    const { users } = await import("@shared/schema");
    return await db.select().from(users);
  }

  async getTeamInsights(userId: string, workspaceId: string, opts: { limit: number; offset: number; unreadOnly: boolean }) {
    const conditions: any[] = [
      eq(teamAiInsights.userId, userId),
      eq(teamAiInsights.workspaceId, workspaceId),
      eq(teamAiInsights.isDismissed, false),
    ];
    if (opts.unreadOnly) conditions.push(eq(teamAiInsights.isRead, false));

    const items = await db.select().from(teamAiInsights)
      .where(and(...conditions))
      .orderBy(desc(teamAiInsights.generatedAt))
      .limit(opts.limit)
      .offset(opts.offset);

    const allMatching = await db.select().from(teamAiInsights)
      .where(and(...conditions));

    return { items, total: allMatching.length };
  }

  async updateTeamInsight(id: string, userId: string, updates: Partial<typeof teamAiInsights.$inferInsert>) {
    const [updated] = await db.update(teamAiInsights).set(updates)
      .where(and(eq(teamAiInsights.id, id), eq(teamAiInsights.userId, userId)))
      .returning();
    return updated;
  }

  async getTeamAiSettings(userId: string, workspaceId: string) {
    const existing = await db.select().from(teamAiSettings)
      .where(and(eq(teamAiSettings.userId, userId), eq(teamAiSettings.workspaceId, workspaceId)))
      .limit(1);
    if (existing.length > 0) return existing[0];
    const [created] = await db.insert(teamAiSettings).values({ userId, workspaceId }).returning();
    return created;
  }

  async upsertTeamAiSettings(userId: string, workspaceId: string, data: Partial<typeof teamAiSettings.$inferInsert>) {
    const existing = await this.getTeamAiSettings(userId, workspaceId);
    const [updated] = await db.update(teamAiSettings).set({ ...data, updatedAt: new Date() })
      .where(eq(teamAiSettings.id, existing.id))
      .returning();
    return updated;
  }

  async getTeamOrgSettings(workspaceId: string) {
    const existing = await db.select().from(teamOrgSettings)
      .where(eq(teamOrgSettings.workspaceId, workspaceId))
      .limit(1);
    if (existing.length > 0) return existing[0];
    const [created] = await db.insert(teamOrgSettings).values({ workspaceId }).returning();
    return created;
  }

  async upsertTeamOrgSettings(workspaceId: string, data: Partial<typeof teamOrgSettings.$inferInsert>) {
    const existing = await this.getTeamOrgSettings(workspaceId);
    const [updated] = await db.update(teamOrgSettings).set({ ...data, updatedAt: new Date() })
      .where(eq(teamOrgSettings.id, existing.id))
      .returning();
    return updated;
  }

  async getTeamAlerts(workspaceId: string, filters: { userId?: string; visibleToRoles?: string[]; acknowledgedOnly?: boolean }) {
    const conditions: any[] = [
      eq(teamAlerts.workspaceId, workspaceId),
      gte(teamAlerts.expiresAt, new Date()),
    ];
    if (filters.userId) conditions.push(eq(teamAlerts.targetUserId, filters.userId));
    if (filters.visibleToRoles && filters.visibleToRoles.length > 0) {
      conditions.push(inArray(teamAlerts.visibleToRole, filters.visibleToRoles));
    }
    if (!filters.acknowledgedOnly) conditions.push(eq(teamAlerts.isAcknowledged, false));

    return await db.select().from(teamAlerts)
      .where(and(...conditions))
      .orderBy(desc(teamAlerts.triggeredAt));
  }

  async updateTeamAlert(id: string, updates: Partial<typeof teamAlerts.$inferInsert>) {
    const [updated] = await db.update(teamAlerts).set(updates)
      .where(eq(teamAlerts.id, id))
      .returning();
    return updated;
  }

  async getManagerAssignments(workspaceId: string, managerUserId?: string) {
    const conditions: any[] = [
      eq(teamManagerAssignments.workspaceId, workspaceId),
      sql`${teamManagerAssignments.unassignedAt} IS NULL`,
    ];
    if (managerUserId) conditions.push(eq(teamManagerAssignments.managerUserId, managerUserId));
    return await db.select().from(teamManagerAssignments).where(and(...conditions));
  }

  async createManagerAssignment(data: typeof teamManagerAssignments.$inferInsert) {
    const [created] = await db.insert(teamManagerAssignments).values(data).returning();
    return created;
  }

  async softDeleteManagerAssignment(id: string) {
    const [updated] = await db.update(teamManagerAssignments)
      .set({ unassignedAt: new Date() })
      .where(eq(teamManagerAssignments.id, id))
      .returning();
    return updated;
  }

  // Projects
  async getProjects(workspaceId: number) {
    return await db.select().from(projects).where(eq(projects.workspaceId, workspaceId)).orderBy(desc(projects.createdAt));
  }
  async getProject(id: number) {
    const [p] = await db.select().from(projects).where(eq(projects.id, id));
    return p;
  }
  async createProject(data: typeof projects.$inferInsert) {
    const [created] = await db.insert(projects).values(data).returning();
    return created;
  }
  async updateProject(id: number, data: Partial<typeof projects.$inferInsert>) {
    const [updated] = await db.update(projects).set({ ...data, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    return updated;
  }
  async deleteProject(id: number) {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Team Tasks
  async getTeamTasks(projectId: number) {
    return await db.select().from(teamTasks).where(eq(teamTasks.projectId, projectId)).orderBy(asc(teamTasks.sortOrder), asc(teamTasks.id));
  }
  async getTeamTask(id: number) {
    const [t] = await db.select().from(teamTasks).where(eq(teamTasks.id, id));
    return t;
  }
  async createTeamTask(data: typeof teamTasks.$inferInsert) {
    const [created] = await db.insert(teamTasks).values(data).returning();
    return created;
  }
  async updateTeamTask(id: number, data: Partial<typeof teamTasks.$inferInsert>) {
    const [updated] = await db.update(teamTasks).set({ ...data, updatedAt: new Date() }).where(eq(teamTasks.id, id)).returning();
    return updated;
  }
  async deleteTeamTask(id: number) {
    await db.delete(subtasks).where(eq(subtasks.taskId, id));
    await db.delete(taskDependencies).where(eq(taskDependencies.taskId, id));
    await db.delete(teamTasks).where(eq(teamTasks.id, id));
  }

  // Subtasks
  async getSubtasks(taskId: number) {
    return await db.select().from(subtasks).where(eq(subtasks.taskId, taskId)).orderBy(asc(subtasks.sortOrder), asc(subtasks.id));
  }
  async createSubtask(data: typeof subtasks.$inferInsert) {
    const [created] = await db.insert(subtasks).values(data).returning();
    return created;
  }
  async updateSubtask(id: number, data: Partial<typeof subtasks.$inferInsert>) {
    const [updated] = await db.update(subtasks).set(data).where(eq(subtasks.id, id)).returning();
    return updated;
  }
  async deleteSubtask(id: number) {
    await db.delete(subtasks).where(eq(subtasks.id, id));
  }

  // Task Dependencies
  async getTaskDependencies(taskId: number) {
    return await db.select().from(taskDependencies).where(eq(taskDependencies.taskId, taskId));
  }
  async createTaskDependency(data: typeof taskDependencies.$inferInsert) {
    const [created] = await db.insert(taskDependencies).values(data).returning();
    return created;
  }
  async deleteTaskDependency(taskId: number, dependsOnTaskId: number) {
    await db.delete(taskDependencies).where(and(eq(taskDependencies.taskId, taskId), eq(taskDependencies.dependsOnTaskId, dependsOnTaskId)));
  }

  // Channels
  async getChannels(workspaceId: number) {
    return await db.select().from(channels).where(eq(channels.workspaceId, workspaceId)).orderBy(asc(channels.name));
  }
  async createChannel(data: typeof channels.$inferInsert) {
    const [created] = await db.insert(channels).values(data).returning();
    return created;
  }

  // Channel Messages
  async getChannelMessages(channelId: number) {
    return await db.select().from(channelMessages).where(eq(channelMessages.channelId, channelId)).orderBy(asc(channelMessages.createdAt));
  }
  async createChannelMessage(data: typeof channelMessages.$inferInsert) {
    const [created] = await db.insert(channelMessages).values(data).returning();
    return created;
  }

  // Task Comments
  async getTaskComments(taskId: number) {
    return await db.select().from(taskComments).where(eq(taskComments.taskId, taskId)).orderBy(asc(taskComments.createdAt));
  }
  async createTaskComment(data: typeof taskComments.$inferInsert) {
    const [created] = await db.insert(taskComments).values(data).returning();
    return created;
  }

  // Documents
  async getDocuments(workspaceId: number, isWiki?: boolean) {
    const conditions: any[] = [eq(documents.workspaceId, workspaceId)];
    if (isWiki !== undefined) conditions.push(eq(documents.isWiki, isWiki));
    return await db.select().from(documents).where(and(...conditions)).orderBy(asc(documents.sortOrder), asc(documents.createdAt));
  }
  async getDocument(id: number) {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }
  async createDocument(data: typeof documents.$inferInsert) {
    const [created] = await db.insert(documents).values(data).returning();
    return created;
  }
  async updateDocument(id: number, data: Partial<typeof documents.$inferInsert>) {
    const [updated] = await db.update(documents).set({ ...data, updatedAt: new Date() }).where(eq(documents.id, id)).returning();
    return updated;
  }
  async deleteDocument(id: number) {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Preferred view
  async updatePreferredView(userId: string, workspaceId: number, view: string) {
    await db.update(workspaceMembers)
      .set({ preferredView: view })
      .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)));
  }

  // Time Entries
  async getTimeEntries(userId: string, filters?: { taskId?: number; projectId?: number; dateFrom?: string; dateTo?: string }) {
    const conditions: any[] = [eq(timeEntries.userId, userId)];
    if (filters?.taskId) conditions.push(eq(timeEntries.taskId, filters.taskId));
    if (filters?.projectId) conditions.push(eq(timeEntries.projectId, filters.projectId));
    if (filters?.dateFrom) conditions.push(sql`${timeEntries.date} >= ${filters.dateFrom}`);
    if (filters?.dateTo) conditions.push(sql`${timeEntries.date} <= ${filters.dateTo}`);
    return await db.select().from(timeEntries).where(and(...conditions)).orderBy(desc(timeEntries.date));
  }
  async createTimeEntry(data: typeof timeEntries.$inferInsert) {
    const [created] = await db.insert(timeEntries).values(data).returning();
    return created;
  }
  async updateTimeEntry(id: number, data: Partial<typeof timeEntries.$inferInsert>) {
    const [updated] = await db.update(timeEntries).set(data).where(eq(timeEntries.id, id)).returning();
    return updated;
  }
  async deleteTimeEntry(id: number) {
    await db.delete(timeEntries).where(eq(timeEntries.id, id));
  }

  // Timesheets
  async getTimesheets(userId: string, workspaceId?: number) {
    const conditions: any[] = [eq(timesheets.userId, userId)];
    if (workspaceId) conditions.push(eq(timesheets.workspaceId, workspaceId));
    return await db.select().from(timesheets).where(and(...conditions)).orderBy(desc(timesheets.weekStart));
  }
  async getTimesheet(id: number) {
    const [ts] = await db.select().from(timesheets).where(eq(timesheets.id, id));
    return ts;
  }
  async createTimesheet(data: typeof timesheets.$inferInsert) {
    const [created] = await db.insert(timesheets).values(data).returning();
    return created;
  }
  async updateTimesheet(id: number, data: Partial<typeof timesheets.$inferInsert>) {
    const [updated] = await db.update(timesheets).set(data).where(eq(timesheets.id, id)).returning();
    return updated;
  }

  // Productivity Snapshots
  async getProductivitySnapshots(userId: string, workspaceId?: number) {
    const conditions: any[] = [eq(productivitySnapshots.userId, userId)];
    if (workspaceId) conditions.push(eq(productivitySnapshots.workspaceId, workspaceId));
    return await db.select().from(productivitySnapshots).where(and(...conditions)).orderBy(desc(productivitySnapshots.date)).limit(90);
  }
  async upsertProductivitySnapshot(data: typeof productivitySnapshots.$inferInsert) {
    const [result] = await db.insert(productivitySnapshots)
      .values(data)
      .onConflictDoUpdate({ target: [productivitySnapshots.userId, productivitySnapshots.date], set: { ...data } })
      .returning();
    return result;
  }
  async getTeamSnapshots(workspaceId: number, date: string) {
    return await db.select().from(productivitySnapshots)
      .where(and(eq(productivitySnapshots.workspaceId, workspaceId), sql`${productivitySnapshots.date} = ${date}`));
  }

  // Workspace Platform
  async getWorkspaces(userId: string) {
    return await db.select().from(workspaces).where(eq(workspaces.createdBy, userId)).orderBy(desc(workspaces.createdAt));
  }
  async getWorkspace(id: number) {
    const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return ws;
  }
  async createWorkspace(data: typeof workspaces.$inferInsert) {
    const [created] = await db.insert(workspaces).values(data).returning();
    return created;
  }
  async getTeams(workspaceId: number) {
    return await db.select().from(teams).where(eq(teams.workspaceId, workspaceId)).orderBy(asc(teams.createdAt));
  }
  async getTeam(id: number) {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }
  async createTeam(data: typeof teams.$inferInsert) {
    const [created] = await db.insert(teams).values(data).returning();
    return created;
  }
  async getWorkspaceMembers(workspaceId: number) {
    return await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId)).orderBy(asc(workspaceMembers.displayName));
  }
  async createWorkspaceMember(data: typeof workspaceMembers.$inferInsert) {
    const [created] = await db.insert(workspaceMembers).values(data).returning();
    return created;
  }
  async updateWorkspaceMemberRole(id: number, role: string) {
    const [updated] = await db.update(workspaceMembers).set({ role }).where(eq(workspaceMembers.id, id)).returning();
    return updated;
  }
  async deleteWorkspaceMember(id: number) {
    await db.delete(workspaceMembers).where(eq(workspaceMembers.id, id));
  }

  // OKR Goals
  async getOkrGoals(workspaceId: number, period?: string) {
    const conditions = [eq(okrGoals.workspaceId, workspaceId)];
    if (period) conditions.push(eq(okrGoals.period, period));
    return await db.select().from(okrGoals).where(and(...conditions)).orderBy(asc(okrGoals.createdAt));
  }
  async getOkrGoal(id: number) {
    const [goal] = await db.select().from(okrGoals).where(eq(okrGoals.id, id));
    return goal;
  }
  async createOkrGoal(data: typeof okrGoals.$inferInsert) {
    const [created] = await db.insert(okrGoals).values(data).returning();
    return created;
  }
  async updateOkrGoal(id: number, data: Partial<typeof okrGoals.$inferInsert>) {
    const [updated] = await db.update(okrGoals).set({ ...data, updatedAt: new Date() }).where(eq(okrGoals.id, id)).returning();
    return updated;
  }
  async deleteOkrGoal(id: number) {
    await db.delete(okrGoals).where(eq(okrGoals.id, id));
  }
  async createGoalTaskLink(goalId: number, taskId: number) {
    const [link] = await db.insert(goalTaskLinks).values({ goalId, taskId }).returning();
    return link;
  }
  async deleteGoalTaskLink(goalId: number, taskId: number) {
    await db.delete(goalTaskLinks).where(and(eq(goalTaskLinks.goalId, goalId), eq(goalTaskLinks.taskId, taskId)));
  }

  // Automations
  async getAutomations(workspaceId: number) {
    return await db.select().from(automations).where(eq(automations.workspaceId, workspaceId)).orderBy(desc(automations.createdAt));
  }
  async getAutomation(id: number) {
    const [auto] = await db.select().from(automations).where(eq(automations.id, id));
    return auto;
  }
  async createAutomation(data: typeof automations.$inferInsert) {
    const [created] = await db.insert(automations).values(data).returning();
    return created;
  }
  async updateAutomation(id: number, data: Partial<typeof automations.$inferInsert>) {
    const [updated] = await db.update(automations).set(data).where(eq(automations.id, id)).returning();
    return updated;
  }
  async deleteAutomation(id: number) {
    await db.delete(automations).where(eq(automations.id, id));
  }
  async logAutomation(data: typeof automationLogs.$inferInsert) {
    const [log] = await db.insert(automationLogs).values(data).returning();
    return log;
  }
  async getMatchingAutomations(workspaceId: number, triggerType: string) {
    return await db.select().from(automations).where(
      and(eq(automations.workspaceId, workspaceId), eq(automations.triggerType, triggerType), eq(automations.isActive, true))
    );
  }

  // Notifications
  async getNotifications(userId: string, workspaceId: number) {
    return await db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.workspaceId, workspaceId)))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }
  async createNotification(data: typeof notifications.$inferInsert) {
    const [created] = await db.insert(notifications).values(data).returning();
    return created;
  }
  async markNotificationRead(id: number) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }
  async markAllNotificationsRead(userId: string, workspaceId: number) {
    await db.update(notifications).set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.workspaceId, workspaceId)));
  }
  async searchWorkspace(workspaceId: number, query: string) {
    const q = `%${query}%`;
    const [foundTasks, foundDocs, foundMembers] = await Promise.all([
      db.select().from(teamTasks).where(sql`lower(${teamTasks.title}) like lower(${q})`).limit(10),
      db.select().from(documents).where(and(eq(documents.workspaceId, workspaceId), sql`lower(${documents.title}) like lower(${q})`)).limit(10),
      db.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspaceId), or(sql`lower(${workspaceMembers.displayName}) like lower(${q})`, sql`lower(${workspaceMembers.email}) like lower(${q})`))).limit(10),
    ]);
    return { tasks: foundTasks, documents: foundDocs, members: foundMembers };
  }

  async getWorkloadData(workspaceId: number, teamId?: number) {
    let membersQuery = db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
    const members = await membersQuery;
    const result = await Promise.all(members.map(async (m) => {
      const assignedTasks = m.userId
        ? await db.select().from(teamTasks).where(
            and(
              eq(teamTasks.assigneeId, m.userId),
              sql`${teamTasks.status} != 'Done'`
            )
          )
        : [];
      const totalMinutes = assignedTasks.reduce((s: number, t: any) => s + (t.estimatedMinutes || 0), 0);
      const capacityMinutes = (m.weeklyCapacityHours || 40) * 60;
      return {
        ...m,
        assignedTasks,
        totalMinutes,
        capacityMinutes,
        utilization: capacityMinutes > 0 ? Math.round((totalMinutes / capacityMinutes) * 100) : 0,
      };
    }));
    if (teamId) return result.filter((m) => m.teamId === teamId);
    return result;
  }

  async reassignTask(taskId: number, assigneeId: string) {
    const [updated] = await db.update(teamTasks).set({ assigneeId, updatedAt: new Date() }).where(eq(teamTasks.id, taskId)).returning();
    return updated;
  }

  async getMemberAvailability(workspaceId: number, dateFrom?: string, dateTo?: string) {
    const conditions = [eq(memberAvailability.workspaceId, workspaceId)];
    if (dateFrom) conditions.push(gte(memberAvailability.date, dateFrom));
    if (dateTo) conditions.push(lte(memberAvailability.date, dateTo));
    return await db.select().from(memberAvailability).where(and(...conditions)).orderBy(asc(memberAvailability.date));
  }

  async createMemberAvailability(data: typeof memberAvailability.$inferInsert) {
    const [created] = await db.insert(memberAvailability).values(data).returning();
    return created;
  }

  async deleteMemberAvailability(id: number) {
    await db.delete(memberAvailability).where(eq(memberAvailability.id, id));
  }

  async getSavedReports(workspaceId: number) {
    return await db.select().from(savedReports).where(eq(savedReports.workspaceId, workspaceId)).orderBy(desc(savedReports.createdAt));
  }

  async getSavedReport(id: number) {
    const [report] = await db.select().from(savedReports).where(eq(savedReports.id, id));
    return report;
  }

  async createSavedReport(data: typeof savedReports.$inferInsert) {
    const [created] = await db.insert(savedReports).values(data).returning();
    return created;
  }

  async getExecutiveSummary(workspaceId: number) {
    const allMembers = await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
    const allProjects = await db.select().from(projects).where(eq(projects.workspaceId, workspaceId));
    const activeProjects = allProjects.filter((p) => p.status === "active" || p.status === "Active");

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];

    const allTasks = await db.select().from(teamTasks).orderBy(desc(teamTasks.createdAt));
    const tasksThisWeek = allTasks.filter((t) => t.completedAt && t.completedAt.toISOString().split("T")[0] >= weekAgoStr);
    const overdueTasks = allTasks.filter((t) =>
      t.status !== "Done" && t.dueDate && new Date(t.dueDate) < new Date()
    );

    const completedTasks = allTasks.filter((t) => t.status === "Done");
    const avgCompletionTime = completedTasks.length > 0
      ? Math.round(completedTasks.reduce((s, t) => {
          if (!t.completedAt || !t.createdAt) return s;
          return s + (t.completedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / completedTasks.length)
      : 0;

    const onTimeCount = completedTasks.filter((t) => !t.dueDate || (t.completedAt && new Date(t.completedAt) <= new Date(t.dueDate))).length;
    const onTimeRate = completedTasks.length > 0 ? Math.round((onTimeCount / completedTasks.length) * 100) : 0;

    const workloadData = await this.getWorkloadData(workspaceId);
    const avgUtilization = workloadData.length > 0
      ? Math.round(workloadData.reduce((s, m) => s + m.utilization, 0) / workloadData.length)
      : 0;

    const projectsAtRisk = activeProjects.map((p) => {
      const projectTasks = allTasks.filter((t) => t.projectId === p.id);
      const overdue = projectTasks.filter((t) => t.status !== "Done" && t.dueDate && new Date(t.dueDate) < new Date());
      const completion = projectTasks.length > 0
        ? Math.round((projectTasks.filter((t) => t.status === "Done").length / projectTasks.length) * 100)
        : 0;
      return { ...p, overdueCount: overdue.length, completion };
    }).filter((p) => p.overdueCount > 0 || (p.dueDate && new Date(p.dueDate) < new Date(Date.now() + 7 * 86400000)));

    return {
      productivityScore: 72,
      activeProjects: activeProjects.length,
      tasksCompletedThisWeek: tasksThisWeek.length,
      teamUtilization: avgUtilization,
      onTimeDeliveryRate: onTimeRate,
      avgTaskCompletionDays: avgCompletionTime,
      projectsAtRisk,
      teamSize: allMembers.length,
    };
  }

  // ─── AUTOPILOT ────────────────────────────────────────────────────────────
  async getAutopilotRules(userId: string, filters: { isActive?: boolean; type?: string } = {}) {
    const conditions = [eq(autopilotRules.userId, userId)];
    if (filters.isActive !== undefined) conditions.push(eq(autopilotRules.isActive, filters.isActive));
    if (filters.type) conditions.push(eq(autopilotRules.type, filters.type));
    return db.select().from(autopilotRules).where(and(...conditions)).orderBy(desc(autopilotRules.timesTriggered));
  }
  async createAutopilotRule(data: typeof autopilotRules.$inferInsert) {
    const [row] = await db.insert(autopilotRules).values(data).returning();
    return row;
  }
  async updateAutopilotRule(id: number, userId: string, data: Partial<typeof autopilotRules.$inferInsert>) {
    const [row] = await db.update(autopilotRules).set({ ...data, updatedAt: new Date() }).where(and(eq(autopilotRules.id, id), eq(autopilotRules.userId, userId))).returning();
    return row;
  }
  async deleteAutopilotRule(id: number, userId: string) {
    await db.update(autopilotRules).set({ isActive: false, updatedAt: new Date() }).where(and(eq(autopilotRules.id, id), eq(autopilotRules.userId, userId)));
  }
  async getAutopilotExecutions(userId: string, filters: { status?: string; ruleId?: number; limit?: number } = {}) {
    const conditions = [eq(autopilotExecutions.userId, userId)];
    if (filters.status) conditions.push(eq(autopilotExecutions.status, filters.status));
    if (filters.ruleId) conditions.push(eq(autopilotExecutions.ruleId, filters.ruleId));
    return db.select().from(autopilotExecutions).where(and(...conditions)).orderBy(desc(autopilotExecutions.createdAt)).limit(filters.limit ?? 20);
  }
  async createAutopilotExecution(data: typeof autopilotExecutions.$inferInsert) {
    const [row] = await db.insert(autopilotExecutions).values(data).returning();
    return row;
  }
  async updateAutopilotExecution(id: number, userId: string, data: Partial<typeof autopilotExecutions.$inferInsert>) {
    const [row] = await db.update(autopilotExecutions).set(data).where(and(eq(autopilotExecutions.id, id), eq(autopilotExecutions.userId, userId))).returning();
    return row;
  }
  async logActivityEvents(events: (typeof autopilotActivityLog.$inferInsert)[]) {
    if (events.length === 0) return;
    await db.insert(autopilotActivityLog).values(events);
  }
  async getActivityLogs(userId: string, days: number) {
    const since = new Date(Date.now() - days * 86400000);
    return db.select().from(autopilotActivityLog).where(and(eq(autopilotActivityLog.userId, userId), gte(autopilotActivityLog.timestamp, since)));
  }
  async getAutopilotPatterns(userId: string) {
    return db.select().from(autopilotPatterns).where(eq(autopilotPatterns.userId, userId)).orderBy(desc(autopilotPatterns.confidence));
  }
  async createAutopilotPattern(data: typeof autopilotPatterns.$inferInsert) {
    const [row] = await db.insert(autopilotPatterns).values(data).returning();
    return row;
  }
  async updateAutopilotPattern(id: number, data: Partial<typeof autopilotPatterns.$inferInsert>) {
    await db.update(autopilotPatterns).set({ ...data, updatedAt: new Date() }).where(eq(autopilotPatterns.id, id));
  }
  async getAutopilotSettings(userId: string) {
    const [row] = await db.select().from(userAutopilotSettings).where(eq(userAutopilotSettings.userId, userId));
    return row?.settings ?? {};
  }
  async saveAutopilotSettings(userId: string, settings: any) {
    await db.insert(userAutopilotSettings).values({ userId, settings }).onConflictDoUpdate({ target: userAutopilotSettings.userId, set: { settings, updatedAt: new Date() } });
  }
  // ─── PREDICTIONS ──────────────────────────────────────────────────────────
  async getTaskPredictions(userId: string) {
    const now = new Date();
    return db.select().from(taskPredictions).where(and(eq(taskPredictions.userId, userId), eq(taskPredictions.status, "predicted"), gte(taskPredictions.expiresAt, now))).orderBy(desc(taskPredictions.confidence)).limit(5);
  }
  async createTaskPrediction(data: typeof taskPredictions.$inferInsert) {
    const [row] = await db.insert(taskPredictions).values(data).returning();
    return row;
  }
  async updateTaskPrediction(id: number, userId: string, data: Partial<typeof taskPredictions.$inferInsert>) {
    const [row] = await db.update(taskPredictions).set({ ...data, updatedAt: new Date() }).where(and(eq(taskPredictions.id, id), eq(taskPredictions.userId, userId))).returning();
    return row;
  }
  async getTaskSequences(userId: string) {
    return db.select().from(taskSequences).where(and(eq(taskSequences.userId, userId), eq(taskSequences.isActive, true))).orderBy(desc(taskSequences.confidence));
  }
  async upsertTaskSequence(data: typeof taskSequences.$inferInsert) {
    const [row] = await db.insert(taskSequences).values(data).returning();
    return row;
  }
  // ─── TIME MACHINE ─────────────────────────────────────────────────────────
  async getWorkSession(userId: string, date: string) {
    const [row] = await db.select().from(workSessions).where(and(eq(workSessions.userId, userId), eq(workSessions.date, date)));
    return row;
  }
  async saveWorkSession(data: typeof workSessions.$inferInsert) {
    const [row] = await db.insert(workSessions).values(data).onConflictDoUpdate({ target: [workSessions.userId, workSessions.date], set: { ...data, updatedAt: new Date() } }).returning();
    return row;
  }
  async getWorkSessions(userId: string, days: number) {
    const since = new Date(Date.now() - days * 86400000);
    return db.select().from(workSessions).where(and(eq(workSessions.userId, userId), gte(workSessions.startTime, since))).orderBy(desc(workSessions.startTime));
  }
  async getWorkPatterns(userId: string) {
    return db.select().from(workPatterns).where(eq(workPatterns.userId, userId)).orderBy(desc(workPatterns.analysisDate));
  }
  async createWorkPattern(data: typeof workPatterns.$inferInsert) {
    const [row] = await db.insert(workPatterns).values(data).returning();
    return row;
  }
  async getCoachingMessages(userId: string) {
    return db.select().from(aiCoachingMessages).where(and(eq(aiCoachingMessages.userId, userId), eq(aiCoachingMessages.isDismissed, false))).orderBy(desc(aiCoachingMessages.createdAt));
  }
  async createCoachingMessage(data: typeof aiCoachingMessages.$inferInsert) {
    const [row] = await db.insert(aiCoachingMessages).values(data).returning();
    return row;
  }
  async updateCoachingMessage(id: number, userId: string, data: Partial<typeof aiCoachingMessages.$inferInsert>) {
    await db.update(aiCoachingMessages).set(data).where(and(eq(aiCoachingMessages.id, id), eq(aiCoachingMessages.userId, userId)));
  }
  // ─── DELEGATION ───────────────────────────────────────────────────────────
  async getTeamMemberProfile(userId: string) {
    const [row] = await db.select().from(teamMemberProfiles).where(eq(teamMemberProfiles.userId, userId));
    return row;
  }
  async upsertTeamMemberProfile(data: typeof teamMemberProfiles.$inferInsert) {
    const [row] = await db.insert(teamMemberProfiles).values(data).onConflictDoUpdate({ target: teamMemberProfiles.userId, set: { ...data, updatedAt: new Date() } }).returning();
    return row;
  }
  async getAllTeamMemberProfiles() {
    return db.select().from(teamMemberProfiles).orderBy(desc(teamMemberProfiles.lastProfileUpdateAt));
  }
  async createDelegationSuggestion(data: typeof delegationSuggestions.$inferInsert) {
    const [row] = await db.insert(delegationSuggestions).values(data).returning();
    return row;
  }
  async updateDelegationSuggestion(id: number, data: Partial<typeof delegationSuggestions.$inferInsert>) {
    await db.update(delegationSuggestions).set(data).where(eq(delegationSuggestions.id, id));
  }
  async getDelegationRules(userId: string) {
    return db.select().from(delegationRules).where(and(eq(delegationRules.userId, userId), eq(delegationRules.isActive, true))).orderBy(desc(delegationRules.createdAt));
  }
  async createDelegationRule(data: typeof delegationRules.$inferInsert) {
    const [row] = await db.insert(delegationRules).values(data).returning();
    return row;
  }
  async updateDelegationRule(id: number, userId: string, data: Partial<typeof delegationRules.$inferInsert>) {
    await db.update(delegationRules).set({ ...data, updatedAt: new Date() }).where(and(eq(delegationRules.id, id), eq(delegationRules.userId, userId)));
  }
  // ─── PROJECT CONTEXTS ─────────────────────────────────────────────────────
  async getProjectContexts(userId: string) {
    return db.select().from(projectContexts).where(eq(projectContexts.userId, userId)).orderBy(desc(projectContexts.lastActiveAt));
  }
  async createProjectContext(data: typeof projectContexts.$inferInsert) {
    const [row] = await db.insert(projectContexts).values(data).returning();
    return row;
  }
  async updateProjectContext(id: number, userId: string, data: Partial<typeof projectContexts.$inferInsert>) {
    const [row] = await db.update(projectContexts).set({ ...data, updatedAt: new Date() }).where(and(eq(projectContexts.id, id), eq(projectContexts.userId, userId))).returning();
    return row;
  }
  // ─── WORKFLOWS ────────────────────────────────────────────────────────────
  async getRecordedWorkflows(userId: string) {
    return db.select().from(recordedWorkflows).where(and(eq(recordedWorkflows.userId, userId), eq(recordedWorkflows.isActive, true))).orderBy(desc(recordedWorkflows.createdAt));
  }
  async getPublicWorkflows() {
    return db.select().from(recordedWorkflows).where(and(eq(recordedWorkflows.isPublic, true), eq(recordedWorkflows.isActive, true))).orderBy(desc(recordedWorkflows.timesRun));
  }
  async createRecordedWorkflow(data: typeof recordedWorkflows.$inferInsert) {
    const [row] = await db.insert(recordedWorkflows).values(data).returning();
    return row;
  }
  async updateRecordedWorkflow(id: number, userId: string, data: Partial<typeof recordedWorkflows.$inferInsert>) {
    const [row] = await db.update(recordedWorkflows).set({ ...data, updatedAt: new Date() }).where(and(eq(recordedWorkflows.id, id), eq(recordedWorkflows.userId, userId))).returning();
    return row;
  }
  async deleteRecordedWorkflow(id: number, userId: string) {
    await db.update(recordedWorkflows).set({ isActive: false, updatedAt: new Date() }).where(and(eq(recordedWorkflows.id, id), eq(recordedWorkflows.userId, userId)));
  }
  // ─── DAILY PLANS ──────────────────────────────────────────────────────────
  async getDailyPlan(userId: string, date: string) {
    const [row] = await db.select().from(dailyPlans).where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, date)));
    return row;
  }
  async createDailyPlan(data: typeof dailyPlans.$inferInsert) {
    const [row] = await db.insert(dailyPlans).values(data).onConflictDoUpdate({ target: [dailyPlans.userId, dailyPlans.date], set: { ...data, updatedAt: new Date() } }).returning();
    return row;
  }
  async updateDailyPlan(id: number, userId: string, data: Partial<typeof dailyPlans.$inferInsert>) {
    const [row] = await db.update(dailyPlans).set({ ...data, updatedAt: new Date() }).where(and(eq(dailyPlans.id, id), eq(dailyPlans.userId, userId))).returning();
    return row;
  }
  // ─── DOCUMENT TEMPLATES ───────────────────────────────────────────────────
  async getDocumentTemplates() {
    return db.select().from(documentTemplatesAi).orderBy(asc(documentTemplatesAi.createdAt));
  }
  async createDocumentTemplate(data: typeof documentTemplatesAi.$inferInsert) {
    const [row] = await db.insert(documentTemplatesAi).values(data).returning();
    return row;
  }
  async updateDocumentTemplate(id: number, data: Partial<typeof documentTemplatesAi.$inferInsert>) {
    await db.update(documentTemplatesAi).set({ ...data, updatedAt: new Date() }).where(eq(documentTemplatesAi.id, id));
  }
  async deleteDocumentTemplate(id: number) {
    await db.delete(documentTemplatesAi).where(eq(documentTemplatesAi.id, id));
  }
  async createGeneratedDocument(data: typeof generatedDocuments.$inferInsert) {
    const [row] = await db.insert(generatedDocuments).values(data).returning();
    return row;
  }
}

export const storage = new DatabaseStorage();
