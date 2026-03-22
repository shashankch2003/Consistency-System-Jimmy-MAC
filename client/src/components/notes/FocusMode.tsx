import { X } from "lucide-react";

const wordCount = 342;
const wordGoal = 500;
const progress = wordCount / wordGoal;
const minutes = 25;
const seconds = 0;
const radius = 20;
const circ = 2 * Math.PI * radius;
const dash = circ * (1 - progress);

export default function FocusMode() {
  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">
      <div className="flex justify-between items-center px-8 py-4">
        <div className="flex items-center gap-4">
          <span className="text-white/60 text-sm">Focus Mode</span>
          <span className="text-white/40 text-sm">Goal: 500 words</span>
        </div>

        <div className="flex items-center justify-center">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r={radius} fill="none" stroke="#374151" strokeWidth="3" />
            <circle
              cx="25" cy="25" r={radius}
              fill="none"
              stroke="#60a5fa"
              strokeWidth="3"
              strokeDasharray={circ}
              strokeDashoffset={dash}
              strokeLinecap="round"
            />
            <text
              x="25" y="25"
              textAnchor="middle"
              dominantBaseline="central"
              className="rotate-90"
              style={{ transform: "rotate(90deg)", transformOrigin: "25px 25px", fill: "white", fontSize: "10px", fontWeight: 500 }}
            >
              {wordCount}
            </text>
          </svg>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <button className="text-white/40 hover:text-white/70 text-lg" title="Rain">🌧️</button>
            <button className="text-white/40 hover:text-white/70 text-lg" title="Forest">🌲</button>
            <button className="text-white/60 hover:text-white/70 text-lg" title="Silence">🔇</button>
          </div>
          <span className="text-white/60 text-sm font-mono">
            {String(Math.floor(minutes)).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          <button className="text-white/40 hover:text-white/70">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-[700px] mx-auto flex-1 py-12 px-4 w-full">
        <div className="text-3xl font-bold text-white outline-none mb-6">
          Sprint 1 Planning
        </div>

        <div className="space-y-4">
          <p className="text-lg text-white leading-relaxed">
            This sprint focuses on delivering the core authentication flow, dashboard layout, and the first set of productivity tracking features. The team will work in two-week cycles with daily standups to ensure rapid iteration.
          </p>
          <p className="text-lg text-white/40 leading-relaxed">
            We've decided to use Replit Auth for the authentication layer, which significantly reduces the complexity of our security implementation. The integration is straightforward and the session management is handled automatically.
          </p>
          <p className="text-lg text-white/40 leading-relaxed">
            The database schema has been carefully designed to support all the productivity tracking features we have planned. We're using Drizzle ORM for type-safe queries and Drizzle Kit for schema migrations.
          </p>
        </div>
      </div>

      <div className="text-center py-4">
        <div className="text-white/30 text-sm mb-1">{wordCount} / {wordGoal} words</div>
        <div className="text-white/20 text-xs">Press Esc to exit</div>
      </div>
    </div>
  );
}
