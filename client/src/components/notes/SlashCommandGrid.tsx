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
      { icon: "🖼️", name: "Image", desc: "Upload or embed image", type: "image" },
      { icon: "🎬", name: "Video", desc: "YouTube / Vimeo embed", type: "video" },
      { icon: "📎", name: "File", desc: "Attach a file", type: "file" },
      { icon: "🔖", name: "Bookmark", desc: "Save a link", type: "bookmark" },
      { icon: "🌐", name: "Embed", desc: "Embed any URL", type: "embed" },
      { icon: "🔗", name: "Link Preview", desc: "Rich URL preview card", type: "link_preview" },
    ],
  },
  {
    label: "ADVANCED",
    items: [
      { icon: "⊞", name: "Table", desc: "Structured data grid", type: "table" },
      { icon: "< >", name: "Code", desc: "Code block with syntax", type: "code" },
      { icon: "▶ ⚙", name: "Code Runner", desc: "Run JavaScript live", type: "code_runner" },
      { icon: "💬", name: "Callout", desc: "Highlighted note", type: "callout" },
      { icon: "—", name: "Divider", desc: "Horizontal rule", type: "divider" },
      { icon: "∑", name: "Equation", desc: "LaTeX math formula", type: "equation" },
      { icon: "📑", name: "Table of Contents", desc: "Auto-generated TOC", type: "table_of_contents" },
      { icon: "🔄", name: "Synced Block", desc: "Block that syncs copies", type: "synced_block" },
      { icon: "⚡", name: "Template Button", desc: "Insert template blocks", type: "template_button" },
      { icon: "📄→", name: "Link to Page", desc: "Link to another page", type: "link_to_page" },
      { icon: "@", name: "Mention", desc: "Mention user or page", type: "mention" },
      { icon: "⊞⊞", name: "Columns", desc: "2-column layout", type: "columns" },
    ],
  },
  {
    label: "UNIQUE BLOCKS",
    sparkle: true,
    items: [
      { icon: "🎙️", name: "Voice Note", desc: "Record and transcribe audio", type: "voice_note" },
      { icon: "✏️", name: "Sketch", desc: "Draw a freehand sketch", type: "sketch" },
      { icon: "🃏", name: "Flashcard", desc: "3D flip study card", type: "flashcard" },
      { icon: "📊", name: "Progress Tracker", desc: "Labeled progress bar", type: "progress_tracker" },
      { icon: "📚", name: "Reading List", desc: "Track URLs to read", type: "reading_list" },
      { icon: "📅", name: "Timeline", desc: "Horizontal event timeline", type: "timeline" },
      { icon: "🗳️", name: "Poll", desc: "Vote on options", type: "poll" },
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

  const filtered = query.trim()
    ? ALL_ITEMS.filter(i => i.name.toLowerCase().includes(query.toLowerCase()) || i.desc.toLowerCase().includes(query.toLowerCase()) || i.type.includes(query.toLowerCase()))
    : null;

  const flatFiltered = filtered ?? ALL_ITEMS;

  useEffect(() => {
    setFocused(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setFocused(f => Math.min(f + 1, flatFiltered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)); }
      if (e.key === "Enter") { e.preventDefault(); if (flatFiltered[focused]) onSelect(flatFiltered[focused].type); }
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [focused, flatFiltered, onSelect, onClose]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (filtered && filtered.length === 0) {
    return (
      <div ref={containerRef} className="fixed z-50 w-[300px] bg-white rounded-xl shadow-2xl border p-4" style={{ top: "40%", left: "50%", transform: "translateX(-50%)" }}>
        <p className="text-sm text-gray-400 text-center py-2">No results for "{query}"</p>
      </div>
    );
  }

  if (filtered) {
    return (
      <div ref={containerRef} className="fixed z-50 w-[300px] bg-white rounded-xl shadow-2xl border p-2 max-h-[360px] overflow-y-auto" style={{ top: "40%", left: "50%", transform: "translateX(-50%)" }}>
        {filtered.map((item, i) => (
          <div
            key={item.type}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${i === focused ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}`}
            onClick={() => onSelect(item.type)}
            onMouseEnter={() => setFocused(i)}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-medium shrink-0 ${i === focused ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
              {item.icon.length <= 2 ? item.icon : <span className="text-base">{item.icon}</span>}
            </div>
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
    <div ref={containerRef} className="fixed z-50 w-[500px] bg-white rounded-xl shadow-2xl border p-4 max-h-[480px] overflow-y-auto" style={{ top: "35%", left: "50%", transform: "translateX(-50%)" }}>
      <div className="text-xs text-gray-400 mb-3">Type to filter · ↑↓ to navigate · Enter to select · Esc to close</div>
      {CATEGORIES.map(cat => (
        <div key={cat.label}>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3 mb-2 first:mt-0">
            {cat.sparkle && <span>✨</span>}
            {cat.label}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {cat.items.map(item => {
              const myIdx = globalIdx++;
              return (
                <div
                  key={item.type}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${myIdx === focused ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50 border border-transparent"}`}
                  onClick={() => onSelect(item.type)}
                  onMouseEnter={() => setFocused(myIdx)}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${myIdx === focused ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                    {item.icon.length <= 3 ? item.icon : <span className="text-sm">{item.icon.charAt(0)}</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-800 truncate">{item.name}</div>
                    <div className="text-[10px] text-gray-400 truncate">{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
