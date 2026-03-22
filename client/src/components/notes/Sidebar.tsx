import { useAuth } from "@/hooks/use-auth";
import { ChevronRight, ChevronLeft, Plus, Star, Tag, Clock, FileText, Lightbulb, Archive, Microscope, BookOpen, Inbox } from "lucide-react";

const pages = [
  { id: 1, icon: "🚀", name: "Getting Started", depth: 0, children: [] },
  {
    id: 2, icon: "📁", name: "Project Notes", depth: 0, expanded: true,
    children: [
      { id: 21, icon: "📄", name: "Sprint 1", depth: 1 },
      { id: 22, icon: "📄", name: "Sprint 2", depth: 1 },
    ],
  },
  { id: 3, icon: "📝", name: "Meeting Notes", depth: 0, collapsed: true },
  { id: 4, icon: "💡", name: "Ideas", depth: 0 },
  { id: 5, icon: "🔬", name: "Research", depth: 0 },
  { id: 6, icon: "🗂️", name: "Archive", depth: 0, dimmed: true },
];

const recentPages = [
  { id: 1, name: "Sprint 1", time: "2h ago" },
  { id: 2, name: "Meeting Notes", time: "Yesterday" },
  { id: 3, name: "Project Notes", time: "Yesterday" },
  { id: 4, name: "Ideas", time: "2 days ago" },
  { id: 5, name: "Research", time: "3 days ago" },
];

const favoritePages = [
  { id: 1, name: "Getting Started" },
  { id: 2, name: "Sprint 1" },
  { id: 3, name: "Ideas" },
];

const tags = ["Work", "Personal", "Ideas", "Research", "Team", "Archive"];

const inboxItems = [
  "Follow up on design review",
  "Read article about AI trends",
];

const tabs = ["Pages", "Recent", "Favorites", "Tags"] as const;

export default function Sidebar() {
  const { user } = useAuth();
  const firstName = (user as any)?.claims?.first_name || (user as any)?.firstName || "";
  const lastName = (user as any)?.claims?.last_name || (user as any)?.lastName || "";
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || "My Notes";

  const activeTab = "Pages";

  return (
    <div className="w-[260px] h-full bg-gray-50 border-r border-gray-200 flex flex-col select-none">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <span className="font-semibold text-sm text-gray-800 truncate">{displayName}</span>
        <ChevronLeft className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600 shrink-0" />
      </div>

      <div className="flex border-b border-gray-200 px-2 gap-1 pt-1">
        {tabs.map(tab => (
          <div
            key={tab}
            className={
              tab === activeTab
                ? "bg-white rounded-t-md shadow-sm text-blue-700 text-xs font-medium px-3 py-1.5 cursor-pointer"
                : "text-gray-500 text-xs px-3 py-1.5 hover:bg-gray-100 rounded-t-md cursor-pointer"
            }
          >
            {tab}
          </div>
        ))}
      </div>

      {activeTab === "Pages" && (
        <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col">
          <div className="flex-1">
            {pages.map(page => (
              <div key={page.id}>
                <div
                  className={`h-8 px-2 rounded-md hover:bg-gray-100 cursor-pointer flex items-center gap-2 text-sm ${page.id === 21 ? "bg-blue-50 text-blue-700" : "text-gray-700"} ${page.dimmed ? "text-gray-400" : ""}`}
                  style={{ paddingLeft: page.depth === 1 ? "1.5rem" : undefined }}
                >
                  {page.collapsed ? (
                    <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                  ) : page.expanded ? (
                    <span className="w-3 h-3 shrink-0" />
                  ) : (
                    <span className="w-3 h-3 shrink-0" />
                  )}
                  <span className="text-base leading-none">{page.icon}</span>
                  <span className="truncate flex-1 text-sm">{page.name}</span>
                </div>
                {page.expanded && page.children?.map(child => (
                  <div
                    key={child.id}
                    className={`h-8 rounded-md hover:bg-gray-100 cursor-pointer flex items-center gap-2 text-sm pl-6 ${child.id === 21 ? "bg-blue-50 text-blue-700" : "text-gray-700"}`}
                  >
                    <span className="w-3 h-3 shrink-0" />
                    <span className="text-base leading-none">{child.icon}</span>
                    <span className="truncate flex-1">{child.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 mt-2 px-1 py-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Inbox className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Inbox</span>
            </div>
            {inboxItems.map((item, i) => (
              <div key={i} className="text-xs text-gray-600 truncate py-1 px-1 hover:bg-gray-100 rounded cursor-pointer">
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "Recent" && (
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {recentPages.map(p => (
            <div key={p.id} className="h-8 px-2 rounded-md hover:bg-gray-100 cursor-pointer flex items-center justify-between text-sm text-gray-700">
              <div className="flex items-center gap-2"><Clock className="w-3 h-3 text-gray-400" /><span className="truncate">{p.name}</span></div>
              <span className="text-xs text-gray-400 shrink-0">{p.time}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "Favorites" && (
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {favoritePages.map(p => (
            <div key={p.id} className="h-8 px-2 rounded-md hover:bg-gray-100 cursor-pointer flex items-center gap-2 text-sm text-gray-700">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="truncate">{p.name}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "Tags" && (
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="flex flex-wrap gap-2 p-2">
            {tags.map(tag => (
              <div key={tag} className="bg-gray-100 text-xs rounded-full px-2 py-1 text-gray-600 cursor-pointer hover:bg-gray-200">
                {tag}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 px-2 py-2">
        <div className="w-full h-9 flex items-center gap-2 px-4 text-sm text-gray-500 hover:bg-gray-100 rounded-md cursor-pointer">
          <Plus className="w-4 h-4" />
          New Page
        </div>
      </div>
    </div>
  );
}
