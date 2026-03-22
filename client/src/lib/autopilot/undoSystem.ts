export interface UndoEntry {
  executionId: string;
  ruleId: number;
  ruleName: string;
  undoData: Record<string, unknown>;
  createdAt: number;
  undoneAt?: number;
}

const UNDO_TTL_MS = 24 * 60 * 60 * 1000;
const store: UndoEntry[] = [];

export function recordUndo(
  executionId: string,
  ruleId: number,
  ruleName: string,
  undoData: Record<string, unknown>
): void {
  store.push({
    executionId,
    ruleId,
    ruleName,
    undoData,
    createdAt: Date.now(),
  });
  purgeExpired();
}

export function getUndoable(): UndoEntry[] {
  purgeExpired();
  return store.filter((e) => !e.undoneAt);
}

export function applyUndo(
  executionId: string,
  onUndo: (undoData: Record<string, unknown>) => void
): boolean {
  const entry = store.find((e) => e.executionId === executionId && !e.undoneAt);
  if (!entry) return false;
  entry.undoneAt = Date.now();
  onUndo(entry.undoData);
  return true;
}

function purgeExpired(): void {
  const cutoff = Date.now() - UNDO_TTL_MS;
  for (let i = store.length - 1; i >= 0; i--) {
    if (store[i].createdAt < cutoff) store.splice(i, 1);
  }
}
