import { useState } from "react";
import { MessageSquarePlus, Hash } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import ChannelSidebar from "@/components/connect/ChannelSidebar";
import ChannelView from "@/components/connect/ChannelView";

export default function ConnectPage() {
  const { user } = useAuth();
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeDmId, setActiveDmId] = useState<string | null>(null);

  const currentUserId = (user as any)?.claims?.sub || "";
  const firstName = (user as any)?.claims?.first_name || "";
  const lastName = (user as any)?.claims?.last_name || "";
  const currentUserName = [firstName, lastName].filter(Boolean).join(" ") || currentUserId;

  const handleSelectChannel = (id: string) => {
    setActiveChannelId(id);
    setActiveDmId(null);
  };

  const handleSelectDm = (id: string) => {
    setActiveDmId(id);
    setActiveChannelId(null);
  };

  return (
    <div className="flex h-full bg-[#16181e]" data-testid="connect-page">
      <ChannelSidebar
        activeChannelId={activeChannelId || undefined}
        activeDmId={activeDmId || undefined}
        onSelectChannel={handleSelectChannel}
        onSelectDm={handleSelectDm}
        userId={currentUserId}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeChannelId ? (
          <ChannelView
            channelId={activeChannelId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />
        ) : activeDmId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquarePlus className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">Direct message view coming soon</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-8">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-5">
                <Hash className="w-8 h-8 text-violet-400" />
              </div>
              <h2 className="text-white text-xl font-semibold mb-2">Welcome to Connect</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                Select a channel from the sidebar to start messaging your team, or create a new channel to begin collaborating.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
