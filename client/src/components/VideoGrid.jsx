import React, { useState, useEffect, useRef } from 'react';

/**
 * VideoGrid({ children })
 *
 * Dynamically computes optimal tile layout (rows, columns, tile dimensions)
 * to maximize child tiles' sizes while preserving a 16:9 aspect ratio.
 * Tiles ALWAYS fit within the container — never overflow or cause scrolling.
 */
export default function VideoGrid({ children }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const childrenArray = React.Children.toArray(children).filter(Boolean);
  const count = childrenArray.length;

  if (count === 0) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center">
        <p className="text-neuro-muted text-sm">Waiting for participants…</p>
      </div>
    );
  }

  const { width, height } = dimensions;
  const GAP = 12;
  const ASPECT = 16 / 9;

  let bestCols = 1;
  let bestTileW = 0;
  let bestTileH = 0;

  if (width > 0 && height > 0) {
    for (let cols = 1; cols <= count; cols++) {
      const rows = Math.ceil(count / cols);

      const availW = width - (cols - 1) * GAP;
      const availH = height - (rows - 1) * GAP;

      const maxW = availW / cols;
      const maxH = availH / rows;

      // Fit ASPECT rectangle into maxW × maxH
      let w, h;
      if (maxW / maxH > ASPECT) {
        h = maxH;
        w = h * ASPECT;
      } else {
        w = maxW;
        h = w / ASPECT;
      }

      // Ensure we never exceed available space
      w = Math.min(w, maxW);
      h = Math.min(h, maxH);

      if (w * h > bestTileW * bestTileH) {
        bestTileW = w;
        bestTileH = h;
        bestCols = cols;
      }
    }
  }

  const isMeasured = width > 0 && height > 0;

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ minHeight: 0 }}
    >
      <div
        style={isMeasured ? {
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'center',
          justifyContent: 'center',
          gap: `${GAP}px`,
          width: '100%',
          height: '100%',
        } : {
          display: 'grid',
          gridTemplateColumns: count <= 1 ? '1fr' : 'repeat(2, 1fr)',
          gap: `${GAP}px`,
          width: '100%',
          height: '100%',
          placeItems: 'center',
        }}
      >
        {childrenArray.map((child, index) => (
          <div
            key={child.key || index}
            style={isMeasured ? {
              width: `${bestTileW}px`,
              height: `${bestTileH}px`,
              flexShrink: 0,
              flexGrow: 0,
              transition: 'width 0.3s ease, height 0.3s ease',
            } : {
              aspectRatio: '16 / 9',
              width: '100%',
              maxHeight: '300px',
            }}
            className="relative rounded-xl overflow-hidden shadow-lg bg-neuro-surface border border-neuro-border hover:border-neuro-accent/30 transition-colors duration-300"
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
