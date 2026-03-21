import { Trophy, AlertTriangle, Lightbulb, TrendingUp, GraduationCap } from "lucide-react";
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
  onMarkRead?: () => void;
  onDismiss?: () => void;
}

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; badgeClass: string }> = {
  achievement: {
    icon: <Trophy className="w-4 h-4" />,
    color: 'text-green-400',
    badgeClass: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-yellow-400',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  suggestion: {
    icon: <Lightbulb className="w-4 h-4" />,
    color: 'text-blue-400',
    badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  pattern: {
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'text-purple-400',
    badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  coaching: {
    icon: <GraduationCap className="w-4 h-4" />,
    color: 'text-orange-400',
    badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
};

export default function InsightCard({ category, title, message, confidence, timestamp, isRead, onMarkRead, onDismiss }: InsightCardProps) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['suggestion'];

  return (
    <Card className={`bg-zinc-900 border-zinc-800 relative ${!isRead ? 'border-l-2 border-l-blue-500' : ''}`} data-testid={`insight-card-${title.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          {!isRead && (
            <div className="absolute top-4 left-3 w-2 h-2 rounded-full bg-blue-500 mt-1" />
          )}
          <div className={`flex-shrink-0 ${config.color} mt-0.5 ${!isRead ? 'ml-3' : ''}`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white text-sm">{title}</span>
                <Badge variant="outline" className={`text-xs ${config.badgeClass}`}>
                  {category}
                </Badge>
              </div>
              <span className="text-xs text-zinc-500 whitespace-nowrap flex-shrink-0">{timestamp}</span>
            </div>
            <p className="text-sm text-zinc-400 mb-2 leading-relaxed">{message}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600">Confidence: <span className="text-zinc-500">{confidence}</span></span>
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
                {onDismiss && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-zinc-400 hover:text-red-400"
                    onClick={onDismiss}
                    data-testid="button-dismiss-insight"
                  >
                    Dismiss
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
