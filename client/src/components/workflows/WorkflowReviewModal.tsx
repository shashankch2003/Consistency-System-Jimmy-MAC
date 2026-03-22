import { CheckCircle, X, Edit2, Trash2 } from "lucide-react";

const variables = [
  { name: "Client Name", type: "Text" },
  { name: "Client Email", type: "Text" },
  { name: "Start Date", type: "Date" },
  { name: "Assigned User", type: "User" },
];

const steps = [
  { icon: "📋", desc: "Create welcome task: 'Onboard {{Client Name}}'" },
  { icon: "📧", desc: "Send notification to {{Assigned User}}" },
  { icon: "📅", desc: "Create kickoff task due {{Start Date}}" },
  { icon: "📝", desc: "Create note: 'Client Brief for {{Client Name}}'" },
  { icon: "✅", desc: "Mark onboarding as In Progress" },
];

export default function WorkflowReviewModal() {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="max-w-[600px] w-full max-h-[80vh] overflow-y-auto rounded-xl shadow-2xl bg-white p-6 mx-4">
        <div className="flex items-center gap-2 mb-5">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <h2 className="text-base font-bold text-gray-900">Workflow Recorded: 'Client Onboarding'</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Name</label>
            <input className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" defaultValue="Client Onboarding" readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Optional description..." readOnly />
          </div>

          <div>
            <div className="bg-gray-50 rounded px-4 py-2 font-semibold text-sm text-gray-700 mb-2">INPUT VARIABLES</div>
            <div className="space-y-2">
              {variables.map((v, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="rounded" readOnly />
                  <span className="text-sm text-gray-700 flex-1">{v.name}</span>
                  <span className="text-xs border rounded px-2 py-0.5 text-gray-500">[{v.type}]</span>
                </div>
              ))}
              <button className="text-sm text-blue-500 hover:underline mt-1">+ Add variable</button>
            </div>
          </div>

          <div>
            <div className="bg-gray-50 rounded px-4 py-2 font-semibold text-sm text-gray-700 mb-2">WORKFLOW STEPS</div>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 border rounded-lg p-3">
                  <span className="text-gray-500 text-sm font-medium shrink-0 w-5">{i + 1}.</span>
                  <span className="text-lg shrink-0">{step.icon}</span>
                  <p className="text-sm text-gray-700 flex-1">
                    {step.desc.split(/(\{\{[^}]+\}\})/).map((part, j) =>
                      part.startsWith("{{") ? (
                        <span key={j} className="text-blue-500">{part}</span>
                      ) : (
                        <span key={j}>{part}</span>
                      )
                    )}
                  </p>
                  <div className="flex gap-1 shrink-0">
                    <button className="p-1 text-gray-400 hover:text-gray-600"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    <button className="text-xs text-gray-400 hover:text-gray-600 px-1">Optional</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="bg-gray-50 rounded px-4 py-2 font-semibold text-sm text-gray-700 mb-2">TRIGGER</div>
            <div className="space-y-2">
              {["Manual", "Scheduled", "Event"].map((t, i) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="trigger" defaultChecked={i === 0} readOnly />
                  <span className="text-sm text-gray-700">{t}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md">Cancel</button>
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md">Save Workflow</button>
        </div>
      </div>
    </div>
  );
}
