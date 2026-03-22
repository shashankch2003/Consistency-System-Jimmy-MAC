import { Play, CheckCircle } from "lucide-react";

const fields = [
  { label: "Client Name", placeholder: "Enter client name" },
  { label: "Client Email", placeholder: "Enter email address" },
  { label: "Start Date", placeholder: "YYYY-MM-DD", type: "date" },
  { label: "Assigned User", placeholder: "Select user" },
];

const completedSteps = [
  "Welcome task created: 'Onboard Acme Corp'",
  "Notification sent to Dave",
  "Kickoff task created for Mar 10",
  "Note created: 'Client Brief for Acme Corp'",
  "Onboarding marked In Progress",
];

export default function WorkflowRunModal() {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="max-w-[440px] w-full bg-white rounded-xl shadow-2xl p-6 mx-4">
        <div className="flex items-center gap-2 mb-5">
          <Play className="w-5 h-5 text-blue-500" />
          <h2 className="text-base font-bold text-gray-900">Run: Client Onboarding</h2>
        </div>

        <div className="space-y-3 mb-6">
          {fields.map((f, i) => (
            <div key={i}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input
                type={f.type || "text"}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={f.placeholder}
                readOnly
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <button className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md">Cancel</button>
          <button className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-md">Run Workflow</button>
        </div>

        <div className="border-t pt-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Completion</p>
          <div className="space-y-2 mb-3">
            {completedSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                <span className="text-sm text-gray-700">{step}</span>
              </div>
            ))}
          </div>
          <div className="bg-green-50 rounded-md p-2 text-sm text-green-700 text-center mb-3">
            Time saved: ~8 min
          </div>
          <div className="flex gap-2">
            <button className="flex-1 text-sm border border-gray-300 text-gray-700 py-1.5 rounded-md">View Created Items</button>
            <button className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md">Run Again</button>
            <button className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md">Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
