import { Search } from "lucide-react";

const categories = [
  {
    label: "BASIC",
    items: [
      { icon: "📝", name: "Text", desc: "Plain paragraph" },
      { icon: "H1", name: "Heading 1", desc: "Large header" },
      { icon: "H2", name: "Heading 2", desc: "Medium header" },
      { icon: "H3", name: "Heading 3", desc: "Small header" },
      { icon: "•", name: "Bullet List", desc: "Unordered list" },
      { icon: "1.", name: "Numbered", desc: "Ordered list" },
      { icon: "☐", name: "To-Do", desc: "Task checklist" },
      { icon: "▶", name: "Toggle", desc: "Collapsible block" },
      { icon: "❝", name: "Quote", desc: "Block quote" },
    ],
  },
  {
    label: "MEDIA",
    items: [
      { icon: "🖼️", name: "Image", desc: "Upload or embed" },
      { icon: "🎬", name: "Video", desc: "Video embed" },
      { icon: "🎙️", name: "Voice Note", desc: "Record audio" },
      { icon: "✏️", name: "Sketch", desc: "Freehand drawing" },
      { icon: "📎", name: "File", desc: "Attach a file" },
      { icon: "🔖", name: "Bookmark", desc: "Save a link" },
      { icon: "🔗", name: "Embed", desc: "Embed any URL" },
    ],
  },
  {
    label: "ADVANCED",
    items: [
      { icon: "⊞", name: "Table", desc: "Structured data" },
      { icon: "🗃️", name: "Database", desc: "Inline database" },
      { icon: "< >", name: "Code", desc: "Code block" },
      { icon: "∑", name: "Equation", desc: "Math formula" },
      { icon: "💬", name: "Callout", desc: "Highlighted note" },
      { icon: "—", name: "Divider", desc: "Horizontal rule" },
      { icon: "🔄", name: "Synced Block", desc: "Reuse anywhere" },
    ],
  },
  {
    label: "UNIQUE",
    sparkle: true,
    items: [
      { icon: "📊", name: "Progress Bar", desc: "Track progress" },
      { icon: "🗓️", name: "Timeline", desc: "Visual timeline" },
      { icon: "📊", name: "Poll", desc: "Quick poll" },
      { icon: "🃏", name: "Flashcard", desc: "Study cards" },
      { icon: "📚", name: "Reading List", desc: "Track reads" },
      { icon: "▶️", name: "Code Runner", desc: "Run code live" },
    ],
  },
];

export default function SlashCommandGrid() {
  return (
    <div className="absolute z-50 w-[480px] bg-white rounded-xl shadow-2xl border p-4 top-12 left-8">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          className="h-9 w-full border-0 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent"
          placeholder="Search blocks..."
          readOnly
        />
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {categories.map(cat => (
          <div key={cat.label}>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3 mb-2">
              {cat.sparkle && <span>✨</span>}
              {cat.label}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {cat.items.map(item => (
                <div
                  key={item.name}
                  className="p-3 rounded-lg hover:bg-blue-50 cursor-pointer border border-transparent hover:border-blue-200 transition-colors"
                >
                  <div className="text-xl mb-1 font-mono leading-none">{item.icon}</div>
                  <div className="text-sm font-medium text-gray-700">{item.name}</div>
                  <div className="text-xs text-gray-400">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
