import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { type ComparisonResult } from "@/utils/productivityCalculator";

interface ComparisonCardsProps {
  comparisons: ComparisonResult;
  detailed?: boolean;
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) return (
    <span className="flex items-center gap-0.5 text-xs text-green-400">
      <TrendingUp className="h-3 w-3" />{Math.abs(delta)}
    </span>
  );
  if (delta < 0) return (
    <span className="flex items-center gap-0.5 text-xs text-red-400">
      <TrendingDown className="h-3 w-3" />{Math.abs(delta)}
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" />0
    </span>
  );
}

export function ComparisonCards({ comparisons, detailed = false }: ComparisonCardsProps) {
  const cards = [
    {
      label: "Today vs Yesterday",
      current: comparisons.todayVsYesterday.current,
      previous: comparisons.todayVsYesterday.previous,
      delta: comparisons.todayVsYesterday.delta,
      unit: "pts",
    },
    {
      label: "This Week vs Last",
      current: comparisons.thisWeekVsLast.current,
      previous: comparisons.thisWeekVsLast.previous,
      delta: comparisons.thisWeekVsLast.delta,
      unit: "pts",
    },
    {
      label: "This Month vs Last",
      current: comparisons.thisMonthVsLast.current,
      previous: comparisons.thisMonthVsLast.previous,
      delta: comparisons.thisMonthVsLast.delta,
      unit: "pts",
    },
    {
      label: "Avg Hours/Day",
      current: comparisons.avgCompletionTime,
      previous: null,
      delta: 0,
      unit: "h",
    },
    {
      label: "Hours Worked Today",
      current: comparisons.hoursWorked,
      previous: null,
      delta: 0,
      unit: "h",
    },
  ];

  return (
    <div className={`grid gap-4 ${detailed ? "grid-cols-1" : "grid-cols-2 md:grid-cols-5"}`} data-testid="comparison-cards">
      {cards.map((card) => (
        <Card key={card.label} className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2">{card.label}</p>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">
                {card.current}{card.unit}
              </span>
              <DeltaBadge delta={card.delta} />
            </div>
            {card.previous !== null && (
              <p className="text-[11px] text-muted-foreground mt-1">
                vs {card.previous}{card.unit} prev
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
