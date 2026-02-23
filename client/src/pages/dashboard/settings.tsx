import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Settings, Palette, Clock, Bell, Shield, Trophy, BarChart3,
  Download, Trash2, Users, Eye, EyeOff, Zap, Moon, Sun, Monitor,
  AlertTriangle, ChevronRight, Lock, Gauge, MessageSquare, Award,
  FileDown, Database, Flame,
} from "lucide-react";

type UserSettings = {
  id: number;
  userId: string;
  themeMode: string;
  hourlyTrackingEnabled: boolean;
  autoLockTime: string;
  goodHabitStrictMode: boolean;
  badHabitStrictZero: boolean;
  performanceDisplayMode: string;
  levelDowngradeWarning: boolean;
  resetConfirmation: boolean;
  groupNotifications: string;
  showLevelPublicly: boolean;
  showMonthlyScore: boolean;
  showStreakPublicly: boolean;
  allowDirectMessages: boolean;
  showOnlineStatus: boolean;
  dailyReminder: boolean;
  dailyReminderTime: string;
  weeklyPerformanceSummary: boolean;
  monthlyLevelNotification: boolean;
  streakBreakAlert: boolean;
  groupAchievementAlerts: boolean;
  motivationMode: string;
  streakVisibility: string;
  dataExportFormat: string;
  updatedAt: string;
};

