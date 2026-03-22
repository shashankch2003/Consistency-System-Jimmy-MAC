import { Lightbulb, AlertTriangle, Trophy, TrendingUp } from "lucide-react";

const insights = [
  {
    Icon: Lightbulb,
    color: "text-yellow-500",
    text: "Most productive 10:00–11:30 AM — 3 tasks without switching",
  },
  {
    Icon: AlertTriangle,
    color: "text-orange-500",
    text: "Checked messages 12 times 2–4 PM — broke flow",
  },
  {
    Icon: Trophy,
    color: "text-green-500",
    text: "5 tasks — 2 more than daily average!",
  },
  {
    Icon: TrendingUp,
    color: "text-blue-500",
    text: "Score: 78/100 (up from 72 yesterday)",
  },
];

export default function AIInsightsPanel() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 mb-3">AI Insights</h3>
      <div className="flex flex-col gap-2">
        {insights.map(({ Icon, color, text }, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-start gap-3">
            <Icon className={`w-4 h-4 ${color} shrink-0 mt-0.5`} />
            <span className="text-sm text-gray-700">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
