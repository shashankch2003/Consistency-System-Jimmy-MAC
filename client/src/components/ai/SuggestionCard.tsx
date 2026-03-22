import { Zap } from "lucide-react";

export default function SuggestionCard() {
  return (
    <div className="rounded-lg shadow-md border-l-4 border-blue-500 max-w-[400px] p-4 bg-white">
      <div className="flex items-center gap-1.5">
        <Zap className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-semibold text-gray-600">Autopilot Suggestion</span>
      </div>
      <div className="text-base font-bold text-gray-900 mt-1">Create follow-up task</div>
      <div className="text-sm text-gray-500 mt-1">
        Because: You completed wireframes and usually create review next
      </div>
      <div className="flex gap-2 mt-2 text-sm items-center">
        <div className="w-5 h-5 rounded-full bg-gray-200" />
        <span className="text-gray-600">@alice</span>
        <span className="text-gray-400">Due: Mar 7</span>
        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
      </div>
      <div className="flex gap-2 mt-3 items-center">
        <button className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm">Do It</button>
        <button className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700">Edit First</button>
        <button className="text-gray-500 text-sm">Skip</button>
        <button className="text-red-400 text-xs">Never</button>
      </div>
    </div>
  );
}
