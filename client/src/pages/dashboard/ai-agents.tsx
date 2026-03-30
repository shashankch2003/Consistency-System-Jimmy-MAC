import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Sparkles, Search, Brain, Plus, MessageSquare, Trash2,
  Settings, Send, Loader2, ChevronRight, MoreHorizontal, Pencil, Menu, X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Provider = { id: string; name: string; icon: string; models: string[] };
type Project = { id: number; userId: string; name: string; description: string; provider: string; model: string; systemPrompt: string; isArchived: boolean; createdAt: string; updatedAt: string };
type Chat = { id: number; userId: string; projectId: number; title: string; provider: string; model: string; isArchived: boolean; createdAt: string; updatedAt: string };
type Message = { id: number; userId: string; chatId: number; role: string; content: string; provider: string; model: string; tokenCount: number; createdAt: string };

const providerIcons: Record<string, LucideIcon> = {
  chatgpt: Bot,
  gemini: Sparkles,
  perplexity: Search,
  claude: Brain,
};

const providerColors: Record<string, string> = {
  chatgpt: "#10A37F",
  gemini: "#4285F4",
  perplexity: "#20808D",
  claude: "#D97706",
};

function ProviderIcon({ providerId, size = 16 }: { providerId: string; size?: number }) {
  const Icon = providerIcons[providerId] || Bot;
  return <Icon size={size} style={{ color: providerColors[providerId] || "currentColor" }} />;
}

