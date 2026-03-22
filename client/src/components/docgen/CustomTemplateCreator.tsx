import { X, GripVertical } from "lucide-react";

const sectionTypes = ["Static Text", "AI Generated", "Data Query", "User Input"];

const defaultSections = [
  { title: "Executive Summary", type: "AI Generated" },
  { title: "Task Completion", type: "Data Query" },
  { title: "Notes & Observations", type: "User Input" },
];

export default function CustomTemplateCreator() {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="max-w-[600px] w-full max-h-[80vh] overflow-y-auto rounded-xl bg-white p-6 mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">Create Custom Template</h2>
          <button className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. My Weekly Report"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none"
              placeholder="What does this template generate?"
              readOnly
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Sections</label>
            </div>
            <div className="space-y-2">
              {defaultSections.map((section, i) => (
                <div key={i} className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-gray-50">
                  <GripVertical className="w-4 h-4 text-gray-300 cursor-grab shrink-0" />
                  <input
                    className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none"
                    defaultValue={section.title}
                    readOnly
                  />
                  <select className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white">
                    {sectionTypes.map(t => (
                      <option key={t} selected={t === section.type}>{t}</option>
                    ))}
                  </select>
                  <button className="text-gray-300 hover:text-red-400 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button className="text-sm text-blue-500 hover:underline mt-2">+ Add Section</button>
          </div>

          <div className="hidden text-sm text-gray-400 text-center py-3">No custom templates yet.</div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md">Cancel</button>
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md">Save Template</button>
        </div>
      </div>
    </div>
  );
}
