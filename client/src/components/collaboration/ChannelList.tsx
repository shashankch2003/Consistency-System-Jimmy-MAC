import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Hash, Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Channel {
  id: number;
  name: string;
  type: string;
  projectId?: number;
  workspaceId?: number;
}

interface ChannelListProps {
  workspaceId: number;
  activeChannelId: number | null;
  onSelectChannel: (channel: Channel) => void;
}

export function ChannelList({ workspaceId, activeChannelId, onSelectChannel }: ChannelListProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { toast } = useToast();

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ["/api/channels", workspaceId],
    queryFn: () => fetch(`/api/channels?workspaceId=${workspaceId}`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  const mutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/channels", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels", workspaceId] });
      setName("");
      setOpen(false);
    },
    onError: () => toast({ title: "Failed to create channel", variant: "destructive" }),
  });

  const team = channels.filter((c) => c.type === "team");
  const project = channels.filter((c) => c.type === "project");

  const ChannelItem = ({ channel }: { channel: Channel }) => (
    <button
      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
        activeChannelId === channel.id
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
      }`}
      onClick={() => onSelectChannel(channel)}
      data-testid={`channel-item-${channel.id}`}
    >
      <Hash className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{channel.name.replace(/^#/, "")}</span>
    </button>
  );

  return (
    <div className="w-56 shrink-0 border-r border-border flex flex-col" data-testid="channel-list">
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Messages</span>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="button-new-channel">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Channel</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <Input
                placeholder="channel-name"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                data-testid="input-channel-name"
              />
              <Button
                className="w-full"
                onClick={() => mutation.mutate({ workspaceId, name: `#${name}`, type: "team" })}
                disabled={!name.trim() || mutation.isPending}
                data-testid="button-create-channel"
              >
                Create Channel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {team.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 mb-1">Team</p>
            {team.map((c) => <ChannelItem key={c.id} channel={c} />)}
          </div>
        )}
        {project.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 mb-1">Projects</p>
            {project.map((c) => <ChannelItem key={c.id} channel={c} />)}
          </div>
        )}
        {channels.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8 px-3">
            No channels yet. Create one to start messaging.
          </p>
        )}
      </div>
    </div>
  );
}
