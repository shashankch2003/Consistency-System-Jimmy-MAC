import { Calendar, RefreshCw } from "lucide-react";

type Priority = "MUST DO" | "Should Do" | "Nice to Do";
type BlockType = "task" | "break" | "comms" | "focus";

interface PlanBlock {
  time: string;
  duration: string;
  icon: string;
  title: string;
  priority: Priority | null;
  energy: "High" | "Medium" | "Low" | null;
  type: BlockType;
}

const blocks: PlanBlock[] = [
  { time: "9:00 AM", duration: "30 min",  icon: "💬", title: "Check messages & emails",       priority: null,        energy: "Low",    type: "comms"  },
  { time: "9:30 AM", duration: "90 min",  icon: "⚡", title: "Implement auth API",            priority: "MUST DO",   energy: "High",   type: "task"   },
  { time: "11:00 AM",duration: "15 min",  icon: "☕", title: "Break",                         priority: null,        energy: null,     type: "break"  },
  { time: "11:15 AM",duration: "45 min",  icon: "🎨", title: "Review mockups",               priority: "Should Do", energy: "Medium", type: "task"   },
  { time: "12:00 PM",duration: "60 min",  icon: "🍽️", title: "Lunch",                        priority: null,        energy: null,     type: "break"  },
  { time: "1:00 PM", duration: "45 min",  icon: "🔍", title: "Code review",                  priority: "Should Do", energy: "Medium", type: "task"   },
  { time: "1:45 PM", duration: "60 min",  icon: "🧪", title: "Unit tests",                   priority: "Should Do", energy: "High",   type: "focus"  },
  { time: "2:45 PM", duration: "45 min",  icon: "📝", title: "Update docs",                  priority: "Nice to Do",energy: "Low",    type: "task"   },
];

const borderColors: Record<BlockType, string> = {
  task:  "border-blue-400",
  break: "border-gray-300",
  comms: "border-yellow-400",
  focus: "border-orange-400",
};

const priorityStyles: Record<string, string> = {
  "MUST DO":   "bg-red-100 text-red-700",
  "Should Do": "bg-blue-100 text-blue-700",
  "Nice to Do":"bg-gray-100 text-gray-600",
};

function PlanBlock({ block }: { block: PlanBlock }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-3 border-l-4 ${borderColors[block.type]} flex items-start gap-3`}>
      <div className="shrink-0 text-left min-w-[80px]">
        <div className="text-xs text-gray-400">{block.time}</div>
        <div className="text-xs text-gray-300">{block.duration}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">{block.icon}</span>
          <span className="font-medium text-gray-900 text-sm">{block.title}</span>
          {block.priority && (
            <span className={`text-xs rounded-full px-2 py-0.5 ${priorityStyles[block.priority]}`}>
              {block.priority}
            </span>
          )}
          {block.energy && (
            <span className="text-xs text-gray-400">Energy: {block.energy}</span>
          )}
        </div>
      </div>
      {block.type !== "break" && (
        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
          <button className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-md px-2 py-1">Done</button>
          <button className="text-xs text-gray-400 border border-gray-200 rounded-md px-2 py-1">Skip</button>
          <button className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-md px-2 py-1">Start Focus</button>
          <button className="text-xs text-gray-400 border border-gray-200 rounded-md px-2 py-1">Reschedule</button>
        </div>
      )}
    </div>
  );
}

function PlanSummaryBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t p-3 z-30">
      <div className="max-w-3xl mx-auto flex items-center gap-6 text-sm flex-wrap">
        <div className="flex gap-4">
          <span className="text-gray-500">
            Must Do: <span className="font-semibold text-gray-900">1/2</span>
          </span>
          <span className="text-gray-500">
            Should Do: <span className="font-semibold text-gray-900">1/4</span>
          </span>
          <span className="text-gray-500">
            Nice: <span className="font-semibold text-gray-900">0/2</span>
          </span>
        </div>
        <div className="h-5 w-px bg-gray-200" />
        <div className="flex gap-4 text-gray-500">
          <span>Planned: <span className="font-semibold text-gray-800">6h 30m</span></span>
          <span>Completed: <span className="font-semibold text-gray-800">0h</span></span>
          <span>Remaining: <span className="font-semibold text-gray-800">6h 30m</span></span>
        </div>
      </div>
    </div>
  );
}

export default function DailyPlanner() {
  return (
    <div className="p-6 max-w-3xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold text-gray-900">My Day — Wednesday, March 4</h1>
        </div>
        <button className="flex items-center gap-1.5 border border-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded-md hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" />
          Regenerate
        </button>
      </div>

      <div className="bg-blue-50 rounded-lg p-3 text-sm italic text-blue-700 mb-5">
        "Deadline tomorrow, prioritized backend work in your peak productivity hours (9:30–11 AM). 
        Energy-matched tasks assigned to post-lunch slot."
      </div>

      <div className="space-y-3">
        {blocks.map((block, i) => (
          <PlanBlock key={i} block={block} />
        ))}
      </div>

      <div className="hidden text-sm text-gray-400 text-center mt-8">
        Click Regenerate to create today's plan.
      </div>

      <PlanSummaryBar />
    </div>
  );
}
