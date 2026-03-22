import { useState, useEffect, useRef } from "react";
import { BlockType } from "./NotesContext";

interface Item { icon: string; name: string; desc: string; type: BlockType; }
interface Category { label: string; sparkle?: boolean; items: Item[]; }

const CATEGORIES: Category[] = [
  {
    label: "BASIC",
    items: [
      { icon: "📝", name: "Text", desc: "Plain paragraph", type: "text" },
      { icon: "H1", name: "Heading 1", desc: "Large header", type: "heading1" },
      { icon: "H2", name: "Heading 2", desc: "Medium header", type: "heading2" },
      { icon: "H3", name: "Heading 3", desc: "Small header", type: "heading3" },
      { icon: "•", name: "Bullet List", desc: "Unordered list", type: "bullet_list" },
      { icon: "1.", name: "Numbered", desc: "Ordered list", type: "numbered_list" },
      { icon: "☐", name: "To-Do", desc: "Task checklist", type: "todo" },
      { icon: "▶", name: "Toggle", desc: "Collapsible block", type: "toggle" },
      { icon: "❝", name: "Quote", desc: "Block quote", type: "quote" },
    ],
  },
  {
    label: "MEDIA",
    items: [
      { icon: "🖼️", name: "Image", desc: "Upload or embed", type: "image" },
      { icon: "🎬", name: "Video", desc: "Video embed", type: "video" },
      { icon: "📎", name: "File", desc: "Attach a file", type: "file" },
      { icon: "🔖", name: "Bookmark", desc: "Save a link", type: "bookmark" },
      { icon: "🔗", name: "Embed", desc: "Embed any URL", type: "embed" },
    ],
  },
  {
    label: "ADVANCED",
    items: [
      { icon: "⊞", name: "Table", desc: "Structured data", type: "table" },
      { icon: "< >", name: "Code", desc: "Code block", type: "code" },
      { icon: "💬", name: "Callout", desc: "Highlighted note", type: "callout" },
      { icon: "—", name: "Divider", desc: "Horizontal rule", type: "divider" },
    ],
  },
];

const ALL_ITEMS = CATEGORIES.flatMap(c => c.items);

interface Props {
  query: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

export default function SlashCommandGrid({ query, onSelect, onClose }: Props) {
  const [focused, setFocused] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim() === ""
    ? ALL_ITEMS
    : ALL_ITEMS.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.type.toLowerCase().includes(query.toLowerCase())
      );

  useEffect(() => { setFocused(0); }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setFocused(f => Math.min(f + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)); }
      if (e.key === "Enter" && filtered[focused]) { e.preventDefault(); onSelect(filtered[focused].type); }
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [filtered, focused, onSelect, onClose]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (filtered.length === 0) {
    return (
      <div ref={containerRef} className="fixed z-50 w-[300px] bg-white rounded-xl shadow-2xl border p-4" style={{ top: "40%", left: "50%", transform: "translateX(-50%)" }}>
        <p className="text-sm text-gray-400 text-center py-2">No results for "{query}"</p>
      </div>
    );
  }

  if (query.trim() !== "") {
    return (
      <div ref={containerRef} className="fixed z-50 w-[300px] bg-white rounded-xl shadow-2xl border p-2 max-h-[360px] overflow-y-auto" style={{ top: "40%", left: "50%", transform: "translateX(-50%)" }}>
        {filtered.map((item, i) => (
          <div
            key={item.type}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${i === focused ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}`}
            onMouseEnter={() => setFocused(i)}
            onClick={() => onSelect(item.type)}
          >
            <span className="text-xl w-7 text-center shrink-0 font-mono">{item.icon}</span>
            <div>
              <div className="text-sm font-medium text-gray-800">{item.name}</div>
              <div className="text-xs text-gray-400">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  let globalIdx = 0;
  return (
    <div ref={containerRef} className="fixed z-50 w-[480px] bg-white rounded-xl shadow-2xl border p-4 max-h-[420px] overflow-y-auto" style={{ top: "35%", left: "50%", transform: "translateX(-50%)" }}>
      {CATEGORIES.map(cat => (
        <div key={cat.label}>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3 mb-2 first:mt-0">
            {cat.sparkle && <span>✨</span>}
            {cat.label}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {cat.items.map(item => {
              const idx = globalIdx++;
              return (
                <div
                  key={item.type}
                  className={`p-3 rounded-lg cursor-pointer border transition-colors ${idx === focused ? "bg-blue-50 border-blue-200" : "border-transparent hover:bg-blue-50 hover:border-blue-200"}`}
                  onMouseEnter={() => setFocused(idx)}
                  onClick={() => onSelect(item.type)}
                >
                  <div className="text-xl mb-1 font-mono leading-none">{item.icon}</div>
                  <div className="text-sm font-medium text-gray-700">{item.name}</div>
                  <div className="text-xs text-gray-400">{item.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
