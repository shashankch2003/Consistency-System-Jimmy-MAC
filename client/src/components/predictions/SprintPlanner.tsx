import { Edit3 } from "lucide-react";

const sprintTasks = [
  { title: "Set up weekly goals", day: "day 1" },
  { title: "Review backlog items", day: "day 1" },
  { title: "Write unit tests for auth module", day: "day 2" },
  { title: "Update API documentation", day: "day 2" },
  { title: "Design review meeting prep", day: "day 3" },
  { title: "Fix reported bugs from last sprint", day: "day 3" },
  { title: "Sprint retrospective notes", day: "day 5" },
];

export default function SprintPlanner() {
  return (
    <div className="max-w-[600px] rounded-xl shadow-2xl bg-white p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">🔮</span>
        <h2 className="text-lg font-bold text-gray-900">AI Sprint Planner</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">Based on your last 5 sprints:</p>

      <div className="divide-y border rounded-lg overflow-hidden">
        {sprintTasks.map((task, i) => (
          <div key={i} className="h-11 px-3 flex items-center justify-between hover:bg-gray-50 group">
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="rounded" readOnly />
              <span className="text-sm text-gray-800">{task.title}</span>
              <span className="text-xs text-gray-400">({task.day})</span>
            </div>
            <Edit3 className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100" />
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-5">
        <button className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md">Create All Selected</button>
        <button className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-md">Customize</button>
        <button className="text-gray-500 text-sm px-3 py-2">Start Blank</button>
      </div>

      <div className="hidden text-sm text-gray-400 text-center mt-4">
        Complete 3 sprints for AI suggestions.
      </div>
    </div>
  );
}
