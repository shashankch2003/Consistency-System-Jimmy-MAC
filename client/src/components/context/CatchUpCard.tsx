import { useState } from "react";
import { Shuffle } from "lucide-react";
import { shouldShowCatchUp, getAwayDuration, buildCatchUpSummary } from "@/lib/context/contextManager";

interface CatchUpCardProps {
  projectName?: string;
  lastActiveAt?: string;
  newTasks?: number;
  completedTasks?: number;
  newMessages?: number;
  noteEdits?: number;
  onDismiss?: () => void;
  onGoToMessages?: () => void;
}

export default function CatchUpCard({
  projectName = "API Documentation",
  lastActiveAt = new Date(Date.now() - 28 * 3_600_000).toISOString(),
  newTasks = 2,
  completedTasks = 3,
  newMessages = 1,
  noteEdits = 1,
  onDismiss,
  onGoToMessages,
}: CatchUpCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !shouldShowCatchUp(lastActiveAt)) return null;

  const awayHours = getAwayDuration(lastActiveAt);
  const days = Math.floor(awayHours / 24);
  const hours = Math.floor(awayHours % 24);
  const awayStr = days > 0 ? `${days} day${days > 1 ? "s" : ""} ${hours}h` : `${hours}h`;

  const updates = buildCatchUpSummary(newTasks, completedTasks, newMessages, noteEdits);

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <div className="max-w-[440px] bg-white shadow-xl rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Shuffle className="w-5 h-5 text-blue-500" />
        <span className="font-semibold text-gray-900">Welcome back to &apos;{projectName}&apos;</span>
      </div>
      <p className="text-sm text-gray-500 mb-3">Away for {awayStr}</p>

      <div className="mb-3">
        <p className="text-sm font-medium text-gray-700 mb-2">What happened:</p>
        <ul className="space-y-1">
          {updates.map((u, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-gray-400 mt-0.5">•</span>
              {u}
            </li>
          ))}
          {updates.length === 0 && (
            <li className="text-sm text-gray-400">No changes while you were away.</li>
          )}
        </ul>
      </div>

      {newMessages > 0 && (
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Suggested first action:</span> Check group messages — they may need your attention
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {newMessages > 0 && (
          <button className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md" onClick={onGoToMessages}>
            Go to messages
          </button>
        )}
        <button className="border border-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded-md">View all</button>
        <button className="text-gray-400 text-sm px-2 py-1.5" onClick={handleDismiss}>Dismiss</button>
      </div>
    </div>
  );
}
