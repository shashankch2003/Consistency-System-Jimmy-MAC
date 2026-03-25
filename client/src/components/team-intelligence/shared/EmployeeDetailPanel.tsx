import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Brain, Users, Layers, BookOpen, Clock, CheckCircle2, AlertCircle,
  Flame, Target, Zap, Mail, Calendar, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import ScoreCircle from "./ScoreCircle";
import type { EmployeeDashboardData } from "@shared/lib/team-intelligence/types";

interface EmployeeDetailPanelProps {
  workspaceId?: string;
  employeeUserId: string;
  memberName?: string;
  memberRole?: string;
  memberAvatar?: string;
  isOpen: boolean;
  onClose: () => void;
}

function hashNum(str: string, max: number, min = 0): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}

function seedDemoData(userId: string, name: string, role: string) {
  const base = hashNum(userId, 85, 52);
  const today = new Date();

  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    const jitter = hashNum(userId + i, 12, -8);
    const score = Math.max(30, Math.min(98, base + jitter));
    return {
      date: d.toISOString().slice(0, 10),
      productivityScore: score,
    };
  });

  const focusHrs = hashNum(userId + "focus", 6, 3) + hashNum(userId + "f2", 9, 0) / 10;
  const meetings = hashNum(userId + "meet", 4, 1) + hashNum(userId + "m2", 9, 0) / 10;
  const shallow = hashNum(userId + "shw", 3, 1) + hashNum(userId + "s2", 9, 0) / 10;
  const learning = hashNum(userId + "lrn", 2, 0) + hashNum(userId + "l2", 9, 0) / 10;
  const tasksCompleted = hashNum(userId + "tc", 18, 7);
  const overdueCount = hashNum(userId + "od", 4, 0);
  const streak = hashNum(userId + "st", 21, 2);
  const habitsToday = hashNum(userId + "hb", 5, 2);
  const goalsOnTrack = hashNum(userId + "gl", 100, 60);

  const firstName = name.split(" ")[0];

  const depts = ["Engineering", "Product", "Design", "Marketing", "Operations", "Sales", "Data"];
  const dept = depts[hashNum(userId + "dept", depts.length - 1, 0)];

  const joinMonths = hashNum(userId + "jm", 36, 4);
  const joinDate = new Date(today);
  joinDate.setMonth(joinDate.getMonth() - joinMonths);
  const joinStr = joinDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const taskTitles = [
    "Refactor authentication module",
    "Q2 roadmap review session",
    "Update API documentation",
    "Design sprint planning",
    "Bug fix: dashboard loading state",
    "Write unit tests for payment flow",
    "Weekly team sync notes",
    "Review pull requests",
    "Customer feedback analysis",
    "Set up CI/CD pipeline",
    "Competitor analysis report",
    "Prototype new onboarding flow",
  ];

  const myTasks = Array.from({ length: 5 }, (_, i) => {
    const titleIdx = hashNum(userId + "t" + i, taskTitles.length - 1, 0);
    const statusSeed = hashNum(userId + "ts" + i, 10, 0);
    const status = statusSeed < 5 ? "done" : statusSeed < 7 ? "in_progress" : "overdue";
    const priorities = ["high", "medium", "low"] as const;
    const priority = priorities[hashNum(userId + "tp" + i, 2, 0)];
    return { title: taskTitles[(titleIdx + i * 3) % taskTitles.length], status, priority };
  });

  const insights = [
    {
      icon: Brain,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      title: `${firstName} logged ${focusHrs.toFixed(1)}h of deep focus this week`,
      message: `That's ${focusHrs > 4.5 ? "above" : "below"} the team average of 4.2h. ${focusHrs > 4.5 ? "Great sustained concentration." : "Consider blocking 2h focus slots each morning."}`,
    },
    {
      icon: overdueCount > 2 ? AlertCircle : CheckCircle2,
      color: overdueCount > 2 ? "text-red-400" : "text-green-400",
      bg: overdueCount > 2 ? "bg-red-500/10" : "bg-green-500/10",
      title: overdueCount > 2 ? `${overdueCount} overdue tasks aging past 3 days` : "Task completion rate is strong",
      message: overdueCount > 2
        ? `${firstName} may be overloaded. Consider a 1:1 to reprioritise the backlog.`
        : `${firstName} has cleared ${tasksCompleted} tasks this sprint with only ${overdueCount} overdue.`,
    },
    {
      icon: Flame,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      title: `${streak}-day active streak`,
      message: `${firstName} has been consistently logging work for ${streak} days in a row. ${streak >= 14 ? "Excellent consistency." : "Encourage maintaining the streak through month-end."}`,
    },
  ];

  const habits = [
    { name: "Morning planning", pct: hashNum(userId + "hab0", 100, 50) },
    { name: "Deep work session", pct: hashNum(userId + "hab1", 100, 40) },
    { name: "End-of-day review", pct: hashNum(userId + "hab2", 100, 30) },
    { name: "Learning / reading", pct: hashNum(userId + "hab3", 100, 20) },
  ];

  const goals = [
    { name: "Ship Q2 roadmap items", pct: hashNum(userId + "g0", 90, 40), status: "on_track" as const },
    { name: "Reduce overdue by 50%", pct: hashNum(userId + "g1", 80, 10), status: overdueCount > 2 ? "at_risk" as const : "on_track" as const },
  ];

  const scoreBreakdown = [
    { label: "Focus", value: hashNum(userId + "sb0", 95, 50), color: "bg-blue-500" },
    { label: "Completion", value: hashNum(userId + "sb1", 95, 45), color: "bg-green-500" },
    { label: "Consistency", value: hashNum(userId + "sb2", 95, 40), color: "bg-purple-500" },
    { label: "Habits", value: hashNum(userId + "sb3", 95, 35), color: "bg-orange-500" },
    { label: "Learning", value: hashNum(userId + "sb4", 95, 30), color: "bg-yellow-500" },
  ];

  return {
    base, focusHrs, meetings, shallow, learning,
    tasksCompleted, overdueCount, streak, habitsToday, goalsOnTrack,
    last14Days, firstName, dept, joinStr, myTasks, insights, habits, goals, scoreBreakdown,
  };
}

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-yellow-600",
  "bg-red-600", "bg-green-600", "bg-orange-600", "bg-pink-600", "bg-cyan-600",
];

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  done: { label: "Done", className: "text-green-400", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  in_progress: { label: "In Progress", className: "text-blue-400", icon: <Clock className="w-3.5 h-3.5" /> },
  overdue: { label: "Overdue", className: "text-red-400", icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

const HEALTH_COLOR: Record<string, string> = {
  on_track: "bg-green-500/20 text-green-400 border-green-500/30",
  at_risk: "bg-red-500/20 text-red-400 border-red-500/30",
  needs_attention: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

export default function EmployeeDetailPanel({
  workspaceId = "default",
  employeeUserId,
  memberName = "Team Member",
  memberRole = "Member",
  memberAvatar,
  isOpen,
  onClose,
}: EmployeeDetailPanelProps) {
  const { data, isLoading } = useQuery<EmployeeDashboardData>({
    queryKey: [`/api/team-intelligence/employee/${employeeUserId}?workspaceId=${workspaceId}`],
    enabled: isOpen && !!employeeUserId,
  });

  const hasRealData = !isLoading && data &&
    (data.recentSnapshots?.length > 0 || (data.currentScores?.total ?? 0) > 0);

  const demo = (!isLoading && !hasRealData && employeeUserId)
    ? seedDemoData(employeeUserId, memberName, memberRole)
    : null;

  const avatarColorIdx = employeeUserId
    ? AVATAR_COLORS[employeeUserId.charCodeAt(0) % AVATAR_COLORS.length]
    : AVATAR_COLORS[0];

  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        className="bg-zinc-950 border-zinc-800 w-full sm:max-w-lg overflow-y-auto p-0"
        data-testid="panel-employee-detail"
      >
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle className="text-white text-base">Employee Detail</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 p-5">
            <Skeleton className="h-28 w-full bg-zinc-800 rounded-xl" />
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-16 bg-zinc-800 rounded-xl" />)}
            </div>
            <Skeleton className="h-40 w-full bg-zinc-800 rounded-xl" />
            <Skeleton className="h-48 w-full bg-zinc-800 rounded-xl" />
          </div>
        ) : hasRealData ? (
          <RealDataView data={data!} memberName={memberName} memberRole={memberRole} memberAvatar={memberAvatar} avatarColor={avatarColorIdx} />
        ) : demo ? (
          <DemoDataView demo={demo} memberName={memberName} memberRole={memberRole} memberAvatar={memberAvatar} avatarColor={avatarColorIdx} />
        ) : (
          <div className="mt-8 text-center text-zinc-500 text-sm px-5">No data available for this employee.</div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function RealDataView({ data, memberName, memberRole, memberAvatar, avatarColor }: {
  data: EmployeeDashboardData;
  memberName: string;
  memberRole: string;
  memberAvatar?: string;
  avatarColor: string;
}) {
  const latest = data.todaySnapshot || data.recentSnapshots?.[0];
  const last7 = (data.recentSnapshots || []).slice(0, 7).reverse();

  return (
    <div className="space-y-5 p-5">
      <ProfileHeader name={memberName} role={memberRole} avatar={memberAvatar} avatarColor={avatarColor} score={data.currentScores.total} />

      <div className="grid grid-cols-3 gap-2">
        <StatCell label="Focus" value={`${Math.round((latest?.deepWorkMinutes ?? 0) / 60 * 10) / 10}h`} icon={<Brain className="w-3.5 h-3.5 text-blue-400" />} />
        <StatCell label="Tasks" value={String(latest?.tasksCompleted ?? 0)} icon={<CheckCircle2 className="w-3.5 h-3.5 text-green-400" />} />
        <StatCell label="Overdue" value={String(latest?.tasksOverdue ?? 0)} icon={<AlertCircle className="w-3.5 h-3.5 text-red-400" />} valueClass={latest?.tasksOverdue ? "text-red-400" : undefined} />
        <StatCell label="Streak" value={`${data.streak}d`} icon={<Flame className="w-3.5 h-3.5 text-orange-400" />} />
        <StatCell label="Score" value={String(data.currentScores.total)} icon={<Zap className="w-3.5 h-3.5 text-yellow-400" />} />
        <StatCell label="Goals" value="—" icon={<Target className="w-3.5 h-3.5 text-purple-400" />} />
      </div>

      {last7.length > 1 && (
        <TrendChart data={last7} />
      )}

      {data.insights?.length > 0 && (
        <div>
          <SectionLabel>AI Insights</SectionLabel>
          <div className="space-y-2">
            {data.insights.slice(0, 3).map((ins, idx) => (
              <div key={idx} className="flex gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <Zap className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-white">{ins.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{ins.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DemoDataView({ demo, memberName, memberRole, memberAvatar, avatarColor }: {
  demo: ReturnType<typeof seedDemoData>;
  memberName: string;
  memberRole: string;
  memberAvatar?: string;
  avatarColor: string;
}) {
  const totalSessionHrs = demo.focusHrs + demo.meetings + demo.shallow + demo.learning;
  const sessionPcts = [
    { label: "Deep Focus", hrs: demo.focusHrs, pct: Math.round((demo.focusHrs / totalSessionHrs) * 100), color: "bg-blue-500" },
    { label: "Meetings", hrs: demo.meetings, pct: Math.round((demo.meetings / totalSessionHrs) * 100), color: "bg-orange-500" },
    { label: "Shallow Work", hrs: demo.shallow, pct: Math.round((demo.shallow / totalSessionHrs) * 100), color: "bg-yellow-500" },
    { label: "Learning", hrs: demo.learning, pct: Math.round((demo.learning / totalSessionHrs) * 100), color: "bg-green-500" },
  ];

  const trendTrend = (() => {
    const s = demo.last14Days;
    if (s.length < 2) return "stable" as const;
    const last = s[s.length - 1].productivityScore;
    const prev = s[s.length - 2].productivityScore;
    return last > prev ? "up" as const : last < prev ? "down" as const : "stable" as const;
  })();

  const TrendIcon = trendTrend === "up" ? TrendingUp : trendTrend === "down" ? TrendingDown : Minus;
  const trendColor = trendTrend === "up" ? "text-green-400" : trendTrend === "down" ? "text-red-400" : "text-zinc-400";

  return (
    <div className="space-y-5 p-5">
      <div className="p-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 flex items-center gap-2 mb-1">
        <span className="text-yellow-400 text-xs">Preview</span>
        <span className="text-zinc-400 text-xs">Showing how this panel looks with real data — actual data accumulates as this member logs their work.</span>
      </div>

      <ProfileHeader
        name={memberName}
        role={memberRole}
        avatar={memberAvatar}
        avatarColor={avatarColor}
        score={demo.base}
        trendIcon={<TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />}
        dept={demo.dept}
        joinStr={demo.joinStr}
      />

      <div className="grid grid-cols-3 gap-2">
        <StatCell label="Focus hrs" value={`${demo.focusHrs.toFixed(1)}h`} icon={<Brain className="w-3.5 h-3.5 text-blue-400" />} sub="this week" />
        <StatCell label="Tasks done" value={String(demo.tasksCompleted)} icon={<CheckCircle2 className="w-3.5 h-3.5 text-green-400" />} sub="this sprint" />
        <StatCell label="Overdue" value={String(demo.overdueCount)} icon={<AlertCircle className="w-3.5 h-3.5 text-red-400" />} valueClass={demo.overdueCount > 0 ? "text-red-400" : undefined} />
        <StatCell label="Streak" value={`${demo.streak}d`} icon={<Flame className="w-3.5 h-3.5 text-orange-400" />} sub="active days" />
        <StatCell label="Habits" value={`${demo.habitsToday}/5`} icon={<Target className="w-3.5 h-3.5 text-purple-400" />} sub="today" />
        <StatCell label="Goals" value={`${demo.goalsOnTrack}%`} icon={<Zap className="w-3.5 h-3.5 text-yellow-400" />} sub="on track" />
      </div>

      <div>
        <SectionLabel>Score Breakdown</SectionLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3 space-y-2.5">
            {demo.scoreBreakdown.map(item => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{item.label}</span>
                  <span className="text-white font-medium">{item.value}</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <SectionLabel>14-Day Score Trend</SectionLabel>
        <TrendChart data={demo.last14Days} />
      </div>

      <div>
        <SectionLabel>Time Allocation — This Week</SectionLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex gap-0.5 h-5 rounded-full overflow-hidden mb-3">
              {sessionPcts.map(s => (
                <div key={s.label} className={`${s.color} first:rounded-l-full last:rounded-r-full`} style={{ width: `${s.pct}%` }} title={s.label} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {sessionPcts.map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${s.color} flex-shrink-0`} />
                  <span className="text-xs text-zinc-400">{s.label}</span>
                  <span className="text-xs text-white ml-auto">{s.hrs.toFixed(1)}h</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <SectionLabel>Recent Tasks</SectionLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3 space-y-2">
            {demo.myTasks.map((task, i) => {
              const s = STATUS_CONFIG[task.status];
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className={s.className}>{s.icon}</span>
                  <span className="text-xs text-zinc-300 flex-1 truncate">{task.title}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORITY_BADGE[task.priority]}`}>
                    {task.priority}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div>
        <SectionLabel>Habit Adherence — This Month</SectionLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3 space-y-2.5">
            {demo.habits.map(h => (
              <div key={h.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{h.name}</span>
                  <span className={h.pct >= 70 ? "text-green-400" : h.pct >= 40 ? "text-yellow-400" : "text-red-400"}>{h.pct}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div
                    className={`h-full rounded-full ${h.pct >= 70 ? "bg-green-500" : h.pct >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${h.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <SectionLabel>Goal Progress</SectionLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3 space-y-3">
            {demo.goals.map(g => (
              <div key={g.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300 font-medium">{g.name}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${HEALTH_COLOR[g.status]}`}>
                    {g.status === "on_track" ? "On Track" : g.status === "at_risk" ? "At Risk" : "Needs Attention"}
                  </Badge>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div
                    className={`h-full rounded-full ${g.status === "on_track" ? "bg-green-500" : "bg-red-500"}`}
                    style={{ width: `${g.pct}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 text-right">{g.pct}% complete</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <SectionLabel>AI Insights</SectionLabel>
        <div className="space-y-2">
          {demo.insights.map((ins, idx) => (
            <div key={idx} className={`flex gap-3 p-3 rounded-lg border border-zinc-800 ${ins.bg}`}>
              <ins.icon className={`w-4 h-4 ${ins.color} flex-shrink-0 mt-0.5`} />
              <div>
                <p className="text-xs font-semibold text-white">{ins.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{ins.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileHeader({ name, role, avatar, avatarColor, score, trendIcon, dept, joinStr }: {
  name: string;
  role: string;
  avatar?: string;
  avatarColor: string;
  score: number;
  trendIcon?: React.ReactNode;
  dept?: string;
  joinStr?: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className={`w-16 h-16 rounded-full ${avatarColor} flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>
        {avatar ? (
          <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
        ) : (
          getInitials(name)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-base leading-tight">{name}</p>
        <p className="text-zinc-400 text-sm">{role}</p>
        {dept && <p className="text-zinc-500 text-xs mt-0.5">{dept} Department</p>}
        {joinStr && (
          <div className="flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3 text-zinc-600" />
            <span className="text-xs text-zinc-500">Joined {joinStr}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <ScoreCircle score={score} label="" size="sm" />
        {trendIcon && <div className="flex items-center gap-0.5">{trendIcon}</div>}
      </div>
    </div>
  );
}

function StatCell({ label, value, icon, sub, valueClass }: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-3">
        <div className="flex items-center gap-1 mb-1">
          {icon}
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide leading-none">{label}</p>
        </div>
        <p className={`text-lg font-bold leading-tight ${valueClass || "text-white"}`}>{value}</p>
        {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function TrendChart({ data }: { data: { date: string; productivityScore: number }[] }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-3">
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: "#71717A", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis domain={[0, 100]} tick={{ fill: "#71717A", fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8, fontSize: 12 }}
              labelFormatter={formatDate}
              formatter={(v: number) => [`${v}`, "Score"]}
            />
            <Line type="monotone" dataKey="productivityScore" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#3B82F6" }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">{children}</p>;
}
