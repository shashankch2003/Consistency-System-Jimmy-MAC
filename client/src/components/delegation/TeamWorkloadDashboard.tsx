import { useState } from "react";
import { Bot } from "lucide-react";
import { suggestAutoBalance } from "@/lib/delegation/workloadCalculator";

const INITIAL_MEMBERS = [
  { id: "aj", name: "Alice", initials: "AJ", status: "Good",       statusColor: "bg-green-100 text-green-700",   tasks: 3, due: 1, pct: 60,  barColor: "bg-green-400",  maxTasks: 5,  overdueCount: 0 },
  { id: "bm", name: "Bob",   initials: "BM", status: "Busy",       statusColor: "bg-yellow-100 text-yellow-700", tasks: 6, due: 2, pct: 85,  barColor: "bg-orange-400", maxTasks: 7,  overdueCount: 1 },
  { id: "cw", name: "Carol", initials: "CW", status: "Good",       statusColor: "bg-green-100 text-green-700",   tasks: 1, due: 0, pct: 15,  barColor: "bg-green-400",  maxTasks: 7,  overdueCount: 0 },
  { id: "dk", name: "Dave",  initials: "DK", status: "Overloaded", statusColor: "bg-red-100 text-red-700",       tasks: 9, due: 4, pct: 110, barColor: "bg-red-500",    maxTasks: 8,  overdueCount: 3 },
  { id: "el", name: "Eve",   initials: "EL", status: "Good",       statusColor: "bg-green-100 text-green-700",   tasks: 2, due: 0, pct: 45,  barColor: "bg-green-400",  maxTasks: 5,  overdueCount: 0 },
];

interface AutoBalanceModalProps {
  suggestions: ReturnType<typeof suggestAutoBalance>;
  onApplyAll: () => void;
  onCancel: () => void;
}

function AutoBalanceModal({ suggestions, onApplyAll, onCancel }: AutoBalanceModalProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set(suggestions.map((_, i) => i)));

  function toggleSelected(i: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="max-w-[480px] w-full bg-white rounded-xl shadow-2xl p-6 mx-4">
        <h3 className="font-bold text-gray-900 text-base mb-1">Auto-Balance Preview</h3>
        <p className="text-sm text-gray-500 mb-4">Suggested task redistribution to balance workload.</p>
        <div className="space-y-3 mb-6">
          {suggestions.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">Team workload is already balanced.</p>
          )}
          {suggestions.map((s, i) => (
            <label key={i} className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selected.has(i)}
                onChange={() => toggleSelected(i)}
                className="mt-0.5"
              />
              <div className="text-sm text-gray-700">
                Move <strong>{s.taskCount} task{s.taskCount > 1 ? "s" : ""}</strong> from{" "}
                <strong>{s.fromMemberName}</strong> → <strong>{s.toMemberName}</strong>
                <p className="text-xs text-gray-400 mt-0.5">{s.reason}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md">Cancel</button>
          {suggestions.length > 0 && (
            <>
              <button
                onClick={() => { onApplyAll(); }}
                className="px-4 py-2 text-sm border border-blue-600 text-blue-600 rounded-md"
              >
                Apply Selected ({selected.size})
              </button>
              <button onClick={onApplyAll} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md">Apply All</button>
            </>
          )}
          {suggestions.length === 0 && (
            <button onClick={onCancel} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md">OK</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeamWorkloadDashboard() {
  const [showBalance, setShowBalance] = useState(false);
  const [members] = useState(INITIAL_MEMBERS);

  const suggestions = suggestAutoBalance({
    members: members.map(m => ({
      memberId: m.id,
      memberName: m.name,
      assignedTasks: m.tasks,
      maxTasks: m.maxTasks,
      capacityPercent: m.pct,
      status: m.status as "Good" | "Busy" | "Overloaded",
      overdueTasks: m.overdueCount,
    })),
    totalTasks: members.reduce((s, m) => s + m.tasks, 0),
    averageCapacity: Math.round(members.reduce((s, m) => s + m.pct, 0) / members.length),
    overloadedCount: members.filter(m => m.status === "Overloaded").length,
  });

  return (
    <>
      {showBalance && (
        <AutoBalanceModal
          suggestions={suggestions}
          onApplyAll={() => setShowBalance(false)}
          onCancel={() => setShowBalance(false)}
        />
      )}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Team Workload Overview</h3>
          <button
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md"
            onClick={() => setShowBalance(true)}
          >
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
                <div className={`h-2 rounded-full ${m.barColor}`} style={{ width: `${Math.min(m.pct, 100)}%` }} />
              </div>
              <div className="text-xs text-gray-400 text-center mt-1">{m.pct}%</div>
            </div>
          ))}
        </div>

        <div className="hidden text-sm text-gray-400 text-center mt-4">No team members available.</div>
      </div>
    </>
  );
}
