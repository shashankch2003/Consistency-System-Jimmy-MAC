interface AiModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
}

const MODELS = [
  { id: "auto", label: "Auto", description: "Best model for the task" },
  { id: "gpt-4o", label: "GPT-4o", description: "Balanced, versatile" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", description: "Faster, cheaper" },
];

export function AiModelSelector({ value, onChange }: AiModelSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs border border-gray-600 rounded px-2 py-1 bg-gray-800 text-gray-300 cursor-pointer hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
      data-testid="select-ai-model"
    >
      {MODELS.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label}
        </option>
      ))}
    </select>
  );
}
