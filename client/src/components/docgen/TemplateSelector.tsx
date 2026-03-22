import { FileText, CheckCircle, Loader2 } from "lucide-react";

const sections = [
  {
    label: "REPORTS",
    templates: [
      { icon: "📊", title: "Weekly Status Report", desc: "Summarizes weekly task completion, blockers, and next steps." },
      { icon: "🔁", title: "Sprint Retrospective", desc: "Documents what went well, what didn't, and action items." },
    ],
  },
  {
    label: "PLANNING",
    templates: [
      { icon: "🎯", title: "Project Brief", desc: "Defines project goals, scope, timeline, and stakeholders." },
    ],
  },
  {
    label: "HANDOFFS",
    templates: [
      { icon: "🤝", title: "Handoff Document", desc: "Captures all context needed for a smooth project handoff." },
      { icon: "📖", title: "Onboarding Guide", desc: "Step-by-step guide for onboarding a new team member." },
    ],
  },
  {
    label: "CUSTOM",
    templates: [
      { icon: "✏️", title: "Describe what you need", desc: "Tell AI what kind of document you need and it will generate a template." },
    ],
  },
];

const progressSteps = [
  { label: "Fetching task data", done: true },
  { label: "Analyzing patterns", done: true },
  { label: "Generating document", done: false },
  { label: "Formatting output", done: false },
];

export default function TemplateSelector() {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="max-w-[560px] w-full rounded-xl shadow-2xl bg-white p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-5">
          <FileText className="w-5 h-5 text-blue-500" />
          <h2 className="text-base font-bold text-gray-900">Generate Document with AI</h2>
        </div>

        {sections.map(section => (
          <div key={section.label} className="mb-5">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{section.label}</div>
            <div className="grid grid-cols-1 gap-2">
              {section.templates.map((tmpl, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-4 border hover:shadow-md cursor-pointer flex items-start gap-3 transition-shadow">
                  <span className="text-2xl shrink-0">{tmpl.icon}</span>
                  <div>
                    <div className="font-medium text-sm text-gray-900">{tmpl.title}</div>
                    <p className="text-xs text-gray-500 mt-0.5">{tmpl.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button className="text-sm text-blue-500 hover:underline mb-6">+ Create Custom Template</button>

        <div className="border-t pt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Configuration</p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Date Range</label>
                <input className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm" placeholder="Last 7 days" readOnly />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Project</label>
                <input className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm" placeholder="All projects" readOnly />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2">Include data</label>
              <div className="flex gap-4">
                {["Tasks", "Notes", "Time data"].map(opt => (
                  <label key={opt} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" defaultChecked className="rounded" readOnly />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Additional notes</label>
              <textarea className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm h-20 resize-none" placeholder="Any specific focus areas..." readOnly />
            </div>
            <button className="w-full bg-blue-600 text-white text-sm py-2 rounded-md">Generate Document</button>
          </div>

          <div className="mt-5 space-y-2">
            {progressSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                {step.done ? (
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 text-blue-400 shrink-0 animate-spin" />
                )}
                <span className={`text-sm ${step.done ? "line-through text-gray-400" : "text-gray-700"}`}>{step.label}</span>
              </div>
            ))}
            <div className="h-2 bg-gray-100 rounded-full mt-2">
              <div className="h-2 bg-blue-500 rounded-full" style={{ width: "50%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
