import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Play, ArrowLeft, Send, MessageSquare, Clock, Search,
  Video, AlertCircle, Lightbulb, Bug, Sparkles,
  ExternalLink, Plus, Edit2, Trash2, Shield, Eye, EyeOff, Reply, X
} from "lucide-react";

type VideoItem = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  youtubeUrl: string;
  thumbnailUrl: string | null;
  duration: string | null;
  videoProvider: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type FeedbackItem = {
  id: number;
  videoId: number;
  userId: string;
  feedbackType: string;
  message: string;
  status: string;
  adminReply: string | null;
  adminRepliedAt: string | null;
  createdAt: string | null;
};

const VIDEO_CATEGORIES = [
  { value: "all", label: "All Videos" },
  { value: "general", label: "General" },
  { value: "getting-started", label: "Getting Started" },
  { value: "features", label: "Features" },
  { value: "tips", label: "Tips & Tricks" },
  { value: "updates", label: "Updates" },
];

const CATEGORY_OPTIONS = VIDEO_CATEGORIES.filter(c => c.value !== "all");

const FEEDBACK_TYPES = [
  { value: "doubt", label: "Ask a Doubt", icon: AlertCircle, color: "text-blue-400" },
  { value: "improvement", label: "Suggest Improvement", icon: Lightbulb, color: "text-yellow-400" },
  { value: "issue", label: "Report Issue", icon: Bug, color: "text-red-400" },
  { value: "feature", label: "Request Feature", icon: Sparkles, color: "text-purple-400" },
];

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getThumbnailUrl(video: VideoItem): string {
  if (video.thumbnailUrl) return video.thumbnailUrl;
  const vid = extractVideoId(video.youtubeUrl);
  return vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : "";
}

