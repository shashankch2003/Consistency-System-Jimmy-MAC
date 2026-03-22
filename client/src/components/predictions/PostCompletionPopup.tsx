import { CheckCircle } from "lucide-react";

export default function PostCompletionPopup() {
  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-[380px] bg-white rounded-xl shadow-xl p-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
        <span className="font-semibold text-gray-900">Task completed!</span>
      </div>

      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-base">🔮</span>
        <span className="text-sm text-gray-500">Usually you do this next:</span>
      </div>

      <div className="font-medium text-gray-900 mt-1">Update Project Documentation</div>
      <div className="text-sm text-gray-500">Due: Tomorrow</div>

      <div className="flex items-center gap-3 mt-3">
        <button className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md">Create It</button>
        <button className="text-gray-400 text-sm">Skip</button>
      </div>

      <div className="text-xs text-gray-300 mt-2">Dismissing in 10s</div>
    </div>
  );
}
