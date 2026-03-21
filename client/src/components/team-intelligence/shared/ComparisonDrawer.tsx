import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronUp, ChevronDown, Minus } from "lucide-react";
import type { ComparisonResult } from "@shared/lib/team-intelligence/types";

interface ComparisonDrawerProps {
  workspaceId?: string;
  userId?: string;
  isOpen: boolean;
  onClose: () => void;
}

function todayStr() { return new Date().toISOString().split("T")[0]; }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; }
function startOfWeek() { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split("T")[0]; }
function startOfLastWeek() { const d = new Date(); d.setDate(d.getDate() - d.getDay() - 6); return d.toISOString().split("T")[0]; }
function endOfLastWeek() { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split("T")[0]; }
function startOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; }
function startOfLastMonth() { const d = new Date(); d.setMonth(d.getMonth() - 1, 1); return d.toISOString().split("T")[0]; }
function endOfLastMonth() { const d = new Date(); d.setDate(0); return d.toISOString().split("T")[0]; }

const PRESETS: Record<string, { from: () => string; to: () => string }> = {
  today: { from: todayStr, to: todayStr },
  yesterday: { from: () => daysAgo(1), to: () => daysAgo(1) },
  this_week: { from: startOfWeek, to: todayStr },
  last_week: { from: startOfLastWeek, to: endOfLastWeek },
  this_month: { from: startOfMonth, to: todayStr },
  last_month: { from: startOfLastMonth, to: endOfLastMonth },
  custom: { from: () => daysAgo(14), to: todayStr },
};

const METRICS = [
  { key: "productivityScore", label: "Productivity Score", defaultChecked: true },
  { key: "focusScore", label: "Focus Score", defaultChecked: true },
  { key: "tasksCompleted", label: "Tasks Completed", defaultChecked: true },
  { key: "tasksOverdue", label: "Overdue Tasks", defaultChecked: false },
  { key: "deepWorkMinutes", label: "Deep Work Time", defaultChecked: false },
  { key: "consistencyScore", label: "Consistency Score", defaultChecked: false },
];

const INVERT_METRICS = new Set(["tasksOverdue"]);

