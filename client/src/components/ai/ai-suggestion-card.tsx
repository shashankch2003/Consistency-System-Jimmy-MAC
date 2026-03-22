import { Lightbulb, X } from "lucide-react";

interface AiSuggestionCardProps {
  message: string;
  sources?: { title: string; url: string }[];
  onAccept?: () => void;
  onDismiss?: () => void;
}

export function AiSuggestionCard({ message, sources, onAccept, onDismiss }: AiSuggestionCardProps) {
  return (
    <div className="bg-blue-950/40 border border-blue-700/50 rounded-lg p-3 text-sm max-w-md">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-gray-200">{message}</p>
          {sources && sources.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {sources.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  className="text-xs text-blue-400 hover:underline block"
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.title}
                </a>
              ))}
            </div>
          )}
          <div className="mt-2 flex gap-2">
            {onAccept && (
              <button
                onClick={onAccept}
                className="text-xs px-2 py-0.5 bg-blue-700 text-white rounded hover:bg-blue-600 transition-colors"
                data-testid="button-accept-suggestion"
              >
                View Source
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                data-testid="button-dismiss-suggestion"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            data-testid="button-close-suggestion"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
