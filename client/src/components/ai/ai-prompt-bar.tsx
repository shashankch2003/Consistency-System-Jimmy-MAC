import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, X } from "lucide-react";
import { AiStreamingDisplay } from "./ai-streaming-display";
import { AiModelSelector } from "./ai-model-selector";

interface AiPromptBarProps {
  context?: string;
  contextLabel?: string;
  placeholder?: string;
  onResult?: (text: string) => void;
  onClose?: () => void;
  feature: string;
}

export function AiPromptBar({
  context,
  contextLabel,
  placeholder = "Ask AI anything...",
  onResult,
  onClose,
  feature,
}: AiPromptBarProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setStreamedText("");
    setIsComplete(false);

    try {
      const response = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input,
          context: context || undefined,
          model: selectedModel === "auto" ? undefined : selectedModel,
          feature,
        }),
      });

      if (!response.ok) throw new Error("Request failed");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setStreamedText(fullText);
      }

      setIsComplete(true);
    } catch {
      setStreamedText("Sorry, something went wrong. Please try again.");
      setIsComplete(true);
    } finally {
      setIsLoading(false);
    }
  }, [input, context, selectedModel, feature, isLoading]);

  return (
    <div className="border border-gray-700 rounded-lg bg-gray-900 shadow-xl p-4 max-w-2xl w-full">
      {contextLabel && (
        <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-purple-400" />
          Context: {contextLabel}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          className="flex-1 resize-none border border-gray-600 rounded-md p-2 text-sm min-h-[40px] max-h-[120px] bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          rows={1}
          data-testid="input-ai-prompt"
        />
        <AiModelSelector value={selectedModel} onChange={setSelectedModel} />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !input.trim()}
          className="p-2 bg-purple-700 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          data-testid="button-ai-submit"
        >
          <Send className="w-4 h-4" />
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
            data-testid="button-ai-close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {streamedText && (
        <div className="mt-3 border-t border-gray-700 pt-3">
          <AiStreamingDisplay text={streamedText} isComplete={isComplete} />
          {isComplete && (
            <div className="mt-2 flex gap-2">
              {onResult && (
                <button
                  onClick={() => onResult(streamedText)}
                  className="text-sm px-3 py-1 bg-green-700 text-white rounded hover:bg-green-600 transition-colors"
                  data-testid="button-ai-use-result"
                >
                  Use this
                </button>
              )}
              <button
                onClick={() => { setStreamedText(""); setIsComplete(false); }}
                className="text-sm px-3 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors"
                data-testid="button-ai-retry"
              >
                Try again
              </button>
              <button
                onClick={() => { setStreamedText(""); setIsComplete(false); setInput(""); }}
                className="text-sm px-3 py-1 text-gray-400 hover:text-gray-200 transition-colors"
                data-testid="button-ai-discard"
              >
                Discard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
