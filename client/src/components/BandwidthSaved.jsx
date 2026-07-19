import React, { useState, useCallback } from 'react';

/**
 * Formats bytes into human-readable units (B → KB → MB → GB).
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Formats milliseconds into human-readable duration.
 */
function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

/**
 * BandwidthSavedCounter — Live indicator showing cumulative bandwidth saved.
 * Appears in the bottom bar when AI engine has saved any bandwidth.
 */
export function BandwidthSavedCounter({ bytesSaved, isThrottled }) {
  if (bytesSaved <= 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-neuro-success/10 px-2.5 py-1 ring-1 ring-neuro-success/20">
      <svg className="h-3.5 w-3.5 text-neuro-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
      </svg>
      <span className="text-[10px] font-medium text-neuro-success">
        Saved {formatBytes(bytesSaved)}
      </span>
      {isThrottled && <span className="h-1.5 w-1.5 rounded-full bg-neuro-success animate-pulse" />}
    </div>
  );
}

/**
 * SessionSummary — Modal card shown when user leaves a room.
 * Displays session stats: duration, throttle time, bandwidth saved, events.
 */
export function SessionSummary({ visible, onClose, sessionData }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = [
      `NeuroStream Session Summary`,
      `──────────────────────────`,
      `Duration: ${formatDuration(sessionData.duration)}`,
      `Time Throttled: ${formatDuration(sessionData.throttledTime)} (${sessionData.throttlePercent}%)`,
      `Bandwidth Saved: ${formatBytes(sessionData.bytesSaved)}`,
      `Throttle Events: ${sessionData.throttleCount}`,
      `Avg Bitrate (Full): ~2,500 kbps`,
      `Avg Bitrate (Throttled): ~50 kbps`,
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [sessionData]);

  if (!visible || !sessionData) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-neuro-bg border border-neuro-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neuro-success/10 ring-1 ring-neuro-success/20">
            <svg className="h-6 w-6 text-neuro-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-neuro-text">Session Complete</h2>
          <p className="mt-1 text-xs text-neuro-muted">AI bandwidth optimization results</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 px-6 pb-4">
          <StatBox label="Duration" value={formatDuration(sessionData.duration)} />
          <StatBox label="Throttled" value={`${sessionData.throttlePercent}%`} sub={formatDuration(sessionData.throttledTime)} />
          <StatBox label="Saved" value={formatBytes(sessionData.bytesSaved)} highlight />
          <StatBox label="Events" value={sessionData.throttleCount.toString()} sub="throttle cycles" />
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-neuro-border px-6 py-4">
          <button
            onClick={handleCopy}
            className="flex-1 rounded-xl bg-neuro-surface px-4 py-2.5 text-sm font-medium text-neuro-text ring-1 ring-neuro-border hover:ring-neuro-accent/30 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy Stats'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-neuro-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-neuro-accent/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, highlight = false }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ${highlight ? 'bg-neuro-success/10 ring-1 ring-neuro-success/20' : 'bg-neuro-surface/60 ring-1 ring-neuro-border/50'}`}>
      <p className="text-[10px] text-neuro-muted uppercase tracking-wider">{label}</p>
      <p className={`text-base font-bold font-mono mt-0.5 ${highlight ? 'text-neuro-success' : 'text-neuro-text'}`}>{value}</p>
      {sub && <p className="text-[10px] text-neuro-muted mt-0.5">{sub}</p>}
    </div>
  );
}
