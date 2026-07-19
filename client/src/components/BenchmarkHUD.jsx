import React from 'react';

/**
 * BenchmarkHUD — Minimal overlay shown during scripted benchmark mode.
 * Displays elapsed time, current phase, progress bar, and export button.
 */
export default function BenchmarkHUD({ elapsedSec, currentPhase, progress, isComplete, onExport }) {
  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[80] w-80 rounded-xl bg-neuro-bg/95 border border-neuro-accent/30 shadow-xl backdrop-blur-sm px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-neuro-accent animate-pulse" />
          <span className="text-xs font-bold text-neuro-accent uppercase tracking-wider">Benchmark</span>
        </div>
        <span className="text-xs font-mono text-neuro-text">{elapsedSec}s / 60s</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-neuro-surface overflow-hidden mb-2">
        <div
          className="h-full rounded-full bg-neuro-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-[10px] text-neuro-muted truncate">{currentPhase}</p>

      {isComplete && (
        <button
          onClick={onExport}
          className="mt-2 w-full rounded-lg bg-neuro-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-neuro-accent/90 transition-colors"
        >
          ⬇ Download Results JSON
        </button>
      )}
    </div>
  );
}
