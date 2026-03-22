import { X } from "lucide-react";

const statuses = [
  { label: "Draft", cls: "bg-gray-100 text-gray-600" },
  { label: "In Progress", cls: "bg-yellow-100 text-yellow-700" },
  { label: "Review", cls: "bg-blue-100 text-blue-700" },
  { label: "Final", cls: "bg-green-100 text-green-700" },
  { label: "Archived", cls: "bg-gray-200 text-gray-400" },
];

const actions = [
  "Copy link", "Duplicate page", "Move to...", "Lock page",
  "Suggest edits", "Use with AI", "Translate", "History", "Share", "Export", "Import",
];

export default function PageSettingsPanel() {
  return (
    <div className="fixed right-0 top-0 h-full w-[340px] bg-white shadow-xl border-l z-40 overflow-y-auto">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="font-semibold text-lg text-gray-900">Page Settings</h2>
        <X className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600" />
      </div>

      <div className="px-5 py-4 space-y-6">
        <section>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Appearance</div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Default", active: true, preview: "Aa" },
              { label: "Serif", active: false, preview: "Aa" },
              { label: "Mono", active: false, preview: "Aa" },
            ].map(f => (
              <div key={f.label} className={`rounded-lg border-2 p-3 text-center cursor-pointer ${f.active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                <div className={`text-lg font-medium mb-1 ${f.label === "Serif" ? "font-serif" : f.label === "Mono" ? "font-mono" : ""}`}>{f.preview}</div>
                <div className="text-xs text-gray-500">{f.label}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-2">
            <span>Small text</span>
            <div className="w-10 h-5 bg-gray-200 rounded-full relative"><div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow" /></div>
          </div>
          <div className="flex justify-between items-center py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-2">
            <span>Full width</span>
            <div className="w-10 h-5 bg-blue-500 rounded-full relative"><div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5 shadow" /></div>
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Page Status</div>
          <div className="flex flex-wrap gap-2">
            {statuses.map(s => (
              <span key={s.label} className={`text-xs px-3 py-1.5 rounded-full cursor-pointer font-medium ${s.cls}`}>{s.label}</span>
            ))}
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Page Info</div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2 py-1">
              <span className="text-gray-400 w-24 shrink-0">Icon</span>
              <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 text-base">📁</button>
            </div>
            <div className="flex items-center gap-2 py-1">
              <span className="text-gray-400 w-24 shrink-0">Cover</span>
              <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 text-xs">Change cover</button>
            </div>
            <div className="flex items-center gap-2 py-1">
              <span className="text-gray-400 w-24 shrink-0">Created</span>
              <span>Mar 1, 2026</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <span className="text-gray-400 w-24 shrink-0">Last edited</span>
              <span>3h ago</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <span className="text-gray-400 w-24 shrink-0">Words</span>
              <span>342</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <span className="text-gray-400 w-24 shrink-0">Read time</span>
              <span>2 min</span>
            </div>
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">AI Insights</div>
          <button className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 w-full text-left mb-2">
            ✨ Generate Insights
          </button>
          <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">Insights will appear here</div>
        </section>

        <section>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Actions</div>
          <div className="space-y-0.5">
            {actions.map(action => (
              <div key={action} className="h-10 flex items-center hover:bg-gray-50 rounded px-2 text-sm cursor-pointer text-gray-700">
                {action}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Danger Zone</div>
          <div className="h-10 flex items-center hover:bg-red-50 rounded px-2 text-sm cursor-pointer text-red-500">
            Move to Trash
          </div>
        </section>
      </div>
    </div>
  );
}
