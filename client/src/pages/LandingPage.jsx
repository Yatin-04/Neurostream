import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Helpers ──────────────────────────────────────────────────────────

/** Generate a random 6-character alphanumeric slug */
function randomSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 6; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

/** Convert human-readable text into a clean URL slug */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

/** Extract roomId from a pasted link or raw slug */
function parseRoomInput(input) {
  const trimmed = input.trim();
  if (!trimmed) return '';

  // If user pasted a full URL like http://localhost:5173/room/my-room-abc123
  try {
    const url = new URL(trimmed);
    const roomMatch = url.pathname.match(/\/room\/(.+)/);
    if (roomMatch) return roomMatch[1];
  } catch {
    // Not a URL — fall through
  }

  // If it looks like it already has a suffix (slug-abc123), use as-is
  if (/^[a-z0-9\-]+-[a-z0-9]{6}$/i.test(trimmed)) {
    return trimmed;
  }

  // Otherwise, treat as a human-readable name and add suffix
  const slug = slugify(trimmed);
  const suffix = randomSlug();
  return slug ? `${slug}-${suffix}` : suffix;
}

// ── Component ────────────────────────────────────────────────────────

export default function LandingPage() {
  const [roomInput, setRoomInput] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  /** Create a room — show the link and copy it, but don't navigate yet */
  const handleCreateRoom = useCallback(() => {
    const name = roomInput.trim();
    if (!name) return;
    const finalId = parseRoomInput(name);
    setCreatedRoomId(finalId);
    setLinkCopied(false);
  }, [roomInput]);

  /** Join the created/specified room */
  const handleJoinRoom = useCallback((id) => {
    if (id) navigate(`/room/${id}`);
  }, [navigate]);

  /** Copy the room link to clipboard */
  const handleCopyLink = useCallback((id) => {
    const link = `${window.location.origin}/room/${id}`;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    }).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    });
  }, []);

  /** Share via native Web Share API (mobile / desktop with support) */
  const handleShareLink = useCallback((id) => {
    const link = `${window.location.origin}/room/${id}`;
    if (navigator.share) {
      navigator.share({
        title: 'Join my Baud meeting',
        text: 'Click this link to join my video call on Baud:',
        url: link,
      }).catch(() => {});
    } else {
      // Fallback: copy to clipboard
      handleCopyLink(id);
    }
  }, [handleCopyLink]);

  /** Fill the input with a random slug */
  const handleGenerateRandom = useCallback(() => {
    const slug = randomSlug();
    setRoomInput(slug);
    setCreatedRoomId('');
  }, []);

  /** Allow Enter key to submit */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') handleCreateRoom();
    },
    [handleCreateRoom],
  );

  const roomLink = createdRoomId
    ? `${window.location.origin}/room/${createdRoomId}`
    : '';

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* ── Animated background orbs ─────────────────────────── */}
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />

      {/* ── Glass card ───────────────────────────────────────── */}
      <div className="glass glow-accent relative z-10 w-full max-w-md rounded-2xl p-8 sm:p-10">
        {/* Logo / Title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neuro-accent/10 ring-1 ring-neuro-accent/20">
            <svg
              className="h-8 w-8 text-neuro-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
              />
            </svg>
          </div>

          <h1 className="text-glow text-3xl font-bold tracking-tight sm:text-4xl">
            Ba<span className="text-neuro-accent">ud</span>
          </h1>

          <p className="mt-3 text-sm text-neuro-muted sm:text-base">
            AI-Powered Cognitive Bandwidth Optimization
          </p>
        </div>

        {/* Room input */}
        <div className="space-y-4">
          <div>
            <label htmlFor="room-slug" className="sr-only">
              Room name or invite link
            </label>
            <input
              id="room-slug"
              type="text"
              value={roomInput}
              onChange={(e) => { setRoomInput(e.target.value); setCreatedRoomId(''); }}
              onKeyDown={handleKeyDown}
              placeholder="Room name or paste invite link…"
              autoComplete="off"
              spellCheck={false}
              className="
                w-full rounded-xl border border-neuro-border bg-neuro-bg/60
                px-5 py-3.5 text-base text-neuro-text placeholder-neuro-muted
                outline-none transition-smooth
                focus:border-neuro-accent/50 focus:ring-2 focus:ring-neuro-accent/20
              "
            />
          </div>

          {/* Create / Join button */}
          {!createdRoomId ? (
            <button
              onClick={handleCreateRoom}
              disabled={!roomInput.trim()}
              className="
                w-full rounded-xl bg-neuro-accent px-5 py-3.5 text-base
                font-semibold text-white transition-smooth
                hover:bg-neuro-accent/90 hover:shadow-lg hover:shadow-neuro-accent/20
                active:scale-[0.98]
                disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none
              "
            >
              Create Room
            </button>
          ) : (
            /* ── Room created — show link + actions ────────────── */
            <div className="space-y-3 animate-in">
              {/* Link display */}
              <div className="rounded-xl bg-neuro-surface/80 px-4 py-3 ring-1 ring-neuro-border">
                <p className="mb-1 text-[10px] uppercase tracking-widest text-neuro-muted">
                  Room invite link
                </p>
                <p className="break-all text-sm font-mono text-neuro-accent">
                  {roomLink}
                </p>
              </div>

              {/* Action buttons row */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCopyLink(createdRoomId)}
                  className={`
                    flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-smooth ring-1
                    ${linkCopied
                      ? 'bg-neuro-success/20 text-neuro-success ring-neuro-success/30'
                      : 'bg-neuro-surface text-neuro-text ring-neuro-border hover:ring-neuro-accent/30 hover:bg-neuro-border'
                    }
                  `}
                >
                  {linkCopied ? (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                      </svg>
                      Copy Link
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleShareLink(createdRoomId)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-neuro-surface px-4 py-3 text-sm font-medium text-neuro-text ring-1 ring-neuro-border transition-smooth hover:ring-neuro-accent/30 hover:bg-neuro-border"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.935-2.186 2.25 2.25 0 0 0-3.935 2.186Z" />
                  </svg>
                  Share
                </button>
              </div>

              {/* Join button */}
              <button
                onClick={() => handleJoinRoom(createdRoomId)}
                className="
                  w-full rounded-xl bg-neuro-accent px-5 py-3.5 text-base
                  font-semibold text-white transition-smooth
                  hover:bg-neuro-accent/90 hover:shadow-lg hover:shadow-neuro-accent/20
                  active:scale-[0.98]
                "
              >
                Join Room →
              </button>
            </div>
          )}

          {/* Generate random slug */}
          <div className="text-center">
            <button
              onClick={handleGenerateRandom}
              className="
                text-sm text-neuro-muted transition-smooth
                hover:text-neuro-accent
              "
            >
              ✦ Generate Random Room
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-neuro-muted/60">
          Mesh network&nbsp;•&nbsp;≤4 peers&nbsp;•&nbsp;Edge AI inference
        </p>

        {/* User info & logout */}
        {user && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-neuro-surface/50 px-4 py-2.5 ring-1 ring-neuro-border">
            <span className="text-sm text-neuro-muted">
              Signed in as <span className="font-medium text-neuro-text">{user.username}</span>
            </span>
            <button onClick={logout} className="text-xs text-neuro-muted transition-smooth hover:text-neuro-danger">
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
