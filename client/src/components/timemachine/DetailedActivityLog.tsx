import { Brain } from "lucide-react";

const entries = [
  "9:00 AM — Opened Tasks",
  "9:02 AM — Changed Login Redesign → In Progress",
  "9:15 AM — Created note: Sprint Planning Notes",
  "9:45 AM — Viewed Goals page",
  "10:01 AM — Opened Login Redesign task",
  "10:12 AM — Changed Login Redesign → Review",
  "11:02 AM — Created task: Write unit tests",
  "11:30 AM — Opened Notes",
  "11:45 AM — Edited API Documentation note",
  "12:00 PM — Opened Daily Score",
];

const coachingItems = [
  "Try batching your message checks to 3 set times per day to reduce context switches.",
  "Your peak focus hours are 10 AM–12 PM. Schedule complex tasks there.",
  "You complete 40% more tasks on days you review your goal list in the morning.",
];

export default function DetailedActivityLog() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 mb-3">Activity Log</h3>
      <div className="space-y-1.5 mb-3">
        {entries.map((entry, i) => (
          <div key={i} className="text-sm text-gray-600 py-1 border-b border-gray-50 last:border-0">
            {entry}
          </div>
        ))}
      </div>
      <button className="text-sm text-blue-500 hover:underline mb-5">Show All 47 Activities</button>

      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-3">Weekly AI Coaching</h4>
        <div className="space-y-2 mb-4">
          {coachingItems.map((item, i) => (
            <div key={i} className="flex items-start gap-2 bg-white rounded-md p-3">
              <Brain className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">{item}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md">Apply Suggestions</button>
          <button className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md">Export Report</button>
          <button className="text-sm text-gray-500 px-3 py-1.5">Share</button>
        </div>
      </div>
    </div>
  );
}
