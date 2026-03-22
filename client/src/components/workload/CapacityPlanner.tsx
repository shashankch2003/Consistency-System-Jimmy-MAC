import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkloadMember {
  id: number;
  userId: string | null;
  displayName: string | null;
  email: string;
  weeklyCapacityHours: number | null;
  totalMinutes: number;
}

interface Availability {
  id: number;
  userId: string;
  date: string;
  type: string;
  notes: string | null;
}

interface CapacityPlannerProps {
  members: WorkloadMember[];
}

function getWeekDates(monday: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmt(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const TYPE_COLOR: Record<string, string> = {
  pto: "bg-blue-500/30 border-blue-500/50 text-blue-300",
  holiday: "bg-green-500/30 border-green-500/50 text-green-300",
  sick: "bg-red-500/30 border-red-500/50 text-red-300",
};

const LOAD_COLOR = (pct: number) => {
  if (pct === 0) return "bg-muted/30";
  if (pct > 100) return "bg-red-500/40";
  if (pct >= 80) return "bg-orange-500/40";
  return "bg-green-500/30";
};

export function CapacityPlanner({ members }: CapacityPlannerProps) {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [monday, setMonday] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return d;
  });

  const [addModal, setAddModal] = useState<{ open: boolean; userId: string; date: string }>({
    open: false, userId: "", date: "",
  });
  const [ptoType, setPtoType] = useState<string>("pto");
  const [ptoNotes, setPtoNotes] = useState("");

  // 4 weeks of dates
  const weeks = Array.from({ length: 4 }, (_, w) => {
    const m = new Date(monday);
    m.setDate(monday.getDate() + w * 7);
    return getWeekDates(m);
  });
  const allDates = weeks.flat();
  const dateFrom = fmt(allDates[0]);
  const dateTo = fmt(allDates[allDates.length - 1]);

  const { data: availability = [] } = useQuery<Availability[]>({
    queryKey: ["/api/member-availability", workspaceId, dateFrom, dateTo],
    queryFn: () => fetch(`/api/member-availability?workspaceId=${workspaceId}&dateFrom=${dateFrom}&dateTo=${dateTo}`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  const createAvailability = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/member-availability", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member-availability"] });
      setAddModal({ open: false, userId: "", date: "" });
      setPtoNotes("");
      toast({ title: "PTO recorded" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const deleteAvailability = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/member-availability/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/member-availability"] }),
  });

  const getAvailabilityFor = (userId: string | null, date: string) => {
    if (!userId) return null;
    return availability.find((a) => a.userId === userId && a.date === date);
  };

  const getDailyMinutes = (member: WorkloadMember, date: Date) => {
    const dateStr = fmt(date);
    const isOff = member.userId ? !!getAvailabilityFor(member.userId, dateStr) : false;
    if (isOff) return 0;
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 0;
    return ((member.weeklyCapacityHours || 40) / 5) * 60;
  };

  const getDailyCommitted = (member: WorkloadMember) => {
    return (member.totalMinutes || 0) / 5;
  };

  // Summary stats
  const totalAvailableHours = members.reduce((sum, m) => {
    const workDays = allDates.filter((d) => {
      const day = d.getDay();
      if (day === 0 || day === 6) return false;
      const dateStr = fmt(d);
      return !getAvailabilityFor(m.userId, dateStr);
    }).length;
    return sum + workDays * ((m.weeklyCapacityHours || 40) / 5);
  }, 0);

  const totalCommittedHours = members.reduce((sum, m) => sum + (m.totalMinutes || 0) / 60, 0);

  return (
    <div className="space-y-4" data-testid="capacity-planner">
      {/* Summary */}
      <div className="flex gap-6 p-4 bg-card border border-border rounded-xl">
        <div>
          <p className="text-xs text-muted-foreground">Team Available Hours</p>
          <p className="text-2xl font-bold text-green-400">{Math.round(totalAvailableHours)}h</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Team Committed</p>
          <p className="text-2xl font-bold text-blue-400">{Math.round(totalCommittedHours)}h</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Utilization</p>
          <p className="text-2xl font-bold text-primary">
            {totalAvailableHours > 0 ? Math.round((totalCommittedHours / totalAvailableHours) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => { const d = new Date(monday); d.setDate(d.getDate() - 7); setMonday(d); }}>← Prev</Button>
        <span className="text-sm font-medium">
          {fmt(allDates[0])} — {fmt(allDates[allDates.length - 1])}
        </span>
        <Button variant="outline" size="sm" onClick={() => { const d = new Date(monday); d.setDate(d.getDate() + 7); setMonday(d); }}>Next →</Button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="w-40 text-left px-3 py-2 text-muted-foreground font-medium border-b border-border">Member</th>
              {weeks.map((week, wi) =>
                week.map((date, di) => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <th
                      key={`${wi}-${di}`}
                      className={`w-10 text-center px-1 py-1 border-b border-border ${isWeekend ? "text-muted-foreground/40" : "text-muted-foreground"} ${di === 0 && wi > 0 ? "border-l-2 border-l-border/60" : ""}`}
                    >
                      <div>{["Su","Mo","Tu","We","Th","Fr","Sa"][date.getDay()]}</div>
                      <div className="text-[10px] opacity-60">{date.getDate()}</div>
                    </th>
                  );
                })
              )}
              <th className="w-16 text-center px-2 py-2 text-muted-foreground font-medium border-b border-border">PTO</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b border-border/30 hover:bg-muted/10">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-primary/10">{initials(member.displayName || member.email)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[90px]">{member.displayName || member.email.split("@")[0]}</span>
                  </div>
                </td>
                {weeks.map((week, wi) =>
                  week.map((date, di) => {
                    const dateStr = fmt(date);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const avail = getAvailabilityFor(member.userId, dateStr);
                    const dailyCapMin = getDailyMinutes(member, date);
                    const dailyCommMin = getDailyCommitted(member);
                    const loadPct = dailyCapMin > 0 ? Math.round((dailyCommMin / dailyCapMin) * 100) : 0;

                    return (
                      <td
                        key={`${wi}-${di}`}
                        className={`px-0.5 py-1 text-center ${di === 0 && wi > 0 ? "border-l-2 border-l-border/60" : ""}`}
                        onClick={() => {
                          if (!isWeekend && member.userId && !avail) {
                            setAddModal({ open: true, userId: member.userId, date: dateStr });
                          }
                        }}
                      >
                        {avail ? (
                          <div
                            className={`h-7 w-8 rounded-sm flex items-center justify-center border text-[9px] font-medium cursor-pointer mx-auto ${TYPE_COLOR[avail.type] || "bg-muted/40"}`}
                            title={avail.type.toUpperCase() + (avail.notes ? `: ${avail.notes}` : "")}
                            onClick={(e) => { e.stopPropagation(); deleteAvailability.mutate(avail.id); }}
                          >
                            {avail.type.slice(0, 1).toUpperCase()}
                          </div>
                        ) : (
                          <div
                            className={`h-7 w-8 rounded-sm mx-auto ${isWeekend ? "bg-muted/10 cursor-default" : `${LOAD_COLOR(loadPct)} cursor-pointer hover:ring-1 hover:ring-primary/40`}`}
                            title={isWeekend ? "Weekend" : `${Math.round(dailyCapMin / 60)}h capacity · ${Math.round(dailyCommMin / 60)}h committed`}
                          />
                        )}
                      </td>
                    );
                  })
                )}
                <td className="px-2 py-1 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => member.userId && setAddModal({ open: true, userId: member.userId, date: fmt(new Date()) })}
                    data-testid={`button-add-pto-${member.id}`}
                    title="Add PTO"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded-sm bg-green-500/30" />Available</div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded-sm bg-orange-500/40" />High Load</div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded-sm bg-red-500/40" />Overloaded</div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded-sm bg-blue-500/30 border border-blue-500/50" />PTO</div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded-sm bg-green-500/30 border border-green-500/50" />Holiday</div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded-sm bg-red-500/30 border border-red-500/50" />Sick</div>
      </div>

      {/* Add PTO Modal */}
      <Dialog open={addModal.open} onOpenChange={(o) => !o && setAddModal({ open: false, userId: "", date: "" })}>
        <DialogContent data-testid="pto-modal">
          <DialogHeader><DialogTitle>Add Time Off</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Date</Label>
              <Input
                type="date"
                value={addModal.date}
                onChange={(e) => setAddModal((s) => ({ ...s, date: e.target.value }))}
                className="mt-1"
                data-testid="input-pto-date"
              />
            </div>
            <div>
              <Label className="text-sm">Type</Label>
              <Select value={ptoType} onValueChange={setPtoType}>
                <SelectTrigger className="mt-1" data-testid="select-pto-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pto">PTO</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Notes (optional)</Label>
              <Input
                value={ptoNotes}
                onChange={(e) => setPtoNotes(e.target.value)}
                placeholder="Vacation, etc."
                className="mt-1"
                data-testid="input-pto-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddModal({ open: false, userId: "", date: "" })}>Cancel</Button>
            <Button
              onClick={() => createAvailability.mutate({
                userId: addModal.userId,
                date: addModal.date,
                type: ptoType,
                notes: ptoNotes || null,
                workspaceId,
              })}
              disabled={!addModal.date || createAvailability.isPending}
              data-testid="button-save-pto"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
