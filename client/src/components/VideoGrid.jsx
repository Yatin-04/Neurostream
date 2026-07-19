import React from 'react';

/**
 * VideoGrid — Adaptive tile layout with pin support.
 *
 * Props:
 *   - children: VideoTile components (first child is pinned if pinnedIndex >= 0)
 *   - pinnedIndex: number — index of the pinned child (-1 = none)
 */
export default function VideoGrid({ children, pinnedIndex = -1 }) {
  const childrenArray = React.Children.toArray(children).flat().filter(Boolean);
  const count = childrenArray.length;

  if (count === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-neuro-muted text-sm">Waiting for participants…</p>
      </div>
    );
  }

  // ── Pinned layout: 50% left + grid right ───────────────────────
  if (pinnedIndex >= 0 && pinnedIndex < count && count > 1) {
    const pinned = childrenArray[pinnedIndex];
    const others = childrenArray.filter((_, i) => i !== pinnedIndex);
    const rightCols = others.length <= 2 ? 1 : 2;

    return (
      <div className="w-full h-full flex gap-2 p-1">
        <div className="w-1/2 h-full rounded-xl overflow-hidden bg-neuro-surface border-2 border-neuro-accent/40 flex-shrink-0">
          {pinned}
        </div>
        <div
          className="flex-1 min-w-0 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${rightCols}, 1fr)`, gridAutoRows: '1fr' }}
        >
          {others.map((child, i) => (
            <div key={child.key || i} className="rounded-xl overflow-hidden bg-neuro-surface border border-neuro-border min-h-0">
              {child}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Normal layout ──────────────────────────────────────────────
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3;

  return (
    <div className="w-full h-full p-1">
      <div
        className="w-full h-full grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: '1fr' }}
      >
        {childrenArray.map((child, i) => (
          <div
            key={child.key || i}
            className="relative rounded-xl overflow-hidden bg-neuro-surface border border-neuro-border hover:border-neuro-accent/30 transition-colors min-h-0"
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
