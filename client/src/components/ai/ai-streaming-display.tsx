import { useEffect, useRef } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface AiStreamingDisplayProps {
  text: string;
  isComplete: boolean;
  className?: string;
}

export function AiStreamingDisplay({ text, isComplete, className = "" }: AiStreamingDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text]);

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-1 text-xs text-purple-400 mb-1">
        <Sparkles className="w-3 h-3" />
        {isComplete ? "AI Response" : "Generating..."}
        {!isComplete && <Loader2 className="w-3 h-3 animate-spin" />}
      </div>
      <div
        ref={containerRef}
        className="text-sm text-gray-200 prose prose-sm prose-invert max-h-[300px] overflow-y-auto whitespace-pre-wrap"
      >
        {text}
        {!isComplete && <span className="animate-pulse text-purple-400">▊</span>}
      </div>
    </div>
  );
}
