const predictionCards = [
  {
    title: "Write Sprint Retrospective",
    confidence: 94,
    reasoning: "You complete this after every Sprint Review meeting on Thursdays",
    due: "Mar 8",
    priority: "Medium",
  },
  {
    title: "Update Project Roadmap",
    confidence: 87,
    reasoning: "You typically update the roadmap after completing milestone tasks",
    due: "Mar 9",
    priority: "High",
  },
];

function PredictionCard({ card }: { card: typeof predictionCards[0] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-400">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔮</span>
          <span className="font-semibold text-gray-900 text-sm">{card.title}</span>
        </div>
        <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 shrink-0">
          Confidence: {card.confidence}%
        </span>
      </div>
      <p className="text-sm text-gray-500 mt-1.5">{card.reasoning}</p>
      <p className="text-xs text-gray-400 mt-1">Due: {card.due} | Priority: {card.priority}</p>
      <div className="flex gap-2 mt-3">
        <button className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-md">Create Task</button>
        <button className="border border-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-md">Edit &amp; Create</button>
        <button className="text-gray-400 text-xs px-2 py-1.5">Not Needed</button>
      </div>
    </div>
  );
}

export default function PredictionBanner() {
  return (
    <div className="bg-purple-50 rounded-lg border border-purple-200 p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🔮</span>
          <span className="font-semibold text-sm text-purple-800">AI Predictions (3 suggested tasks)</span>
        </div>
        <button className="text-xs text-purple-600 hover:underline">Collapse</button>
      </div>

      <div className="space-y-3">
        {predictionCards.map((card, i) => (
          <PredictionCard key={i} card={card} />
        ))}
      </div>

      <div className="hidden text-sm text-gray-400 text-center py-3">
        AI is learning your patterns. Predictions appear after more activity.
      </div>

      <div className="hidden mt-2 flex items-center justify-between">
        <span className="text-xs text-purple-700">3 predictions available</span>
        <button className="text-xs text-purple-600 hover:underline">Expand</button>
      </div>
    </div>
  );
}
