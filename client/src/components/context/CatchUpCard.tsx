import { Shuffle } from "lucide-react";

const updates = [
  "3 tasks completed",
  "2 new tasks assigned to you",
  "New group message about auth",
  "Design review notes posted",
];

export default function CatchUpCard() {
  return (
    <div className="max-w-[440px] bg-white shadow-xl rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Shuffle className="w-5 h-5 text-blue-500" />
        <span className="font-semibold text-gray-900">Welcome back to 'API Documentation'</span>
      </div>
      <p className="text-sm text-gray-500 mb-3">Away for 1 day 4 hours</p>

      <div className="mb-3">
        <p className="text-sm font-medium text-gray-700 mb-2">What happened:</p>
        <ul className="space-y-1">
          {updates.map((u, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-gray-400 mt-0.5">•</span>
              {u}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-blue-50 rounded-lg p-3 mb-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Suggested first action:</span> Check group messages — 6 hours old
        </p>
      </div>

      <div className="flex gap-2">
        <button className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md">Go to messages</button>
        <button className="border border-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded-md">View all</button>
        <button className="text-gray-400 text-sm px-2 py-1.5">Dismiss</button>
      </div>
    </div>
  );
}
