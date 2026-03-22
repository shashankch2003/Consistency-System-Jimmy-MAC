import { X } from "lucide-react";

function PaneTabBar({ title }: { title: string }) {
  return (
    <div className="h-8 bg-gray-50 border-b border-gray-200 flex items-center px-3 gap-2 shrink-0">
      <span className="text-xs font-medium text-gray-700 flex-1 truncate">{title}</span>
      <X className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer shrink-0" />
    </div>
  );
}

function LeftContent() {
  return (
    <div className="px-10 py-6">
      <div className="h-[100px] w-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-b-lg relative mb-2">
        <div className="absolute bottom-2 right-2 text-white/70 text-xs">Change cover</div>
      </div>
      <div className="text-4xl -mt-5 ml-1 relative z-10">📁</div>
      <div className="text-xs text-gray-400 mt-2">Notes › Project Notes</div>
      <h1 className="text-2xl font-bold text-gray-900 mt-2">Sprint 1</h1>
      <div className="mt-4 space-y-2">
        <p className="text-sm text-gray-700">Sprint 1 focuses on core authentication and the dashboard layout.</p>
        <h2 className="text-lg font-semibold text-gray-800">Key Decisions</h2>
        <ul className="pl-4 space-y-1 text-sm text-gray-700">
          <li className="list-disc">React Query for server state</li>
          <li className="list-disc">Drizzle ORM for database</li>
          <li className="list-disc">Replit Auth for login</li>
        </ul>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg text-sm text-blue-800">
          💡 Always run drizzle-kit push after schema changes.
        </div>
      </div>
    </div>
  );
}

function RightContent() {
  return (
    <div className="px-10 py-6">
      <div className="h-[100px] w-full bg-gradient-to-r from-green-400 to-teal-500 rounded-b-lg relative mb-2">
        <div className="absolute bottom-2 right-2 text-white/70 text-xs">Change cover</div>
      </div>
      <div className="text-4xl -mt-5 ml-1 relative z-10">🔬</div>
      <div className="text-xs text-gray-400 mt-2">Notes › Research</div>
      <h1 className="text-2xl font-bold text-gray-900 mt-2">Research Notes</h1>
      <div className="mt-4 space-y-2">
        <p className="text-sm text-gray-700">Collection of research articles, papers, and links related to productivity science.</p>
        <h2 className="text-lg font-semibold text-gray-800">Key Findings</h2>
        <ul className="pl-4 space-y-1 text-sm text-gray-700">
          <li className="list-disc">Deep work sessions average 90 minutes</li>
          <li className="list-disc">Habit stacking improves retention by 40%</li>
          <li className="list-disc">Regular review cycles outperform daily tracking</li>
        </ul>
        <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg text-sm text-amber-800">
          ⚠️ Verify all statistics with primary sources before citing.
        </div>
      </div>
    </div>
  );
}

export default function SplitView() {
  return (
    <div className="flex h-full w-full">
      <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
        <PaneTabBar title="Sprint 1" />
        <div className="flex-1 overflow-y-auto">
          <LeftContent />
        </div>
      </div>

      <div className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize relative flex items-center justify-center shrink-0 transition-colors">
        <div className="flex flex-col gap-0.5 items-center justify-center h-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-gray-400" />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <PaneTabBar title="Research Notes" />
        <div className="flex-1 overflow-y-auto">
          <RightContent />
        </div>
      </div>
    </div>
  );
}
