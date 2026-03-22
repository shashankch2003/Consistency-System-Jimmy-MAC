import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoalCard } from "./GoalCard";

interface OkrGoal {
  id: number;
  title: string;
  description: string | null;
  confidence: string | null;
  currentValue: string | null;
  targetValue: string | null;
  measurementUnit: string | null;
  dueDate: string | null;
  ownerId: string | null;
  goalType: string | null;
  parentGoalId: number | null;
  workspaceId: number | null;
}

interface OKRTreeProps {
  goals: OkrGoal[];
  filterType?: string;
}

function buildTree(goals: OkrGoal[]) {
  const map = new Map<number, OkrGoal & { children: any[] }>();
  goals.forEach((g) => map.set(g.id, { ...g, children: [] }));
  const roots: (OkrGoal & { children: any[] })[] = [];
  goals.forEach((g) => {
    if (g.parentGoalId && map.has(g.parentGoalId)) {
      map.get(g.parentGoalId)!.children.push(map.get(g.id));
    } else {
      roots.push(map.get(g.id)!);
    }
  });
  return roots;
}

const INDENT = 40;

function GoalNode({
  goal,
  depth,
}: {
  goal: OkrGoal & { children: any[] };
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = goal.children.length > 0;

  return (
    <div data-testid={`goal-node-${goal.id}`}>
      <div style={{ marginLeft: depth * INDENT }}>
        <GoalCard
          goal={goal}
          depth={depth}
          hasChildren={hasChildren}
          isExpanded={expanded}
          onToggle={() => setExpanded((p) => !p)}
        />
      </div>
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            key="children"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2">
              {goal.children.map((child: any) => (
                <GoalNode key={child.id} goal={child} depth={depth + 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function OKRTree({ goals, filterType }: OKRTreeProps) {
  const filtered = filterType && filterType !== "all"
    ? goals.filter((g) => {
        if (filterType === "company") return g.goalType === "company_objective";
        if (filterType === "team") return g.goalType === "team_goal";
        if (filterType === "individual") return g.goalType === "individual";
        return true;
      })
    : goals;

  const tree = buildTree(filtered);

  if (tree.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
        <p className="text-sm">No goals yet — click &quot;Add Goal&quot; to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="okr-tree">
      {tree.map((goal) => (
        <GoalNode key={goal.id} goal={goal} depth={0} />
      ))}
    </div>
  );
}
