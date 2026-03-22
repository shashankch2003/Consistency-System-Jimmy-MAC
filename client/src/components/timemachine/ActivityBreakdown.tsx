const categories = [
  { name: "Task Work", time: "3h 12m", pct: 48, color: "#3b82f6" },
  { name: "Documentation", time: "1h 02m", pct: 15, color: "#22c55e" },
  { name: "Messaging", time: "0h 45m", pct: 11, color: "#eab308" },
  { name: "Planning", time: "0h 28m", pct: 7, color: "#a855f7" },
  { name: "Other", time: "1h 15m", pct: 19, color: "#9ca3af" },
];

function PieChart() {
  const cx = 100;
  const cy = 100;
  const r = 80;
  let startAngle = -90;

  const slices = categories.map(cat => {
    const angle = (cat.pct / 100) * 360;
    const start = startAngle;
    const end = startAngle + angle;
    startAngle = end;

    const s = start * (Math.PI / 180);
    const e = end * (Math.PI / 180);
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const largeArc = angle > 180 ? 1 : 0;

    return { ...cat, d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z` };
  });

  return (
    <svg width={200} height={200} viewBox="0 0 200 200">
      {slices.map((slice, i) => (
        <path key={i} d={slice.d} fill={slice.color} stroke="white" strokeWidth={2} />
      ))}
    </svg>
  );
}

export default function ActivityBreakdown() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Activity Breakdown</h3>
      <div className="flex gap-6 items-center">
        <div className="shrink-0">
          <PieChart />
        </div>
        <div className="flex-1 space-y-3">
          {categories.map(cat => (
            <div key={cat.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-sm text-gray-700">{cat.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-800">{cat.time}</div>
                <div className="text-xs text-gray-400">{cat.pct}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
