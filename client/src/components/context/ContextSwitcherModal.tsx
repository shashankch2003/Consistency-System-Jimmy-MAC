import { Shuffle, X, Pin } from "lucide-react";

const pinned = [
  {
    name: "Login Redesign",
    color: "bg-blue-500",
    last: "2h ago",
    stats: "5 active tasks | 3 unread | 1 draft",
    alert: null,
  },
];

const recent = [
  {
    name: "API Documentation",
    color: "bg-green-500",
    last: "Yesterday",
    stats: "2 active tasks | 0 unread | 0 drafts",
    alert: "3 important updates",
    alertColor: "text-orange-500",
  },
  {
    name: "Sprint Planning Q2",
    color: "bg-purple-500",
    last: "2 days ago",
    stats: "8 active tasks | 1 unread | 3 drafts",
    alert: "2 decisions need input",
    alertColor: "text-orange-500",
  },
  {
    name: "Onboarding Guide",
    color: "bg-yellow-500",
    last: "3 days ago",
    stats: "1 active task | 0 unread | 2 drafts",
    alert: null,
  },
];

function ProjectRow({ project, pinIcon }: { project: typeof recent[0]; pinIcon?: boolean }) {
  return (
    <div className="h-16 hover:bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-3 cursor-pointer">
      {pinIcon && <Pin className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
      <div className={`w-3 h-3 rounded-full ${project.color} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm">{project.name}</span>
          {project.alert && (
            <span className={`text-xs ${project.alertColor}`}>{project.alert}</span>
          )}
          <span className="ml-auto text-sm text-gray-400 shrink-0">Last: {project.last}</span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{project.stats}</div>
      </div>
    </div>
  );
}

export default function ContextSwitcherModal() {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="max-w-[560px] w-full max-h-[70vh] rounded-xl shadow-2xl bg-white p-5 mx-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-bold text-gray-900">Switch Project Context</h2>
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search projects..."
          readOnly
        />

        <div className="overflow-y-auto flex-1">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">PINNED</div>
          {pinned.map((p, i) => <ProjectRow key={i} project={p} pinIcon />)}

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-1">RECENT</div>
          {recent.map((p, i) => <ProjectRow key={i} project={p} />)}

          <div className="hidden text-sm text-gray-400 text-center mt-4">No project contexts detected.</div>
        </div>

        <div className="pt-3 border-t mt-3">
          <button className="text-sm text-blue-500 hover:underline">+ Create New Project Context</button>
        </div>
      </div>
    </div>
  );
}