function SettingSection({ icon: Icon, title, description, children }: {
  icon: any;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card/50 border border-border rounded-xl overflow-hidden" data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
            <Icon className="w-4.5 h-4.5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

function ToggleSetting({ label, description, checked, onCheckedChange, testId, badge }: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
  testId: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium cursor-pointer">{label}</Label>
          {badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground font-medium">{badge}</span>}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} data-testid={testId} />
    </div>
  );
}

function SelectSetting({ label, description, value, onValueChange, options, testId }: {
  label: string;
  description?: string;
  value: string;
  onValueChange: (val: string) => void;
  options: { value: string; label: string }[];
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-[160px]" data-testid={testId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("appearance");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: [api.settings.get.path],
  });

  const updateSetting = useMutation({
    mutationFn: async (data: Partial<UserSettings>) => {
      const res = await apiRequest("PUT", api.settings.update.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.settings.get.path] });
      toast({ title: "Settings updated", description: "Your preference has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings. Please try again.", variant: "destructive" });
    },
  });

  const handleUpdate = (key: string, value: any) => {
    updateSetting.mutate({ [key]: value });
  };

  const handleExport = (format: string) => {
    window.open(`/api/export-data?format=${format}`, "_blank");
  };

  const sections = [
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "productivity", label: "Productivity", icon: Zap },
    { id: "habits", label: "Habits", icon: Flame },
    { id: "level", label: "Level & Progress", icon: Trophy },
    { id: "group", label: "Group & Social", icon: Users },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "gamification", label: "Gamification", icon: Award },
    { id: "data", label: "Data & Privacy", icon: Shield },
  ];

  if (isLoading || !settings) {
    return (
      <div className="p-4 pt-14 sm:p-8 sm:pt-8">
        <div className="text-center py-20 text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-14 sm:p-8 sm:pt-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-settings-title">
          <Settings className="w-7 h-7 text-muted-foreground" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Customize your experience, tracking preferences, and privacy controls.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Navigation */}
        <nav className="space-y-1 lg:sticky lg:top-8 lg:self-start" data-testid="settings-nav">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                activeSection === s.id ? "bg-white/10 text-white font-medium" : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}
              data-testid={`nav-${s.id}`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="space-y-6 max-w-2xl">
          {/* 1. Appearance */}
          {activeSection === "appearance" && (
            <SettingSection icon={Palette} title="Appearance" description="Customize how the app looks and feels.">
              <SelectSetting
                label="Theme Mode"
                description="Choose your preferred color theme for the app."
                value={settings.themeMode}
                onValueChange={(v) => handleUpdate("themeMode", v)}
                options={[
                  { value: "dark", label: "Dark Mode" },
                  { value: "light", label: "Light Mode" },
                  { value: "system", label: "System Default" },
                ]}
                testId="select-theme"
              />
              <div className="flex gap-3 mt-2">
                {[
                  { value: "dark", icon: Moon, label: "Dark" },
                  { value: "light", icon: Sun, label: "Light" },
                  { value: "system", icon: Monitor, label: "System" },
                ].map(t => (
                  <button
                    key={t.value}
                    onClick={() => handleUpdate("themeMode", t.value)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                      settings.themeMode === t.value
                        ? "border-white/30 bg-white/10"
                        : "border-border bg-white/[0.02] hover:bg-white/5"
                    )}
                    data-testid={`theme-${t.value}`}
                  >
                    <t.icon className={cn("w-5 h-5", settings.themeMode === t.value ? "text-white" : "text-muted-foreground")} />
                    <span className={cn("text-xs font-medium", settings.themeMode === t.value ? "text-white" : "text-muted-foreground")}>{t.label}</span>
                  </button>
                ))}
              </div>
            </SettingSection>
          )}

          {/* 2. Productivity */}
          {activeSection === "productivity" && (
            <>
              <SettingSection icon={Clock} title="Hourly Task Tracking" description="Controls whether hourly productivity data affects your level qualification.">
                <ToggleSetting
                  label="Enable Hourly Task Tracking"
                  description="When enabled, hourly task completion % is included in your level qualification. When disabled, only Tasks, Good Habits, and Bad Habits are considered."
                  checked={settings.hourlyTrackingEnabled}
                  onCheckedChange={(v) => handleUpdate("hourlyTrackingEnabled", v)}
                  testId="toggle-hourly-tracking"
                />
                <div className={cn(
                  "rounded-lg p-3 text-xs",
                  settings.hourlyTrackingEnabled ? "bg-green-500/10 text-green-300" : "bg-amber-500/10 text-amber-300"
                )}>
                  {settings.hourlyTrackingEnabled ? (
                    <p>Level qualification includes: Tasks % + Good Habits % + Bad Habits % + Hourly %</p>
                  ) : (
                    <p>Level qualification includes: Tasks % + Good Habits % + Bad Habits % only. Hourly tracking is excluded from level calculations.</p>
                  )}
                </div>
              </SettingSection>

              <SettingSection icon={Lock} title="Auto Lock Time" description="Set when your daily rating locks permanently.">
                <SelectSetting
                  label="Lock Time"
                  description="After this time, your daily data cannot be modified."
                  value={settings.autoLockTime}
                  onValueChange={(v) => handleUpdate("autoLockTime", v)}
                  options={[
                    { value: "22:00", label: "10:00 PM" },
                    { value: "23:00", label: "11:00 PM" },
                    { value: "00:00", label: "12:00 AM" },
                    { value: "01:00", label: "1:00 AM" },
                    { value: "02:00", label: "2:00 AM" },
                  ]}
                  testId="select-lock-time"
                />
              </SettingSection>
            </>
          )}

          {/* 3. Habits */}
          {activeSection === "habits" && (
            <SettingSection icon={Flame} title="Habit Settings" description="Configure how habits impact your score and level.">
              <ToggleSetting
                label="Good Habit Strict Mode"
                description="When enabled, missing a good habit counts as double negative impact on your score."
                checked={settings.goodHabitStrictMode}
                onCheckedChange={(v) => handleUpdate("goodHabitStrictMode", v)}
                testId="toggle-strict-good"
              />
              <Separator className="bg-border/50" />
              <ToggleSetting
                label="Bad Habit Strict Zero Mode"
                description="When enabled, any bad habit occurrence automatically invalidates that entire day's qualification."
                checked={settings.badHabitStrictZero}
                onCheckedChange={(v) => handleUpdate("badHabitStrictZero", v)}
                testId="toggle-strict-bad"
              />
              {settings.badHabitStrictZero && (
                <div className="rounded-lg p-3 text-xs bg-red-500/10 text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <p>Strict Zero is active. Any bad habit occurrence will fully disqualify that day from level progression.</p>
                </div>
              )}
            </SettingSection>
          )}

          {/* 4. Level & Progress */}
          {activeSection === "level" && (
            <SettingSection icon={Trophy} title="Level & Progress" description="Control how your progress is displayed and level warnings.">
              <SelectSetting
                label="Performance Display Mode"
                description="Choose how your performance metrics are shown throughout the app."
                value={settings.performanceDisplayMode}
                onValueChange={(v) => handleUpdate("performanceDisplayMode", v)}
                options={[
                  { value: "percentages", label: "Show Percentages" },
                  { value: "points", label: "Show Score Points" },
                  { value: "minimal", label: "Minimal (Badge Only)" },
                ]}
                testId="select-display-mode"
              />
              <Separator className="bg-border/50" />
              <ToggleSetting
                label="Level Downgrade Warning"
                description="Get notified 3 days before month-end if you're at risk of being downgraded."
                checked={settings.levelDowngradeWarning}
                onCheckedChange={(v) => handleUpdate("levelDowngradeWarning", v)}
                testId="toggle-downgrade-warning"
              />
              <Separator className="bg-border/50" />
              <ToggleSetting
                label="Monthly Reset Confirmation"
                description="Show a confirmation prompt before monthly level evaluation resets."
                checked={settings.resetConfirmation}
                onCheckedChange={(v) => handleUpdate("resetConfirmation", v)}
                testId="toggle-reset-confirm"
              />
            </SettingSection>
          )}

          {/* 5. Group & Social */}
          {activeSection === "group" && (
            <>
              <SettingSection icon={MessageSquare} title="Group Notifications" description="Control what notifications you receive from groups.">
                <SelectSetting
                  label="Notification Preference"
                  description="Filter which group messages trigger notifications."
                  value={settings.groupNotifications}
                  onValueChange={(v) => handleUpdate("groupNotifications", v)}
                  options={[
                    { value: "all", label: "All Messages" },
                    { value: "admin_only", label: "Admin Only" },
                    { value: "mentions", label: "Mentions Only" },
                    { value: "off", label: "Off" },
                  ]}
                  testId="select-group-notifs"
                />
              </SettingSection>

              <SettingSection icon={Eye} title="Privacy Preferences" description="Control what others can see about your profile.">
                <ToggleSetting
                  label="Show My Level Publicly"
                  description="Allow other users to see your current level in the community."
                  checked={settings.showLevelPublicly}
                  onCheckedChange={(v) => handleUpdate("showLevelPublicly", v)}
                  testId="toggle-show-level"
                />
                <Separator className="bg-border/50" />
                <ToggleSetting
                  label="Show Monthly Score"
                  description="Allow others to see your monthly performance score."
                  checked={settings.showMonthlyScore}
                  onCheckedChange={(v) => handleUpdate("showMonthlyScore", v)}
                  testId="toggle-show-score"
                />
                <Separator className="bg-border/50" />
                <ToggleSetting
                  label="Show Streak Publicly"
                  description="Display your current streak to other community members."
                  checked={settings.showStreakPublicly}
                  onCheckedChange={(v) => handleUpdate("showStreakPublicly", v)}
                  testId="toggle-show-streak"
                />
              </SettingSection>

              <SettingSection icon={Users} title="Interaction Settings" description="Control how other users can interact with you.">
                <ToggleSetting
                  label="Allow Direct Messages"
                  description="Let other Platinum+ members send you direct messages."
                  checked={settings.allowDirectMessages}
                  onCheckedChange={(v) => handleUpdate("allowDirectMessages", v)}
                  testId="toggle-allow-dm"
                  badge="Platinum+"
                />
                <Separator className="bg-border/50" />
                <ToggleSetting
                  label="Show Online Status"
                  description="Let others see when you're actively using the app."
                  checked={settings.showOnlineStatus}
                  onCheckedChange={(v) => handleUpdate("showOnlineStatus", v)}
                  testId="toggle-online-status"
                />
              </SettingSection>
            </>
          )}

          {/* 6. Notifications */}
          {activeSection === "notifications" && (
            <SettingSection icon={Bell} title="Notifications" description="Manage all your notification preferences.">
              <ToggleSetting
                label="Daily Reminder"
                description="Get a reminder to complete your daily tasks and ratings."
                checked={settings.dailyReminder}
                onCheckedChange={(v) => handleUpdate("dailyReminder", v)}
                testId="toggle-daily-reminder"
              />
              {settings.dailyReminder && (
                <div className="pl-6">
                  <SelectSetting
                    label="Reminder Time"
                    value={settings.dailyReminderTime}
                    onValueChange={(v) => handleUpdate("dailyReminderTime", v)}
                    options={[
                      { value: "18:00", label: "6:00 PM" },
                      { value: "19:00", label: "7:00 PM" },
                      { value: "20:00", label: "8:00 PM" },
                      { value: "21:00", label: "9:00 PM" },
                      { value: "22:00", label: "10:00 PM" },
                    ]}
                    testId="select-reminder-time"
                  />
                </div>
              )}
              <Separator className="bg-border/50" />
              <ToggleSetting
                label="Weekly Performance Summary"
                description="Receive a weekly summary of your productivity trends."
                checked={settings.weeklyPerformanceSummary}
                onCheckedChange={(v) => handleUpdate("weeklyPerformanceSummary", v)}
                testId="toggle-weekly-summary"
              />
              <Separator className="bg-border/50" />
              <ToggleSetting
                label="Monthly Level Result"
                description="Get notified when your monthly level evaluation is complete."
                checked={settings.monthlyLevelNotification}
                onCheckedChange={(v) => handleUpdate("monthlyLevelNotification", v)}
                testId="toggle-monthly-notif"
              />
              <Separator className="bg-border/50" />
              <ToggleSetting
                label="Streak Break Alert"
                description="Get alerted if you're about to break your productivity streak."
                checked={settings.streakBreakAlert}
                onCheckedChange={(v) => handleUpdate("streakBreakAlert", v)}
                testId="toggle-streak-alert"
              />
              <Separator className="bg-border/50" />
              <ToggleSetting
                label="Group Achievement Alerts"
                description="Get notified about level-ups and achievements in your group."
                checked={settings.groupAchievementAlerts}
                onCheckedChange={(v) => handleUpdate("groupAchievementAlerts", v)}
                testId="toggle-group-alerts"
              />
            </SettingSection>
          )}

          {/* 7. Gamification */}
          {activeSection === "gamification" && (
            <SettingSection icon={Award} title="Gamification" description="Configure leaderboard and competitive features.">
              <SelectSetting
                label="Motivation Mode"
                description="Choose whether to see leaderboards and competitive elements."
                value={settings.motivationMode}
                onValueChange={(v) => handleUpdate("motivationMode", v)}
                options={[
                  { value: "competitive", label: "Competitive" },
                  { value: "private", label: "Private Mode" },
                ]}
                testId="select-motivation"
              />
              <div className={cn(
                "rounded-lg p-3 text-xs",
                settings.motivationMode === "competitive" ? "bg-blue-500/10 text-blue-300" : "bg-purple-500/10 text-purple-300"
              )}>
                {settings.motivationMode === "competitive"
                  ? "Leaderboards and rankings are visible. Compete with others!"
                  : "Leaderboards and rankings are hidden. Focus on your personal growth."}
              </div>
              <Separator className="bg-border/50" />
              <SelectSetting
                label="Streak Visibility"
                description="Control whether your streak is visible to other users."
                value={settings.streakVisibility}
                onValueChange={(v) => handleUpdate("streakVisibility", v)}
                options={[
                  { value: "public", label: "Public" },
                  { value: "private", label: "Private" },
                ]}
                testId="select-streak-visibility"
              />
            </SettingSection>
          )}

          {/* 8. Data & Privacy */}
          {activeSection === "data" && (
            <>
              <SettingSection icon={Download} title="Export Your Data" description="Download your productivity data for backup or analysis.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleExport("csv")}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-white/[0.02] hover:bg-white/5 transition-colors text-left"
                    data-testid="button-export-csv"
                  >
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                      <FileDown className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Export as CSV</p>
                      <p className="text-xs text-muted-foreground">Spreadsheet format</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport("json")}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-white/[0.02] hover:bg-white/5 transition-colors text-left"
                    data-testid="button-export-json"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Database className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Export as JSON</p>
                      <p className="text-xs text-muted-foreground">Developer format</p>
                    </div>
                  </button>
                </div>
              </SettingSection>

              <SettingSection icon={AlertTriangle} title="Danger Zone" description="Irreversible actions. Please proceed with caution.">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <div>
                      <p className="text-sm font-medium text-amber-200">Reset All Productivity Data</p>
                      <p className="text-xs text-muted-foreground">Clear all tasks, habits, entries, and scores. Your account and settings will be kept.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                      onClick={() => setShowResetConfirm(!showResetConfirm)}
                      data-testid="button-reset-data"
                    >
                      Reset
                    </Button>
                  </div>
                  {showResetConfirm && (
                    <div className="rounded-lg p-3 bg-amber-500/10 text-xs text-amber-200 space-y-2">
                      <p>This feature is not yet available. Contact the admin to request a data reset.</p>
                      <Button size="sm" variant="ghost" onClick={() => setShowResetConfirm(false)}>Dismiss</Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                    <div>
                      <p className="text-sm font-medium text-red-200">Delete Account</p>
                      <p className="text-xs text-muted-foreground">Permanently delete your account and all associated data. This cannot be undone.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-red-500/30 text-red-300 hover:bg-red-500/10"
                      onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                      data-testid="button-delete-account"
                    >
                      Delete
                    </Button>
                  </div>
                  {showDeleteConfirm && (
                    <div className="rounded-lg p-3 bg-red-500/10 text-xs text-red-200 space-y-2">
                      <p>Account deletion is permanent. Contact the admin to request account deletion.</p>
                      <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Dismiss</Button>
                    </div>
                  )}
                </div>
              </SettingSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
