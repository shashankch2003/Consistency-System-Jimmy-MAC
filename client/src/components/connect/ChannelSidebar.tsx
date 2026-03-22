import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Hash, Lock, Megaphone, Users, MessageSquare, Plus, ChevronDown, ChevronRight, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface Channel {
  id: string;
  name: string;
  displayName: string;
  type: string;
  icon?: string;
  isDefault: boolean;
  lastMessagePreview?: string;
  lastMessageAt?: string;
}

interface ChannelSidebarProps {
  workspaceId?: number;
  activeChannelId?: string;
  activeDmId?: string;
  onSelectChannel: (id: string) => void;
  onSelectDm: (id: string) => void;
  userId: string;
}

const channelIcon = (type: string) => {
  if (type === "private") return <Lock className="w-3.5 h-3.5" />;
  if (type === "announcement") return <Megaphone className="w-3.5 h-3.5" />;
  if (type === "team") return <Users className="w-3.5 h-3.5" />;
  return <Hash className="w-3.5 h-3.5" />;
};

export default function ChannelSidebar({ workspaceId, activeChannelId, activeDmId, onSelectChannel, onSelectDm, userId }: ChannelSidebarProps) {
  const { toast } = useToast();
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ["/api/connect/channels", workspaceId],
    queryFn: async () => {
      const url = workspaceId ? `/api/connect/channels?workspaceId=${workspaceId}` : "/api/connect/channels";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: conversations = [] } = useQuery<any[]>({
    queryKey: ["/api/connect/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/connect/conversations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createChannelMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/connect/channels", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connect/channels"] });
      setNewChannelOpen(false);
      setNewChannelName("");
      setNewChannelDesc("");
      toast({ title: "Channel created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    createChannelMutation.mutate({
      name: newChannelName.toLowerCase().replace(/\s+/g, "-"),
      displayName: newChannelName,
      description: newChannelDesc,
      type: "public",
      workspaceId,
    });
  };

  const filteredChannels = channels.filter(c =>
    c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#1a1d23] border-r border-white/[0.06] w-64 min-w-[240px] overflow-hidden">
      <div className="px-3 pt-4 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.06] text-white/50">
          <Search className="w-3.5 h-3.5 shrink-0" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search channels..."
            className="border-0 bg-transparent p-0 h-5 text-sm text-white placeholder:text-white/30 focus-visible:ring-0 focus-visible:ring-offset-0"
            data-testid="input-channel-search"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 space-y-1 px-2">
        <div>
          <button
            className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold text-white/40 uppercase tracking-wider hover:text-white/60 transition-colors"
            onClick={() => setChannelsOpen(!channelsOpen)}
            data-testid="button-toggle-channels"
          >
            {channelsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Channels
          </button>

          {channelsOpen && (
            <div className="mt-0.5 space-y-0.5">
              {filteredChannels.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  data-testid={`channel-item-${channel.id}`}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors group",
                    activeChannelId === channel.id
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:bg-white/[0.05] hover:text-white/80"
                  )}
                >
                  <span className="shrink-0 opacity-70">{channelIcon(channel.type)}</span>
                  <span className="truncate">{channel.displayName}</span>
                </button>
              ))}

              <Dialog open={newChannelOpen} onOpenChange={setNewChannelOpen}>
                <DialogTrigger asChild>
                  <button
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
                    data-testid="button-add-channel"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add channel
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-[#1e2128] border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle>Create a channel</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-sm text-white/60 mb-1 block">Name</label>
                      <Input
                        value={newChannelName}
                        onChange={e => setNewChannelName(e.target.value)}
                        placeholder="e.g. project-updates"
                        className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                        data-testid="input-channel-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-white/60 mb-1 block">Description (optional)</label>
                      <Input
                        value={newChannelDesc}
                        onChange={e => setNewChannelDesc(e.target.value)}
                        placeholder="What is this channel about?"
                        className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                        data-testid="input-channel-description"
                      />
                    </div>
                    <Button
                      onClick={handleCreateChannel}
                      disabled={createChannelMutation.isPending || !newChannelName.trim()}
                      className="w-full bg-violet-600 hover:bg-violet-700"
                      data-testid="button-create-channel"
                    >
                      {createChannelMutation.isPending ? "Creating..." : "Create Channel"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <div className="mt-4">
          <button
            className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold text-white/40 uppercase tracking-wider hover:text-white/60 transition-colors"
            onClick={() => setDmsOpen(!dmsOpen)}
            data-testid="button-toggle-dms"
          >
            {dmsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Direct Messages
          </button>

          {dmsOpen && (
            <div className="mt-0.5 space-y-0.5">
              {conversations.map(conv => {
                const otherIds = (conv.participantIds || []).filter((id: string) => id !== userId);
                const label = conv.name || `DM (${otherIds.length + 1})`;
                return (
                  <button
                    key={conv.id}
                    onClick={() => onSelectDm(conv.id)}
                    data-testid={`dm-item-${conv.id}`}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                      activeDmId === conv.id
                        ? "bg-white/10 text-white"
                        : "text-white/50 hover:bg-white/[0.05] hover:text-white/80"
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}

              {conversations.length === 0 && (
                <p className="px-2 py-2 text-xs text-white/30">No direct messages yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
