import { X } from "lucide-react";

function Toggle({ on }: { on: boolean }) {
  return (
    <div className={`w-10 h-5 rounded-full relative ${on ? "bg-blue-500" : "bg-gray-200"}`}>
      <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow ${on ? "left-[22px]" : "left-0.5"}`} />
    </div>
  );
}

function Row({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <Toggle on={on} />
    </div>
  );
}

export default function TimeMachineSettings() {
  return (
    <div className="fixed right-0 top-0 h-full w-[380px] bg-white shadow-xl z-50 overflow-y-auto">
      <div className="flex items-center justify-between p-5 border-b">
        <h2 className="text-base font-bold text-gray-900">Time Machine Settings</h2>
        <button className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-6">
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tracking</div>
          <div className="divide-y divide-gray-100">
            <Row label="Track task activity" on={true} />
            <Row label="Track note edits" on={true} />
            <Row label="Track feature navigation" on={true} />
            <Row label="Track focus sessions" on={true} />
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Daily Summary</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Summary time</span>
              <input className="text-sm border border-gray-200 rounded-md px-2 py-1 w-24" defaultValue="6:00 PM" readOnly />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Timezone</span>
              <select className="text-sm border border-gray-200 rounded-md px-2 py-1 text-gray-700">
                <option>Auto</option>
                <option>UTC</option>
                <option>US/Eastern</option>
              </select>
            </div>
            <Row label="Daily summary notification" on={true} />
            <Row label="Daily AI coaching" on={true} />
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Weekly Report</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Report day</span>
              <select className="text-sm border border-gray-200 rounded-md px-2 py-1 text-gray-700">
                <option>Sunday</option>
                <option>Monday</option>
                <option>Friday</option>
              </select>
            </div>
            <Row label="Weekly report notification" on={true} />
            <Row label="Share with team" on={false} />
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Privacy</div>
          <p className="text-xs text-gray-500 mb-3">
            Activity data is stored locally in your session and never shared without permission.
          </p>
          <button className="w-full py-2 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
            Delete All Data
          </button>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Display</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Default view</span>
              <select className="text-sm border border-gray-200 rounded-md px-2 py-1 text-gray-700">
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
            <Row label="Show focus score" on={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
