const hours = ["9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM", "4PM", "5PM"];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

type HeatLevel = "high" | "medium" | "low" | "idle";

const heatmap: HeatLevel[][] = [
  ["medium", "high",   "medium", "low",    "idle"  ],
  ["high",   "high",   "high",   "medium", "medium"],
  ["high",   "medium", "medium", "high",   "low"   ],
  ["idle",   "low",    "idle",   "low",    "idle"  ],
  ["low",    "medium", "low",    "medium", "low"   ],
  ["medium", "high",   "medium", "low",    "medium"],
  ["high",   "medium", "low",    "high",   "medium"],
  ["medium", "low",    "medium", "medium", "low"   ],
  ["idle",   "idle",   "low",    "idle",   "idle"  ],
];

const colorMap: Record<HeatLevel, string> = {
  high:   "bg-blue-700",
  medium: "bg-blue-400",
  low:    "bg-blue-200",
  idle:   "bg-gray-100",
};

export default function WeeklyHeatmap() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 mb-3">Weekly Activity Heatmap</h3>

      <div className="overflow-x-auto">
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 pt-7 pr-1">
            {hours.map(h => (
              <div key={h} className="h-10 flex items-center text-xs text-gray-400 w-10 justify-end pr-1">
                {h}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex gap-1 mb-1">
              {days.map(d => (
                <div key={d} className="w-10 text-center text-xs text-gray-500 font-medium">{d}</div>
              ))}
            </div>
            {heatmap.map((row, ri) => (
              <div key={ri} className="flex gap-1">
                {row.map((level, ci) => (
                  <div
                    key={ci}
                    className={`w-10 h-10 rounded-sm ${colorMap[level]}`}
                    title={`${days[ci]} ${hours[ri]}: ${level}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3">
        <span className="text-xs text-gray-400">Less</span>
        {(["idle", "low", "medium", "high"] as HeatLevel[]).map(l => (
          <div key={l} className={`w-4 h-4 rounded-sm ${colorMap[l]}`} />
        ))}
        <span className="text-xs text-gray-400">More</span>
      </div>

      <div className="hidden text-sm text-gray-400 mt-3">No activity for this day.</div>
      <div className="hidden text-sm text-gray-400 mt-1">Not enough data for weekly view.</div>
    </div>
  );
}
