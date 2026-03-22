import { X, ZoomIn, ZoomOut } from "lucide-react";

const nodes = [
  { id: "center", label: "My Notes", icon: "📒", x: 350, y: 220, isCenter: true },
  { id: "project", label: "Project Notes", icon: "📁", x: 150, y: 100 },
  { id: "meeting", label: "Meeting Notes", icon: "📝", x: 500, y: 80 },
  { id: "ideas", label: "Ideas", icon: "💡", x: 620, y: 230 },
  { id: "research", label: "Research", icon: "🔬", x: 520, y: 370 },
  { id: "getting-started", label: "Getting Started", icon: "🚀", x: 200, y: 360 },
  { id: "archive", label: "Archive", icon: "🗂️", x: 80, y: 240 },
];

const edges = [
  { from: "center", to: "project" },
  { from: "center", to: "meeting" },
  { from: "center", to: "ideas" },
  { from: "center", to: "research" },
  { from: "center", to: "getting-started" },
  { from: "center", to: "archive" },
];

function getNodeCenter(id: string) {
  const node = nodes.find(n => n.id === id);
  if (!node) return { x: 0, y: 0 };
  const w = node.isCenter ? 100 : 90;
  const h = node.isCenter ? 36 : 36;
  return { x: node.x + w / 2, y: node.y + h / 2 };
}

export default function ContentMap() {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="h-12 border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <span className="font-semibold text-gray-900">Content Map</span>
        <div className="flex items-center gap-3">
          <button className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="relative" style={{ width: 800, height: 500, margin: "auto", marginTop: 20 }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {edges.map(edge => {
              const from = getNodeCenter(edge.from);
              const to = getNodeCenter(edge.to);
              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={`M ${from.x} ${from.y} C ${from.x} ${(from.y + to.y) / 2}, ${to.x} ${(from.y + to.y) / 2}, ${to.x} ${to.y}`}
                  fill="none"
                  stroke="#d1d5db"
                  strokeWidth="2"
                />
              );
            })}
          </svg>

          {nodes.map(node => (
            <div
              key={node.id}
              className="absolute cursor-pointer"
              style={{ left: node.x, top: node.y }}
            >
              {node.isCenter ? (
                <div className="bg-blue-500 text-white rounded-xl px-4 py-2 shadow-lg font-medium text-sm flex items-center gap-2 hover:bg-blue-600 transition-colors whitespace-nowrap">
                  <span>{node.icon}</span>
                  {node.label}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md px-3 py-2 text-sm border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow flex items-center gap-2 whitespace-nowrap">
                  <span>{node.icon}</span>
                  <span className="text-gray-700">{node.label}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
