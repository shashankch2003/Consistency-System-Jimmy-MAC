export interface ProjectContext {
  id: string;
  projectName: string;
  color?: string;
  icon?: string;
  isPinned: boolean;
  lastActiveAt: string;
  lastActiveDuration?: number;
  openItems: {
    route?: string;
    scrollY?: number;
    selectedTaskId?: number | null;
    selectedNoteId?: number | null;
  };
}

interface SavedContext {
  projectId: string;
  context: ProjectContext["openItems"];
  savedAt: string;
}

const contextStore = new Map<string, SavedContext>();

export function saveCurrentContext(
  projectId: string,
  data: ProjectContext["openItems"]
): void {
  contextStore.set(projectId, {
    projectId,
    context: data,
    savedAt: new Date().toISOString(),
  });
}

export function restoreContext(projectId: string): ProjectContext["openItems"] | null {
  const saved = contextStore.get(projectId);
  if (!saved) return null;
  if (saved.context.scrollY != null && saved.context.scrollY > 0) {
    setTimeout(() => {
      window.scrollTo({ top: saved.context.scrollY, behavior: "smooth" });
    }, 100);
  }
  return saved.context;
}

export function clearContext(projectId: string): void {
  contextStore.delete(projectId);
}

export function getAwayDuration(lastActiveAt: string): number {
  return (Date.now() - new Date(lastActiveAt).getTime()) / 3_600_000;
}

export function shouldShowCatchUp(lastActiveAt: string): boolean {
  return getAwayDuration(lastActiveAt) >= 2;
}

export function buildCatchUpSummary(
  newTasks: number,
  completedTasks: number,
  newMessages: number,
  noteEdits: number
): string[] {
  const updates: string[] = [];
  if (newTasks > 0) updates.push(`${newTasks} new task${newTasks > 1 ? "s" : ""} added`);
  if (completedTasks > 0) updates.push(`${completedTasks} task${completedTasks > 1 ? "s" : ""} completed`);
  if (newMessages > 0) updates.push(`${newMessages} new group message${newMessages > 1 ? "s" : ""}`);
  if (noteEdits > 0) updates.push(`${noteEdits} note${noteEdits > 1 ? "s" : ""} updated`);
  return updates;
}
