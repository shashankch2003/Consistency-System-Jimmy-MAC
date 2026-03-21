import { ChevronUp, ChevronDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  delta?: string;
  icon?: React.ReactNode;
}

export default function MetricCard({ title, value, subtitle, trend, delta, icon }: MetricCardProps) {
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-500';

  return (
    <Card className="bg-zinc-900 border-zinc-800" data-testid={`metric-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-4 relative">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon && <span className="text-zinc-400">{icon}</span>}
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{title}</span>
          </div>
          {delta && trend && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
              {trend === 'up' && <ChevronUp className="w-3 h-3" />}
              {trend === 'down' && <ChevronDown className="w-3 h-3" />}
              {trend === 'stable' && <Minus className="w-3 h-3" />}
              {delta}
            </span>
          )}
        </div>
        <div className="text-2xl font-bold text-white mb-0.5">
          {value !== undefined && value !== null && value !== '' ? value : '—'}
        </div>
        {subtitle && <div className="text-xs text-zinc-500">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}
