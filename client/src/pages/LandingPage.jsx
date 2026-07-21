import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// ── Helpers ──────────────────────────────────────────────────────────

function randomSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 6; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

function parseRoomInput(input) {
  const trimmed = input.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    const roomMatch = url.pathname.match(/\/room\/(.+)/);
    if (roomMatch) return roomMatch[1];
  } catch {}
  if (/^[a-z0-9\-]+-[a-z0-9]{6}$/i.test(trimmed)) return trimmed;
  const slug = slugify(trimmed);
  const suffix = randomSlug();
  return slug ? `${slug}-${suffix}` : suffix;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ── Background Component ─────────────────────────────────────────────
function ElementalBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#0a0a0a]">
      {/* Subtle radial gradient to give depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neuro-surface/40 via-[#0a0a0a] to-[#0a0a0a]" />
      
      {/* Very faint, slow sweeping light ray */}
      <div className="absolute top-[-50%] left-[-20%] w-[140%] h-[200%] opacity-20 transform rotate-12"
           style={{
             background: 'linear-gradient(90deg, transparent 45%, rgba(232, 122, 93, 0.05) 50%, transparent 55%)',
             animation: 'sweep 15s infinite linear'
           }}
      />

      {/* SVG Noise overlay for a tactile, paper/stone feel */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)"/>
      </svg>
      
      <style>{`
        @keyframes sweep {
          0% { transform: translateX(-50%) rotate(12deg); }
          100% { transform: translateX(50%) rotate(12deg); }
        }
      `}</style>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────

