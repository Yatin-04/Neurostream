import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useCognitiveLoop
 *
 * Implements the asymmetric hysteresis controller that throttles the local
 * user's outgoing video based on cognitive engagement signals.
 *
 * Inputs:
 *   - isAttentive: boolean (from face landmarker)
 *   - isSpeaking: boolean (from VAD)
 *   - hasVideo: boolean (is local camera active)
 *   - hasAudio: boolean (is local mic active)
 *   - senders: RTCRtpSender[] (all active video senders)
 *   - isEnabled: boolean (manual override)
 *   - isScreenSharing: boolean (is local screen share active)
 */
export default function useCognitiveLoop({
  isAttentive,
  isSpeaking,
  hasVideo,
  hasAudio,
  senders,
  isEnabled,
  isScreenSharing,
}) {
  const [isThrottled, setIsThrottled] = useState(false);
  const [bytesSaved, setBytesSaved] = useState(0);
  const [throttleEvents, setThrottleEvents] = useState([]);
  
  const timerRef = useRef(null);
  const throttleStartRef = useRef(null);

  // Constants
  const THROTTLE_DELAY_MS = 3000;
  const NORMAL_BITRATE_BPS = 2_500_000; // 2.5 Mbps
  const THROTTLE_BITRATE_BPS = 50_000; // 50 kbps
  
  // Actuator: Apply throttle to camera senders
  const throttleQuality = useCallback(async () => {
    let applied = false;
    
    // Execute all sender parameter updates concurrently
    const promises = senders.map(async (sender) => {
      if (!sender.track || sender.track.kind !== 'video') return;
      
      // Screen Share Immunity: Check if this is a display track
      const settings = sender.track.getSettings();
      if (settings.displaySurface) return;

      try {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) return;

        params.encodings[0].maxBitrate = THROTTLE_BITRATE_BPS;
        params.encodings[0].scaleResolutionDownBy = 4; // 1/4 resolution
        params.encodings[0].maxFramerate = 5; // Drop from 30fps to 5fps (massively saves CPU & Bandwidth)

        await sender.setParameters(params);
        applied = true;
      } catch (err) {
        console.error('[CognitiveLoop] Failed to apply throttle parameters:', err);
      }
    });

    await Promise.all(promises);
    
    if (applied && !isThrottled) {
      setIsThrottled(true);
      throttleStartRef.current = Date.now();
      setThrottleEvents((prev) => [
        ...prev,
        { timestamp: Date.now(), type: 'throttle' },
      ]);
      console.log('[CognitiveLoop] Throttled outbound video');
    }
  }, [senders, isThrottled]);

  // Actuator: Restore full quality to camera senders
  const restoreQuality = useCallback(async () => {
    let applied = false;
    
    // Execute all sender parameter updates concurrently
    const promises = senders.map(async (sender) => {
      if (!sender.track || sender.track.kind !== 'video') return;
      
      const settings = sender.track.getSettings();
      if (settings.displaySurface) return;

      try {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) return;

        delete params.encodings[0].maxBitrate;
        delete params.encodings[0].maxFramerate; // Restore native framerate
        params.encodings[0].scaleResolutionDownBy = 1;

        await sender.setParameters(params);
        applied = true;
      } catch (err) {
        console.error('[CognitiveLoop] Failed to restore parameters:', err);
      }
    });

    await Promise.all(promises);

    if (applied && isThrottled) {
      setIsThrottled(false);
      const duration = Date.now() - (throttleStartRef.current || Date.now());
      setThrottleEvents((prev) => [
        ...prev,
        { timestamp: Date.now(), type: 'restore', duration },
      ]);
      throttleStartRef.current = null;
      console.log('[CognitiveLoop] Restored outbound video');
    }
  }, [senders, isThrottled]);

  // Evaluate conditions and trigger state machine
  useEffect(() => {
    // If global switch is off, or user has no video, we must be fully restored
    if (!isEnabled || !hasVideo) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (isThrottled) {
        restoreQuality();
      }
      return;
    }

    // Determine if we *should* throttle based on available media
    // If audio is available, we check isSpeaking. If not, we ignore it.
    const attentionLost = !isAttentive;
    const voiceLost = hasAudio ? !isSpeaking : true; // If no mic, voice is "lost" by default
    
    // If the user is screen sharing, their camera is relegated to a tiny thumbnail for all peers.
    // Therefore, we aggressively throttle their camera feed regardless of attention or speaking status.
    const shouldThrottle = isScreenSharing || (attentionLost && voiceLost);

    if (shouldThrottle) {
      // Start timer if not already running and not already throttled
      if (!timerRef.current && !isThrottled) {
        timerRef.current = setTimeout(() => {
          throttleQuality();
          timerRef.current = null;
        }, THROTTLE_DELAY_MS);
      }
    } else {
      // Immediate restore if conditions break
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (isThrottled) {
        restoreQuality();
      }
    }
  }, [isAttentive, isSpeaking, hasVideo, hasAudio, isEnabled, isScreenSharing, isThrottled, throttleQuality, restoreQuality]);

  // Bandwidth accumulation loop
  useEffect(() => {
    if (!isThrottled) return;
    
    const interval = setInterval(() => {
      // Save bytes per second: (2.5Mbps - 50kbps) / 8 = Bytes per second
      // Since interval is 1000ms, this adds exactly 1 second of savings
      const bytesPerSecond = (NORMAL_BITRATE_BPS - THROTTLE_BITRATE_BPS) / 8;
      setBytesSaved((prev) => prev + bytesPerSecond);
    }, 1000);

    return () => clearInterval(interval);
  }, [isThrottled]);

  return {
    isThrottled,
    throttleEvents,
    bytesSaved,
    currentMode: !isEnabled ? 'disabled' : isThrottled ? 'throttled' : 'full',
  };
}
