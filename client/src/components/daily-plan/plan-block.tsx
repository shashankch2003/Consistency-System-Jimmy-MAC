import { Check, SkipForward, Play, GripVertical, Coffee, Clock, Flame, Mail, Calendar, Target } from "lucide-react";

interface PlanBlockProps {
  block: {
    id: string;
    type: string;
    title: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    priority: string;
    energyLevel: string;
    isFixed: boolean;
    isCompleted: boolean;
    isSkipped: boolean;
    aiReason?: string;
    scheduledByAI?: boolean;
  };
  onComplete: () => void;
  onSkip: () => void;
  onStartFocus: () => void;
}

const TYPE_CONFIG: Record<string, { borderColor: string; bgColor: string; label: string }> = {
  task: { borderColor: "border-l-blue-500", bgColor: "dark:bg-gray-800 bg-white", label: "Task" },
  meeting: { borderColor: "border-l-purple-500", bgColor: "dark:bg-purple-950/30 bg-purple-50", label: "Meeting" },
  focus: { borderColor: "border-l-red-500", bgColor: "dark:bg-red-950/20 bg-red-50", label: "Focus" },
  break: { borderColor: "border-l-green-500", bgColor: "dark:bg-green-950/20 bg-green-50", label: "Break" },
  habit: { borderColor: "border-l-orange-500", bgColor: "dark:bg-orange-950/20 bg-white", label: "Habit" },
  communication: { borderColor: "border-l-yellow-500", bgColor: "dark:bg-yellow-950/20 bg-yellow-50", label: "Comms" },
  planning: { borderColor: "border-l-indigo-500", bgColor: "dark:bg-indigo-950/30 bg-indigo-50", label: "Planning" },
  buffer: { borderColor: "border-l-gray-400", bgColor: "dark:bg-gray-800/50 bg-gray-50", label: "Buffer" },
  custom: { borderColor: "border-l-teal-500", bgColor: "dark:bg-teal-950/20 bg-white", label: "Custom" },
};

const PRIORITY_BADGE: Record<string, string> = {
  must_do: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  should_do: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  nice_to_do: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
};

const ENERGY_DOT: Record<string, string> = {
  high: "bg-red-400",
  medium: "bg-yellow-400",
  low: "bg-green-400",
};

function TypeIcon({ type }: { type: string }) {
  const cls = "w-3.5 h-3.5 flex-shrink-0";
  switch (type) {
    case "break": return <Coffee className={cls} />;
    case "habit": return <Flame className={cls} />;
    case "meeting": return <Calendar className={cls} />;
    case "focus": return <Target className={cls} />;
    case "communication": return <Mail className={cls} />;
    default: return <Clock className={cls} />;
  }
}

export function PlanBlock({ block, onComplete, onSkip, onStartFocus }: PlanBlockProps) {
  const config = TYPE_CONFIG[block.type] || TYPE_CONFIG.custom;

  return (
    <div
      data-testid={`plan-block-${block.id}`}
      className={`rounded-lg p-3 border-l-4 ${config.borderColor} ${config.bgColor} shadow-sm hover:shadow-md transition-all ${
        block.isCompleted ? "opacity-50" : ""
      } ${block.isSkipped ? "opacity-30" : ""}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-gray-400 cursor-grab mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeIcon type={block.type} />
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {block.startTime} – {block.endTime}
            </span>
            <span className={`font-medium text-sm truncate ${block.isCompleted ? "line-through text-gray-400" : "dark:text-gray-100"}`}>
              {block.title}
            </span>
            {block.isFixed && (
              <span className="text-xs text-gray-400 dark:text-gray-500 italic">Fixed</span>
            )}
            {block.priority !== "nice_to_do" && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_BADGE[block.priority] || ""}`}>
                {block.priority === "must_do" ? "MUST DO" : "SHOULD DO"}
              </span>
            )}
            {block.scheduledByAI && (
              <span className="text-xs text-purple-500 dark:text-purple-400">✦ AI</span>
            )}
          </div>
          {block.aiReason && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{block.aiReason}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">{block.durationMinutes} min</span>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${ENERGY_DOT[block.energyLevel] || "bg-gray-400"}`} />
              <span className="text-xs text-gray-400 dark:text-gray-500">{block.energyLevel} energy</span>
            </div>
          </div>
        </div>
        {!block.isCompleted && !block.isSkipped && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {!block.isFixed && (
              <button
                data-testid={`complete-block-${block.id}`}
                onClick={onComplete}
                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                title="Mark Complete"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
            {block.type === "task" && (
              <button
                data-testid={`focus-block-${block.id}`}
                onClick={onStartFocus}
                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                title="Start Focus Session"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}
            {!block.isFixed && (
              <button
                data-testid={`skip-block-${block.id}`}
                onClick={onSkip}
                className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Skip"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        {block.isCompleted && (
          <div className="flex-shrink-0">
            <Check className="w-4 h-4 text-green-500" />
          </div>
        )}
      </div>
    </div>
  );
}
