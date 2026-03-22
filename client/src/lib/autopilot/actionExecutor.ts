export interface AutopilotAction {
  type: "create_task" | "update_task" | "send_notification" | "wait" | "condition";
  config: Record<string, unknown>;
}

export interface ExecutionResult {
  actionType: string;
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
}

function replaceVars(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key) => {
    return vars[key] ?? vars[key.split(".").pop()!] ?? `{{${key}}}`;
  });
}

function replaceRefs(
  value: unknown,
  stepOutputs: Record<number, Record<string, unknown>>
): unknown {
  if (typeof value !== "string") return value;
  return value.replace(/\$step(\d+)\.(\w+)/g, (_, idx, field) => {
    const out = stepOutputs[Number(idx)];
    return out ? String(out[field] ?? "") : "";
  });
}

export async function executeActions(
  actions: AutopilotAction[],
  eventData: Record<string, unknown>,
  vars: Record<string, string> = {},
  onTask?: (title: string, description: string) => void,
  onNotify?: (message: string) => void
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];
  const stepOutputs: Record<number, Record<string, unknown>> = {};

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const cfg = action.config;

    try {
      if (action.type === "create_task") {
        const title = replaceVars(
          String(replaceRefs(cfg["title"] ?? "", stepOutputs)),
          vars
        );
        const description = replaceVars(
          String(replaceRefs(cfg["description"] ?? "", stepOutputs)),
          vars
        );
        onTask?.(title, description);
        const output = { title, description, created: true };
        stepOutputs[i] = output;
        results.push({ actionType: "create_task", success: true, output });
      } else if (action.type === "send_notification") {
        const message = replaceVars(String(cfg["message"] ?? ""), vars);
        onNotify?.(message);
        results.push({ actionType: "send_notification", success: true });
      } else if (action.type === "wait") {
        const ms = Number(cfg["ms"] ?? 0);
        if (ms > 0) await new Promise((r) => setTimeout(r, Math.min(ms, 5000)));
        results.push({ actionType: "wait", success: true });
      } else if (action.type === "condition") {
        const field = String(cfg["field"] ?? "");
        const value = eventData[field];
        const condMet = Boolean(value);
        results.push({ actionType: "condition", success: true, output: { conditionMet: condMet } });
      } else {
        results.push({ actionType: action.type, success: false, error: "Unknown action type" });
      }
    } catch (err) {
      results.push({
        actionType: action.type,
        success: false,
        error: String(err),
      });
    }
  }
  return results;
}
