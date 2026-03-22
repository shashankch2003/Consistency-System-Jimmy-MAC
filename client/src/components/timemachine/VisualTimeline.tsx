import TimelineVisualizer from "@/components/ai/TimelineVisualizer";

const blocks = [
  { label: "Login Redesign", start: "9:00", end: "10:30", color: "bg-blue-500" },
  { label: "Sprint Planning", start: "10:30", end: "11:15", color: "bg-purple-500" },
  { label: "API Docs", start: "11:15", end: "12:00", color: "bg-green-500" },
  { label: "Chat", start: "12:00", end: "12:15", color: "bg-yellow-400" },
  { label: "Lunch", start: "12:15", end: "13:15", color: "bg-gray-300" },
  { label: "Focus", start: "13:15", end: "14:15", color: "bg-orange-400" },
  { label: "Bug Fix", start: "14:15", end: "15:30", color: "bg-blue-500" },
  { label: "Messages", start: "15:30", end: "15:45", color: "bg-yellow-400" },
  { label: "Review", start: "15:45", end: "17:00", color: "bg-blue-400" },
];

export default function VisualTimeline() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Daily Timeline</h3>
        <span className="text-xs text-gray-400">Hover for details</span>
      </div>

      <TimelineVisualizer />

      <div className="mt-4 space-y-1">
        {blocks.map((block, i) => (
          <div key={i} className="flex items-center gap-3 py-1 hover:bg-gray-50 rounded px-2 cursor-default group">
            <div className={`w-2.5 h-2.5 rounded-full ${block.color} shrink-0`} />
            <span className="text-xs text-gray-400 w-[100px] shrink-0">{block.start} – {block.end}</span>
            <span className="text-sm text-gray-700">{block.label}</span>
            <span className="ml-auto text-xs text-gray-300 opacity-0 group-hover:opacity-100">Details</span>
          </div>
        ))}
      </div>
    </div>
  );
}
