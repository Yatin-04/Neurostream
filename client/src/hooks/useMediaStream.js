import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * useMediaStream()
 *
 * Wraps getUserMedia and getDisplayMedia with graceful degradation.
 * If the user denies permissions or has no devices, the hook resolves
 * with localStream=null instead of blocking — allowing room entry
 * without camera/mic access.
 *
 * Returns:
 *   - localStream: MediaStream | null
 *   - screenStream: MediaStream | null
 *   - isAudioEnabled / isVideoEnabled / isScreenSharing: boolean
 *   - hasAudio / hasVideo: boolean — whether tracks were acquired
 *   - isMediaReady: boolean — true once acquisition attempt completes
 *   - toggleAudio / toggleVideo: () => void
 *   - startScreenShare / stopScreenShare: () => void
 *   - requestMedia: () => Promise<void> — retry acquisition
 *   - mediaWarning: string | null — informational, never blocks UI
 */
export default function useMediaStream() {
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [mediaWarning, setMediaWarning] = useState(null);

  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // ── Graceful media acquisition (fallback chain) ────────────────────

  const acquireMedia = useCallback(async () => {
    const fallbacks = [
      { video: true, audio: true },
      { video: false, audio: true },
      { video: true, audio: false },
    ];

    const warnings = {
      '01': 'Camera unavailable — joining with audio only.',
      '10': 'Microphone unavailable — joining with video only.',
    };

    let stream = null;
    let warning = null;

    for (const constraints of fallbacks) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        const key = `${constraints.video ? 0 : 1}${constraints.audio ? 0 : 1}`;
        warning = warnings[key] || null;
        break;
      } catch {
        continue;
      }
    }

    if (!stream) {
      warning = 'Camera and microphone unavailable — joining without media. You can still see and hear others.';
    }

    // Tear down previous stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    localStreamRef.current = stream;
    setLocalStream(stream);
    setMediaWarning(warning);

    const audioTracks = stream?.getAudioTracks() ?? [];
    const videoTracks = stream?.getVideoTracks() ?? [];
    setHasAudio(audioTracks.length > 0);
    setHasVideo(videoTracks.length > 0);
    setIsAudioEnabled(audioTracks[0]?.enabled ?? false);
    setIsVideoEnabled(videoTracks[0]?.enabled ?? false);
    setIsMediaReady(true);
  }, []);

  // ── Acquire on mount ───────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    acquireMedia().then(() => {
      if (cancelled && localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    });

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    };
  }, [acquireMedia]);

  // ── Toggle helpers ─────────────────────────────────────────────────

  const toggleAudio = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsAudioEnabled(track.enabled);
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsVideoEnabled(track.enabled);
  }, []);

  // ── Screen share ───────────────────────────────────────────────────

  const cleanupScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    setIsScreenSharing(false);
  }, []);

  const startScreenShare = useCallback(async () => {
    if (isScreenSharing) return;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      setScreenStream(stream);
      setIsScreenSharing(true);

      // Auto-cleanup when user clicks the browser's native "Stop sharing" button
      stream.getVideoTracks()[0]?.addEventListener('ended', cleanupScreenShare);
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'NotAllowedError') return;
      setMediaWarning(`Screen sharing failed: ${err.message}`);
    }
  }, [isScreenSharing, cleanupScreenShare]);

  const stopScreenShare = useCallback(() => cleanupScreenShare(), [cleanupScreenShare]);

  // ── Retry media (user may grant permission later) ──────────────────

  const requestMedia = useCallback(() => acquireMedia(), [acquireMedia]);

  // ── Public API ─────────────────────────────────────────────────────

  return {
    localStream,
    screenStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    hasAudio,
    hasVideo,
    isMediaReady,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    requestMedia,
    mediaWarning,
  };
}
