export type StepType = "create_task" | "update_task" | "create_note" | "update_note";

export interface RecordedStep {
  id: string;
  type: StepType;
  description: string;
  data: Record<string, unknown>;
  timestamp: string;
}

let steps: RecordedStep[] = [];
let isRecording = false;
let isPaused = false;

export function startRecording(): void {
  steps = [];
  isRecording = true;
  isPaused = false;
}

export function pauseRecording(): void {
  isPaused = true;
}

export function resumeRecording(): void {
  isPaused = false;
}

export function stopRecording(): RecordedStep[] {
  isRecording = false;
  isPaused = false;
  return [...steps];
}

export function undoLastStep(): RecordedStep | null {
  if (steps.length === 0) return null;
  return steps.pop() ?? null;
}

export function getSteps(): RecordedStep[] {
  return [...steps];
}

export function getStepCount(): number {
  return steps.length;
}

export function getLastStep(): RecordedStep | null {
  return steps[steps.length - 1] ?? null;
}

export function isCurrentlyRecording(): boolean {
  return isRecording && !isPaused;
}

export function isCurrentlyPaused(): boolean {
  return isRecording && isPaused;
}

export function recordAction(
  type: StepType,
  data: Record<string, unknown>
): void {
  if (!isRecording || isPaused) return;
  const descriptions: Record<StepType, string> = {
    create_task: `Created task: ${String(data["title"] ?? "Untitled")}`,
    update_task: `Updated task: ${String(data["title"] ?? "Task")}`,
    create_note: `Created note: ${String(data["title"] ?? "Untitled")}`,
    update_note: `Updated note: ${String(data["title"] ?? "Note")}`,
  };
  steps.push({
    id: crypto.randomUUID(),
    type,
    description: descriptions[type],
    data,
    timestamp: new Date().toISOString(),
  });
}
