import { Search, Plus, Zap, Maximize2, Map, SplitSquareVertical } from "lucide-react";

const quickActions = [
  { icon: <Plus className="w-4 h-4 text-blue-500" />, label: "New Page" },
  { icon: <Zap className="w-4 h-4 text-yellow-500" />, label: "Quick Capture" },
  { icon: <Maximize2 className="w-4 h-4 text-purple-500" />, label: "Toggle Focus Mode" },
  { icon: <SplitSquareVertical className="w-4 h-4 text-green-500" />, label: "Open Split View" },
  { icon: <Map className="w-4 h-4 text-orange-500" />, label: "Open Content Map" },
];

const recentPages = [
  { icon: "📁", name: "Project Notes", time: "2h ago" },
  { icon: "📝", name: "Sprint 1", time: "3h ago" },
  { icon: "📋", name: "Meeting Notes", time: "Yesterday" },
  { icon: "💡", name: "Ideas", time: "2 days ago" },
];

export default function SearchCommandPalette() {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[15vh]">
      <div className="w-[600px] bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center px-5 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            type="text"
            className="h-12 w-full border-0 px-3 text-base text-gray-800 outline-none placeholder:text-gray-400 bg-transparent"
            placeholder="Search pages, blocks, or type a command..."
            readOnly
          />
        </div>

        <div className="px-4 py-2 border-b border-gray-50">
          <div className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1">Actions</div>
          {quickActions.map((action, i) => (
            <div key={i} className="h-9 px-3 rounded-md hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
              {action.icon}
              {action.label}
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-b border-gray-50">
          <div className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1">Recent</div>
          {recentPages.map((page, i) => (
            <div key={i} className="h-9 px-3 rounded-md hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
              <span className="text-base">{page.icon}</span>
              <span className="flex-1">{page.name}</span>
              <span className="text-xs text-gray-400">{page.time}</span>
            </div>
          ))}
        </div>

        <div className="px-4 py-6 text-center">
          <span className="text-sm text-gray-400">Start typing to search...</span>
        </div>

        <div className="px-4 py-2 text-right text-xs text-gray-300">
          Ctrl+K
        </div>
      </div>
    </div>
  );
}