export default function LandingPage() {
  const [roomInput, setRoomInput] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [stats, setStats] = useState({ totalBandwidthSaved: 0, recentRooms: [], recentPeers: [] });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user) {
      api.get('/api/telemetry/dashboard')
        .then(res => {
          setStats(res.data);
          setLoadingStats(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingStats(false);
        });
    }
  }, [user]);

  const handleCreateRoom = useCallback(() => {
    const name = roomInput.trim();
    if (!name) return;
    const finalId = parseRoomInput(name);
    setCreatedRoomId(finalId);
    setLinkCopied(false);
  }, [roomInput]);

  const handleJoinRoom = useCallback((id) => {
    if (id) navigate(`/room/${id}`);
  }, [navigate]);

  const handleCopyLink = useCallback((id) => {
    const link = `${window.location.origin}/room/${id}`;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    }).catch(() => {});
  }, []);

  const handleShareLink = useCallback((id, peerName = null) => {
    const link = `${window.location.origin}/room/${id}`;
    if (navigator.share) {
      navigator.share({
        title: 'Join my Baud meeting',
        text: peerName ? `Hey ${peerName}, join me in this room:` : 'Join my video call on Baud:',
        url: link,
      }).catch(() => {});
    } else {
      handleCopyLink(id);
    }
  }, [handleCopyLink]);

  const handleInvitePeer = useCallback((peerName) => {
    // Instantly generate a room and invite the peer
    const slug = randomSlug();
    handleShareLink(slug, peerName);
  }, [handleShareLink]);

  const handleGenerateRandom = useCallback(() => {
    const slug = randomSlug();
    setRoomInput(slug);
    setCreatedRoomId('');
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col px-4 py-8 sm:px-8 sm:py-12 bg-[#0a0a0a] text-neuro-text font-sans">
      <ElementalBackground />
      
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col flex-1">
        
        {/* ── Header ────────────────────────────────────────── */}
        <header className="flex justify-between items-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-neuro-surface shadow-md ring-1 ring-neuro-border backdrop-blur-sm">
              <img src="/favicon.svg" alt="Baud" className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white/90">Baud</span>
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-neuro-muted">
                {user.username}
              </span>
              <div className="w-px h-4 bg-neuro-border"></div>
              <button onClick={logout} className="text-sm font-medium text-neuro-muted hover:text-neuro-accent transition-smooth">
                Sign out
              </button>
            </div>
          )}
        </header>

        {/* ── Dashboard Grid ────────────────────────────────── */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-min animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 fill-mode-both">
          
          {/* Left Column (Nexus + Impact) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* The Nexus (Input) */}
            <section className="glass rounded-2xl p-8 ring-1 ring-neuro-border/50 shadow-2xl relative overflow-hidden group">
              {/* Subtle accent glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-neuro-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              
              <h2 className="text-2xl font-light text-white/90 mb-2">Initialize Connection</h2>
              <p className="text-sm text-neuro-muted mb-6">Enter a room moniker or paste a coordinate link.</p>
              
              <div className="relative flex items-center">
                <span className="absolute left-4 text-neuro-accent font-mono text-lg select-none">&gt;</span>
                <input
                  type="text"
                  value={roomInput}
                  onChange={(e) => { setRoomInput(e.target.value); setCreatedRoomId(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateRoom(); }}
                  placeholder="_"
                  className="w-full bg-neuro-bg/80 border border-neuro-border/80 rounded-xl py-4 pl-10 pr-12 text-lg text-white font-mono placeholder-neuro-muted/30 outline-none focus:ring-1 focus:ring-neuro-accent focus:border-neuro-accent transition-all shadow-inner"
                  spellCheck={false}
                  autoComplete="off"
                />
                <button 
                  onClick={handleGenerateRandom}
                  className="absolute right-3 p-2 text-neuro-muted hover:text-neuro-accent transition-smooth"
                  title="Generate Random"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                </button>
              </div>

              {!createdRoomId ? (
                <button
                  onClick={handleCreateRoom}
                  disabled={!roomInput.trim()}
                  className="mt-6 w-full sm:w-auto px-8 py-3 bg-neuro-surface text-neuro-text rounded-xl font-medium ring-1 ring-neuro-border hover:bg-neuro-accent hover:text-white hover:ring-neuro-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Engage
                </button>
              ) : (
                <div className="mt-6 p-4 rounded-xl bg-neuro-bg/50 ring-1 ring-neuro-border/50 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-neuro-muted mb-1">Room Link</span>
                      <span className="text-sm font-mono text-neuro-accent break-all">{`${window.location.origin}/room/${createdRoomId}`}</span>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button onClick={() => handleShareLink(createdRoomId)} className="flex-1 sm:flex-none px-4 py-2 bg-neuro-surface rounded-lg text-sm hover:bg-neuro-border transition-smooth ring-1 ring-neuro-border">Share</button>
                      <button onClick={() => handleJoinRoom(createdRoomId)} className="flex-1 sm:flex-none px-6 py-2 bg-neuro-accent text-white rounded-lg text-sm font-medium hover:bg-neuro-accent/90 transition-smooth shadow-lg shadow-neuro-accent/20">Join →</button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Impact Metric */}
            <section className="glass rounded-2xl p-6 ring-1 ring-neuro-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xs uppercase tracking-widest text-neuro-muted mb-1">Lifetime Bandwidth Saved</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-mono font-light text-white tracking-tight">
                    {loadingStats ? '--' : formatBytes(stats.totalBandwidthSaved)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neuro-surface/50 ring-1 ring-neuro-border/50">
                <span className="h-2 w-2 rounded-full bg-neuro-success animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                <span className="text-[11px] font-medium text-neuro-muted uppercase tracking-wider">Edge AI Active</span>
              </div>
            </section>

          </div>

          {/* Right Column (The Network) */}
          <div className="flex flex-col gap-6">
            
            {/* Recent Peers */}
            <section className="glass rounded-2xl p-6 ring-1 ring-neuro-border/50 flex-1 flex flex-col">
              <h3 className="text-sm font-medium text-white/90 mb-4 flex items-center justify-between">
                <span>Recent Peers</span>
                <svg className="h-4 w-4 text-neuro-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
              </h3>
              
              <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: '200px' }}>
                {loadingStats ? (
                  <div className="text-xs text-neuro-muted text-center py-4">Loading network...</div>
                ) : stats.recentPeers.length === 0 ? (
                  <div className="text-xs text-neuro-muted/60 text-center py-6 border border-dashed border-neuro-border rounded-xl">No recent connections.</div>
                ) : (
                  stats.recentPeers.map(peer => (
                    <div key={peer.id} className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-neuro-surface transition-smooth cursor-default">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-neuro-border flex items-center justify-center text-xs font-bold text-neuro-text select-none">
                          {peer.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-neuro-text/90">{peer.username}</span>
                      </div>
                      <button 
                        onClick={() => handleInvitePeer(peer.username)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] uppercase tracking-wider font-semibold text-neuro-accent px-3 py-1.5 rounded bg-neuro-accent/10 hover:bg-neuro-accent hover:text-white transition-all"
                      >
                        Invite
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Recent Rooms */}
            <section className="glass rounded-2xl p-6 ring-1 ring-neuro-border/50 flex-1 flex flex-col">
              <h3 className="text-sm font-medium text-white/90 mb-4 flex items-center justify-between">
                <span>Recent Coordinates</span>
                <svg className="h-4 w-4 text-neuro-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" /></svg>
              </h3>
              
              <div className="flex flex-col gap-2">
                {loadingStats ? (
                  <div className="text-xs text-neuro-muted text-center py-4">Loading coordinates...</div>
                ) : stats.recentRooms.length === 0 ? (
                  <div className="text-xs text-neuro-muted/60 text-center py-6 border border-dashed border-neuro-border rounded-xl">No recent rooms.</div>
                ) : (
                  stats.recentRooms.map((room, idx) => (
                    <button 
                      key={`${room.room_slug}-${idx}`}
                      onClick={() => handleJoinRoom(room.room_slug)}
                      className="group flex items-center justify-between p-3 rounded-xl bg-neuro-surface/30 ring-1 ring-neuro-border/50 hover:bg-neuro-surface hover:ring-neuro-accent/50 transition-all text-left"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-mono text-neuro-text/90 group-hover:text-neuro-accent transition-colors">{room.room_slug}</span>
                      </div>
                      <span className="text-neuro-muted group-hover:text-neuro-accent transition-transform transform group-hover:translate-x-1">→</span>
                    </button>
                  ))
                )}
              </div>
            </section>

          </div>

        </main>
      </div>
    </div>
  );
}
