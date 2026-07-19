import React, { useRef, useEffect, useState } from 'react';

/**
 * VideoTile — Displays a peer's media stream with controls.
 *
 * Props:
 *   stream        MediaStream to display
 *   peerId        string — socket ID or 'local'
 *   isLocal       boolean — if true, this is the local user's camera (mirrored for self-view only)
 *   isScreen      boolean — if true, this is a screen share (never mirrored)
 *   isMuted       boolean — show muted indicator
 *   label         string — display name
 *   onPin         function — called when pin is toggled
 *   isPinned      boolean — whether this tile is pinned
 */
export default function VideoTile({
  stream = null,
  peerId = 'local',
  isLocal = false,
  isScreen = false,
  isMuted = false,
  label = '',
  onPin,
  isPinned = false,
}) {
  const videoRef = useRef(null);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (stream) {
      video.srcObject = stream;
    } else {
      video.srcObject = null;
    }
    return () => { if (video) video.srcObject = null; };
  }, [stream]);

  // Mirror logic: only mirror local camera self-view, never screen shares or remote feeds
  const shouldMirror = isLocal && !isScreen;

  // Compute transform from mirror + user flip toggles
  const scaleX = (shouldMirror ? -1 : 1) * (flipH ? -1 : 1);
  const scaleY = flipV ? -1 : 1;
  const transform = `scale(${scaleX}, ${scaleY})`;

  return (
    <div
      className="relative w-full h-full rounded-xl overflow-hidden bg-neuro-surface group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="absolute inset-0 w-full h-full object-contain bg-black"
          style={{ transform }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-neuro-surface">
          <div className="flex flex-col items-center gap-3 opacity-60">
            <svg className="w-14 h-14 text-neuro-muted" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .66.54 1.2 1.2 1.2h16.8c.66 0 1.2-.54 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
            <span className="text-sm text-neuro-muted font-medium">{label || 'No video'}</span>
          </div>
        </div>
      )}

      {!stream && <video ref={videoRef} className="hidden" />}

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

      {/* Label + muted */}
      <div className="absolute inset-x-0 bottom-0 px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-white drop-shadow truncate max-w-[70%]">{label}</span>
        {isMuted && (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-neuro-danger/80" title="Muted">
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            </svg>
          </div>
        )}
      </div>

      {/* Hover controls: pin + flip */}
      {showControls && stream && (
        <div className="absolute top-2 left-2 flex gap-1 z-10">
          {/* Pin button */}
          {onPin && (
            <button
              onClick={() => onPin(peerId)}
              className={`p-1.5 rounded-md backdrop-blur-sm transition-colors ${isPinned ? 'bg-neuro-accent/80 text-white' : 'bg-black/50 text-white/70 hover:text-white'}`}
              title={isPinned ? 'Unpin' : 'Pin'}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </button>
          )}
          {/* Flip horizontal */}
          <button
            onClick={() => setFlipH(!flipH)}
            className={`p-1.5 rounded-md backdrop-blur-sm transition-colors ${flipH ? 'bg-neuro-accent/80 text-white' : 'bg-black/50 text-white/70 hover:text-white'}`}
            title="Flip horizontal"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </button>
          {/* Flip vertical */}
          <button
            onClick={() => setFlipV(!flipV)}
            className={`p-1.5 rounded-md backdrop-blur-sm transition-colors ${flipV ? 'bg-neuro-accent/80 text-white' : 'bg-black/50 text-white/70 hover:text-white'}`}
            title="Flip vertical"
          >
            <svg className="w-3.5 h-3.5 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </button>
        </div>
      )}

      {/* Pinned indicator */}
      {isPinned && (
        <div className="absolute top-2 right-2">
          <span className="inline-block w-3 h-3 rounded-full bg-neuro-accent ring-2 ring-black/20 shadow" />
        </div>
      )}

      {/* Hover border */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-neuro-accent/40 transition-colors pointer-events-none" />
    </div>
  );
}
