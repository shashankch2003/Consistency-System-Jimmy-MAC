import { Bot } from "lucide-react";

const members = [
  { name: "Alice", initials: "AJ", status: "Good",       statusColor: "bg-green-100 text-green-700",  tasks: 3, due: 1, pct: 60,  barColor: "bg-green-400" },
  { name: "Bob",   initials: "BM", status: "Busy",       statusColor: "bg-yellow-100 text-yellow-700", tasks: 6, due: 2, pct: 85,  barColor: "bg-orange-400" },
  { name: "Carol", initials: "CW", status: "Good",       statusColor: "bg-green-100 text-green-700",  tasks: 1, due: 0, pct: 15,  barColor: "bg-green-400" },
  { name: "Dave",  initials: "DK", status: "Overloaded", statusColor: "bg-red-100 text-red-700",      tasks: 9, due: 4, pct: 110, barColor: "bg-red-500" },
  { name: "Eve",   initials: "EL", status: "Good",       statusColor: "bg-green-100 text-green-700",  tasks: 2, due: 0, pct: 45,  barColor: "bg-green-400" },
];

export default function TeamWorkloadDashboard() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Team Workload Overview</h3>
        <button className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md">
          <Bot className="w-4 h-4" />
          Auto-Balance
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {members.map((m, i) => (
          <div key={i} className="w-[130px] bg-white rounded-lg shadow-sm p-3 flex-shrink-0 border border-gray-100">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm mx-auto mb-2">
              {m.initials}
            </div>
            <div className="text-sm font-medium text-center text-gray-900 truncate">{m.name}</div>
            <div className="flex justify-center mt-1 mb-2">
              <span className={`text-xs rounded-full px-2 py-0.5 ${m.statusColor}`}>{m.status}</span>
            </div>
            <div className="text-xs text-gray-500 text-center">Tasks: {m.tasks}</div>
            <div className="text-xs text-gray-500 text-center mb-2">Due: {m.due}</div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full ${m.barColor}`}
                style={{ width: `${Math.min(m.pct, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 text-center mt-1">{m.pct}%</div>
          </div>
        ))}
      </div>

      <div className="hidden text-sm text-gray-400 text-center mt-4">No team members available.</div>
    </div>
  );
}
