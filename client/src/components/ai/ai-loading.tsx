import { Sparkles, Loader2 } from "lucide-react";

interface AiLoadingProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function AiLoading({ message = "AI is thinking...", size = "md" }: AiLoadingProps) {
  const sizeClasses = {
    sm: "text-xs gap-1",
    md: "text-sm gap-2",
    lg: "text-base gap-2",
  };

  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  return (
    <div className={`flex items-center ${sizeClasses[size]} text-purple-400`}>
      <Sparkles className={iconSize} />
      <span>{message}</span>
      <Loader2 className={`${iconSize} animate-spin`} />
    </div>
  );
}
