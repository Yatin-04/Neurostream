import React, { useRef, useEffect } from 'react';

/**
 * VideoTile — A single video tile displaying a peer's media stream.
 *
 * Props:
 *   stream        MediaStream to display
 *   peerId        string — socket ID or 'local'
 *   isLocal       boolean — if true, mirror the video
 *   isMuted       boolean — show muted indicator
 *   label         string — display name (e.g., 'You', 'Peer 1')
 *   isAttentive   boolean | null — attention state (null = not tracked yet)  [Day 5 placeholder]
 *   isSpeaking    boolean — voice activity indicator                         [Day 6 placeholder]
 */
export default function VideoTile({
  stream = null,
  peerId = 'local',
  isLocal = false,
  isMuted = false,
  label = '',
  isAttentive = null,
  isSpeaking = false,
}) {
  const videoRef = useRef(null);

  // ── Attach stream to <video> element ─────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
    } else {
      video.srcObject = null;
    }

    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  // ── Attention dot color ──────────────────────────────────────────
  const attentionColor =
    isAttentive === null
      ? 'bg-neuro-muted'
      : isAttentive
        ? 'bg-neuro-success'
        : 'bg-neuro-danger';

  const attentionLabel =
    isAttentive === null
      ? 'Not tracked'
      : isAttentive
        ? 'Attentive'
        : 'Distracted';

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-neuro-surface group">
      {/* ── Video element ─────────────────────────────────────────── */}
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: isLocal ? 'scaleX(-1)' : 'none',
          }}
        />
      ) : (
        /* ── Null-stream placeholder ────────────────────────────── */
        <div className="absolute inset-0 flex items-center justify-center bg-neuro-surface">
          <div className="flex flex-col items-center gap-3 opacity-60">
            {/* User silhouette icon */}
            <svg
              className="w-16 h-16 text-neuro-muted"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .66.54 1.2 1.2 1.2h16.8c.66 0 1.2-.54 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
            <span className="text-sm text-neuro-muted font-medium tracking-wide">
              {label || 'No video'}
            </span>
          </div>
        </div>
      )}

      {/* Hidden video ref for null-stream case (keep ref stable) */}
      {!stream && <video ref={videoRef} className="hidden" />}

      {/* ── Bottom gradient overlay for label readability ────────── */}
      <div
        className="
          absolute inset-x-0 bottom-0 h-20
          bg-gradient-to-t from-black/70 via-black/30 to-transparent
          pointer-events-none
          transition-opacity duration-300
        "
      />

      {/* ── Bottom bar: label + muted icon ──────────────────────── */}
      <div
        className="
          absolute inset-x-0 bottom-0 px-3 py-2.5
          flex items-center justify-between
          transition-all duration-300
        "
      >
        {/* Label */}
        <span
          className="
            text-sm font-semibold text-white tracking-wide
            drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]
            truncate max-w-[70%]
          "
        >
          {label}
        </span>

        {/* Muted icon */}
        {isMuted && (
          <div
            className="
              flex items-center justify-center
              w-7 h-7 rounded-full
              bg-neuro-danger/80 backdrop-blur-sm
              transition-all duration-300 ease-out
              animate-fade-in
            "
            title="Muted"
          >
            <svg
              className="w-3.5 h-3.5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.49-.34 2.18" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
        )}
      </div>

      {/* ── Top-right: Attention indicator [Day 5 placeholder] ──── */}
      <div
        className="
          absolute top-2.5 right-2.5
          flex items-center gap-1.5
          transition-all duration-500 ease-out
        "
        title={attentionLabel}
      >
        <span
          className={`
            inline-block w-3 h-3 rounded-full
            ${attentionColor}
            ring-2 ring-black/20
            shadow-[0_0_6px_rgba(0,0,0,0.3)]
            transition-colors duration-500
            ${isAttentive === true ? 'animate-pulse' : ''}
          `}
        />
      </div>

      {/* ── Top-left: Speaking indicator [Day 6 placeholder] ────── */}
      {isSpeaking && (
        <div
          className="
            absolute top-2.5 left-2.5
            flex items-center justify-center
            w-7 h-7 rounded-full
            bg-neuro-accent/80 backdrop-blur-sm
            shadow-lg
            transition-all duration-300 ease-out
          "
          title="Speaking"
        >
          {/* Pulsing mic icon */}
          <svg
            className="w-3.5 h-3.5 text-white animate-pulse"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="1" width="6" height="11" rx="3" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>

          {/* Animated rings */}
          <span
            className="
              absolute inset-0 rounded-full
              border-2 border-neuro-accent/50
              animate-ping
            "
          />
        </div>
      )}

      {/* ── Hover border accent ─────────────────────────────────── */}
      <div
        className="
          absolute inset-0 rounded-xl
          border-2 border-transparent
          group-hover:border-neuro-accent/40
          transition-colors duration-300
          pointer-events-none
        "
      />

      {/* ── Inline keyframe animations ──────────────────────────── */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease-out both;
        }
      `}</style>
    </div>
  );
}
