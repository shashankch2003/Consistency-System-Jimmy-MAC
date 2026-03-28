import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addWeeks, subWeeks, startOfWeek, addDays, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export interface TimelineViewConfig {
  datePropertyId?: number;
  endDatePropertyId?: number | null;
  titlePropertyId?: number;
  groupByPropertyId?: number | null;
  filters?: any[];
}

interface Props {
  databaseId: number;
  viewConfig: TimelineViewConfig;
}

const WEEK_COUNT = 8;
const COL_WIDTH = 40;

export default function DatabaseTimelineView({ databaseId, viewConfig }: Props) {
  const [, navigate] = useLocation();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const datePropertyId = viewConfig.datePropertyId;

  const rangeStart = format(weekStart, "yyyy-MM-dd");
  const rangeEnd = format(addDays(weekStart, WEEK_COUNT * 7 - 1), "yyyy-MM-dd");

  const { data: database } = useQuery<any>({
    queryKey: ["pm-database", databaseId],
    queryFn: () => apiRequest("GET", `/api/pm-databases/${databaseId}`).then(r => r.json()),
  });

  const { data: rows = [] } = useQuery<any[]>({
    queryKey: ["pm-database-rows-timeline", databaseId, datePropertyId, rangeStart, rangeEnd],
    queryFn: () => apiRequest("GET", `/api/pm-databases/${databaseId}/rows/timeline?datePropertyId=${datePropertyId}&startDate=${rangeStart}&endDate=${rangeEnd}`).then(r => r.json()),
    enabled: !!datePropertyId,
  });

  const days: Date[] = [];
  for (let i = 0; i < WEEK_COUNT * 7; i++) days.push(addDays(weekStart, i));

  const getTitle = (row: any) => {
    const firstTextProp = database?.properties?.find((p: any) => p.type === "text");
    if (!firstTextProp) return "Untitled";
    const cell = row.cells?.find((c: any) => c.propertyId === firstTextProp.id);
    return (cell?.value as any)?.text || "Untitled";
  };

  const totalWidth = WEEK_COUNT * 7 * COL_WIDTH;

  const getBar = (row: any) => {
    if (!row.startDate) return null;
    const start = parseISO(row.startDate);
    const end = row.endDate ? parseISO(row.endDate) : start;
    const visStart = weekStart;
    const visEnd = addDays(weekStart, WEEK_COUNT * 7 - 1);
    const clampedStart = start < visStart ? visStart : start;
    const clampedEnd = end > visEnd ? visEnd : end;
    const leftDays = differenceInDays(clampedStart, visStart);
    const widthDays = differenceInDays(clampedEnd, clampedStart) + 1;
    return {
      left: leftDays * COL_WIDTH,
      width: Math.max(widthDays * COL_WIDTH, COL_WIDTH),
    };
  };

  if (!datePropertyId) return (
    <div className="p-8 text-center text-muted-foreground text-sm">
      Timeline view requires a date property. Add one in the database properties.
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 p-3 border-b border-border sticky left-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekStart(d => subWeeks(d, WEEK_COUNT))} data-testid="timeline-prev">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs font-medium">{format(weekStart, "MMM d")} – {format(addDays(weekStart, WEEK_COUNT * 7 - 1), "MMM d, yyyy")}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekStart(d => addWeeks(d, WEEK_COUNT))} data-testid="timeline-next">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setWeekStart(startOfWeek(new Date()))} data-testid="timeline-today">Today</Button>
      </div>
      <div className="flex">
        <div className="w-40 shrink-0 border-r border-border">
          <div className="h-8 border-b border-border bg-muted/20" />
          {rows.map((row: any) => (
            <div key={row.id} className="h-10 flex items-center px-2 border-b border-border text-xs truncate text-muted-foreground" data-testid={`timeline-row-label-${row.id}`}>
              {getTitle(row)}
            </div>
          ))}
        </div>
        <div className="overflow-x-auto flex-1">
          <div style={{ width: totalWidth }}>
            <div className="flex h-8 border-b border-border bg-muted/20">
              {days.map((d, i) => (
                <div key={i} style={{ width: COL_WIDTH }} className={cn("flex items-center justify-center text-[10px] text-muted-foreground border-r border-border/50 shrink-0", format(d, "d") === "1" && "font-semibold text-foreground")}>
                  {format(d, "d") === "1" || i === 0 ? format(d, "MMM d") : format(d, "d")}
                </div>
              ))}
            </div>
            {rows.map((row: any) => {
              const bar = getBar(row);
              return (
                <div key={row.id} className="relative h-10 border-b border-border flex">
                  {days.map((_, i) => (
                    <div key={i} style={{ width: COL_WIDTH }} className="shrink-0 border-r border-border/30 h-full" />
                  ))}
                  {bar && (
                    <div
                      className="absolute top-1.5 h-7 rounded bg-primary/70 hover:bg-primary transition-colors cursor-pointer flex items-center px-2"
                      style={{ left: bar.left, width: bar.width }}
                      onClick={() => { if (row.linkedPageId) navigate(`/dashboard/pm-editor/${row.linkedPageId}`); }}
                      data-testid={`timeline-bar-${row.id}`}
                    >
                      <span className="text-[10px] text-primary-foreground truncate">{getTitle(row)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
