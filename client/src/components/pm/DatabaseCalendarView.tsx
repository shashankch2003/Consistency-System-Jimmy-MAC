import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, getDay } from "date-fns";
import { cn } from "@/lib/utils";

export interface CalendarViewConfig {
  datePropertyId?: number;
  titlePropertyId?: number;
  visiblePropertyIds?: number[];
  filters?: any[];
}

interface Props {
  databaseId: number;
  viewConfig: CalendarViewConfig;
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PILL_COLORS = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500"];

export default function DatabaseCalendarView({ databaseId, viewConfig }: Props) {
  const [, navigate] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const datePropertyId = viewConfig.datePropertyId;
  const month = format(currentDate, "yyyy-MM");

  const { data: database } = useQuery<any>({
    queryKey: ["pm-database", databaseId],
    queryFn: () => apiRequest("GET", `/api/pm-databases/${databaseId}`).then(r => r.json()),
  });

  const { data: calData } = useQuery<any>({
    queryKey: ["pm-database-rows-calendar", databaseId, datePropertyId, month],
    queryFn: () => apiRequest("GET", `/api/pm-databases/${databaseId}/rows/calendar?datePropertyId=${datePropertyId}&month=${month}`).then(r => r.json()),
    enabled: !!datePropertyId,
  });

  const createRow = useMutation({
    mutationFn: (body: any) => apiRequest("POST", `/api/pm-databases/${databaseId}/rows`, body).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-database-rows-calendar", databaseId] }),
  });

  const rows: any[] = calData?.rows || [];

  const getTitle = (row: any) => {
    const firstTextProp = database?.properties?.find((p: any) => p.type === "text");
    if (!firstTextProp) return "Untitled";
    const cell = row.cells?.find((c: any) => c.propertyId === firstTextProp.id);
    return (cell?.value as any)?.text || "Untitled";
  };

  const getRowsForDay = (dateStr: string) => rows.filter(r => r.dateValue === dateStr);

  const handleDayClick = (dateStr: string) => {
    if (!datePropertyId) return;
    createRow.mutate({ cells: [{ propertyId: datePropertyId, value: { start: dateStr } }] });
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  return (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentDate(d => subMonths(d, 1))} data-testid="cal-prev">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold flex-1 text-center">{format(currentDate, "MMMM yyyy")}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentDate(d => addMonths(d, 1))} data-testid="cal-next">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCurrentDate(new Date())} data-testid="cal-today">
          Today
        </Button>
      </div>

      <div className="grid grid-cols-7 border-l border-t border-border rounded-lg overflow-hidden">
        {DAY_HEADERS.map(h => (
          <div key={h} className="border-r border-b border-border px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground bg-muted/30">
            {h}
          </div>
        ))}
        {days.map((d, i) => {
          const dateStr = format(d, "yyyy-MM-dd");
          const dayRows = getRowsForDay(dateStr);
          const isCurrentMonth = isSameMonth(d, currentDate);
          const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
          return (
            <div
              key={i}
              className={cn("border-r border-b border-border min-h-[80px] p-1.5 cursor-pointer hover:bg-muted/20 transition-colors", !isCurrentMonth && "opacity-40")}
              onClick={() => handleDayClick(dateStr)}
              data-testid={`cal-day-${dateStr}`}
            >
              <div className={cn("text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full", isToday && "bg-primary text-primary-foreground")}>
                {format(d, "d")}
              </div>
              <div className="space-y-0.5">
                {dayRows.slice(0, 3).map((row: any, idx: number) => (
                  <div
                    key={row.id}
                    className={cn("text-[10px] px-1.5 py-0.5 rounded text-white truncate cursor-pointer", PILL_COLORS[idx % PILL_COLORS.length])}
                    onClick={e => { e.stopPropagation(); if (row.linkedPageId) navigate(`/dashboard/pm-editor/${row.linkedPageId}`); }}
                    data-testid={`cal-pill-${row.id}`}
                  >
                    {getTitle(row)}
                  </div>
                ))}
                {dayRows.length > 3 && (
                  <div className="text-[10px] text-muted-foreground pl-1">+{dayRows.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
