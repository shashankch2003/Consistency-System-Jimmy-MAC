import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { Send, Paperclip, Smile, Bold, Italic, Code, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessageComposerProps {
  onSend: (content: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MessageComposer({
  onSend,
  onTypingStart,
  onTypingStop,
  placeholder = "Type a message...",
  disabled = false,
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    if (val.trim() && !isTypingRef.current) {
      isTypingRef.current = true;
      onTypingStart?.();
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingStop?.();
    }, 2000);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  };

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setContent("");
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    onTypingStop?.();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [content, disabled, onSend, onTypingStop]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertFormat = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    const newContent = content.slice(0, start) + prefix + selected + suffix + content.slice(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  return (
    <div className={cn(
      "border rounded-xl transition-colors",
      isFocused ? "border-violet-500/50 bg-white/[0.05]" : "border-white/[0.08] bg-white/[0.03]"
    )}>
      <div className="flex items-center gap-1 px-3 pt-2 pb-1 border-b border-white/[0.05]">
        <button
          onClick={() => insertFormat("**")}
          className="p-1.5 rounded text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          title="Bold"
          data-testid="button-format-bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertFormat("_")}
          className="p-1.5 rounded text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          title="Italic"
          data-testid="button-format-italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertFormat("`")}
          className="p-1.5 rounded text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          title="Code"
          data-testid="button-format-code"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <button
          className="p-1.5 rounded text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          title="Mention"
          data-testid="button-mention"
        >
          <AtSign className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1.5 rounded text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          title="Emoji"
          data-testid="button-emoji"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1.5 rounded text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          title="Attach file"
          data-testid="button-attach"
        >
          <Paperclip className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-end gap-2 px-3 py-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 resize-none outline-none min-h-[24px] max-h-[200px] leading-6 disabled:opacity-50"
          data-testid="input-message-composer"
        />
        <Button
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          size="sm"
          className={cn(
            "shrink-0 h-8 w-8 p-0 rounded-lg transition-colors",
            content.trim()
              ? "bg-violet-600 hover:bg-violet-700 text-white"
              : "bg-white/[0.06] text-white/20 cursor-not-allowed"
          )}
          data-testid="button-send-message"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
