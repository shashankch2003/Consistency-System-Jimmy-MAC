import { Trophy, AlertTriangle, Lightbulb, TrendingUp, GraduationCap, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface InsightCardProps {
  category: string;
  title: string;
  message: string;
  confidence: string;
  timestamp: string;
  isRead: boolean;
  showColors?: boolean;
  onMarkRead?: () => void;
  onDismiss?: () => void;
}

const CATEGORY_CONFIG: Record<string, {
  icon: React.ReactNode;
  colorClass: string;
  badgeColor: string;
  neutralBadge: string;
}> = {
  achievement: {
    icon: <Trophy className="w-4 h-4" />,
    colorClass: "text-green-400",
    badgeColor: "bg-green-500/20 text-green-400 border-green-500/30",
    neutralBadge: "bg-zinc-800 text-zinc-400 border-zinc-700",
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    colorClass: "text-yellow-400",
    badgeColor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    neutralBadge: "bg-zinc-800 text-zinc-400 border-zinc-700",
  },
  suggestion: {
    icon: <Lightbulb className="w-4 h-4" />,
    colorClass: "text-zinc-300",
    badgeColor: "bg-zinc-800 text-zinc-400 border-zinc-700",
    neutralBadge: "bg-zinc-800 text-zinc-400 border-zinc-700",
  },
  pattern: {
    icon: <TrendingUp className="w-4 h-4" />,
    colorClass: "text-zinc-300",
    badgeColor: "bg-zinc-800 text-zinc-400 border-zinc-700",
    neutralBadge: "bg-zinc-800 text-zinc-400 border-zinc-700",
  },
  coaching: {
    icon: <GraduationCap className="w-4 h-4" />,
    colorClass: "text-zinc-300",
    badgeColor: "bg-zinc-800 text-zinc-400 border-zinc-700",
    neutralBadge: "bg-zinc-800 text-zinc-400 border-zinc-700",
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    colorClass: "text-zinc-300",
    badgeColor: "bg-zinc-800 text-zinc-400 border-zinc-700",
    neutralBadge: "bg-zinc-800 text-zinc-400 border-zinc-700",
  },
};

export default function InsightCard({
  category, title, message, confidence, timestamp,
  isRead, showColors = true, onMarkRead, onDismiss,
}: InsightCardProps) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG["suggestion"];
  const badgeClass = showColors ? config.badgeColor : config.neutralBadge;
  const iconClass = showColors ? config.colorClass : "text-zinc-500";

  return (
    <Card
      className="bg-zinc-900 border-zinc-800 relative"
      data-testid={`insight-card-${title.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {!isRead && (
            <div className="absolute top-4 left-3 w-1.5 h-1.5 rounded-full bg-zinc-500 mt-1" />
          )}
          <div className={`flex-shrink-0 ${iconClass} mt-0.5 ${!isRead ? "ml-3" : ""}`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white text-sm">{title}</span>
                <Badge variant="outline" className={`text-xs ${badgeClass}`}>
                  {category}
                </Badge>
              </div>
              <span className="text-xs text-zinc-600 whitespace-nowrap flex-shrink-0">{timestamp}</span>
            </div>
            <p className="text-sm text-zinc-400 mb-2 leading-relaxed">{message}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600">
                Confidence: <span className="text-zinc-500">{confidence}</span>
              </span>
              <div className="flex gap-1">
                {!isRead && onMarkRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-zinc-400 hover:text-white"
                    onClick={onMarkRead}
                    data-testid="button-mark-read"
                  >
                    Mark Read
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
