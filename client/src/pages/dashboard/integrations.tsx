import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plug, Plus, RefreshCw, X, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Integration = { id: number; type: string; displayName: string; syncStatus: string; syncEnabled: boolean; lastSyncAt?: string };

const INTEGRATION_TYPES: Record<string, { label: string; color: string; icon: string }> = {
  google_drive: { label: "Google Drive", color: "text-yellow-400", icon: "🗂️" },
  github: { label: "GitHub", color: "text-white", icon: "🐙" },
  gitlab: { label: "GitLab", color: "text-orange-400", icon: "🦊" },
  jira: { label: "Jira", color: "text-blue-400", icon: "🎯" },
  linear: { label: "Linear", color: "text-purple-400", icon: "🔷" },
  slack: { label: "Slack", color: "text-green-400", icon: "💬" },
  figma: { label: "Figma", color: "text-pink-400", icon: "🎨" },
  confluence: { label: "Confluence", color: "text-blue-300", icon: "📝" },
};

const STATUS_CONFIG: Record<string, { color: string; icon: any }> = {
  connected: { color: "bg-green-500/20 text-green-400", icon: CheckCircle },
  syncing: { color: "bg-blue-500/20 text-blue-400", icon: RefreshCw },
  disconnected: { color: "bg-gray-500/20 text-gray-400", icon: X },
  error: { color: "bg-red-500/20 text-red-400", icon: X },
};

export default function IntegrationsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectForm, setConnectForm] = useState({ type: "github", displayName: "", accessToken: "", scopes: "read" });

  const { data: integrations = [], isLoading } = useQuery<Integration[]>({
    queryKey: ["/api/integrations"],
  });

  const connect = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/integrations", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/integrations"] }); setConnectOpen(false); toast({ title: "Integration connected!" }); }
  });

  const disconnect = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/integrations/${id}/disconnect`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/integrations"] }); toast({ title: "Integration disconnected" }); }
  });

  const sync = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/integrations/${id}/sync`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/integrations"] }); toast({ title: "Sync started" }); }
  });

  const availableTypes = Object.entries(INTEGRATION_TYPES).filter(([type]) => !integrations.some(i => i.type === type && i.syncEnabled));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Plug className="w-7 h-7 text-violet-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Integration Hub</h1>
            <p className="text-sm text-gray-400">Connect your tools and sync data automatically</p>
          </div>
        </div>
        <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
          <DialogTrigger asChild>
            <Button className="bg-violet-600 hover:bg-violet-700" data-testid="button-connect"><Plus className="w-4 h-4 mr-2" />Connect</Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 text-white">
            <DialogHeader><DialogTitle>Connect Integration</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={connectForm.type} onValueChange={v => setConnectForm(f => ({ ...f, type: v, displayName: INTEGRATION_TYPES[v]?.label || v }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-integration-type"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {Object.entries(INTEGRATION_TYPES).map(([type, { label, icon }]) => (
                    <SelectItem key={type} value={type}>{icon} {label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Display name" value={connectForm.displayName || INTEGRATION_TYPES[connectForm.type]?.label} onChange={e => setConnectForm(f => ({ ...f, displayName: e.target.value }))} className="bg-gray-800 border-gray-700" data-testid="input-display-name" />
              <Input placeholder="Access token" type="password" value={connectForm.accessToken} onChange={e => setConnectForm(f => ({ ...f, accessToken: e.target.value }))} className="bg-gray-800 border-gray-700" data-testid="input-access-token" />
              <Button onClick={() => connect.mutate({ type: connectForm.type, displayName: connectForm.displayName || INTEGRATION_TYPES[connectForm.type]?.label, accessToken: connectForm.accessToken, scopes: [connectForm.scopes] })} disabled={!connectForm.accessToken || connect.isPending} className="w-full bg-violet-600 hover:bg-violet-700" data-testid="button-submit-connect">{connect.isPending ? "Connecting..." : "Connect"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-800"><CardContent className="pt-4"><p className="text-gray-400 text-sm">Connected</p><p className="text-2xl font-bold text-white">{integrations.filter(i => i.syncEnabled).length}</p></CardContent></Card>
        <Card className="bg-gray-900 border-gray-800"><CardContent className="pt-4"><p className="text-gray-400 text-sm">Available</p><p className="text-2xl font-bold text-white">{Object.keys(INTEGRATION_TYPES).length}</p></CardContent></Card>
        <Card className="bg-gray-900 border-gray-800"><CardContent className="pt-4"><p className="text-gray-400 text-sm">Syncing</p><p className="text-2xl font-bold text-blue-400">{integrations.filter(i => i.syncStatus === "syncing").length}</p></CardContent></Card>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-36 rounded-xl bg-gray-800/50 animate-pulse" />)}</div>
      ) : integrations.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Connected Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map(int => {
              const config = INTEGRATION_TYPES[int.type] || { label: int.type, color: "text-gray-400", icon: "🔌" };
              const status = STATUS_CONFIG[int.syncStatus] || STATUS_CONFIG.disconnected;
              const StatusIcon = status.icon;
              return (
                <Card key={int.id} className="bg-gray-900 border-gray-800" data-testid={`card-integration-${int.id}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{config.icon}</span>
                        <div>
                          <p className={`font-medium text-sm ${config.color}`}>{int.displayName}</p>
                          <p className="text-xs text-gray-500">{int.type.replace("_", " ")}</p>
                          {int.lastSyncAt && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />Last sync: {new Date(int.lastSyncAt).toLocaleString()}</p>}
                        </div>
                      </div>
                      <Badge className={status.color} data-testid={`badge-status-${int.id}`}><StatusIcon className="w-3 h-3 mr-1" />{int.syncStatus}</Badge>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {int.syncEnabled && (
                        <Button size="sm" variant="ghost" onClick={() => sync.mutate(int.id)} disabled={sync.isPending} className="text-xs text-blue-400 hover:bg-blue-900/20" data-testid={`button-sync-${int.id}`}><RefreshCw className="w-3 h-3 mr-1" />Sync</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => disconnect.mutate(int.id)} disabled={disconnect.isPending} className="text-xs text-red-400 hover:bg-red-900/20" data-testid={`button-disconnect-${int.id}`}><X className="w-3 h-3 mr-1" />Disconnect</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-3">Available Integrations</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(INTEGRATION_TYPES).map(([type, { label, color, icon }]) => {
            const isConnected = integrations.some(i => i.type === type && i.syncEnabled);
            return (
              <Card key={type} className={`bg-gray-900 border-gray-800 cursor-pointer hover:border-violet-700/50 transition-colors ${isConnected ? "opacity-50" : ""}`} onClick={() => { if (!isConnected) { setConnectForm(f => ({ ...f, type, displayName: label })); setConnectOpen(true); } }} data-testid={`card-available-${type}`}>
                <CardContent className="pt-4 pb-3 text-center">
                  <span className="text-3xl">{icon}</span>
                  <p className={`text-sm font-medium mt-2 ${color}`}>{label}</p>
                  {isConnected ? <Badge className="mt-1 bg-green-500/20 text-green-400 text-xs">Connected</Badge> : <p className="text-xs text-gray-500 mt-1">Click to connect</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
