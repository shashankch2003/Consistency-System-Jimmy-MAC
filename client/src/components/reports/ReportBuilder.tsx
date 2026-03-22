import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart2, LineChart as LineIcon, PieChart as PieIcon, Table2, Plus, Download, Save, Play
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";

const DATA_SOURCES = ["Tasks", "Time", "Members", "Projects"];
const CHART_TYPES = [
  { id: "bar", label: "Bar", icon: BarChart2 },
  { id: "line", label: "Line", icon: LineIcon },
  { id: "pie", label: "Pie", icon: PieIcon },
  { id: "table", label: "Table", icon: Table2 },
];
const GROUP_BY_OPTIONS = ["Date", "Assignee", "Project", "Status", "Priority"];
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function generateMockData(sources: string[], groupBy: string) {
  if (sources.includes("Tasks")) {
    return [
      { label: "Mon", value: 12, completed: 8 },
      { label: "Tue", value: 18, completed: 14 },
      { label: "Wed", value: 9, completed: 7 },
      { label: "Thu", value: 22, completed: 19 },
      { label: "Fri", value: 15, completed: 13 },
    ];
  }
  if (sources.includes("Time")) {
    return [
      { label: "Design", value: 24 },
      { label: "Development", value: 48 },
      { label: "Meetings", value: 12 },
      { label: "Review", value: 8 },
    ];
  }
  return [
    { label: "Active", value: 45 },
    { label: "Done", value: 32 },
    { label: "Blocked", value: 8 },
    { label: "Pending", value: 15 },
  ];
}

interface ReportBuilderProps {
  initialConfig?: any;
  reportName?: string;
}

export function ReportBuilder({ initialConfig, reportName }: ReportBuilderProps) {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();

  const [sources, setSources] = useState<string[]>(initialConfig?.sources ?? ["Tasks"]);
  const [chartType, setChartType] = useState<string>(initialConfig?.chartType ?? "bar");
  const [groupBy, setGroupBy] = useState<string>(initialConfig?.groupBy ?? "Date");
  const [filters, setFilters] = useState<string[]>(initialConfig?.filters ?? []);
  const [filterInput, setFilterInput] = useState("");
  const [name, setName] = useState(reportName ?? "");
  const [generated, setGenerated] = useState(false);

  const { data: savedReports = [] } = useQuery({
    queryKey: ["/api/saved-reports", workspaceId],
    queryFn: () => fetch(`/api/saved-reports?workspaceId=${workspaceId}`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/saved-reports", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-reports"] });
      toast({ title: "Report saved" });
    },
    onError: () => toast({ title: "Failed to save report", variant: "destructive" }),
  });

  const reportData = generated ? generateMockData(sources, groupBy) : [];

  const toggleSource = (src: string) => {
    setSources((prev) => prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src]);
    setGenerated(false);
  };

  const handleGenerate = () => {
    if (sources.length === 0) {
      toast({ title: "Select at least one data source", variant: "destructive" });
      return;
    }
    setGenerated(true);
  };

  const handleSave = () => {
    if (!name.trim()) { toast({ title: "Report name required", variant: "destructive" }); return; }
    saveMutation.mutate({
      workspaceId,
      name: name.trim(),
      configuration: { sources, chartType, groupBy, filters },
    });
  };

  const renderChart = () => {
    if (chartType === "bar") return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={reportData}>
          <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          {reportData[0]?.completed !== undefined && <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />}
        </BarChart>
      </ResponsiveContainer>
    );
    if (chartType === "line") return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={reportData}>
          <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    );
    if (chartType === "pie") return (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={reportData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100} label>
            {reportData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
    // table
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {Object.keys(reportData[0] || { label: "", value: "" }).map((k) => (
              <th key={k} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground capitalize">{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reportData.map((row, i) => (
            <tr key={i} className="border-b border-border/30">
              {Object.values(row).map((v: any, j) => (
                <td key={j} className="px-3 py-2 text-sm">{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="flex gap-6" data-testid="report-builder">
      {/* Left panel — data sources */}
      <div className="w-60 shrink-0 space-y-4">
        <div className="border border-border rounded-xl p-4 space-y-3 bg-card">
          <p className="text-sm font-semibold">Data Sources</p>
          {DATA_SOURCES.map((src) => (
            <div key={src} className="flex items-center gap-2">
              <Checkbox
                id={src}
                checked={sources.includes(src)}
                onCheckedChange={() => toggleSource(src)}
                data-testid={`checkbox-source-${src.toLowerCase()}`}
              />
              <label htmlFor={src} className="text-sm cursor-pointer">{src}</label>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="border border-border rounded-xl p-4 space-y-2 bg-card">
          <p className="text-sm font-semibold">Active Filters</p>
          {filters.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
              <span>{f}</span>
              <button onClick={() => setFilters((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-400">×</button>
            </div>
          ))}
          {filters.length === 0 && <p className="text-xs text-muted-foreground">No filters</p>}
        </div>
      </div>

      {/* Center — report canvas */}
      <div className="flex-1 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap border border-border rounded-xl p-3 bg-card">
          {/* Chart type icons */}
          <div className="flex items-center gap-1">
            {CHART_TYPES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setChartType(id); setGenerated(false); }}
                title={label}
                data-testid={`chart-type-${id}`}
                className={`p-1.5 rounded-lg transition-colors ${chartType === id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-border" />

          {/* Add Filter */}
          <div className="flex items-center gap-1">
            <Input
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              placeholder="Add filter..."
              className="h-7 w-32 text-xs"
              data-testid="input-filter"
              onKeyDown={(e) => {
                if (e.key === "Enter" && filterInput.trim()) {
                  setFilters((prev) => [...prev, filterInput.trim()]);
                  setFilterInput("");
                }
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => { if (filterInput.trim()) { setFilters((prev) => [...prev, filterInput.trim()]); setFilterInput(""); } }}
              data-testid="button-add-filter"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Group By */}
          <Select value={groupBy} onValueChange={(v) => { setGroupBy(v); setGenerated(false); }}>
            <SelectTrigger className="h-7 w-32 text-xs" data-testid="select-group-by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_BY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 h-7 text-xs"
              onClick={() => toast({ title: "Export coming soon" })}
              data-testid="button-export"
            >
              <Download className="h-3 w-3" />Export
            </Button>
            <Button size="sm" className="gap-1 h-7 text-xs" onClick={handleGenerate} data-testid="button-generate">
              <Play className="h-3 w-3" />Generate
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="border border-border rounded-xl p-4 bg-card min-h-[340px]">
          {generated ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">
                {sources.join(", ")} · Grouped by {groupBy} · {chartType.charAt(0).toUpperCase() + chartType.slice(1)} chart
              </p>
              {renderChart()}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
              <BarChart2 className="h-12 w-12 opacity-20" />
              <p className="text-sm">Select data sources and click Generate</p>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 border border-border rounded-xl p-3 bg-card">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Report name..."
            className="flex-1 h-8 text-sm"
            data-testid="input-report-name"
          />
          <Button
            size="sm"
            className="gap-1"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="button-save-report"
          >
            <Save className="h-3.5 w-3.5" />Save Report
          </Button>
        </div>
      </div>
    </div>
  );
}
