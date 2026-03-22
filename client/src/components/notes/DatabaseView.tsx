import { Filter, ArrowUpDown, Layers, Columns, Plus, Search } from "lucide-react";

const viewTabs = ["Table", "Board", "Calendar", "Timeline", "Gallery", "List"];

const tableRows = [
  { name: "Design System Audit", status: { label: "In Progress", cls: "bg-yellow-100 text-yellow-700" }, priority: "🔴 High", assignee: "AK", due: "Mar 28" },
  { name: "API Documentation", status: { label: "Review", cls: "bg-blue-100 text-blue-700" }, priority: "🟡 Medium", assignee: "BL", due: "Apr 2" },
  { name: "User Testing", status: { label: "To Do", cls: "bg-gray-100 text-gray-600" }, priority: "🟡 Medium", assignee: "CM", due: "Apr 5" },
  { name: "Performance Audit", status: { label: "Done", cls: "bg-green-100 text-green-700" }, priority: "🟢 Low", assignee: "DN", due: "Mar 20" },
  { name: "Security Review", status: { label: "To Do", cls: "bg-gray-100 text-gray-600" }, priority: "🔴 High", assignee: "EO", due: "Apr 10" },
];

const boardCols = [
  { name: "To Do", cards: ["Security Review", "User Testing"], cls: "bg-gray-100" },
  { name: "In Progress", cards: ["Design System Audit"], cls: "bg-yellow-50" },
  { name: "Done", cards: ["Performance Audit", "API Documentation"], cls: "bg-green-50" },
];

export default function DatabaseView() {
  const activeView = "Table";

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <span className="font-medium text-sm text-gray-800">Task Tracker</span>
        <div className="flex gap-1">
          {viewTabs.map(v => (
            <div
              key={v}
              className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors ${v === activeView ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-500 hover:bg-gray-50"}`}
            >
              {v}
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-1.5 border-b border-gray-100 flex gap-3 text-xs text-gray-500">
        <button className="flex items-center gap-1 hover:text-gray-700"><Filter className="w-3 h-3" /> Filter</button>
        <button className="flex items-center gap-1 hover:text-gray-700"><ArrowUpDown className="w-3 h-3" /> Sort</button>
        <button className="flex items-center gap-1 hover:text-gray-700"><Layers className="w-3 h-3" /> Group</button>
        <button className="flex items-center gap-1 hover:text-gray-700"><Columns className="w-3 h-3" /> Properties</button>
        <button className="flex items-center gap-1 hover:text-gray-700"><Plus className="w-3 h-3" /> New view</button>
        <div className="ml-auto"><Search className="w-3 h-3" /></div>
      </div>

      {activeView === "Table" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-medium text-gray-500">
                <th className="text-left px-4 py-2 border-b border-gray-200 font-medium">Name</th>
                <th className="text-left px-4 py-2 border-b border-gray-200 font-medium">Status</th>
                <th className="text-left px-4 py-2 border-b border-gray-200 font-medium">Priority</th>
                <th className="text-left px-4 py-2 border-b border-gray-200 font-medium">Assignee</th>
                <th className="text-left px-4 py-2 border-b border-gray-200 font-medium">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr key={i} className="h-10 border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-2 text-gray-800 font-medium">{row.name}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.status.cls}`}>{row.status.label}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{row.priority}</td>
                  <td className="px-4 py-2">
                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">{row.assignee}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{row.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeView === "Board" && (
        <div className="flex gap-4 p-4 overflow-x-auto">
          {boardCols.map(col => (
            <div key={col.name} className="w-56 shrink-0">
              <div className="text-xs font-semibold text-gray-600 mb-2 px-1">{col.name}</div>
              <div className={`rounded-lg p-2 space-y-2 ${col.cls}`}>
                {col.cards.map(card => (
                  <div key={card} className="bg-white rounded-md px-3 py-2 text-sm text-gray-700 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md">
                    {card}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-2 border-t border-gray-100">
        <button className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </div>
    </div>
  );
}
