import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { useHourlyEntries, useUpdateHourlyEntry } from "@/hooks/use-hourly";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function HourlyPage() {
  const [date, setDate] = useState(new Date());
  const dateStr = format(date, "yyyy-MM-dd");
  
  const { data: entries, isLoading } = useHourlyEntries(dateStr);
  const updateEntry = useUpdateHourlyEntry();

  const handleUpdate = (hour: number, field: 'taskDescription' | 'productivityScore', value: string | number) => {
    // Find existing entry or create partial
    const entry = entries?.find(e => e.hour === hour);
    
    updateEntry.mutate({
      date: dateStr,
      hour,
      taskDescription: field === 'taskDescription' ? String(value) : (entry?.taskDescription || ""),
      productivityScore: field === 'productivityScore' ? Number(value) : (entry?.productivityScore || 0),
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-500 bg-green-500/10 border-green-500/20";
    if (score >= 5) return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    if (score > 0) return "text-red-500 bg-red-500/10 border-red-500/20";
    return "text-muted-foreground bg-secondary/50 border-transparent";
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b border-border/50">
        <div>
          <h1 className="text-3xl font-display font-bold">Hourly Tracker</h1>
          <p className="text-muted-foreground">Log your focus and productivity.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-card p-2 rounded-lg border border-border">
          <Button variant="ghost" size="icon" onClick={() => setDate(subDays(date, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-mono font-medium min-w-[100px] text-center">
            {format(date, "MMM dd")}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setDate(addDays(date, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2 pb-20">
        {HOURS.map(hour => {
          const entry = entries?.find(e => e.hour === hour);
          const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
          
          return (
            <div key={hour} className="flex gap-4 items-center group">
              <div className="w-16 font-mono text-sm text-muted-foreground">{timeLabel}</div>
              
              <Input 
                className="flex-1 bg-card/30 border-border/50 focus:bg-card transition-all"
                placeholder="What did you do?"
                defaultValue={entry?.taskDescription || ""}
                onBlur={(e) => handleUpdate(hour, 'taskDescription', e.target.value)}
              />
              
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                  <button
                    key={score}
                    onClick={() => handleUpdate(hour, 'productivityScore', score)}
                    className={cn(
                      "w-6 h-8 rounded text-[10px] font-bold border transition-all hover:scale-110",
                      (entry?.productivityScore === score) 
                        ? getScoreColor(score)
                        : "text-muted-foreground/30 border-transparent hover:bg-secondary"
                    )}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