export default function ComparisonDrawer({ workspaceId = "default", userId, isOpen, onClose }: ComparisonDrawerProps) {
  const [presetA, setPresetA] = useState("last_week");
  const [presetB, setPresetB] = useState("this_week");
  const [customAFrom, setCustomAFrom] = useState(daysAgo(14));
  const [customATo, setCustomATo] = useState(daysAgo(7));
  const [customBFrom, setCustomBFrom] = useState(daysAgo(7));
  const [customBTo, setCustomBTo] = useState(todayStr());
  const [checkedMetrics, setCheckedMetrics] = useState<Set<string>>(new Set(METRICS.filter(m => m.defaultChecked).map(m => m.key)));
  const [compareTriggered, setCompareTriggered] = useState(false);

  const periodAFrom = presetA === "custom" ? customAFrom : PRESETS[presetA].from();
  const periodATo = presetA === "custom" ? customATo : PRESETS[presetA].to();
  const periodBFrom = presetB === "custom" ? customBFrom : PRESETS[presetB].from();
  const periodBTo = presetB === "custom" ? customBTo : PRESETS[presetB].to();

  const queryUrl = userId
    ? `/api/team-intelligence/compare?workspaceId=${workspaceId}&userId=${userId}&periodAFrom=${periodAFrom}&periodATo=${periodATo}&periodBFrom=${periodBFrom}&periodBTo=${periodBTo}`
    : `/api/team-intelligence/compare?workspaceId=${workspaceId}&periodAFrom=${periodAFrom}&periodATo=${periodATo}&periodBFrom=${periodBFrom}&periodBTo=${periodBTo}`;

  const { data: results, isLoading, error } = useQuery<ComparisonResult[]>({
    queryKey: [queryUrl],
    enabled: isOpen && compareTriggered,
  });

  const filteredResults = useMemo(() => {
    if (!results) return [];
    return results.filter(r => checkedMetrics.has(r.metric));
  }, [results, checkedMetrics]);

  const toggleMetric = (key: string) => {
    setCheckedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const formatMetricName = (metric: string) => {
    return METRICS.find(m => m.key === metric)?.label || metric;
  };

  const formatValue = (metric: string, value: number) => {
    if (metric === "deepWorkMinutes") return `${Math.round(value / 60 * 10) / 10}h`;
    return String(Math.round(value * 100) / 100);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setCompareTriggered(false); } }}>
      <SheetContent className="bg-zinc-950 border-zinc-800 w-full sm:max-w-xl overflow-y-auto" data-testid="drawer-comparison">
        <SheetHeader>
          <SheetTitle className="text-white">Compare Periods</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Period A</Label>
              <Select value={presetA} onValueChange={(v) => { setPresetA(v); setCompareTriggered(false); }}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white" data-testid="select-period-a">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="last_week">Last Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              {presetA === "custom" && (
                <div className="flex gap-2 mt-2">
                  <Input type="date" value={customAFrom} onChange={e => { setCustomAFrom(e.target.value); setCompareTriggered(false); }} className="bg-zinc-900 border-zinc-700 text-white text-xs" data-testid="input-period-a-from" />
                  <Input type="date" value={customATo} onChange={e => { setCustomATo(e.target.value); setCompareTriggered(false); }} className="bg-zinc-900 border-zinc-700 text-white text-xs" data-testid="input-period-a-to" />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Period B</Label>
              <Select value={presetB} onValueChange={(v) => { setPresetB(v); setCompareTriggered(false); }}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white" data-testid="select-period-b">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="last_week">Last Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              {presetB === "custom" && (
                <div className="flex gap-2 mt-2">
                  <Input type="date" value={customBFrom} onChange={e => { setCustomBFrom(e.target.value); setCompareTriggered(false); }} className="bg-zinc-900 border-zinc-700 text-white text-xs" data-testid="input-period-b-from" />
                  <Input type="date" value={customBTo} onChange={e => { setCustomBTo(e.target.value); setCompareTriggered(false); }} className="bg-zinc-900 border-zinc-700 text-white text-xs" data-testid="input-period-b-to" />
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs text-zinc-400 mb-2 block">Metrics to Compare</Label>
            <div className="grid grid-cols-2 gap-2">
              {METRICS.map(m => (
                <div key={m.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`metric-${m.key}`}
                    checked={checkedMetrics.has(m.key)}
                    onCheckedChange={() => toggleMetric(m.key)}
                    data-testid={`checkbox-metric-${m.key}`}
                  />
                  <Label htmlFor={`metric-${m.key}`} className="text-xs text-zinc-300 cursor-pointer">{m.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
            onClick={() => setCompareTriggered(true)}
            disabled={checkedMetrics.size === 0}
            data-testid="button-run-compare"
          >
            Compare
          </Button>

          {compareTriggered && isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 bg-zinc-800 rounded" />)}
            </div>
          )}

          {compareTriggered && error && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 text-center text-zinc-500 text-sm">
                No data available for the selected period.
              </CardContent>
            </Card>
          )}

          {compareTriggered && !isLoading && !error && filteredResults.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-500 text-xs">Metric</TableHead>
                      <TableHead className="text-zinc-500 text-xs text-right">Period A</TableHead>
                      <TableHead className="text-zinc-500 text-xs text-right">Period B</TableHead>
                      <TableHead className="text-zinc-500 text-xs text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((r) => {
                      const inverted = INVERT_METRICS.has(r.metric);
                      const isPositive = inverted ? r.deltaPercent < 0 : r.deltaPercent > 0;
                      const isNegative = inverted ? r.deltaPercent > 0 : r.deltaPercent < 0;
                      const color = isPositive ? "text-green-400" : isNegative ? "text-red-400" : "text-zinc-400";
                      return (
                        <TableRow key={r.metric} className="border-zinc-800" data-testid={`row-compare-${r.metric}`}>
                          <TableCell className="text-zinc-300 text-sm">{formatMetricName(r.metric)}</TableCell>
                          <TableCell className="text-zinc-400 text-sm text-right">{formatValue(r.metric, r.periodAValue)}</TableCell>
                          <TableCell className="text-zinc-400 text-sm text-right">{formatValue(r.metric, r.periodBValue)}</TableCell>
                          <TableCell className={`text-sm text-right font-medium ${color}`}>
                            <span className="inline-flex items-center gap-0.5">
                              {r.deltaPercent > 0 && <ChevronUp className="w-3 h-3" />}
                              {r.deltaPercent < 0 && <ChevronDown className="w-3 h-3" />}
                              {r.deltaPercent === 0 && <Minus className="w-3 h-3" />}
                              {Math.abs(r.deltaPercent)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {compareTriggered && !isLoading && !error && filteredResults.length === 0 && results && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 text-center text-zinc-500 text-sm">
                No data available for the selected period.
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
