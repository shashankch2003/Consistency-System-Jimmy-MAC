import { Edit2, Share2, Trash2 } from "lucide-react";

const workflows = [
  {
    icon: "🤝",
    name: "Client Onboarding",
    desc: "Automates the full client onboarding process from first contact to kickoff",
    runs: 12,
    avg: "45s",
  },
  {
    icon: "📋",
    name: "Sprint Setup",
    desc: "Creates all recurring tasks and notes for a new sprint week",
    runs: 8,
    avg: "1m 12s",
  },
  {
    icon: "📊",
    name: "Weekly Report",
    desc: "Generates and sends weekly progress summary with task completion data",
    runs: 4,
    avg: "30s",
  },
  {
    icon: "🔁",
    name: "Task Follow-up",
    desc: "Creates a follow-up task automatically after completing high-priority items",
    runs: 34,
    avg: "8s",
  },
];

const tabs = ["My", "Shared", "All"];

export default function WorkflowLibrary() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Workflows</h3>
        <button className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md">Record New Workflow</button>
      </div>

      <div className="flex gap-1 border-b mb-4">
        {tabs.map((tab, i) => (
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

      <div className="grid grid-cols-2 gap-3">
        {workflows.map((wf, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-4 border hover:shadow-md transition-shadow">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-2xl">{wf.icon}</span>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-gray-900">{wf.name}</div>
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{wf.desc}</p>
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-3">Run {wf.runs} times | Avg: {wf.avg}</div>
            <div className="flex items-center gap-2">
              <button className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded-md">Run</button>
              <button className="p-1.5 text-gray-400 hover:text-gray-600"><Edit2 className="w-3.5 h-3.5" /></button>
              <button className="p-1.5 text-gray-400 hover:text-gray-600"><Share2 className="w-3.5 h-3.5" /></button>
              <button className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden text-sm text-gray-400 text-center mt-6">
        No workflows yet. Record your first!
      </div>
    </div>
  );
}
