import { useState, useEffect } from "react";
import {
  startRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  undoLastStep,
  getStepCount,
  getLastStep,
  isCurrentlyPaused,
} from "@/lib/workflows/actionRecorder";
import { processRecordedSteps } from "@/lib/workflows/workflowProcessor";

interface RecordingBarProps {
  onStop?: (result: ReturnType<typeof processRecordedSteps>) => void;
  onHide?: () => void;
}

export default function RecordingBar({ onStop, onHide }: RecordingBarProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [lastStepDesc, setLastStepDesc] = useState<string>("—");

  useEffect(() => {
    startRecording();
    const interval = setInterval(() => {
      setStepCount(getStepCount());
      const last = getLastStep();
      if (last) setLastStepDesc(last.description);
    }, 500);
    return () => {
      clearInterval(interval);
    };
  }, []);

  function handlePauseResume() {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
    setIsPaused((p) => !p);
  }

  function handleStop() {
    const steps = stopRecording();
    const processed = processRecordedSteps(steps);
    onStop?.(processed);
    onHide?.();
  }

  function handleUndoLast() {
    const removed = undoLastStep();
    if (removed) {
      setStepCount((n) => Math.max(0, n - 1));
      setLastStepDesc(getLastStep()?.description ?? "—");
    }
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="h-12 bg-white rounded-full shadow-lg border px-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          {isPaused ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400" />
            </span>
          ) : (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
          )}
          <span className="text-sm font-semibold text-gray-800">
            {isPaused ? "Paused" : "Recording..."}
          </span>
        </div>

        <div className="h-5 w-px bg-gray-200" />

        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>Steps: <strong>{stepCount}</strong></span>
          <span className="text-gray-500 truncate max-w-[200px]">Last: {lastStepDesc}</span>
        </div>

        <div className="h-5 w-px bg-gray-200" />

        <div className="flex items-center gap-2">
          <button
            className="border border-gray-300 rounded-full px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            onClick={handlePauseResume}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            className="bg-red-500 text-white rounded-full px-3 py-1 text-sm hover:bg-red-600"
            onClick={handleStop}
          >
            Stop
          </button>
          <button
            className="text-gray-400 text-sm hover:text-gray-600"
            onClick={handleUndoLast}
            disabled={stepCount === 0}
          >
            Undo Last
          </button>
        </div>
      </div>
    </div>
  );
}
