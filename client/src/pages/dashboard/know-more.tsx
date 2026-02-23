import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play, ArrowLeft, Send, MessageSquare, Clock, Filter, Search,
  ChevronRight, Video, AlertCircle, Lightbulb, Bug, Sparkles,
  ExternalLink
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [playerLoaded, setPlayerLoaded] = useState(false);

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

  if (selectedVideo) {
    return <VideoPlayerView video={selectedVideo} onBack={() => { setSelectedVideo(null); setPlayerLoaded(false); }} />;
  }

  return (
    <div className="p-2 pt-14 sm:p-4 sm:pt-4 max-w-6xl mx-auto" data-testid="know-more-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" data-testid="text-page-title">Know More About Consistency System</h1>
        <p className="text-muted-foreground text-sm">Learn how to get the most out of every feature</p>
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
      <div className="aspect-video relative bg-muted overflow-hidden">
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

  const videoId = extractVideoId(video.youtubeUrl);
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` : null;

  const { data: feedback = [] } = useQuery<FeedbackItem[]>({
    queryKey: ["/api/videos", video.id, "feedback"],
    queryFn: async () => {
      const res = await fetch(`/api/videos/${video.id}/feedback`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch feedback");
      return res.json();
    },
  });

  const submitFeedback = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/videos/${video.id}/feedback`, {
        feedbackType, message: feedbackMessage,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos", video.id, "feedback"] });
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
    <div className="p-2 pt-14 sm:p-4 sm:pt-4 max-w-5xl mx-auto" data-testid="video-player-view">
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
                <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm inline-flex items-center gap-1 mt-2">
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
              <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" data-testid="button-open-youtube">
                  <ExternalLink className="w-4 h-4 mr-2" /> Watch on YouTube
                </Button>
              </a>
            )}
          </div>
          {video.description && (
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{video.description}</p>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Feedback
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
