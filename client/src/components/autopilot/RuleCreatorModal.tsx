import { X } from "lucide-react";

export default function RuleCreatorModal() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="max-w-[600px] w-full max-h-[80vh] overflow-y-auto rounded-xl shadow-2xl bg-white p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Create Autopilot Rule</h2>
          <button className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Auto-assign follow-up tasks"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none"
              placeholder="What does this rule do?"
              readOnly
            />
          </div>

          <div>
            <div className="bg-gray-50 rounded px-4 py-2 font-semibold text-sm text-gray-700 mb-2">WHEN</div>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-400">
              <option>Select trigger...</option>
              <option>Task completed</option>
              <option>Task overdue</option>
              <option>New task created</option>
              <option>Priority changed</option>
            </select>
          </div>

          <div>
            <div className="bg-gray-50 rounded px-4 py-2 font-semibold text-sm text-gray-700 mb-2">THEN</div>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-400 mb-2">
              <option>Select action...</option>
              <option>Create follow-up task</option>
              <option>Send notification</option>
              <option>Update task priority</option>
              <option>Assign to team member</option>
            </select>
            <button className="text-blue-500 text-sm hover:underline">+ Add Another Action</button>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Execution Mode</div>
            <div className="space-y-2">
              {[
                { value: "suggest", label: "Suggest", desc: "Show suggestion and wait for approval", checked: true },
                { value: "auto", label: "Auto", desc: "Execute automatically without confirmation", checked: false },
                { value: "confirm", label: "Confirm", desc: "Always ask before executing", checked: false },
              ].map(opt => (
                <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="mode" defaultChecked={opt.checked} className="mt-0.5" readOnly />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-3">Safety Settings</div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Max actions/day</label>
                <input className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" defaultValue="50" readOnly />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Cooldown</label>
                <input className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" defaultValue="0 min" readOnly />
              </div>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-700">Active hours only</span>
              <div className="w-10 h-5 bg-gray-200 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow" />
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-2">Active days</div>
              <div className="flex gap-2">
                {days.map(d => (
                  <label key={d} className="flex items-center gap-1 text-xs text-gray-700">
                    <input type="checkbox" defaultChecked className="rounded" readOnly />
                    {d}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md">Cancel</button>
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md">Save Rule</button>
        </div>
      </div>
    </div>
  );
}
