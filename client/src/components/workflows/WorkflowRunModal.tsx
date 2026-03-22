import { useState } from "react";
import { Play, CheckCircle, Loader2, XCircle } from "lucide-react";
import type { Workflow, StepResult } from "@/lib/workflows/workflowExecutor";
import { executeWorkflow } from "@/lib/workflows/workflowExecutor";

interface SavedWorkflow {
  id: string;
  name: string;
  variables: Array<{ label: string; type: string; required: boolean; name: string }>;
}

const DEFAULT_WORKFLOW: SavedWorkflow = {
  id: "demo",
  name: "Client Onboarding",
  variables: [
    { name: "client_name",  label: "Client Name",    type: "text", required: true },
    { name: "client_email", label: "Client Email",   type: "text", required: true },
    { name: "start_date",   label: "Start Date",     type: "date", required: true },
    { name: "assigned_user",label: "Assigned User",  type: "text", required: false },
  ],
};

interface WorkflowRunModalProps {
  workflow?: SavedWorkflow;
  initialValues?: Record<string, string>;
  onClose?: () => void;
}

type ModalPhase = "form" | "running" | "completed" | "failed";

export default function WorkflowRunModal({ workflow = DEFAULT_WORKFLOW, initialValues = {}, onClose }: WorkflowRunModalProps) {
  const [phase, setPhase] = useState<ModalPhase>("form");
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [timeSaved, setTimeSaved] = useState(0);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    for (const v of workflow.variables) {
      if (v.required && !values[v.name]?.trim()) {
        newErrors[v.name] = `${v.label} is required`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleRun() {
    if (!validate()) return;
    setPhase("running");

    const mockWorkflow: Workflow = {
      id: workflow.id,
      name: workflow.name,
      inputVariables: workflow.variables.map((v) => ({
        name: v.name, label: v.label, type: v.type as "text", required: v.required, stepIndex: 0, fieldPath: "data",
      })),
      processedSteps: [
        { id: "s1", originalStep: { id: "s1", type: "create_task", description: `Create welcome task: 'Onboard ${values["client_name"] ?? "Client"}'`, data: { title: `Onboard ${values["client_name"] ?? "Client"}` }, timestamp: new Date().toISOString() }, description: `Create welcome task: 'Onboard ${values["client_name"] ?? "Client"}'`, type: "create_task", data: { title: `Onboard ${values["client_name"] ?? "Client"}` }, isOptional: false, inputVarRefs: [], outputRef: "$step0" },
        { id: "s2", originalStep: { id: "s2", type: "create_note", description: `Send notification to ${values["assigned_user"] || "team"}`, data: { title: `Notification for ${values["assigned_user"] || "team"}` }, timestamp: new Date().toISOString() }, description: `Send notification to ${values["assigned_user"] || "team"}`, type: "create_note", data: { title: `Notification for ${values["assigned_user"] || "team"}` }, isOptional: false, inputVarRefs: [], outputRef: "$step1" },
        { id: "s3", originalStep: { id: "s3", type: "create_task", description: `Create kickoff task due ${values["start_date"] || "soon"}`, data: { title: `Kickoff: ${values["client_name"] || "Client"}`, date: values["start_date"] }, timestamp: new Date().toISOString() }, description: `Create kickoff task due ${values["start_date"] || "soon"}`, type: "create_task", data: { title: `Kickoff: ${values["client_name"] || "Client"}`, date: values["start_date"] }, isOptional: false, inputVarRefs: [], outputRef: "$step2" },
        { id: "s4", originalStep: { id: "s4", type: "create_note", description: `Create note: 'Client Brief for ${values["client_name"] || "Client"}'`, data: { title: `Client Brief for ${values["client_name"] || "Client"}` }, timestamp: new Date().toISOString() }, description: `Create note: 'Client Brief for ${values["client_name"] || "Client"}'`, type: "create_note", data: { title: `Client Brief for ${values["client_name"] || "Client"}` }, isOptional: false, inputVarRefs: [], outputRef: "$step3" },
        { id: "s5", originalStep: { id: "s5", type: "update_task", description: "Mark onboarding as In Progress", data: { title: "Onboarding", completionPercentage: 10 }, timestamp: new Date().toISOString() }, description: "Mark onboarding as In Progress", type: "update_task", data: { title: "Onboarding", completionPercentage: 10 }, isOptional: true, inputVarRefs: [], outputRef: "$step4" },
      ],
      triggerType: "manual",
    };

    await executeWorkflow(
      mockWorkflow,
      values,
      (progress) => {
        setStepResults([...progress.results]);
        if (progress.status === "completed") {
          setTimeSaved(progress.timeSavedSeconds);
          setPhase("completed");
        } else if (progress.status === "failed") {
          setPhase("failed");
        }
      }
    );
  }

  function handleRunAgain() {
    setPhase("form");
    setStepResults([]);
  }

  const getStatusIcon = (status: StepResult["status"]) => {
    if (status === "completed") return <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />;
    if (status === "running")   return <Loader2 className="w-4 h-4 text-blue-400 shrink-0 animate-spin" />;
    if (status === "failed")    return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
    return <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />;
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="max-w-[440px] w-full bg-white rounded-xl shadow-2xl p-6 mx-4">
        <div className="flex items-center gap-2 mb-5">
          <Play className="w-5 h-5 text-blue-500" />
          <h2 className="text-base font-bold text-gray-900">Run: {workflow.name}</h2>
        </div>

        {(phase === "form" || phase === "running") && (
          <>
            <div className="space-y-3 mb-6">
              {workflow.variables.map((f) => (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <input
                    type={f.type === "date" ? "date" : "text"}
                    className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[f.name] ? "border-red-400" : "border-gray-300"}`}
                    placeholder={`Enter ${f.label.toLowerCase()}`}
                    value={values[f.name] ?? ""}
                    onChange={(e) => { setValues((p) => ({ ...p, [f.name]: e.target.value })); setErrors((p) => { const n = { ...p }; delete n[f.name]; return n; }); }}
                    disabled={phase === "running"}
                  />
                  {errors[f.name] && <p className="text-xs text-red-500 mt-1">{errors[f.name]}</p>}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mb-6">
              <button className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md" onClick={onClose} disabled={phase === "running"}>Cancel</button>
              <button
                className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-md disabled:opacity-60 flex items-center justify-center gap-2"
                onClick={handleRun}
                disabled={phase === "running"}
              >
                {phase === "running" && <Loader2 className="w-4 h-4 animate-spin" />}
                {phase === "running" ? "Running..." : "Run Workflow"}
              </button>
            </div>
          </>
        )}

        {(phase === "running" || phase === "completed" || phase === "failed") && stepResults.length > 0 && (
          <div className="border-t pt-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
              {phase === "running" ? "Progress" : "Completion"}
            </p>
            <div className="space-y-2 mb-3">
              {stepResults.map((step) => (
                <div key={step.stepId} className="flex items-center gap-2">
                  {getStatusIcon(step.status)}
                  <span className={`text-sm ${step.status === "completed" ? "text-gray-700" : "text-gray-500"}`}>
                    {step.description}
                  </span>
                </div>
              ))}
            </div>

            {phase === "completed" && (
              <>
                <div className="bg-green-50 rounded-md p-2 text-sm text-green-700 text-center mb-3">
                  Time saved: ~{timeSaved > 0 ? `${Math.ceil(timeSaved / 60)} min` : "< 1 min"}
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 text-sm border border-gray-300 text-gray-700 py-1.5 rounded-md">View Created Items</button>
                  <button className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md" onClick={handleRunAgain}>Run Again</button>
                  <button className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md" onClick={onClose}>Done</button>
                </div>
              </>
            )}

            {phase === "failed" && (
              <div className="flex gap-2 mt-3">
                <button className="flex-1 text-sm bg-blue-600 text-white py-1.5 rounded-md" onClick={handleRun}>Retry</button>
                <button className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md" onClick={onClose}>Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