export default function KnowMorePage() {
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/level/is-admin"],
  });

  const { data: videos = [], isLoading } = useQuery<VideoItem[]>({
    queryKey: ["/api/videos"],
  });

  const filteredVideos = videos.filter((v) => {
    if (categoryFilter !== "all" && v.category !== categoryFilter) return false;
    if (searchQuery && !v.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(v.description || "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const categories = VIDEO_CATEGORIES.filter(
    (c) => c.value === "all" || videos.some((v) => v.category === c.value)
  );

  if (showAdmin && adminCheck?.isAdmin) {
    return <AdminVideoManagement onBack={() => setShowAdmin(false)} />;
  }

  if (selectedVideo) {
    return <VideoPlayerView video={selectedVideo} onBack={() => setSelectedVideo(null)} />;
  }

  return (
    <div className="p-2 pt-14 sm:p-4 sm:pt-4" data-testid="know-more-page">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" data-testid="text-page-title">Know More About Consistency System</h1>
          <p className="text-muted-foreground text-sm">Learn how to get the most out of every feature</p>
        </div>
        {adminCheck?.isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setShowAdmin(true)} data-testid="button-admin-videos">
            <Shield className="w-4 h-4 mr-2" /> Manage Videos
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-videos"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat.value}
              variant={categoryFilter === cat.value ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(cat.value)}
              data-testid={`button-filter-${cat.value}`}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-video bg-muted rounded-t-lg" />
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-16">
          <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold mb-1">No videos found</h3>
          <p className="text-muted-foreground text-sm">
            {videos.length === 0 ? "Videos will appear here once they are added." : "Try adjusting your search or filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} onClick={() => setSelectedVideo(video)} />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoCard({ video, onClick }: { video: VideoItem; onClick: () => void }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const thumbnail = getThumbnailUrl(video);

  return (
    <Card
      className="cursor-pointer group hover:ring-1 hover:ring-primary/30 transition-all overflow-hidden"
      onClick={onClick}
      data-testid={`card-video-${video.id}`}
    >
      <div className="aspect-video relative bg-muted overflow-hidden" data-testid={`button-play-card-${video.id}`}>
        {thumbnail && (
          <img
            src={thumbnail}
            alt={video.title}
            className={`w-full h-full object-cover transition-opacity ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-7 h-7 text-black ml-1" />
          </div>
        </div>
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded">
            {video.duration}
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors" data-testid={`text-video-title-${video.id}`}>
          {video.title}
        </h3>
        {video.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{video.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-[10px]">{video.category}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function VideoPlayerView({ video, onBack }: { video: VideoItem; onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [feedbackType, setFeedbackType] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  const ytVideoId = extractVideoId(video.youtubeUrl);
  const embedUrl = ytVideoId ? `https://www.youtube.com/embed/${ytVideoId}?rel=0&modestbranding=1` : null;

  const { data: feedback = [] } = useQuery<FeedbackItem[]>({
    queryKey: [`/api/videos/${video.id}/feedback`],
  });

  const submitFeedback = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/videos/${video.id}/feedback`, {
        feedbackType, message: feedbackMessage,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${video.id}/feedback`] });
      setFeedbackMessage("");
      setFeedbackType("");
      setFeedbackDialogOpen(false);
      toast({ title: "Feedback submitted", description: "Thank you for your feedback!" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-2 pt-14 sm:p-4 sm:pt-4" data-testid="video-player-view">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4" data-testid="button-back-to-videos">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Videos
      </Button>

      <div className="space-y-6">
        <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
          {embedUrl ? (
            <>
              {!playerLoaded && (
                <div
                  className="absolute inset-0 cursor-pointer group"
                  onClick={() => setPlayerLoaded(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") setPlayerLoaded(true); }}
                  data-testid="button-play-video"
                >
                  <img
                    src={getThumbnailUrl(video)}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-10 h-10 text-black ml-1" />
                    </div>
                  </div>
                </div>
              )}
              {playerLoaded && (
                <iframe
                  src={embedUrl}
                  title={video.title}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  data-testid="video-iframe"
                />
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Video className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">Unable to embed this video</p>
                <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm inline-flex items-center gap-1 mt-2" data-testid="link-youtube-fallback">
                  Open on YouTube <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold" data-testid="text-video-detail-title">{video.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">{video.category}</Badge>
                {video.duration && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {video.duration}
                  </span>
                )}
              </div>
            </div>
            {!embedUrl && (
              <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" data-testid="link-open-youtube">
                <Button variant="outline" size="sm" data-testid="button-open-youtube">
                  <ExternalLink className="w-4 h-4 mr-2" /> Watch on YouTube
                </Button>
              </a>
            )}
          </div>
          {video.description && (
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed" data-testid="text-video-description">{video.description}</p>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Your Feedback
              </CardTitle>
              <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-submit-feedback">
                    <Send className="w-4 h-4 mr-2" /> Submit Feedback
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Submit Feedback</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Feedback Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {FEEDBACK_TYPES.map((ft) => (
                          <Button
                            key={ft.value}
                            variant={feedbackType === ft.value ? "default" : "outline"}
                            size="sm"
                            className="justify-start gap-2 h-auto py-2"
                            onClick={() => setFeedbackType(ft.value)}
                            data-testid={`button-feedback-type-${ft.value}`}
                          >
                            <ft.icon className={`w-4 h-4 ${feedbackType === ft.value ? "" : ft.color}`} />
                            <span className="text-xs">{ft.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Your Message</label>
                      <Textarea
                        placeholder="Type your feedback here..."
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        rows={4}
                        maxLength={2000}
                        data-testid="input-feedback-message"
                      />
                    </div>
                    <Button
                      className="w-full"
                      disabled={!feedbackType || !feedbackMessage.trim() || submitFeedback.isPending}
                      onClick={() => submitFeedback.mutate()}
                      data-testid="button-send-feedback"
                    >
                      {submitFeedback.isPending ? "Sending..." : "Send Feedback"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {feedback.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No feedback submitted yet. Share your thoughts about this video!
              </p>
            ) : (
              <div className="space-y-3">
                {feedback.map((fb) => {
                  const ft = FEEDBACK_TYPES.find((t) => t.value === fb.feedbackType);
                  return (
                    <div key={fb.id} className="flex gap-3 p-3 rounded-lg bg-muted/50" data-testid={`feedback-item-${fb.id}`}>
                      <div className="mt-0.5">
                        {ft && <ft.icon className={`w-4 h-4 ${ft.color}`} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px]">{ft?.label || fb.feedbackType}</Badge>
                          <Badge variant={fb.status === "resolved" ? "default" : "secondary"} className="text-[10px]">
                            {fb.status}
                          </Badge>
                        </div>
                        <p className="text-sm">{fb.message}</p>
                        {fb.adminReply && (
                          <div className="bg-primary/10 border border-primary/20 rounded-md p-2.5 mt-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Reply className="w-3 h-3 text-primary" />
                              <span className="text-[10px] font-medium text-primary">Admin Reply</span>
                              {fb.adminRepliedAt && (
                                <span className="text-[10px] text-muted-foreground">· {new Date(fb.adminRepliedAt).toLocaleDateString()}</span>
                              )}
                            </div>
                            <p className="text-sm">{fb.adminReply}</p>
                          </div>
                        )}
                        {fb.createdAt && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(fb.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AdminVideoManagement({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [feedbackTab, setFeedbackTab] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formYoutubeUrl, setFormYoutubeUrl] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formSortOrder, setFormSortOrder] = useState("0");
  const [formPublished, setFormPublished] = useState(true);

  const { data: videos = [], isLoading } = useQuery<VideoItem[]>({
    queryKey: ["/api/admin/videos"],
  });

  const { data: allFeedback = [] } = useQuery<FeedbackItem[]>({
    queryKey: ["/api/admin/video-feedback"],
    enabled: feedbackTab,
  });

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormCategory("general");
    setFormYoutubeUrl("");
    setFormDuration("");
    setFormSortOrder("0");
    setFormPublished(true);
    setEditingVideo(null);
  };

  const openEdit = (v: VideoItem) => {
    setFormTitle(v.title);
    setFormDescription(v.description || "");
    setFormCategory(v.category);
    setFormYoutubeUrl(v.youtubeUrl);
    setFormDuration(v.duration || "");
    setFormSortOrder(String(v.sortOrder));
    setFormPublished(v.isPublished);
    setEditingVideo(v);
    setAddDialogOpen(true);
  };

  const createVideo = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/videos", {
        title: formTitle, description: formDescription, category: formCategory,
        youtubeUrl: formYoutubeUrl, duration: formDuration,
        sortOrder: parseInt(formSortOrder) || 0, isPublished: formPublished,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      resetForm();
      setAddDialogOpen(false);
      toast({ title: "Video added successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateVideo = useMutation({
    mutationFn: async () => {
      if (!editingVideo) return;
      await apiRequest("PATCH", `/api/admin/videos/${editingVideo.id}`, {
        title: formTitle, description: formDescription, category: formCategory,
        youtubeUrl: formYoutubeUrl, duration: formDuration,
        sortOrder: parseInt(formSortOrder) || 0, isPublished: formPublished,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      resetForm();
      setAddDialogOpen(false);
      toast({ title: "Video updated successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteVideo = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/videos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({ title: "Video deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: number; published: boolean }) => {
      await apiRequest("PATCH", `/api/admin/videos/${id}`, { isPublished: published });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
  });

  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const updateFeedbackStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/admin/video-feedback/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/video-feedback"] });
    },
  });

  const replyToFeedback = useMutation({
    mutationFn: async ({ id, reply }: { id: number; reply: string }) => {
      await apiRequest("POST", `/api/admin/video-feedback/${id}/reply`, { reply });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/video-feedback"] });
      setReplyingTo(null);
      setReplyText("");
      toast({ title: "Reply sent" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-2 pt-14 sm:p-4 sm:pt-4" data-testid="admin-video-management">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4" data-testid="button-back-from-admin">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Videos
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Manage Videos</h1>
          <p className="text-muted-foreground text-sm">Add, edit, and manage video content</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={feedbackTab ? "outline" : "default"}
            size="sm"
            onClick={() => setFeedbackTab(false)}
            data-testid="button-tab-videos"
          >
            <Video className="w-4 h-4 mr-2" /> Videos ({videos.length})
          </Button>
          <Button
            variant={feedbackTab ? "default" : "outline"}
            size="sm"
            onClick={() => setFeedbackTab(true)}
            data-testid="button-tab-feedback"
          >
            <MessageSquare className="w-4 h-4 mr-2" /> Feedback
          </Button>
        </div>
      </div>

      {!feedbackTab ? (
        <>
          <div className="flex justify-end mb-4">
            <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-video">
                  <Plus className="w-4 h-4 mr-2" /> Add Video
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingVideo ? "Edit Video" : "Add New Video"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Title</label>
                    <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Video title" data-testid="input-video-title" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">YouTube URL</label>
                    <Input value={formYoutubeUrl} onChange={(e) => setFormYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." data-testid="input-video-url" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Description</label>
                    <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Brief description" rows={3} data-testid="input-video-description" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Category</label>
                      <Select value={formCategory} onValueChange={setFormCategory}>
                        <SelectTrigger data-testid="select-video-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Duration</label>
                      <Input value={formDuration} onChange={(e) => setFormDuration(e.target.value)} placeholder="e.g. 5:30" data-testid="input-video-duration" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Sort Order</label>
                      <Input type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(e.target.value)} data-testid="input-video-sort" />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Switch checked={formPublished} onCheckedChange={setFormPublished} data-testid="switch-video-published" />
                      <label className="text-sm">Published</label>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!formTitle.trim() || !formYoutubeUrl.trim() || createVideo.isPending || updateVideo.isPending}
                    onClick={() => editingVideo ? updateVideo.mutate() : createVideo.mutate()}
                    data-testid="button-save-video"
                  >
                    {(createVideo.isPending || updateVideo.isPending) ? "Saving..." : editingVideo ? "Update Video" : "Add Video"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : videos.length === 0 ? (
            <div className="text-center py-16">
              <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">No videos yet. Add your first video above.</p>
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.map((v) => (
                    <TableRow key={v.id} data-testid={`row-video-${v.id}`}>
                      <TableCell className="font-medium">{v.title}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{v.category}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.duration || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1"
                          onClick={() => togglePublish.mutate({ id: v.id, published: !v.isPublished })}
                          data-testid={`button-toggle-publish-${v.id}`}
                        >
                          {v.isPublished ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                          <span className="text-xs">{v.isPublished ? "Published" : "Draft"}</span>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)} data-testid={`button-edit-video-${v.id}`}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteVideo.mutate(v.id)} data-testid={`button-delete-video-${v.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All User Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            {allFeedback.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No feedback received yet.</p>
            ) : (
              <div className="space-y-3">
                {allFeedback.map((fb) => {
                  const ft = FEEDBACK_TYPES.find((t) => t.value === fb.feedbackType);
                  const vid = videos.find((v) => v.id === fb.videoId);
                  return (
                    <div key={fb.id} className="flex gap-3 p-3 rounded-lg bg-muted/50" data-testid={`admin-feedback-${fb.id}`}>
                      <div className="mt-0.5">
                        {ft && <ft.icon className={`w-4 h-4 ${ft.color}`} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">{ft?.label || fb.feedbackType}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{vid?.title || `Video #${fb.videoId}`}</Badge>
                          <span className="text-[10px] text-muted-foreground">User: {fb.userId.slice(0, 8)}...</span>
                        </div>
                        <p className="text-sm mb-2">{fb.message}</p>
                        {fb.adminReply && (
                          <div className="bg-primary/10 border border-primary/20 rounded-md p-2.5 mb-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Reply className="w-3 h-3 text-primary" />
                              <span className="text-[10px] font-medium text-primary">Admin Reply</span>
                              {fb.adminRepliedAt && (
                                <span className="text-[10px] text-muted-foreground">· {new Date(fb.adminRepliedAt).toLocaleDateString()}</span>
                              )}
                            </div>
                            <p className="text-sm">{fb.adminReply}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Select
                            value={fb.status}
                            onValueChange={(status) => updateFeedbackStatus.mutate({ id: fb.id, status })}
                          >
                            <SelectTrigger className="w-28 h-7 text-xs" data-testid={`select-feedback-status-${fb.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="reviewed">Reviewed</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => { setReplyingTo(replyingTo === fb.id ? null : fb.id); setReplyText(fb.adminReply || ""); }}
                            data-testid={`button-reply-feedback-${fb.id}`}
                          >
                            <Reply className="w-3.5 h-3.5" /> {fb.adminReply ? "Edit Reply" : "Reply"}
                          </Button>
                          {fb.createdAt && (
                            <span className="text-[10px] text-muted-foreground">{new Date(fb.createdAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        {replyingTo === fb.id && (
                          <div className="mt-2 flex gap-2">
                            <Textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type your reply..."
                              rows={2}
                              className="text-sm"
                              data-testid={`input-reply-${fb.id}`}
                            />
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                className="h-8"
                                disabled={!replyText.trim() || replyToFeedback.isPending}
                                onClick={() => replyToFeedback.mutate({ id: fb.id, reply: replyText })}
                                data-testid={`button-send-reply-${fb.id}`}
                              >
                                <Send className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyingTo(null)}
                                data-testid={`button-cancel-reply-${fb.id}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
