import { ChevronUp, ChevronDown, Minus } from "lucide-react";

interface ScoreCircleProps {
  score: number;
  label: string;
  trend?: 'up' | 'down' | 'stable';
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = { sm: 80, md: 120, lg: 160 };

function getColor(score: number): string {
  if (score <= 39) return '#EF4444';
  if (score <= 59) return '#EAB308';
  if (score <= 79) return '#22C55E';
  return '#3B82F6';
}

export default function ScoreCircle({ score, label, trend, size = 'md' }: ScoreCircleProps) {
  const diameter = SIZE_MAP[size];
  const radius = (diameter - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const isEmpty = score === 0;
  const strokeColor = isEmpty ? '#52525b' : getColor(score);
  const dashOffset = isEmpty ? circumference : circumference - (score / 100) * circumference;

  const fontSize = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-base';
  const labelSize = size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <div className="flex flex-col items-center gap-1" data-testid={`score-circle-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="relative" style={{ width: diameter, height: diameter }}>
        <svg width={diameter} height={diameter} className="-rotate-90">
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth={10}
          />
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${fontSize} font-bold text-white leading-none`}>
            {isEmpty ? '—' : score}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className={`${labelSize} text-zinc-400 font-medium text-center leading-tight`}>{label}</span>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-500'}`}>
            {trend === 'up' && <ChevronUp className="w-3 h-3" />}
            {trend === 'down' && <ChevronDown className="w-3 h-3" />}
            {trend === 'stable' && <Minus className="w-3 h-3" />}
          </span>
        )}
      </div>
    </div>
  );
}
