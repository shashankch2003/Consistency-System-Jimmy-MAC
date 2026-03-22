import { CheckCircle, Loader2 } from "lucide-react";

export default function ProgressModal() {
  const steps = [
    { label: "Analyzing your task history", done: true },
    { label: "Identifying patterns", done: true },
    { label: "Building recommendation model", done: true },
    { label: "Generating...", done: false },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="max-w-[480px] w-full bg-white rounded-xl shadow-2xl p-6 mx-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🤖</span>
          <div>
            <div className="text-lg font-bold text-gray-900">Processing...</div>
            <div className="text-sm text-gray-500">AI is working on your request</div>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              {step.done ? (
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <Loader2 className="w-5 h-5 text-blue-500 shrink-0 animate-spin" />
              )}
              <span className={`text-sm ${step.done ? "text-gray-500 line-through" : "text-gray-700 font-medium"}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <div className="h-2 rounded-full bg-gray-200 mt-4">
          <div className="h-2 rounded-full bg-blue-500" style={{ width: "75%" }} />
        </div>
        <div className="text-xs text-gray-400 mt-1 text-right">75%</div>
      </div>
    </div>
  );
}
