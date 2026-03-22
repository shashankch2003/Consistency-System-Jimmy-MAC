interface AiDiffViewProps {
  original: string;
  modified: string;
  onAccept: () => void;
  onReject: () => void;
}

export function AiDiffView({ original, modified, onAccept, onReject }: AiDiffViewProps) {
  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-gray-700">
        <div className="p-3 bg-red-950/20">
          <div className="text-xs font-medium text-red-400 mb-1">Original</div>
          <div className="text-sm text-gray-400 line-through whitespace-pre-wrap">{original}</div>
        </div>
        <div className="p-3 bg-green-950/20">
          <div className="text-xs font-medium text-green-400 mb-1">AI Suggestion</div>
          <div className="text-sm text-gray-200 whitespace-pre-wrap">{modified}</div>
        </div>
      </div>
      <div className="flex gap-2 p-2 bg-gray-800 border-t border-gray-700">
        <button
          onClick={onAccept}
          className="text-sm px-3 py-1 bg-green-700 text-white rounded hover:bg-green-600 transition-colors"
          data-testid="button-accept-diff"
        >
          Accept
        </button>
        <button
          onClick={onReject}
          className="text-sm px-3 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors"
          data-testid="button-reject-diff"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
