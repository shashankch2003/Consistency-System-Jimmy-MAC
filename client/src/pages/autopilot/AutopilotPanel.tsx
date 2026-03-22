import { Zap, Settings, CheckCircle, Brain, ToggleLeft, ToggleRight, Edit2, Copy, Trash2, History, X } from "lucide-react";
import SuggestionCard from "@/components/ai/SuggestionCard";

const stats = [
  { label: "Time Saved", value: "3.2h", sub: "+0.5h", color: "text-green-600" },
  { label: "Actions", value: "47", sub: "+12", color: "text-green-600" },
  { label: "Rules Active", value: "12", sub: "6 learned", color: "text-gray-500" },
  { label: "Accuracy", value: "94%", sub: null, color: null, bar: true },
];

const recentActions = [
  { time: "2m ago", text: "Created follow-up task: Review wireframes", rule: "Post-task Rule" },
  { time: "14m ago", text: "Assigned @alice to Design Review ticket", rule: "Assignment Rule" },
  { time: "1h ago", text: "Sent daily standup summary to Slack", rule: "Report Rule" },
];

const rules = [
  { name: "Post-task Follow-up", type: "Task", mode: "Auto", triggered: "47x", confidence: "94%", color: "border-purple-400" },
  { name: "Meeting Summary", type: "Meeting", mode: "Suggest", triggered: "12x", confidence: "88%", color: "border-blue-400" },
  { name: "Weekly Report", type: "Reporting", mode: "Auto", triggered: "4x", confidence: "99%", color: "border-green-400" },
];

const patterns = [
  {
    icon: Brain,
    text: "After completing tasks tagged 'design', you usually create a review task within 1 hour",
    pills: ["auto", "suggest", "confirm"],
  },
  {
    icon: Brain,
    text: "On Fridays before 5PM, you typically write a weekly summary note",
    pills: ["auto", "suggest", "confirm"],
  },
];

const logEntries = [
  { status: "success", time: "Today 2:15 PM", text: "Created task: Review wireframes", rule: "Post-task Rule" },
  { status: "success", time: "Today 10:32 AM", text: "Sent standup summary", rule: "Report Rule" },
  { status: "skipped", time: "Today 9:48 AM", text: "Skipped: Assign @alice (user dismissed)", rule: "Assignment Rule" },
  { status: "success", time: "Yesterday 5:01 PM", text: "Created weekly summary note", rule: "Weekly Rule" },
  { status: "error", time: "Yesterday 3:22 PM", text: "Failed: Could not create task (quota)", rule: "Post-task Rule" },
  { status: "success", time: "Yesterday 11:00 AM", text: "Meeting summary sent", rule: "Meeting Rule" },
  { status: "success", time: "2 days ago 4:45 PM", text: "Sprint retrospective note created", rule: "Sprint Rule" },
  { status: "skipped", time: "2 days ago 2:00 PM", text: "Skipped: Weekly report (not Friday)", rule: "Report Rule" },
];

const templates = [
  { icon: "✅", title: "Task Follow-up", desc: "Create a follow-up task after completing any task", teams: 124 },
  { icon: "📋", title: "Meeting Summary", desc: "Automatically summarize meeting notes", teams: 89 },
  { icon: "📧", title: "Status Update", desc: "Send status updates when tasks move to review", teams: 67 },
  { icon: "📊", title: "Weekly Report", desc: "Generate and share weekly progress reports", teams: 212 },
  { icon: "🔔", title: "Deadline Alert", desc: "Notify team when deadlines are approaching", teams: 156 },
  { icon: "🔄", title: "Sprint Planning", desc: "Auto-populate sprint from predicted tasks", teams: 43 },
];

const statusColors: Record<string, string> = {
  success: "text-green-500",
  skipped: "text-yellow-500",
  error: "text-red-500",
};

