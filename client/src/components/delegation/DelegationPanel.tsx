import { Bot } from "lucide-react";

const candidates = [
  {
    name: "Alice Johnson",
    initials: "AJ",
    score: 94,
    status: "Available",
    tasks: 3,
    expertise: "React Expert",
    reasoning: "Highest match for frontend tasks. Completed 8 similar tasks this sprint.",
    factors: [
      { label: "Availability", pct: 90 },
      { label: "Skill Match", pct: 95 },
      { label: "Workload", pct: 60 },
    ],
    best: true,
  },
  {
    name: "Bob Martinez",
    initials: "BM",
    score: 81,
    status: "Available",
    tasks: 5,
    expertise: "TypeScript Expert",
    reasoning: "Strong TypeScript skills. Slightly heavier current workload.",
    factors: [
      { label: "Availability", pct: 70 },
      { label: "Skill Match", pct: 88 },
      { label: "Workload", pct: 75 },
    ],
    best: false,
  },
  {
    name: "Carol White",
    initials: "CW",
    score: 74,
    status: "Available",
    tasks: 2,
    expertise: "UI/UX Designer",
    reasoning: "Lower code skill match but fast delivery history for design tasks.",
    factors: [
      { label: "Availability", pct: 95 },
      { label: "Skill Match", pct: 65 },
      { label: "Workload", pct: 30 },
    ],
    best: false,
  },
];

export default function DelegationPanel() {
  return (
    <div className="w-[380px] bg-white rounded-lg shadow-xl border p-4">
      <div className="flex items-center gap-2 mb-1">
        <Bot className="w-5 h-5 text-blue-500" />
        <span className="font-semibold text-gray-900 text-sm">AI Delegation Suggestions</span>
      </div>
      <p className="text-sm text-gray-500 mb-4">Implement Authentication API</p>

      <div className="divide-y">
        {candidates.map((c, i) => (
          <div key={i} className="py-3 first:pt-0 last:border-0">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                {c.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">{c.name}</span>
                  {c.best && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Best Match</span>
                  )}
                  <span className="ml-auto bg-green-500 text-white text-xs rounded-full px-2 py-0.5 shrink-0">
                    {c.score}/100
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                  <span className="text-xs text-gray-500">{c.status} | {c.tasks} tasks | {c.expertise}</span>
                </div>
                <p className="text-sm italic text-gray-500 mt-1.5">{c.reasoning}</p>
                <div className="space-y-1 mt-2">
                  {c.factors.map(f => (
                    <div key={f.label} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-20">{f.label}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                        <div className="h-1.5 bg-blue-400 rounded-full" style={{ width: `${f.pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-7 text-right">{f.pct}%</span>
                    </div>
                  ))}
                </div>
                <button className="mt-2 w-full bg-blue-600 text-white text-sm py-1.5 rounded-md">
                  Assign
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-center">
        <button className="text-sm text-blue-500 hover:underline">Assign to someone else...</button>
      </div>
    </div>
  );
}
