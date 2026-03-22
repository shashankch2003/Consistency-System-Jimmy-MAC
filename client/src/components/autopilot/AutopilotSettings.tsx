import { X } from "lucide-react";

function Toggle({ on }: { on: boolean }) {
  return (
    <div className={`w-10 h-5 rounded-full relative transition-colors ${on ? "bg-blue-500" : "bg-gray-200"}`}>
      <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-all ${on ? "left-5.5 left-[22px]" : "left-0.5"}`} />
    </div>
  );
}

function SettingRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <Toggle on={on} />
    </div>
  );
}

export default function AutopilotSettings() {
  const privacyItems = ["Tasks", "Messages", "Documents", "Notes", "Calendar"];

  return (
    <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-xl z-50 overflow-y-auto">
      <div className="flex items-center justify-between p-5 border-b">
        <h2 className="text-base font-bold text-gray-900">Autopilot Settings</h2>
        <button className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-6">
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">General</div>
          <div className="divide-y divide-gray-100">
            <SettingRow label="Autopilot enabled" on={true} />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">Default mode</span>
              <select className="text-sm border border-gray-200 rounded-md px-2 py-1 text-gray-700">
                <option>Suggest</option>
                <option>Auto</option>
                <option>Confirm</option>
              </select>
            </div>
            <SettingRow label="Activity tracking" on={true} />
            <SettingRow label="Pattern detection" on={true} />
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notifications</div>
          <div className="divide-y divide-gray-100">
            <SettingRow label="Rule execution alerts" on={true} />
            <SettingRow label="Floating suggestions" on={true} />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">Auto-dismiss after</span>
              <select className="text-sm border border-gray-200 rounded-md px-2 py-1 text-gray-700">
                <option>30s</option>
                <option>60s</option>
                <option>Never</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Limits</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Max actions per day</label>
              <input className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" defaultValue="50" readOnly />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Monthly AI credits</label>
              <input className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" defaultValue="100" readOnly />
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Privacy</div>
          <div className="text-xs text-gray-500 mb-3">Allow Autopilot to access:</div>
          <div className="space-y-2">
            {privacyItems.map(item => (
              <label key={item} className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" readOnly />
                <span className="text-sm text-gray-700">{item}</span>
              </label>
            ))}
          </div>
          <button className="mt-4 w-full py-2 bg-red-50 text-red-600 text-sm rounded-md border border-red-200 hover:bg-red-100 transition-colors">
            Delete All Autopilot Data
          </button>
        </div>

        <div className="space-y-2 text-sm text-gray-400">
          <div className="bg-gray-50 rounded-md p-3">No pending suggestions.</div>
          <div className="bg-gray-50 rounded-md p-3">No rules yet.</div>
          <div className="bg-gray-50 rounded-md p-3">No patterns detected.</div>
          <div className="bg-gray-50 rounded-md p-3">No activity yet.</div>
        </div>
      </div>
    </div>
  );
}
