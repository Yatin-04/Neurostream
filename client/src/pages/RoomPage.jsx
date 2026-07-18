import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useSignaling from '../hooks/useSignaling';
import useMediaStream from '../hooks/useMediaStream';
import VideoGrid from '../components/VideoGrid';
import VideoTile from '../components/VideoTile';
import { useAuth } from '../context/AuthContext';
import useCognitiveLoop from '../hooks/useCognitiveLoop';
import useAttention from '../hooks/useAttention';
import useVAD from '../hooks/useVAD';
import useWebRTCStats from '../hooks/useWebRTCStats';
import TelemetryHUD from '../components/TelemetryHUD';

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001';

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    socketRef, isConnected, peers, peerNames, error: signalingError,
    sendOffer, sendAnswer, sendIceCandidate,
    onOffer, onAnswer, onIceCandidate, onUserJoined, onUserLeft,
  } = useSignaling(roomId, user?.username);

  const {
    localStream, screenStream, isAudioEnabled, isVideoEnabled, isScreenSharing,
    hasAudio, hasVideo, toggleAudio, toggleVideo,
    startScreenShare, stopScreenShare, requestMedia, mediaWarning,
  } = useMediaStream();

  const pcs = useRef(new Map());
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [iceServers, setIceServers] = useState(DEFAULT_ICE_SERVERS);
  const makingOffer = useRef(new Set());
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const screenSenders = useRef(new Map());
  const [linkCopied, setLinkCopied] = useState(false);
  // Buffer ICE candidates until remote description is set
  const iceCandidateQueue = useRef(new Map());

  // AI Cognitive loop toggles and states
  const [aiEnabled, setAiEnabled] = useState(true);
  const [activeSenders, setActiveSenders] = useState([]);

  // F3: Machine Learning Attention Sensor
  const { isAttentive, isModelLoaded: isFaceModelLoaded } = useAttention(localStream);

  // F4: Machine Learning Voice Activity Sensor (Silero VAD)
  const { isSpeaking, isVADLoaded } = useVAD(localStream);

  // F2: Telemetry HUD
  const { stats, aggregated, history, isPolling } = useWebRTCStats(pcs.current, 500);
  const [hudExpanded, setHudExpanded] = useState(false);

  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { screenStreamRef.current = screenStream; }, [screenStream]);

  // Sync senders whenever peers or streams change
  const syncSenders = useCallback(() => {
    const senders = [];
    for (const pc of pcs.current.values()) {
      senders.push(...pc.getSenders());
    }
    setActiveSenders(senders);
  }, []);

  // ── Cognitive Control Loop (F5) ────────────────────────────────
  const {
    isThrottled,
    throttleEvents,
    bytesSaved,
    currentMode
  } = useCognitiveLoop({
    isAttentive,
    isSpeaking,
    hasVideo,
    hasAudio,
    senders: activeSenders,
    isEnabled: aiEnabled,
    isScreenSharing,
  });

  // ── Fetch TURN credentials ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch(`${SIGNALING_URL}/api/turn-credentials`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => { if (!cancelled && data.iceServers?.length) setIceServers(data.iceServers); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const iceServersRef = useRef(iceServers);
  useEffect(() => { iceServersRef.current = iceServers; }, [iceServers]);
  const sendOfferRef = useRef(sendOffer);
  useEffect(() => { sendOfferRef.current = sendOffer; }, [sendOffer]);
  const sendAnswerRef = useRef(sendAnswer);
  useEffect(() => { sendAnswerRef.current = sendAnswer; }, [sendAnswer]);
  const sendIceCandidateRef = useRef(sendIceCandidate);
  useEffect(() => { sendIceCandidateRef.current = sendIceCandidate; }, [sendIceCandidate]);

  const addRemoteStream = useCallback((key, stream) => {
    setRemoteStreams((prev) => new Map(prev).set(key, stream));
  }, []);
  const removeRemoteStream = useCallback((key) => {
    setRemoteStreams((prev) => { const n = new Map(prev); n.delete(key); return n; });
  }, []);
  const removeAllPeerStreams = useCallback((peerId) => {
    setRemoteStreams((prev) => {
      const n = new Map(prev);
      for (const k of [...n.keys()]) if (k.startsWith(`${peerId}::`)) n.delete(k);
      return n;
    });
  }, []);

  // ── Add tracks without duplicating ─────────────────────────────
  const addTracksToPC = useCallback((pc, stream) => {
    if (!stream) return;
    const existing = new Set(pc.getSenders().filter((s) => s.track).map((s) => s.track.id));
    stream.getTracks().forEach((t) => { if (!existing.has(t.id)) pc.addTrack(t, stream); });
  }, []);

  // ── Flush queued ICE candidates ────────────────────────────────
  const flushIceCandidates = useCallback(async (peerId, pc) => {
    const queue = iceCandidateQueue.current.get(peerId);
    if (!queue || queue.length === 0) return;
    iceCandidateQueue.current.set(peerId, []);
    for (const c of queue) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
  }, []);

  // ── Create peer connection (no onnegotiationneeded — manual offers) ─
  const createPC = useCallback((peerId) => {
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });

    pc.ontrack = (event) => {
      const stream = event.streams?.[0] || new MediaStream([event.track]);
      const key = `${peerId}::${stream.id}`;
      addRemoteStream(key, stream);
      event.track.addEventListener('ended', () => {
        if (stream.getTracks().every((t) => t.readyState === 'ended')) removeRemoteStream(key);
      });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) sendIceCandidateRef.current(peerId, event.candidate);
    };

    pc.onconnectionstatechange = () =>
      console.log(`[RTC] ${peerId} → ${pc.connectionState}`);

    return pc;
  }, [addRemoteStream, removeRemoteStream]);

  const getOrCreatePC = useCallback((peerId) => {
    if (pcs.current.has(peerId)) return pcs.current.get(peerId);
    const pc = createPC(peerId);
    pcs.current.set(peerId, pc);
    return pc;
  }, [createPC]);

  // ── Send offer (with state guard) ─────────────────────────────
  const doOffer = useCallback(async (peerId) => {
    const pc = getOrCreatePC(peerId);
    if (pc.signalingState !== 'stable') return;
    try {
      makingOffer.current.add(peerId);
      const offer = await pc.createOffer();
      if (pc.signalingState !== 'stable') return;
      await pc.setLocalDescription(offer);
      sendOfferRef.current(peerId, pc.localDescription);
    } catch (err) {
      console.error(`[RTC] Offer to ${peerId} failed:`, err);
    } finally {
      makingOffer.current.delete(peerId);
    }
  }, [getOrCreatePC]);

  // ── Setup a peer: add tracks + send offer ──────────────────────
  const setupPeer = useCallback((peerId) => {
    const pc = getOrCreatePC(peerId);
    if (localStreamRef.current) addTracksToPC(pc, localStreamRef.current);
    if (screenStreamRef.current) {
      const t = screenStreamRef.current.getVideoTracks()[0];
      if (t && !screenSenders.current.has(peerId)) {
        try {
          screenSenders.current.set(peerId, pc.addTrack(t, screenStreamRef.current));
        } catch {}
      }
    }
    doOffer(peerId);
    syncSenders();
  }, [getOrCreatePC, addTracksToPC, doOffer, syncSenders]);

  // ── Peers list (newcomer joins existing peers) ─────────────────
  useEffect(() => {
    peers.forEach((peerId) => {
      if (!pcs.current.has(peerId)) setupPeer(peerId);
    });
  }, [peers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── New peer joins (existing peer gets notified) ───────────────
  // Only create the PC — don't add tracks yet. Tracks will be added
  // in onOffer handler after setRemoteDescription, ensuring transceiver
  // directions match the offer's media sections.
  useEffect(() => {
    return onUserJoined((peerId) => {
      console.log(`[Room] Peer joined: ${peerId}`);
      getOrCreatePC(peerId);
    });
  }, [onUserJoined, getOrCreatePC]);

  // ── When localStream arrives — add to all existing PCs + reoffer
  useEffect(() => {
    if (!localStream) return;
    pcs.current.forEach((pc, peerId) => {
      addTracksToPC(pc, localStream);
      doOffer(peerId);
    });
    syncSenders();
  }, [localStream, addTracksToPC, doOffer, syncSenders]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Screen share management ────────────────────────────────────
  useEffect(() => {
    if (screenStream) {
      const track = screenStream.getVideoTracks()[0];
      if (!track) return;
      pcs.current.forEach((pc, peerId) => {
        if (!screenSenders.current.has(peerId)) {
          try {
            screenSenders.current.set(peerId, pc.addTrack(track, screenStream));
            doOffer(peerId);
          } catch {}
        }
      });
    } else {
      pcs.current.forEach((pc, peerId) => {
        const sender = screenSenders.current.get(peerId);
        if (sender) {
          try { pc.removeTrack(sender); doOffer(peerId); } catch {}
          screenSenders.current.delete(peerId);
        }
      });
    }
    syncSenders();
  }, [screenStream, doOffer, syncSenders]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Receive offer ──────────────────────────────────────────────
  useEffect(() => {
    return onOffer(async ({ from, offer }) => {
      const pc = getOrCreatePC(from);
      const myId = socketRef.current?.id ?? '';
      const polite = myId < from;
      const collision = makingOffer.current.has(from) || pc.signalingState !== 'stable';

      if (!polite && collision) return; // impolite ignores

      try {
        // Polite peer rolls back if needed
        if (collision) await pc.setLocalDescription({ type: 'rollback' });
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushIceCandidates(from, pc);

        // Add tracks BEFORE answering so they appear in the SDP
        if (localStreamRef.current) addTracksToPC(pc, localStreamRef.current);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendAnswerRef.current(from, pc.localDescription);
        
        // Re-sync senders after answering
        setActiveSenders(Array.from(pcs.current.values()).flatMap(p => p.getSenders()));
      } catch (err) {
        console.error(`[RTC] Offer handling error from ${from}:`, err);
      }
    });
  }, [onOffer, getOrCreatePC, socketRef, addTracksToPC, flushIceCandidates]);

  // ── Receive answer ─────────────────────────────────────────────
  useEffect(() => {
    return onAnswer(async ({ from, answer }) => {
      const pc = pcs.current.get(from);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushIceCandidates(from, pc);
      } catch (err) {
        console.error(`[RTC] Answer error from ${from}:`, err);
      }
    });
  }, [onAnswer, flushIceCandidates]);

  // ── Receive ICE candidate (queue if no remote description yet) ─
  useEffect(() => {
    return onIceCandidate(async ({ from, candidate }) => {
      const pc = pcs.current.get(from);
      if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
        // Queue it
        if (!iceCandidateQueue.current.has(from)) iceCandidateQueue.current.set(from, []);
        iceCandidateQueue.current.get(from).push(candidate);
        return;
      }
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });
  }, [onIceCandidate]);

  // ── Peer left ──────────────────────────────────────────────────
  useEffect(() => {
    return onUserLeft((peerId) => {
      const pc = pcs.current.get(peerId);
      if (pc) { pc.close(); pcs.current.delete(peerId); }
      screenSenders.current.delete(peerId);
      iceCandidateQueue.current.delete(peerId);
      removeAllPeerStreams(peerId);
    });
  }, [onUserLeft, removeAllPeerStreams]);

  // ── Cleanup ────────────────────────────────────────────────────
  useEffect(() => () => { pcs.current.forEach((pc) => pc.close()); pcs.current.clear(); }, []);

  const handleLeave = useCallback(() => {
    pcs.current.forEach((pc) => pc.close()); pcs.current.clear(); navigate('/');
  }, [navigate]);
  const handleScreenToggle = useCallback(() => {
    if (isScreenSharing) stopScreenShare(); else startScreenShare();
  }, [isScreenSharing, startScreenShare, stopScreenShare]);
  const handleCopyLink = useCallback(() => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2500);
    }).catch(() => {});
  }, [roomId]);

  // ── Room full error ────────────────────────────────────────────
  if (signalingError === 'room-full') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="glass glow-accent rounded-2xl px-10 py-8 text-center">
          <h2 className="text-xl font-bold text-neuro-text">Room is Full</h2>
          <p className="mt-2 text-sm text-neuro-muted">Maximum of 4 peers reached.</p>
          <Link to="/" className="mt-6 inline-block rounded-xl bg-neuro-accent px-6 py-2.5 text-sm font-semibold text-white">← Back to Lobby</Link>
        </div>
      </div>
    );
  }

  const peerCount = peers.length + 1;

  return (
    <div className="flex h-screen flex-col bg-neuro-bg overflow-hidden">
      {/* Header */}
      <header className="glass flex items-center justify-between border-b border-neuro-border px-4 py-3 sm:px-6 flex-shrink-0">
        <Link to="/" className="flex items-center gap-2 text-sm text-neuro-muted hover:text-neuro-text">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
          <span className="hidden sm:inline">Lobby</span>
        </Link>
        <div className="text-center">
          <span className="text-xs uppercase tracking-widest text-neuro-muted">Room</span>
          <h1 className="text-sm font-bold text-neuro-text sm:text-base">{roomId}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopyLink} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 ${linkCopied ? 'bg-neuro-success/20 text-neuro-success ring-neuro-success/30' : 'bg-neuro-surface text-neuro-muted ring-neuro-border hover:text-neuro-text'}`}>
            {linkCopied ? 'Copied!' : 'Invite'}
          </button>
          <span className={`inline-block h-2 w-2 rounded-full ${isConnected ? 'bg-neuro-success animate-pulse' : 'bg-neuro-danger'}`} />
          <span className="text-xs text-neuro-muted">{isConnected ? 'Connected' : 'Offline'}</span>
          <span className="ml-1 rounded-full bg-neuro-surface px-2 py-0.5 text-[10px] font-medium text-neuro-muted ring-1 ring-neuro-border">{peerCount} {peerCount === 1 ? 'peer' : 'peers'}</span>
        </div>
      </header>

      {mediaWarning && (
        <div className="flex items-center justify-between gap-3 border-b border-neuro-border bg-neuro-surface/50 px-4 py-2.5 sm:px-6 flex-shrink-0">
          <span className="text-xs text-neuro-muted">{mediaWarning}</span>
          {!hasAudio && !hasVideo && (
            <button onClick={requestMedia} className="rounded-lg bg-neuro-accent/20 px-3 py-1 text-xs font-medium text-neuro-accent">Retry</button>
          )}
        </div>
      )}

      {/* Video grid */}
      <main className={`relative flex-1 overflow-hidden p-3 sm:p-6 transition-all duration-300 ${hudExpanded ? 'pr-[19rem]' : ''}`} style={{ minHeight: 0 }}>
        <TelemetryHUD history={history} aggregated={aggregated} cognitiveMode={currentMode} expanded={hudExpanded} setExpanded={setHudExpanded} />
        <VideoGrid>
          <VideoTile stream={localStream} peerId="local" isLocal isMuted={!isAudioEnabled} label={user?.username || 'You'} />
          {screenStream && <VideoTile stream={screenStream} peerId="screen-local" isLocal isMuted label="Your Screen" />}
          {peers.map((peerId) => {
            const name = peerNames.get(peerId) || `Peer ${peerId.slice(-4)}`;
            const peerStreams = [...remoteStreams.entries()].filter(([k]) => k.startsWith(`${peerId}::`));
            if (peerStreams.length === 0) {
              return <VideoTile key={peerId} stream={null} peerId={peerId} isLocal={false} isMuted label={name} />;
            }
            return peerStreams.map(([key, stream]) => {
              const isScreen = stream.getVideoTracks().length > 0 && stream.getAudioTracks().length === 0;
              return <VideoTile key={key} stream={stream} peerId={key} isLocal={false} isMuted={false} label={isScreen ? `${name}'s Screen` : name} />;
            });
          })}
        </VideoGrid>
      </main>

      {/* Controls */}
      <footer className="glass border-t border-neuro-border flex-shrink-0">
        <div className="mx-auto flex max-w-lg items-center justify-center gap-3 px-4 py-3 sm:gap-4">
          <CtrlBtn active={isAudioEnabled} onClick={toggleAudio} disabled={!hasAudio} danger><MicIcon on={isAudioEnabled} /></CtrlBtn>
          <CtrlBtn active={isVideoEnabled} onClick={toggleVideo} disabled={!hasVideo} danger><CamIcon on={isVideoEnabled} /></CtrlBtn>
          <CtrlBtn active={isScreenSharing} onClick={handleScreenToggle} highlight><ScreenIcon /></CtrlBtn>
          <CtrlBtn active={aiEnabled} onClick={() => setAiEnabled(!aiEnabled)} danger={!aiEnabled}>
             <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
             </svg>
          </CtrlBtn>
          <div className="mx-1 h-8 w-px bg-neuro-border" />
          <button onClick={handleLeave} className="flex h-11 w-11 items-center justify-center rounded-full bg-neuro-danger/90 text-white hover:bg-neuro-danger active:scale-95">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
          </button>
        </div>
      </footer>
    </div>
  );
}

