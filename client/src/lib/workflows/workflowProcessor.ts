import type { RecordedStep } from "./actionRecorder";

export interface InputVariable {
  name: string;
  label: string;
  type: "text" | "date" | "user" | "number";
  required: boolean;
  stepIndex: number;
  fieldPath: string;
}

export interface ProcessedStep {
  id: string;
  originalStep: RecordedStep;
  description: string;
  type: RecordedStep["type"];
  data: Record<string, unknown>;
  isOptional: boolean;
  inputVarRefs: string[];
  outputRef: string;
}

const DATE_PATTERNS = [
  /\b\d{4}-\d{2}-\d{2}\b/,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
  /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday)\b/i,
];

const USER_PATTERNS = [/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g];

function detectVariables(value: string, fieldPath: string, stepIndex: number): InputVariable[] {
  const vars: InputVariable[] = [];
  DATE_PATTERNS.forEach((p) => {
    if (p.test(value)) {
      vars.push({
        name: `date_${stepIndex}`,
        label: "Date",
        type: "date",
        required: true,
        stepIndex,
        fieldPath,
      });
    }
  });
  const userMatches = value.match(USER_PATTERNS[0]);
  if (userMatches) {
    vars.push({
      name: `user_${stepIndex}`,
      label: "Assigned User",
      type: "user",
      required: false,
      stepIndex,
      fieldPath,
    });
  }
  return vars;
}

function cleanNavigationSteps(steps: RecordedStep[]): RecordedStep[] {
  return steps.filter((s) => s.type !== "update_task" || s.data["title"]);
}

export function processRecordedSteps(rawSteps: RecordedStep[]): {
  processedSteps: ProcessedStep[];
  inputVariables: InputVariable[];
} {
  const cleaned = cleanNavigationSteps(rawSteps);
  const allVars: InputVariable[] = [];
  const varNames = new Set<string>();

  const processedSteps: ProcessedStep[] = cleaned.map((step, idx) => {
    const stepVars: InputVariable[] = [];
    const data = { ...step.data };

    for (const [key, val] of Object.entries(data)) {
      if (typeof val === "string") {
        const detected = detectVariables(val, key, idx);
        detected.forEach((v) => {
          if (!varNames.has(v.name)) {
            varNames.add(v.name);
            stepVars.push(v);
          }
        });
      }
    }

    allVars.push(...stepVars);
    const inputVarRefs = stepVars.map((v) => `{{${v.name}}}`);

    return {
      id: step.id,
      originalStep: step,
      description: step.description,
      type: step.type,
      data,
      isOptional: false,
      inputVarRefs,
      outputRef: `$step${idx}`,
    };
  });

  return { processedSteps, inputVariables: allVars };
}
