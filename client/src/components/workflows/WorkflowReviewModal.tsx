import { useState } from "react";
import { CheckCircle, X, Edit2, Trash2 } from "lucide-react";
import type { ProcessedStep, InputVariable } from "@/lib/workflows/workflowProcessor";

interface ReviewStep {
  id: string;
  icon: string;
  desc: string;
  isOptional: boolean;
}

const DEFAULT_VARIABLES: InputVariable[] = [
  { name: "client_name", label: "Client Name",    type: "text", required: true,  stepIndex: 0, fieldPath: "title" },
  { name: "client_email",label: "Client Email",   type: "text", required: true,  stepIndex: 1, fieldPath: "email" },
  { name: "start_date",  label: "Start Date",     type: "date", required: true,  stepIndex: 2, fieldPath: "date" },
  { name: "assigned_user",label: "Assigned User", type: "user", required: false, stepIndex: 1, fieldPath: "user" },
];

const DEFAULT_STEPS: ReviewStep[] = [
  { id: "s1", icon: "📋", desc: "Create welcome task: 'Onboard {{Client Name}}'", isOptional: false },
  { id: "s2", icon: "📧", desc: "Send notification to {{Assigned User}}",          isOptional: false },
  { id: "s3", icon: "📅", desc: "Create kickoff task due {{Start Date}}",          isOptional: false },
  { id: "s4", icon: "📝", desc: "Create note: 'Client Brief for {{Client Name}}'", isOptional: false },
  { id: "s5", icon: "✅", desc: "Mark onboarding as In Progress",                  isOptional: true  },
];

interface WorkflowReviewModalProps {
  workflowName?: string;
  processedSteps?: ProcessedStep[];
  inputVariables?: InputVariable[];
  onSave?: (data: { name: string; description: string; steps: ReviewStep[]; variables: InputVariable[]; trigger: string }) => void;
  onCancel?: () => void;
}

export default function WorkflowReviewModal({
  workflowName = "Client Onboarding",
  processedSteps,
  inputVariables,
  onSave,
  onCancel,
}: WorkflowReviewModalProps) {
  const [name, setName] = useState(workflowName);
  const [description, setDescription] = useState("");
  const [variables, setVariables] = useState<InputVariable[]>(inputVariables ?? DEFAULT_VARIABLES);
  const [varEnabled, setVarEnabled] = useState<Set<string>>(new Set(variables.map((v) => v.name)));
  const [steps, setSteps] = useState<ReviewStep[]>(
    processedSteps
      ? processedSteps.map((s) => ({ id: s.id, icon: "📋", desc: s.description, isOptional: s.isOptional }))
      : DEFAULT_STEPS
  );
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [trigger, setTrigger] = useState("Manual");

  function toggleVar(varName: string) {
    setVarEnabled((prev) => {
      const next = new Set(prev);
      next.has(varName) ? next.delete(varName) : next.add(varName);
      return next;
    });
  }

  function addVariable() {
    const newVar: InputVariable = {
      name: `var_${Date.now()}`,
      label: "New Variable",
      type: "text",
      required: false,
      stepIndex: 0,
      fieldPath: "data",
    };
    setVariables((prev) => [...prev, newVar]);
    setVarEnabled((prev) => new Set([...prev, newVar.name]));
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  function toggleOptional(id: string) {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, isOptional: !s.isOptional } : s));
  }

  function updateStepDesc(id: string, desc: string) {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, desc } : s));
  }

  function handleSave() {
    onSave?.({
      name,
      description,
      steps,
      variables: variables.filter((v) => varEnabled.has(v.name)),
      trigger,
    });
  }

  function renderStepDesc(desc: string) {
    return desc.split(/(\{\{[^}]+\}\})/).map((part, j) =>
      part.startsWith("{{") ? (
        <span key={j} className="text-blue-500">{part}</span>
      ) : (
        <span key={j}>{part}</span>
      )
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="max-w-[600px] w-full max-h-[80vh] overflow-y-auto rounded-xl shadow-2xl bg-white p-6 mx-4">
        <div className="flex items-center gap-2 mb-5">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <h2 className="text-base font-bold text-gray-900">Workflow Recorded: &apos;{workflowName}&apos;</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Name</label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none"
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <div className="bg-gray-50 rounded px-4 py-2 font-semibold text-sm text-gray-700 mb-2">INPUT VARIABLES</div>
            <div className="space-y-2">
              {variables.map((v) => (
                <div key={v.name} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={varEnabled.has(v.name)}
                    onChange={() => toggleVar(v.name)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 flex-1">{v.label}</span>
                  <span className="text-xs border rounded px-2 py-0.5 text-gray-500 capitalize">[{v.type}]</span>
                </div>
              ))}
              <button className="text-sm text-blue-500 hover:underline mt-1" onClick={addVariable}>+ Add variable</button>
            </div>
          </div>

          <div>
            <div className="bg-gray-50 rounded px-4 py-2 font-semibold text-sm text-gray-700 mb-2">WORKFLOW STEPS</div>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={step.id} className="flex items-start gap-3 border rounded-lg p-3">
                  <span className="text-gray-500 text-sm font-medium shrink-0 w-5">{i + 1}.</span>
                  <span className="text-lg shrink-0">{step.icon}</span>
                  {editingStep === step.id ? (
                    <input
                      className="flex-1 text-sm border-b border-blue-400 focus:outline-none bg-transparent"
                      value={step.desc}
                      onChange={(e) => updateStepDesc(step.id, e.target.value)}
                      onBlur={() => setEditingStep(null)}
                      autoFocus
                    />
                  ) : (
                    <p className="text-sm text-gray-700 flex-1">{renderStepDesc(step.desc)}</p>
                  )}
                  {step.isOptional && (
                    <span className="text-xs text-gray-400 italic shrink-0">optional</span>
                  )}
                  <div className="flex gap-1 shrink-0">
                    <button className="p-1 text-gray-400 hover:text-gray-600" onClick={() => setEditingStep(step.id)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-red-500" onClick={() => removeStep(step.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className={`text-xs px-1 ${step.isOptional ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}
                      onClick={() => toggleOptional(step.id)}
                    >
                      {step.isOptional ? "Required" : "Optional"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="bg-gray-50 rounded px-4 py-2 font-semibold text-sm text-gray-700 mb-2">TRIGGER</div>
            <div className="space-y-2">
              {["Manual", "Scheduled", "Event"].map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="trigger"
                    checked={trigger === t}
                    onChange={() => setTrigger(t)}
                  />
                  <span className="text-sm text-gray-700">{t}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md" onClick={onCancel}>Cancel</button>
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md" onClick={handleSave}>Save Workflow</button>
        </div>
      </div>
    </div>
  );
}