// ── Control button ───────────────────────────────────────────────
function CtrlBtn({ active, onClick, disabled = false, danger = false, highlight = false, children }) {
  const off = !active;
  const cls = disabled
    ? 'bg-neuro-surface/50 ring-neuro-border/50 text-neuro-muted/50 cursor-not-allowed'
    : off && danger
      ? 'bg-neuro-danger/20 ring-neuro-danger/30 text-neuro-danger hover:bg-neuro-danger/30'
      : highlight && active
        ? 'bg-neuro-accent/20 ring-neuro-accent/50 text-neuro-accent hover:bg-neuro-accent/30'
        : off
          ? 'bg-neuro-surface ring-neuro-border text-neuro-muted hover:bg-neuro-border'
          : 'bg-neuro-surface ring-neuro-border text-neuro-text hover:bg-neuro-border hover:text-neuro-accent';

  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      className={`relative flex h-11 w-11 items-center justify-center rounded-full ring-1 transition-all active:scale-95 ${cls}`}>
      {children}
      {off && danger && !disabled && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-neuro-danger ring-2 ring-neuro-bg" />}
    </button>
  );
}

function MicIcon({ on }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
      {!on && <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />}
    </svg>
  );
}

function CamIcon({ on }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      {!on && <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />}
    </svg>
  );
}

function ScreenIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
    </svg>
  );
}
