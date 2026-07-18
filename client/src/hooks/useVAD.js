import { useState, useEffect, useRef } from 'react';
import { MicVAD } from '@ricky0123/vad-web';

export default function useVAD(mediaStream) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVADLoaded, setIsVADLoaded] = useState(false);
  const vadRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function initVAD() {
      // If there's no media stream or no audio tracks, we can't run VAD
      if (!mediaStream || mediaStream.getAudioTracks().length === 0) {
        if (vadRef.current) {
          vadRef.current.pause();
          vadRef.current = null;
        }
        setIsSpeaking(false);
        return;
      }

      try {
        console.log('[SileroVAD] Downloading WASM and Model...');
        
        // Initialize VAD and point it directly at our existing media stream
        const myvad = await MicVAD.new({
          stream: mediaStream,
          onSpeechStart: () => {
            if (active) {
              console.log('[SileroVAD] Speech started');
              setIsSpeaking(true);
            }
          },
          onSpeechEnd: (audio) => {
            if (active) {
              console.log('[SileroVAD] Speech ended');
              setIsSpeaking(false);
            }
          },
          onVADMisfire: () => {
            if (active) {
              setIsSpeaking(false);
            }
          },
          // Configuration for speech thresholds
          positiveSpeechThreshold: 0.8,
          negativeSpeechThreshold: 0.65,
          minSpeechFrames: 3, // Requires 3 continuous frames of speech to trigger
          preSpeechPadFrames: 1,
          redemptionFrames: 8 // Allows ~250ms of silence (breathing, pausing) before ending speech
        });
        
        if (active) {
          console.log('[SileroVAD] Model loaded successfully');
          vadRef.current = myvad;
          setIsVADLoaded(true);
          myvad.start();
        } else {
          // If unmounted before it finished loading
          myvad.pause();
        }
      } catch (err) {
        console.error('[SileroVAD] Failed to initialize:', err);
      }
    }

    initVAD();

    return () => {
      active = false;
      if (vadRef.current) {
        vadRef.current.pause();
      }
    };
  }, [mediaStream]);

  return { isSpeaking, isVADLoaded };
}