export default function AiAgentsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectProvider, setNewProjectProvider] = useState("chatgpt");
  const [newProjectModel, setNewProjectModel] = useState("gpt-4o-mini");

  const [messageInput, setMessageInput] = useState("");
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState("");
  const [systemPromptInput, setSystemPromptInput] = useState("");
  const [renamingChatId, setRenamingChatId] = useState<number | null>(null);
  const [renameChatTitle, setRenameChatTitle] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: providers = [] } = useQuery<Provider[]>({ queryKey: ["/api/ai-agent-providers"] });
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({ queryKey: ["/api/ai-agent-projects"] });
  const { data: chats = [] } = useQuery<Chat[]>({
    queryKey: ["/api/ai-agent-projects", selectedProjectId, "chats"],
    queryFn: () => fetch(`/api/ai-agent-projects/${selectedProjectId}/chats`).then(r => r.json()),
    enabled: !!selectedProjectId,
  });
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/ai-agent-chats", selectedChatId, "messages"],
    queryFn: () => fetch(`/api/ai-agent-chats/${selectedChatId}/messages`).then(r => r.json()),
    enabled: !!selectedChatId,
  });

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;
  const selectedChat = chats.find(c => c.id === selectedChatId) || null;

  useEffect(() => {
    if (selectedProject) setSystemPromptInput(selectedProject.systemPrompt);
  }, [selectedProject?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const createProjectMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/ai-agent-projects", data),
    onSuccess: async (res) => {
      const project = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/ai-agent-projects"] });
      setSelectedProjectId(project.id);
      setSelectedChatId(null);
      setExpandedProjects(prev => new Set([...prev, project.id]));
      setIsNewProjectDialogOpen(false);
      setNewProjectName("");
      setNewProjectDesc("");
      setNewProjectProvider("chatgpt");
      setNewProjectModel("gpt-4o-mini");
    },
    onError: () => toast({ title: "Failed to create project. Please try again.", variant: "destructive" }),
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      apiRequest("PATCH", `/api/ai-agent-projects/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/ai-agent-projects"] }),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ai-agent-projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agent-projects"] });
      setSelectedProjectId(null);
      setSelectedChatId(null);
    },
  });

  const createChatMutation = useMutation({
    mutationFn: ({ projectId, title }: { projectId: number; title?: string }) =>
      apiRequest("POST", `/api/ai-agent-projects/${projectId}/chats`, { title }),
    onSuccess: async (res) => {
      const chat = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/ai-agent-projects", selectedProjectId, "chats"] });
      setSelectedChatId(chat.id);
      setSidebarOpen(false);
    },
    onError: () => toast({ title: "Failed to create chat. Please try again.", variant: "destructive" }),
  });

  const updateChatMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      apiRequest("PATCH", `/api/ai-agent-chats/${id}`, { title }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agent-projects", selectedProjectId, "chats"] }),
  });

  const deleteChatMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ai-agent-chats/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agent-projects", selectedProjectId, "chats"] });
      setSelectedChatId(null);
    },
  });

  const sendMessage = async () => {
    if (!messageInput.trim() || isSending || !selectedChatId) return;
    const content = messageInput.trim();
    setMessageInput("");
    setIsSending(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    try {
      await apiRequest("POST", `/api/ai-agent-chats/${selectedChatId}/messages`, { content });
      await queryClient.invalidateQueries({ queryKey: ["/api/ai-agent-chats", selectedChatId, "messages"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/ai-agent-projects", selectedProjectId, "chats"] });
    } catch {
      toast({ title: "Failed to send message. Please try again.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 144) + "px";
  };

  const handleProviderForNewProject = (pid: string) => {
    setNewProjectProvider(pid);
    const p = providers.find(pr => pr.id === pid);
    if (p) setNewProjectModel(p.models[0]);
  };

  const toggleProject = (id: number) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectProject = (id: number) => {
    setSelectedProjectId(id);
    setSelectedChatId(null);
    if (!expandedProjects.has(id)) {
      setExpandedProjects(prev => new Set([...prev, id]));
    }
    setSidebarOpen(false);
  };

  const selectChat = (chatId: number, projectId: number) => {
    setSelectedProjectId(projectId);
    setSelectedChatId(chatId);
    setSidebarOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2" size="sm" data-testid="ai-agents-new-project-btn">
              <Plus size={14} /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent onKeyDown={e => { if (e.key === "Escape") setIsNewProjectDialogOpen(false); }}>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Project Name *</label>
                <Input
                  placeholder="My AI Project"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value.slice(0, 100))}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Textarea
                  placeholder="What is this project about?"
                  value={newProjectDesc}
                  onChange={e => setNewProjectDesc(e.target.value.slice(0, 1000))}
                  rows={3}
                  maxLength={1000}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">AI Provider</label>
                <Select value={newProjectProvider} onValueChange={handleProviderForNewProject}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {providers.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Model</label>
                <Select value={newProjectModel} onValueChange={setNewProjectModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(providers.find(p => p.id === newProjectProvider)?.models || []).map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="mt-1"
                disabled={!newProjectName.trim() || createProjectMutation.isPending}
                onClick={() =>
                  createProjectMutation.mutate({
                    name: newProjectName.trim(),
                    description: newProjectDesc,
                    provider: newProjectProvider,
                    model: newProjectModel,
                  })
                }
              >
                {createProjectMutation.isPending ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                Create Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {projects.map(project => {
            const isExpanded = expandedProjects.has(project.id);
            const projectChats = selectedProjectId === project.id ? chats : [];
            const isSelected = selectedProjectId === project.id && !selectedChatId;
            return (
              <div key={project.id}>
                <div
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent/50 transition-colors group ${isSelected ? "bg-accent" : ""}`}
                  data-testid={`ai-agents-project-item-${project.id}`}
                  onClick={() => { toggleProject(project.id); selectProject(project.id); }}
                >
                  <ChevronRight
                    size={12}
                    className={`transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                  />
                  <ProviderIcon providerId={project.provider} size={14} />
                  <span className="text-sm flex-1 truncate font-medium">{project.name}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent">
                        <MoreHorizontal size={12} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => deleteProjectMutation.mutate(project.id)}
                        className="text-destructive"
                      >
                        Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 pl-2 border-l border-border/50 space-y-0.5 py-1">
                        {projectChats.map(chat => (
                          <div
                            key={chat.id}
                            className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer hover:bg-accent/50 transition-colors group text-sm ${selectedChatId === chat.id ? "bg-accent/50" : ""}`}
                            data-testid={`ai-agents-chat-item-${chat.id}`}
                            onClick={() => selectChat(chat.id, project.id)}
                          >
                            <MessageSquare size={12} className="flex-shrink-0 text-muted-foreground" />
                            {renamingChatId === chat.id ? (
                              <input
                                autoFocus
                                className="flex-1 text-sm bg-transparent border-b border-border outline-none"
                                value={renameChatTitle}
                                onChange={e => setRenameChatTitle(e.target.value)}
                                onBlur={() => {
                                  if (renameChatTitle.trim())
                                    updateChatMutation.mutate({ id: chat.id, title: renameChatTitle.trim() });
                                  setRenamingChatId(null);
                                }}
                                onKeyDown={e => {
                                  if (e.key === "Enter") {
                                    if (renameChatTitle.trim())
                                      updateChatMutation.mutate({ id: chat.id, title: renameChatTitle.trim() });
                                    setRenamingChatId(null);
                                  }
                                  if (e.key === "Escape") setRenamingChatId(null);
                                }}
                                onClick={e => e.stopPropagation()}
                              />
                            ) : (
                              <span className="flex-1 truncate">{chat.title}</span>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent">
                                  <MoreHorizontal size={12} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setRenamingChatId(chat.id);
                                    setRenameChatTitle(chat.title);
                                  }}
                                >
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => deleteChatMutation.mutate(chat.id)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                        <button
                          className="flex items-center gap-1.5 px-2 py-1 w-full text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors"
                          data-testid={`ai-agents-new-chat-btn-${project.id}`}
                          onClick={e => {
                            e.stopPropagation();
                            createChatMutation.mutate({ projectId: project.id });
                          }}
                        >
                          <Plus size={10} /> New Chat
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  if (projectsLoading) {
    return (
      <div className="flex h-full w-full">
        <div className="w-[280px] border-r p-3 space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      <div className="hidden md:flex w-[280px] flex-shrink-0 border-r flex-col h-full bg-background">
        <SidebarContent />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="w-[280px] bg-background border-r flex flex-col h-full relative z-10">
            <button
              className="absolute top-3 right-3 p-1 rounded hover:bg-accent"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={16} />
            </button>
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {!selectedProjectId && (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center"
            data-testid="ai-agents-empty-state"
          >
            <div className="md:hidden absolute top-4 left-4">
              <button onClick={() => setSidebarOpen(true)} className="p-2 rounded hover:bg-accent">
                <Menu size={18} />
              </button>
            </div>
            <Bot size={48} className="text-muted-foreground/20" />
            <h1 className="text-2xl font-bold">AI Agents Hub</h1>
            <p className="text-muted-foreground max-w-md">
              Create a project, choose your preferred AI provider, and start chatting. Your conversations are saved automatically.
            </p>
            <Button onClick={() => setIsNewProjectDialogOpen(true)}>Create Your First Project</Button>
          </div>
        )}

        {selectedProjectId && !selectedChatId && selectedProject && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="md:hidden mb-2">
                <button onClick={() => setSidebarOpen(true)} className="p-2 rounded hover:bg-accent">
                  <Menu size={18} />
                </button>
              </div>
              <div className="flex items-center gap-3" data-testid="ai-agents-project-header">
                <ProviderIcon providerId={selectedProject.provider} size={24} />
                {editingProjectName ? (
                  <input
                    autoFocus
                    className="text-2xl font-bold bg-transparent border-b border-border outline-none flex-1"
                    value={projectNameInput}
                    onChange={e => setProjectNameInput(e.target.value)}
                    onBlur={() => {
                      if (projectNameInput.trim())
                        updateProjectMutation.mutate({ id: selectedProject.id, name: projectNameInput.trim() });
                      setEditingProjectName(false);
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        if (projectNameInput.trim())
                          updateProjectMutation.mutate({ id: selectedProject.id, name: projectNameInput.trim() });
                        setEditingProjectName(false);
                      }
                      if (e.key === "Escape") setEditingProjectName(false);
                    }}
                  />
                ) : (
                  <h1 className="text-2xl font-bold flex-1">{selectedProject.name}</h1>
                )}
                <button
                  className="p-1 rounded hover:bg-accent"
                  onClick={() => {
                    setProjectNameInput(selectedProject.name);
                    setEditingProjectName(true);
                  }}
                >
                  <Pencil size={16} className="text-muted-foreground" />
                </button>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">AI Provider & Model</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {providers.map(provider => (
                      <div
                        key={provider.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors hover:bg-accent/50 ${selectedProject.provider === provider.id ? "border-blue-500 bg-blue-500/5" : "border-border"}`}
                        data-testid={`ai-agents-provider-card-${provider.id}`}
                        onClick={() =>
                          updateProjectMutation.mutate({
                            id: selectedProject.id,
                            provider: provider.id,
                            model: provider.models[0],
                          })
                        }
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <ProviderIcon providerId={provider.id} size={16} />
                          <span className="font-medium text-sm">{provider.name}</span>
                        </div>
                        <div className="space-y-1">
                          {provider.models.map(model => (
                            <div
                              key={model}
                              className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors ${selectedProject.provider === provider.id && selectedProject.model === model ? "bg-blue-500/20 text-blue-400 font-medium" : "text-muted-foreground hover:bg-accent"}`}
                              onClick={e => {
                                e.stopPropagation();
                                updateProjectMutation.mutate({
                                  id: selectedProject.id,
                                  provider: provider.id,
                                  model,
                                });
                              }}
                            >
                              {model}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">System Prompt</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    data-testid="ai-agents-system-prompt-input"
                    rows={5}
                    maxLength={5000}
                    value={systemPromptInput}
                    onChange={e => setSystemPromptInput(e.target.value)}
                    placeholder="You are a helpful AI assistant."
                  />
                  <Button
                    size="sm"
                    onClick={() =>
                      updateProjectMutation.mutate({ id: selectedProject.id, systemPrompt: systemPromptInput })
                    }
                    disabled={updateProjectMutation.isPending}
                  >
                    Save Prompt
                  </Button>
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Button
                  size="lg"
                  data-testid="ai-agents-start-chat-btn"
                  onClick={() => createChatMutation.mutate({ projectId: selectedProject.id })}
                  disabled={createChatMutation.isPending}
                >
                  {createChatMutation.isPending
                    ? <Loader2 className="animate-spin mr-2" size={16} />
                    : <MessageSquare className="mr-2" size={16} />
                  }
                  Start New Chat
                </Button>
              </div>
            </div>
          </div>
        )}

        {selectedChatId && selectedChat && (
          <div className="flex flex-col h-full overflow-hidden">
            <div
              className="h-14 border-b flex items-center justify-between px-4 flex-shrink-0"
              data-testid="ai-agents-chat-header"
            >
              <div className="flex items-center gap-3">
                <button
                  className="md:hidden p-1 rounded hover:bg-accent mr-1"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu size={16} />
                </button>
                <span className="font-medium text-sm truncate max-w-[200px]">{selectedChat.title}</span>
                <Badge
                  variant="outline"
                  className="text-xs gap-1 px-2"
                  style={{
                    borderColor: providerColors[selectedChat.provider],
                    color: providerColors[selectedChat.provider],
                  }}
                >
                  <ProviderIcon providerId={selectedChat.provider} size={10} />
                  {providers.find(p => p.id === selectedChat.provider)?.name || selectedChat.provider}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSelectedChatId(null)}
                >
                  <Settings size={15} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteChatMutation.mutate(selectedChatId)}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4 py-6">
              {messages.length === 0 && !isSending && (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                  <MessageSquare size={24} className="opacity-30" />
                  <p className="text-sm">Send a message to start the conversation</p>
                </div>
              )}
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    data-testid={`ai-agents-message-${msg.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] md:max-w-[80%] rounded-lg px-4 py-2 text-sm ${msg.role === "user" ? "bg-accent/30 ml-auto" : ""}`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {msg.content.split("\n").map((line, i) => (
                            <p key={i} className={i > 0 ? "mt-2" : ""}>{line || <br />}</p>
                          ))}
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isSending && (
                  <motion.div
                    data-testid="ai-agents-typing-indicator"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="flex gap-1 px-4 py-3 rounded-lg bg-accent/20">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-muted-foreground"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            <div className="border-t p-4 flex gap-2 items-end flex-shrink-0">
              <Textarea
                ref={textareaRef}
                data-testid="ai-agents-message-input"
                placeholder="Type your message..."
                value={messageInput}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                rows={1}
                className="resize-none min-h-[40px] max-h-[144px] flex-1"
                disabled={isSending}
              />
              <Button
                data-testid="ai-agents-send-btn"
                size="icon"
                onClick={sendMessage}
                disabled={!messageInput.trim() || isSending}
                className="flex-shrink-0 h-10 w-10"
              >
                {isSending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
