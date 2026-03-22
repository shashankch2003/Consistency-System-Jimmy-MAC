import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Clock, Users, Shield, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CalendarRule = { id: number; ruleType: string; config: any; scope: string; isActive: boolean };
type MeetingSlot = { date: string; startTime: string; endTime: string; score: number; reason: string };

const RULE_ICONS: Record<string, any> = { no_meeting_window: Shield, buffer_time: Clock, meeting_defrag: Zap, focus_protection: Users };
const RULE_LABELS: Record<string, string> = { no_meeting_window: "No Meeting Window", buffer_time: "Buffer Time", meeting_defrag: "Meeting Defrag", focus_protection: "Focus Protection" };

export default function CalendarOptimizerPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [findOpen, setFindOpen] = useState(false);
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [meetingSlots, setMeetingSlots] = useState<MeetingSlot[]>([]);
  const [findLoading, setFindLoading] = useState(false);
  const [findForm, setFindForm] = useState({ participantIds: "", durationMinutes: 60, start: "", end: "", preferMorning: false });
  const [ruleForm, setRuleForm] = useState({ ruleType: "no_meeting_window", scope: "individual", configDesc: "" });

  const { data: rules = [], isLoading } = useQuery<CalendarRule[]>({ queryKey: ["/api/calendar/rules"] });
  const { data: events = [] } = useQuery<any[]>({ queryKey: ["/api/calendar/events"] });

  const createRule = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/calendar/rules", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/calendar/rules"] }); setAddRuleOpen(false); toast({ title: "Rule created" }); }
  });

  const createEvent = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/calendar/events", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/calendar/events"] }); toast({ title: "Event added" }); }
  });

  const findMeetingTime = async () => {
    setFindLoading(true);
    try {
      const ids = findForm.participantIds.split(",").map(s => s.trim()).filter(Boolean);
      if (ids.length === 0) { toast({ title: "Enter at least one participant ID", variant: "destructive" }); return; }
      const res = await apiRequest("POST", "/api/calendar/find-meeting-time", {
        participantIds: ids,
        durationMinutes: findForm.durationMinutes,
        dateRange: { start: findForm.start, end: findForm.end },
        preferMorning: findForm.preferMorning,
      });
      const data = await res.json();
      setMeetingSlots(data.suggestions || []);
      setFindOpen(false);
    } catch { toast({ title: "Failed to find meeting times", variant: "destructive" }); }
    finally { setFindLoading(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-7 h-7 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Calendar Optimizer</h1>
            <p className="text-sm text-gray-400">AI-powered meeting scheduling and calendar rules</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Dialog open={findOpen} onOpenChange={setFindOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-blue-700 text-blue-400 hover:bg-blue-900/20" data-testid="button-find-time"><Users className="w-4 h-4 mr-2" />Find Meeting Time</Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white">
              <DialogHeader><DialogTitle>Find Best Meeting Time</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><label className="text-xs text-gray-400 mb-1 block">Participant IDs (comma-separated)</label>
                  <Input placeholder="user1, user2, user3" value={findForm.participantIds} onChange={e => setFindForm(f => ({ ...f, participantIds: e.target.value }))} className="bg-gray-800 border-gray-700" data-testid="input-participants" /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Duration (minutes)</label>
                  <Input type="number" value={findForm.durationMinutes} onChange={e => setFindForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} className="bg-gray-800 border-gray-700" data-testid="input-duration" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-400 mb-1 block">Start Date</label><Input type="date" value={findForm.start} onChange={e => setFindForm(f => ({ ...f, start: e.target.value }))} className="bg-gray-800 border-gray-700" data-testid="input-start" /></div>
                  <div><label className="text-xs text-gray-400 mb-1 block">End Date</label><Input type="date" value={findForm.end} onChange={e => setFindForm(f => ({ ...f, end: e.target.value }))} className="bg-gray-800 border-gray-700" data-testid="input-end" /></div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={findForm.preferMorning} onChange={e => setFindForm(f => ({ ...f, preferMorning: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-gray-300">Prefer morning slots</span>
                </label>
                <Button onClick={findMeetingTime} disabled={findLoading} className="w-full bg-blue-600 hover:bg-blue-700" data-testid="button-submit-find">{findLoading ? "Searching..." : "Find Best Times"}</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={addRuleOpen} onOpenChange={setAddRuleOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-rule"><Plus className="w-4 h-4 mr-2" />Add Rule</Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white">
              <DialogHeader><DialogTitle>Create Optimization Rule</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Select value={ruleForm.ruleType} onValueChange={v => setRuleForm(f => ({ ...f, ruleType: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-rule-type"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="no_meeting_window">No Meeting Window</SelectItem>
                    <SelectItem value="buffer_time">Buffer Time</SelectItem>
                    <SelectItem value="meeting_defrag">Meeting Defrag</SelectItem>
                    <SelectItem value="focus_protection">Focus Protection</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ruleForm.scope} onValueChange={v => setRuleForm(f => ({ ...f, scope: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="workspace">Workspace</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Description (e.g. No meetings Wednesday 10-12)" value={ruleForm.configDesc} onChange={e => setRuleForm(f => ({ ...f, configDesc: e.target.value }))} className="bg-gray-800 border-gray-700" data-testid="input-rule-desc" />
                <Button onClick={() => createRule.mutate({ ruleType: ruleForm.ruleType, scope: ruleForm.scope, config: { description: ruleForm.configDesc } })} disabled={createRule.isPending} className="w-full bg-blue-600 hover:bg-blue-700" data-testid="button-submit-rule">{createRule.isPending ? "Saving..." : "Create Rule"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {meetingSlots.length > 0 && (
        <Card className="bg-gray-900 border-blue-700/30">
          <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><Zap className="w-4 h-4 text-blue-400" />Best Meeting Times</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {meetingSlots.map((slot, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3" data-testid={`card-slot-${i}`}>
                <div>
                  <p className="text-white text-sm font-medium">{slot.date} — {slot.startTime} to {slot.endTime}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{slot.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                    <span className="text-blue-400 text-sm font-bold" data-testid={`text-score-${i}`}>{slot.score}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><Shield className="w-4 h-4 text-blue-400" />Active Rules</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-12 rounded bg-gray-800/50 animate-pulse" />)}</div>
              : rules.length === 0 ? <p className="text-gray-500 text-sm">No optimization rules yet.</p>
              : (
                <div className="space-y-2">
                  {rules.map(rule => {
                    const Icon = RULE_ICONS[rule.ruleType] || Shield;
                    return (
                      <div key={rule.id} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3" data-testid={`card-rule-${rule.id}`}>
                        <Icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-white">{RULE_LABELS[rule.ruleType] || rule.ruleType}</p>
                          <p className="text-xs text-gray-400">{rule.config?.description || rule.scope}</p>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400 text-xs">Active</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-base flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" />Calendar Events</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => createEvent.mutate({ title: "New Event", startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString() })} className="text-blue-400 hover:bg-blue-900/20 text-xs" data-testid="button-add-event"><Plus className="w-3 h-3 mr-1" />Add</Button>
            </div>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? <p className="text-gray-500 text-sm">No events in calendar. Events created will appear here.</p>
              : (
                <div className="space-y-2">
                  {events.slice(0, 8).map((ev: any) => (
                    <div key={ev.id} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-2" data-testid={`card-event-${ev.id}`}>
                      <Clock className="w-3 h-3 text-blue-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-white">{ev.title || "Untitled Event"}</p>
                        {ev.startTime && <p className="text-xs text-gray-400">{new Date(ev.startTime).toLocaleString()}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
