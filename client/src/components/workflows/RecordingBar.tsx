export default function RecordingBar() {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="h-12 bg-white rounded-full shadow-lg border px-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-sm font-semibold text-gray-800">Recording...</span>
        </div>

        <div className="h-5 w-px bg-gray-200" />

        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>Steps: <strong>5</strong></span>
          <span className="text-gray-500 truncate max-w-[200px]">Last: Created task</span>
        </div>

        <div className="h-5 w-px bg-gray-200" />

        <div className="flex items-center gap-2">
          <button className="border border-gray-300 rounded-full px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">
            Pause
          </button>
          <button className="bg-red-500 text-white rounded-full px-3 py-1 text-sm hover:bg-red-600">
            Stop
          </button>
          <button className="text-gray-400 text-sm hover:text-gray-600">
            Undo Last
          </button>
        </div>
      </div>
    </div>
  );
}
