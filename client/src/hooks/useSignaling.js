import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// ── Constants ────────────────────────────────────────────────────────

const SIGNALING_URL =
  import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001';

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * useSignaling(roomId, username)
 *
 * Manages the Socket.io connection to the NeuroStream signaling server.
 * Sends the user's username on join and stores peer usernames received
 * from the server. All signaling events are dispatched through stable
 * callback refs so consumers never miss events.
 */
export default function useSignaling(roomId, username) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [peers, setPeers] = useState([]);
  const [peerNames, setPeerNames] = useState(new Map());
  const [error, setError] = useState(null);

  // ── Callback refs (stable, never stale) ──────────────────────────
  const onOfferRef = useRef(null);
  const onAnswerRef = useRef(null);
  const onIceCandidateRef = useRef(null);
  const onUserJoinedRef = useRef(null);
  const onUserLeftRef = useRef(null);
  const pendingEvents = useRef([]);

  // Store username in a ref so the socket handler always has the latest
  const usernameRef = useRef(username);
  useEffect(() => { usernameRef.current = username; }, [username]);

  // ── Connect & join room ──────────────────────────────────────────

  useEffect(() => {
    if (!roomId) return;

    const socket = io(SIGNALING_URL, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = socket;

    // ── Connection lifecycle ────────────────────────────────────

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      // Small delay to survive React StrictMode's unmount/remount cycle
      setTimeout(() => {
        if (socket.connected) {
          socket.emit('join-room', {
            roomId,
            username: usernameRef.current || 'Anonymous',
          });
        }
      }, 50);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[useSignaling] Connection error:', err.message);
      setError(`Connection failed: ${err.message}`);
      setIsConnected(false);
    });

    // ── Room events ─────────────────────────────────────────────

    socket.on('room-peers', (peerData) => {
      // New format: [{ id, username }, ...] or old format: [string, ...]
      if (Array.isArray(peerData) && peerData.length > 0 && typeof peerData[0] === 'object') {
        setPeers(peerData.map((p) => p.id));
        setPeerNames((prev) => {
          const next = new Map(prev);
          peerData.forEach((p) => next.set(p.id, p.username));
          return next;
        });
      } else {
        setPeers(Array.isArray(peerData) ? peerData : []);
      }
    });

    socket.on('user-joined', (data) => {
      // New format: { peerId, username } or old format: string
      const peerId = typeof data === 'string' ? data : data.peerId;
      const peerUsername = typeof data === 'string' ? null : data.username;

      setPeers((prev) =>
        prev.includes(peerId) ? prev : [...prev, peerId],
      );
      if (peerUsername) {
        setPeerNames((prev) => new Map(prev).set(peerId, peerUsername));
      }
      onUserJoinedRef.current?.(peerId);
    });

    socket.on('user-left', (peerId) => {
      setPeers((prev) => prev.filter((id) => id !== peerId));
      setPeerNames((prev) => {
        const next = new Map(prev);
        next.delete(peerId);
        return next;
      });
      onUserLeftRef.current?.(peerId);
    });

    socket.on('room-full', () => {
      setError('room-full');
    });

    // ── Signaling relay events ──────────────────────────────────
    // Buffer events that arrive before refs are registered by consumer

    socket.on('offer', ({ from, offer }) => {
      if (onOfferRef.current) {
        onOfferRef.current({ from, offer });
      } else {
        pendingEvents.current.push({ type: 'offer', data: { from, offer } });
      }
    });

    socket.on('answer', ({ from, answer }) => {
      if (onAnswerRef.current) {
        onAnswerRef.current({ from, answer });
      } else {
        pendingEvents.current.push({ type: 'answer', data: { from, answer } });
      }
    });

    socket.on('ice-candidate', ({ from, candidate }) => {
      if (onIceCandidateRef.current) {
        onIceCandidateRef.current({ from, candidate });
      } else {
        pendingEvents.current.push({ type: 'ice-candidate', data: { from, candidate } });
      }
    });

    // ── Cleanup ─────────────────────────────────────────────────

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setPeers([]);
      setPeerNames(new Map());
      setError(null);
    };
  }, [roomId]);

  // ── Send helpers ─────────────────────────────────────────────────

  const sendOffer = useCallback((to, offer) => {
    socketRef.current?.emit('offer', { to, offer });
  }, []);

  const sendAnswer = useCallback((to, answer) => {
    socketRef.current?.emit('answer', { to, answer });
  }, []);

  const sendIceCandidate = useCallback((to, candidate) => {
    socketRef.current?.emit('ice-candidate', { to, candidate });
  }, []);

  // ── Listener setters (set ref, flush pending, return cleanup) ────

  const flushPending = useCallback((type, handler) => {
    const remaining = [];
    for (const evt of pendingEvents.current) {
      if (evt.type === type) handler(evt.data);
      else remaining.push(evt);
    }
    pendingEvents.current = remaining;
  }, []);

  const onOffer = useCallback((callback) => {
    onOfferRef.current = callback;
    flushPending('offer', callback);
    return () => { onOfferRef.current = null; };
  }, [flushPending]);

  const onAnswer = useCallback((callback) => {
    onAnswerRef.current = callback;
    flushPending('answer', callback);
    return () => { onAnswerRef.current = null; };
  }, [flushPending]);

  const onIceCandidate = useCallback((callback) => {
    onIceCandidateRef.current = callback;
    flushPending('ice-candidate', callback);
    return () => { onIceCandidateRef.current = null; };
  }, [flushPending]);

  const onUserJoined = useCallback((callback) => {
    onUserJoinedRef.current = callback;
    return () => { onUserJoinedRef.current = null; };
  }, []);

  const onUserLeft = useCallback((callback) => {
    onUserLeftRef.current = callback;
    return () => { onUserLeftRef.current = null; };
  }, []);

  // ── Public API ───────────────────────────────────────────────────

  return {
    socketRef,
    isConnected,
    peers,
    peerNames,
    error,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    onOffer,
    onAnswer,
    onIceCandidate,
    onUserJoined,
    onUserLeft,
  };
}
