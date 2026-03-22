const hours = ["9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM", "4PM", "5PM"];

const bars = [
  { color: "bg-blue-500", flex: 20 },
  { color: "bg-purple-500", flex: 12 },
  { color: "bg-green-500", flex: 12 },
  { color: "bg-yellow-400", flex: 5 },
  { color: "bg-gray-300", flex: 12 },
  { color: "bg-orange-400", flex: 15 },
  { color: "bg-blue-500", flex: 24 },
];

const legend = [
  { color: "bg-blue-500", label: "Task Work" },
  { color: "bg-purple-500", label: "Meetings" },
  { color: "bg-green-500", label: "Docs" },
  { color: "bg-yellow-400", label: "Messaging" },
  { color: "bg-gray-300", label: "Break" },
  { color: "bg-orange-400", label: "Focus" },
];

export default function TimelineVisualizer() {
  return (
    <div className="w-full bg-white rounded-lg p-4">
      <div className="flex justify-between text-xs text-gray-400">
        {hours.map(h => <span key={h}>{h}</span>)}
      </div>

      <div className="h-8 flex gap-0.5 rounded-sm overflow-hidden mt-2">
        {bars.map((b, i) => (
          <div key={i} className={`${b.color} h-full`} style={{ flex: b.flex }} />
        ))}
      </div>

      <div className="flex gap-4 mt-3 text-xs flex-wrap">
        {legend.map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
            <span className="text-gray-500">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="hidden text-sm text-gray-400 text-center mt-4">No activity recorded today</div>
    </div>
  );
}
