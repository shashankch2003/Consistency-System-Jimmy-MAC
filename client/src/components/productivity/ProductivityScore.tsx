import { getScoreLabel, getScoreColor, getFactorColor, type FactorScore } from "@/utils/productivityCalculator";

interface ProductivityScoreProps {
  overallScore: number;
  factors: FactorScore[];
}

export function ProductivityScore({ overallScore, factors }: ProductivityScoreProps) {
  const circumference = 2 * Math.PI * 52;
  const progress = (overallScore / 100) * circumference;
  const color = getScoreColor(overallScore);
  const label = getScoreLabel(overallScore);

  return (
    <div className="flex flex-col items-center gap-4" data-testid="productivity-score">
      {/* Circle ring */}
      <div className="relative">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${progress} ${circumference}`}
            strokeDashoffset={circumference / 4}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold leading-none" style={{ color }} data-testid="text-overall-score">
            {overallScore}
          </span>
          <span className="text-xs text-muted-foreground mt-1">{label}</span>
        </div>
      </div>

      {/* Factor bars */}
      <div className="w-full space-y-2" data-testid="factor-bars">
        {factors.map((f) => (
          <div key={f.key} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{f.label}</span>
              <span className="font-medium" style={{ color: getFactorColor(f.value) }}>{f.value}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${f.value}%`, backgroundColor: getFactorColor(f.value) }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
