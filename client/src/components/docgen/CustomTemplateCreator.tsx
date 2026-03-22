import { useState } from "react";
import { X, GripVertical } from "lucide-react";

const SECTION_TYPES = ["Static Text", "AI Generated", "Data Query", "User Input"] as const;
type SectionType = typeof SECTION_TYPES[number];

interface TemplateSection {
  id: string;
  title: string;
  type: SectionType;
}

const DEFAULT_SECTIONS: TemplateSection[] = [
  { id: "s1", title: "Executive Summary", type: "AI Generated" },
  { id: "s2", title: "Task Completion",   type: "Data Query" },
  { id: "s3", title: "Notes & Observations", type: "User Input" },
];

interface CustomTemplateCreatorProps {
  onSave?: (template: { name: string; description: string; sections: TemplateSection[] }) => void;
  onCancel?: () => void;
}

export default function CustomTemplateCreator({ onSave, onCancel }: CustomTemplateCreatorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<TemplateSection[]>(DEFAULT_SECTIONS);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function addSection() {
    setSections((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: "New Section", type: "Static Text" },
    ]);
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function updateTitle(id: string, title: string) {
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, title } : s));
  }

  function updateType(id: string, type: SectionType) {
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, type } : s));
  }

  function handleDragStart(id: string) { setDragId(id); }
  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    setDragOverId(id);
  }
  function handleDrop() {
    if (!dragId || !dragOverId || dragId === dragOverId) {
      setDragId(null); setDragOverId(null); return;
    }
    setSections((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((s) => s.id === dragId);
      const toIdx = next.findIndex((s) => s.id === dragOverId);
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDragId(null); setDragOverId(null);
  }

  function handleSave() {
    if (!name.trim()) return;
    onSave?.({ name: name.trim(), description, sections });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="max-w-[600px] w-full max-h-[80vh] overflow-y-auto rounded-xl bg-white p-6 mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">Create Custom Template</h2>
          <button className="text-gray-400 hover:text-gray-600" onClick={onCancel}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. My Weekly Report"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none"
              placeholder="What does this template generate?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Sections</label>
            </div>
            <div className="space-y-2">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className={`flex items-center gap-2 border rounded-lg px-3 py-2 bg-gray-50 transition-opacity ${
                    dragOverId === section.id && dragId !== section.id ? "border-blue-400 bg-blue-50" : ""
                  }`}
                  draggable
                  onDragStart={() => handleDragStart(section.id)}
                  onDragOver={(e) => handleDragOver(e, section.id)}
                  onDrop={handleDrop}
                  onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                >
                  <GripVertical className="w-4 h-4 text-gray-300 cursor-grab shrink-0" />
                  <input
                    className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none"
                    value={section.title}
                    onChange={(e) => updateTitle(section.id, e.target.value)}
                  />
                  <select
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white"
                    value={section.type}
                    onChange={(e) => updateType(section.id, e.target.value as SectionType)}
                  >
                    {SECTION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button className="text-gray-300 hover:text-red-400 shrink-0" onClick={() => removeSection(section.id)}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button className="text-sm text-blue-500 hover:underline mt-2" onClick={addSection}>+ Add Section</button>
          </div>

          {sections.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-3">No sections yet. Add one above.</div>
          )}
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md" onClick={onCancel}>Cancel</button>
          <button
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md disabled:opacity-50"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}
