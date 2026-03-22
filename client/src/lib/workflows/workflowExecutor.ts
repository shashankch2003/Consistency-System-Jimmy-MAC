import type { ProcessedStep, InputVariable } from "./workflowProcessor";

export interface Workflow {
  id: string;
  name: string;
  processedSteps: ProcessedStep[];
  inputVariables: InputVariable[];
  triggerType: "manual" | "scheduled" | "event";
}

export interface StepResult {
  stepId: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  output?: Record<string, unknown>;
  error?: string;
}

export interface ExecutionProgress {
  currentStep: number;
  totalSteps: number;
  results: StepResult[];
  status: "running" | "completed" | "failed";
  timeSavedSeconds: number;
}

function replaceVars(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);
}

function replaceRefs(
  value: unknown,
  stepOutputs: Map<string, Record<string, unknown>>
): unknown {
  if (typeof value !== "string") return value;
  return value.replace(/\$step(\d+)\.(\w+)/g, (_, idx, field) => {
    const out = stepOutputs.get(`step_${idx}`);
    return out ? String(out[field] ?? "") : "";
  });
}

export async function executeWorkflow(
  workflow: Workflow,
  values: Record<string, string>,
  onProgress: (progress: ExecutionProgress) => void,
  onCreateTask?: (title: string, description: string) => Promise<{ id: number }>,
  onCreateNote?: (title: string, content: string) => Promise<{ id: number }>
): Promise<ExecutionProgress> {
  const stepResults: StepResult[] = workflow.processedSteps.map((s) => ({
    stepId: s.id,
    description: s.description,
    status: "pending" as const,
  }));

  const stepOutputs = new Map<string, Record<string, unknown>>();
  const startTime = Date.now();

  for (let i = 0; i < workflow.processedSteps.length; i++) {
    const step = workflow.processedSteps[i];
    stepResults[i].status = "running";
    onProgress({
      currentStep: i,
      totalSteps: workflow.processedSteps.length,
      results: [...stepResults],
      status: "running",
      timeSavedSeconds: 0,
    });

    try {
      const processedData: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(step.data)) {
        const withRefs = replaceRefs(val, stepOutputs);
        processedData[key] = typeof withRefs === "string"
          ? replaceVars(withRefs, values)
          : withRefs;
      }

      let output: Record<string, unknown> = {};
      if (step.type === "create_task" && onCreateTask) {
        const result = await onCreateTask(
          String(processedData["title"] ?? "Task"),
          String(processedData["description"] ?? "")
        );
        output = { id: result.id, title: processedData["title"] };
      } else if (step.type === "create_note" && onCreateNote) {
        const result = await onCreateNote(
          String(processedData["title"] ?? "Note"),
          String(processedData["content"] ?? "")
        );
        output = { id: result.id, title: processedData["title"] };
      } else {
        output = processedData;
      }

      stepOutputs.set(`step_${i}`, output);
      stepResults[i].status = "completed";
      stepResults[i].output = output;

      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      stepResults[i].status = "failed";
      stepResults[i].error = String(err);
      const finalProgress: ExecutionProgress = {
        currentStep: i,
        totalSteps: workflow.processedSteps.length,
        results: [...stepResults],
        status: "failed",
        timeSavedSeconds: Math.round((Date.now() - startTime) / 1000),
      };
      onProgress(finalProgress);
      return finalProgress;
    }
  }

  const estimated = workflow.processedSteps.length * 30;
  const actual = Math.round((Date.now() - startTime) / 1000);
  const timeSavedSeconds = Math.max(0, estimated - actual);

  const finalProgress: ExecutionProgress = {
    currentStep: workflow.processedSteps.length,
    totalSteps: workflow.processedSteps.length,
    results: [...stepResults],
    status: "completed",
    timeSavedSeconds,
  };
  onProgress(finalProgress);
  return finalProgress;
}
