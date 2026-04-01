import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Loader2, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AppRow = { appName: string; appCategory: string; timeSpentMinutes: number; launchCount: number };

const TODAY = new Date().toISOString().split("T")[0];

const TEMPLATES: Record<string, AppRow[]> = {
  social: [
    { appName: "Instagram", appCategory: "distractive", timeSpentMinutes: 0, launchCount: 0 },
    { appName: "TikTok", appCategory: "distractive", timeSpentMinutes: 0, launchCount: 0 },
    { appName: "Twitter", appCategory: "distractive", timeSpentMinutes: 0, launchCount: 0 },
    { appName: "Facebook", appCategory: "distractive", timeSpentMinutes: 0, launchCount: 0 },
    { appName: "Snapchat", appCategory: "distractive", timeSpentMinutes: 0, launchCount: 0 },
  ],
  work: [
    { appName: "Slack", appCategory: "productive", timeSpentMinutes: 0, launchCount: 0 },
    { appName: "Email", appCategory: "productive", timeSpentMinutes: 0, launchCount: 0 },
    { appName: "Google Docs", appCategory: "productive", timeSpentMinutes: 0, launchCount: 0 },
    { appName: "Zoom", appCategory: "productive", timeSpentMinutes: 0, launchCount: 0 },
    { appName: "Calendar", appCategory: "productive", timeSpentMinutes: 0, launchCount: 0 },
  ],
  entertainment: [
    { appName: "YouTube", appCategory: "distractive", timeSpentMinutes: 0, launchCount: 0 },
    { appName: "Netflix", appCategory: "distractive", timeSpentMinutes: 0, launchCount: 0 },
    { appName: "Spotify", appCategory: "neutral", timeSpentMinutes: 0, launchCount: 0 },
    { appName: "Gaming", appCategory: "distractive", timeSpentMinutes: 0, launchCount: 0 },
  ],
};

const emptyRow = (): AppRow => ({ appName: "", appCategory: "distractive", timeSpentMinutes: 0, launchCount: 0 });

export default function DigitalFocusLog() {
  const qc = useQueryClient();
  const [date, setDate] = useState(TODAY);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [pickups, setPickups] = useState(0);
  const [notifications, setNotifications] = useState(0);
  const [appRows, setAppRows] = useState<AppRow[]>([emptyRow(), emptyRow(), emptyRow()]);

  const saveDailyMutation = useMutation({
    mutationFn: async () => {
      const totalScreenTimeMinutes = hours * 60 + minutes;
      return (await apiRequest("POST", "/api/focus-daily-logs", { totalScreenTimeMinutes, totalPickups: pickups, totalNotifications: notifications })).json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/focus-daily-logs/today"] });
      qc.invalidateQueries({ queryKey: ["/api/focus-daily-logs"] });
    },
  });

  const saveAppMutation = useMutation({
    mutationFn: async () => {
      const entries = appRows.filter((r) => r.appName.trim());
      if (entries.length === 0) throw new Error("Add at least one app.");
      return (await apiRequest("POST", "/api/focus-app-usage/bulk", { date, entries })).json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/focus-app-usage"] }),
  });

  const updateRow = (i: number, field: keyof AppRow, value: any) => {
    setAppRows((rows) => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const applyTemplate = (template: keyof typeof TEMPLATES) => {
    setAppRows(TEMPLATES[template].map((r) => ({ ...r })));
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6 text-blue-400" />
        <h1 className="text-2xl font-bold">Log Screen Time</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader><CardTitle className="text-sm">Daily Overview</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs mb-1 block">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
            </div>
            <div>
              <Label className="text-xs mb-2 block">Total Screen Time</Label>
              <div className="flex items-center gap-2">
                <Input type="number" value={hours} onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))} min={0} max={24} className="w-20" />
                <span className="text-sm text-muted-foreground">h</span>
                <Input type="number" value={minutes} onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} min={0} max={59} className="w-20" />
                <span className="text-sm text-muted-foreground">m</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs mb-1 block">Pickups</Label>
                <Input type="number" value={pickups} onChange={(e) => setPickups(Math.max(0, parseInt(e.target.value) || 0))} min={0} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Notifications</Label>
                <Input type="number" value={notifications} onChange={(e) => setNotifications(Math.max(0, parseInt(e.target.value) || 0))} min={0} />
              </div>
            </div>
            <Button
              data-testid="save-daily-log"
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => saveDailyMutation.mutate()}
              disabled={saveDailyMutation.isPending}
            >
              {saveDailyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Daily Log
            </Button>
            {saveDailyMutation.isSuccess && <p className="text-xs text-green-400 text-center">Saved!</p>}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">App Usage Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium px-1">
              <span className="col-span-1">App Name</span>
              <span>Category</span>
              <span>Min</span>
              <span>Launches</span>
            </div>
            {appRows.map((row, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-center">
                <Input
                  value={row.appName}
                  onChange={(e) => updateRow(i, "appName", e.target.value)}
                  placeholder="App name"
                  className="col-span-1 text-sm h-8"
                />
                <Select value={row.appCategory} onValueChange={(v) => updateRow(i, "appCategory", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distractive">Distractive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="productive">Productive</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={row.timeSpentMinutes}
                  onChange={(e) => updateRow(i, "timeSpentMinutes", Math.max(0, parseInt(e.target.value) || 0))}
                  min={0}
                  className="h-8 text-sm"
                />
                <Input
                  type="number"
                  value={row.launchCount}
                  onChange={(e) => updateRow(i, "launchCount", Math.max(0, parseInt(e.target.value) || 0))}
                  min={0}
                  className="h-8 text-sm"
                />
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAppRows((rows) => [...rows, emptyRow()])}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add another app
            </Button>
            <Button
              data-testid="save-app-usage"
              className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
              onClick={() => saveAppMutation.mutate()}
              disabled={saveAppMutation.isPending}
            >
              {saveAppMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save App Usage
            </Button>
            {saveAppMutation.isSuccess && <p className="text-xs text-green-400 text-center">Saved!</p>}
            {saveAppMutation.isError && <p className="text-xs text-red-400 text-center">{(saveAppMutation.error as Error)?.message}</p>}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader><CardTitle className="text-sm">Quick Templates</CardTitle></CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => applyTemplate("social")} className="text-xs">
              📱 Social Media Pack
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyTemplate("work")} className="text-xs">
              💼 Work Pack
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyTemplate("entertainment")} className="text-xs">
              🎬 Entertainment Pack
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
