import { Ban, Clock, Plus, Smartphone, Globe, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const suggestions = [
  { name: "Instagram", icon: "📸", category: "Social" },
  { name: "YouTube", icon: "▶️", category: "Entertainment" },
  { name: "Twitter / X", icon: "𝕏", category: "Social" },
  { name: "TikTok", icon: "🎵", category: "Social" },
  { name: "Reddit", icon: "🤖", category: "Social" },
  { name: "Netflix", icon: "🎬", category: "Entertainment" },
];

export default function AppBlockPage() {
  const [blockedApps, setBlockedApps] = useState<{ name: string; icon: string; until?: string }[]>([]);
  const [newApp, setNewApp] = useState("");

  const addApp = (name: string, icon = "🚫") => {
    if (!name.trim() || blockedApps.find(a => a.name.toLowerCase() === name.toLowerCase())) return;
    setBlockedApps(prev => [...prev, { name: name.trim(), icon }]);
    setNewApp("");
  };

  const removeApp = (name: string) => {
    setBlockedApps(prev => prev.filter(a => a.name !== name));
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Ban className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">App Block</h1>
            <p className="text-sm text-muted-foreground">Block distracting apps and stay focused</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Add App to Block</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="App or website name..."
            value={newApp}
            onChange={e => setNewApp(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addApp(newApp)}
          />
          <Button size="sm" className="gap-1.5" onClick={() => addApp(newApp)}>
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>

        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">Quick add:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.filter(s => !blockedApps.find(b => b.name === s.name)).map(s => (
              <button
                key={s.name}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs hover:border-primary/50 hover:bg-muted transition-colors"
                onClick={() => addApp(s.name, s.icon)}
              >
                <span>{s.icon}</span> {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Blocked Apps
            {blockedApps.length > 0 && (
              <span className="ml-2 bg-red-500/10 text-red-500 text-xs px-2 py-0.5 rounded-full">{blockedApps.length}</span>
            )}
          </h2>
        </div>

        {blockedApps.length === 0 ? (
          <div className="py-12 text-center">
            <Smartphone className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No apps blocked yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Add apps above to block them during focus time</p>
          </div>
        ) : (
          <div className="space-y-2">
            {blockedApps.map(app => (
              <div
                key={app.name}
                className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10"
              >
                <span className="text-xl">{app.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{app.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Blocked during focus sessions
                  </p>
                </div>
                <button
                  className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded"
                  onClick={() => removeApp(app.name)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 p-4 rounded-xl border border-border/50 bg-muted/30 text-xs text-muted-foreground flex items-start gap-2">
        <Globe className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>Full browser extension and mobile integration coming soon. For now, use this as your personal commitment tracker — list what you're choosing to avoid during your focus time.</span>
      </div>
    </div>
  );
}