export default function AutopilotPanel() {
  return (
    <div className="bg-white border-l h-full overflow-y-auto min-h-screen">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-500" />
            <h1 className="text-xl font-bold text-gray-900">AI Work Autopilot</h1>
          </div>
          <Settings className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600" />
        </div>

        <div className="flex gap-1 border-b mb-6">
          {["Dashboard", "My Rules", "Suggestions", "Activity Log", "Templates"].map((tab, i) => (
            <button
              key={tab}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                i === 0
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          <div className="flex gap-4 flex-wrap">
            {stats.map(stat => (
              <div key={stat.label} className="bg-white rounded-lg shadow-sm p-4 border flex-1 min-w-[140px]">
                <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                {stat.sub && (
                  <div className={`text-xs mt-0.5 ${stat.color}`}>{stat.sub}</div>
                )}
                {stat.bar && (
                  <div className="h-1.5 bg-gray-100 rounded-full mt-2">
                    <div className="h-1.5 bg-green-500 rounded-full" style={{ width: "94%" }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Pending Suggestions</h2>
            <div className="space-y-3">
              <SuggestionCard />
              <SuggestionCard />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Actions</h2>
            <div className="space-y-2">
              {recentActions.map((action, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="text-xs text-gray-400 w-16 shrink-0">{action.time}</span>
                  <span className="text-sm text-gray-700 flex-1">{action.text}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{action.rule}</span>
                  <button className="text-xs text-blue-500 hover:underline">Undo</button>
                  <button className="text-xs text-gray-400 hover:underline">View</button>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">My Rules</h2>
            <div className="flex items-center justify-between mb-4">
              <button className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md">+ Create New Rule</button>
              <div className="flex gap-2">
                {["All", "Auto", "Suggest", "Confirm"].map(f => (
                  <button key={f} className="text-xs border rounded-full px-3 py-1 text-gray-500 hover:bg-gray-50">{f}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {rules.map(rule => (
                <div key={rule.name} className={`border-l-4 ${rule.color} border rounded-lg p-4`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 text-sm">{rule.name}</span>
                    <ToggleRight className="w-8 h-5 text-blue-500" />
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>Type: {rule.type}</span>
                    <span>Mode: {rule.mode}</span>
                    <span>Triggered: {rule.triggered}</span>
                    <span>Confidence: {rule.confidence}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {[Edit2, Copy, Trash2, History].map((Icon, i) => (
                      <button key={i} className="p-1 text-gray-400 hover:text-gray-600">
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Suggestions</h2>
            <div className="space-y-3">
              {patterns.map((p, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <p.icon className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">{p.text}</p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {p.pills.map(pill => (
                      <span key={pill} className="text-xs border rounded-full px-2 py-0.5 text-gray-500">{pill}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md">Enable</button>
                    <button className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md">Customize</button>
                    <button className="text-sm text-gray-400 px-2 py-1.5">Not Useful</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Activity Log</h2>
            <div className="flex gap-3 mb-4">
              <select className="text-sm border border-gray-200 rounded-md px-2 py-1 text-gray-600">
                <option>All dates</option>
                <option>Today</option>
                <option>This week</option>
              </select>
              <select className="text-sm border border-gray-200 rounded-md px-2 py-1 text-gray-600">
                <option>All statuses</option>
                <option>Success</option>
                <option>Skipped</option>
                <option>Error</option>
              </select>
            </div>
            <div className="space-y-2">
              {logEntries.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50">
                  <CheckCircle className={`w-4 h-4 shrink-0 ${statusColors[entry.status]}`} />
                  <span className="text-xs text-gray-400 w-32 shrink-0">{entry.time}</span>
                  <span className="text-sm text-gray-700 flex-1">{entry.text}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{entry.rule}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Templates</h2>
            <div className="flex gap-2 mb-4 flex-wrap">
              {["All", "Tasks", "Meetings", "Communication", "Reporting"].map(cat => (
                <button key={cat} className={`text-xs rounded-full px-3 py-1 border ${cat === "All" ? "bg-blue-50 border-blue-300 text-blue-600" : "text-gray-500 hover:bg-gray-50"}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(tmpl => (
                <div key={tmpl.title} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="text-2xl mb-2">{tmpl.icon}</div>
                  <div className="font-medium text-gray-900 text-sm">{tmpl.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{tmpl.desc}</div>
                  <div className="text-xs text-gray-400 mt-2">Used by {tmpl.teams} teams</div>
                  <button className="mt-3 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md w-full">Use Template</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-50 space-y-3">
        {[0, 1].map(i => (
          <div key={i} className="relative">
            <div className="absolute -top-1 -right-1 z-10">
              <button className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300">
                <X className="w-3 h-3 text-gray-600" />
              </button>
            </div>
            <SuggestionCard />
            <div className="text-xs text-gray-400 text-center mt-1">Dismissing in 30s</div>
          </div>
        ))}
      </div>
    </div>
  );
}
