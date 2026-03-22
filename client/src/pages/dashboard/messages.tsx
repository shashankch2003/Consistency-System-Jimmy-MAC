import { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { ChannelList } from "@/components/collaboration/ChannelList";
import { ChatWindow } from "@/components/collaboration/ChatWindow";
import { Hash } from "lucide-react";

interface Channel {
  id: number;
  name: string;
  type: string;
  projectId?: number;
}

export default function MessagesPage() {
  const { workspaceId } = useWorkspace();
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Select a workspace to view messages.
      </div>
    );
  }

  return (
    <div className="flex h-full" data-testid="messages-page">
      <ChannelList
        workspaceId={workspaceId}
        activeChannelId={activeChannel?.id ?? null}
        onSelectChannel={setActiveChannel}
      />

      <div className="flex-1 flex flex-col">
        {activeChannel ? (
          <ChatWindow channel={activeChannel} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Hash className="h-12 w-12 opacity-20" />
            <div className="text-center">
              <p className="text-sm font-medium">Select a channel</p>
              <p className="text-xs mt-1">Choose a channel from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
