import { BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
import VisualTimeline from "@/components/timemachine/VisualTimeline";
import ActivityBreakdown from "@/components/timemachine/ActivityBreakdown";

export default function TimeMachine() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold text-gray-900">Work Time Machine</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 px-2">Mar 4</span>
          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {["Daily", "Weekly", "Monthly"].map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              i === 0
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 flex gap-6 text-sm flex-wrap">
        <div className="text-gray-700">
          <span className="text-gray-400 mr-1">Active:</span>
          <span className="font-medium">6h 42m</span>
        </div>
        <div className="text-gray-700">
          <span className="text-gray-400 mr-1">Focus:</span>
          <span className="font-medium">78/100</span>
          <span className="ml-1.5 text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">Good</span>
        </div>
        <div className="text-gray-700">
          <span className="text-gray-400 mr-1">Tasks:</span>
          <span className="font-medium">5 done</span>
        </div>
        <div className="text-gray-700">
          <span className="text-gray-400 mr-1">Notes:</span>
          <span className="font-medium">3 edited</span>
        </div>
      </div>

      <VisualTimeline />
      <ActivityBreakdown />
    </div>
  );
}
