import { useState } from "react";
import { Edit2, Share2, Trash2 } from "lucide-react";

interface WorkflowItem {
  id: string;
  icon: string;
  name: string;
  desc: string;
  runs: number;
  avg: string;
  isPublic: boolean;
  owner: "me" | "shared";
}

const INITIAL_WORKFLOWS: WorkflowItem[] = [
  { id: "w1", icon: "🤝", name: "Client Onboarding",  desc: "Automates the full client onboarding process from first contact to kickoff",     runs: 12, avg: "45s",    isPublic: false, owner: "me" },
  { id: "w2", icon: "📋", name: "Sprint Setup",       desc: "Creates all recurring tasks and notes for a new sprint week",                    runs: 8,  avg: "1m 12s", isPublic: false, owner: "me" },
  { id: "w3", icon: "📊", name: "Weekly Report",      desc: "Generates and sends weekly progress summary with task completion data",          runs: 4,  avg: "30s",    isPublic: true,  owner: "shared" },
  { id: "w4", icon: "🔁", name: "Task Follow-up",     desc: "Creates a follow-up task automatically after completing high-priority items",    runs: 34, avg: "8s",     isPublic: true,  owner: "me" },
];

const TABS = ["My", "Shared", "All"] as const;
type Tab = typeof TABS[number];

interface WorkflowLibraryProps {
  onRecord?: () => void;
  onRun?: (wf: WorkflowItem) => void;
  onEdit?: (wf: WorkflowItem) => void;
}

export default function WorkflowLibrary({ onRecord, onRun, onEdit }: WorkflowLibraryProps) {
  const [activeTab, setActiveTab] = useState<Tab>("My");
  const [workflows, setWorkflows] = useState<WorkflowItem[]>(INITIAL_WORKFLOWS);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = workflows.filter((wf) => {
    if (activeTab === "My") return wf.owner === "me";
    if (activeTab === "Shared") return wf.isPublic;
    return true;
  });

  function toggleShare(id: string) {
    setWorkflows((prev) =>
      prev.map((wf) => wf.id === id ? { ...wf, isPublic: !wf.isPublic } : wf)
    );
  }

  function handleDelete(id: string) {
    if (deleteConfirm === id) {
      setWorkflows((prev) => prev.filter((wf) => wf.id !== id));
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4">
            <h3 className="font-semibold text-gray-900 mb-2">Delete Workflow?</h3>
            <p className="text-sm text-gray-500 mb-4">This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="px-4 py-2 text-sm bg-red-600 text-white rounded-md" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Workflows</h3>
        <button className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md" onClick={onRecord}>
          Record New Workflow
        </button>
      </div>

      <div className="flex gap-1 border-b mb-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-gray-400 text-center mt-6 py-8">
          No workflows yet. Record your first!
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((wf) => (
            <div key={wf.id} className="bg-white rounded-lg shadow-sm p-4 border hover:shadow-md transition-shadow">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-2xl">{wf.icon}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-gray-900">{wf.name}</div>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{wf.desc}</p>
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-3">
                Run {wf.runs} times | Avg: {wf.avg}
                {wf.isPublic && <span className="ml-2 text-green-600">• Shared</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded-md"
                  onClick={() => onRun?.(wf)}
                >
                  Run
                </button>
                <button className="p-1.5 text-gray-400 hover:text-gray-600" onClick={() => onEdit?.(wf)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  className={`p-1.5 ${wf.isPublic ? "text-green-500" : "text-gray-400 hover:text-gray-600"}`}
                  title={wf.isPublic ? "Unshare" : "Share"}
                  onClick={() => toggleShare(wf.id)}
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button
                  className={`p-1.5 ${deleteConfirm === wf.id ? "text-red-600" : "text-gray-400 hover:text-red-500"}`}
                  onClick={() => handleDelete(wf.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
