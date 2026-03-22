import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportBuilder } from "./ReportBuilder";
import {
  ClipboardList, BarChart2, RotateCcw, User, Heart, Clock, DollarSign, Building2, Brain, Shield
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  config: {
    sources: string[];
    chartType: string;
    groupBy: string;
    filters: string[];
  };
}

const TEMPLATES: Template[] = [
  {
    id: "daily-standup",
    name: "Daily Standup Summary",
    description: "Tasks completed yesterday, planned today, and any blockers.",
    icon: ClipboardList,
    color: "text-blue-400",
    config: { sources: ["Tasks"], chartType: "table", groupBy: "Assignee", filters: ["date:today"] },
  },
  {
    id: "weekly-productivity",
    name: "Weekly Productivity",
    description: "Team productivity scores and completed tasks over the past 7 days.",
    icon: BarChart2,
    color: "text-green-400",
    config: { sources: ["Tasks", "Members"], chartType: "bar", groupBy: "Date", filters: ["week:current"] },
  },
  {
    id: "sprint-retro",
    name: "Sprint Retrospective",
    description: "What went well, velocity, and improvement opportunities.",
    icon: RotateCcw,
    color: "text-purple-400",
    config: { sources: ["Tasks", "Projects"], chartType: "bar", groupBy: "Status", filters: [] },
  },
  {
    id: "individual-perf",
    name: "Individual Performance Review",
    description: "Per-member task completion, quality scores, and time tracking.",
    icon: User,
    color: "text-yellow-400",
    config: { sources: ["Tasks", "Time", "Members"], chartType: "line", groupBy: "Assignee", filters: [] },
  },
  {
    id: "project-health",
    name: "Project Health",
    description: "Project status, on-time delivery rate, and risk indicators.",
    icon: Shield,
    color: "text-cyan-400",
    config: { sources: ["Projects", "Tasks"], chartType: "bar", groupBy: "Project", filters: [] },
  },
  {
    id: "workload-dist",
    name: "Workload Distribution",
    description: "Hours assigned vs capacity across all team members.",
    icon: Building2,
    color: "text-orange-400",
    config: { sources: ["Members", "Tasks"], chartType: "bar", groupBy: "Assignee", filters: [] },
  },
  {
    id: "time-utilization",
    name: "Time Utilization",
    description: "How team time is spent across projects and task types.",
    icon: Clock,
    color: "text-pink-400",
    config: { sources: ["Time"], chartType: "pie", groupBy: "Project", filters: [] },
  },
  {
    id: "client-profitability",
    name: "Client Profitability",
    description: "Project revenue vs time invested per client.",
    icon: DollarSign,
    color: "text-emerald-400",
    config: { sources: ["Projects", "Time"], chartType: "bar", groupBy: "Project", filters: [] },
  },
  {
    id: "dept-comparison",
    name: "Department Comparison",
    description: "Side-by-side performance metrics across departments.",
    icon: BarChart2,
    color: "text-indigo-400",
    config: { sources: ["Members", "Tasks"], chartType: "bar", groupBy: "Project", filters: [] },
  },
  {
    id: "burnout-risk",
    name: "Burnout Risk",
    description: "Identifies team members working over capacity consistently.",
    icon: Brain,
    color: "text-red-400",
    config: { sources: ["Members", "Time"], chartType: "bar", groupBy: "Assignee", filters: ["utilization:>80"] },
  },
];

export function ReportLibrary() {
  const [selected, setSelected] = useState<Template | null>(null);

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)} data-testid="button-back-library">
            ← Back to Library
          </Button>
          <h3 className="font-semibold">{selected.name}</h3>
        </div>
        <ReportBuilder initialConfig={selected.config} reportName={selected.name} />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="report-library">
      <p className="text-sm text-muted-foreground">Choose a report template to get started quickly.</p>
      <div className="grid grid-cols-2 gap-4">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <Card key={template.id} className="hover:border-primary/40 transition-colors cursor-pointer group" data-testid={`template-${template.id}`}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted/30 shrink-0 mt-0.5">
                  <Icon className={`h-5 w-5 ${template.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{template.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={() => setSelected(template)}
                  data-testid={`button-generate-${template.id}`}
                >
                  Generate
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
