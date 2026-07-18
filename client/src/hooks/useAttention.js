import { useState, useEffect, useRef } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export default function useAttention(mediaStream) {
  const [isAttentive, setIsAttentive] = useState(true);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  
  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafId = useRef(null);
  const lastVideoTime = useRef(-1);
  const inattentionStartRef = useRef(null);
  const lastLogTime = useRef(0);

  // Constants
  const YAW_THRESHOLD = 0.45; // roughly 25 degrees
  const PITCH_THRESHOLD = 0.35; // roughly 20 degrees
  const INATTENTION_DEBOUNCE_MS = 500;

  // Initialize MediaPipe FaceLandmarker Model
  useEffect(() => {
    let active = true;

    async function initModel() {
      try {
        console.log('[MediaPipe] Downloading WASM and Model...');
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        
        if (active) {
          console.log('[MediaPipe] Model loaded successfully');
          landmarkerRef.current = landmarker;
          setIsModelLoaded(true);
        }
      } catch (err) {
        console.error("[MediaPipe] Failed to load FaceLandmarker:", err);
      }
    }
    
    initModel();
    
    return () => {
      active = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, []);

  // Run Inference Loop
  useEffect(() => {
    if (!mediaStream || !isModelLoaded || !landmarkerRef.current) return;
    
    // Create an offscreen video element to feed frames into the model
    const video = document.createElement('video');
    video.srcObject = mediaStream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    videoRef.current = video;

    const renderLoop = () => {
      if (video.readyState >= 2) {
        if (lastVideoTime.current !== video.currentTime) {
          lastVideoTime.current = video.currentTime;
          
          try {
            const results = landmarkerRef.current.detectForVideo(video, performance.now());
            
            if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
              const matrix = results.facialTransformationMatrixes[0].data;
              
              // MediaPipe Transformation Matrix (row-major array)
              // m00 m01 m02 m03
              // m10 m11 m12 m13
              // m20 m21 m22 m23
              const m12 = matrix[6];
              const m02 = matrix[2];
              const m22 = matrix[10];
              
              const yaw = Math.atan2(m02, m22);
              const pitch = Math.asin(-m12);
              
              const isLookingAway = Math.abs(yaw) > YAW_THRESHOLD || Math.abs(pitch) > PITCH_THRESHOLD;
              
              // Debug log once per second
              if (Date.now() - lastLogTime.current > 1000) {
                console.log(`[MediaPipe] Yaw: ${yaw.toFixed(2)}, Pitch: ${pitch.toFixed(2)} | isLookingAway: ${isLookingAway}`);
                lastLogTime.current = Date.now();
              }
              
              if (isLookingAway) {
                if (!inattentionStartRef.current) {
                  inattentionStartRef.current = Date.now();
                } else if (Date.now() - inattentionStartRef.current > INATTENTION_DEBOUNCE_MS) {
                  setIsAttentive(false);
                }
              } else {
                inattentionStartRef.current = null;
                setIsAttentive(true);
              }
            } else {
              // No face detected - treat as looking away
              if (!inattentionStartRef.current) {
                inattentionStartRef.current = Date.now();
              } else if (Date.now() - inattentionStartRef.current > INATTENTION_DEBOUNCE_MS) {
                setIsAttentive(false);
              }
            }
          } catch (e) {
            console.error('[MediaPipe] Inference error:', e);
          }
        }
      }
      rafId.current = setTimeout(renderLoop, 1000 / 30); // 30 FPS target
    };

    video.play().then(() => {
      rafId.current = setTimeout(renderLoop, 1000 / 30);
    }).catch(console.error);

    return () => {
      clearTimeout(rafId.current);
      video.pause();
      video.srcObject = null;
    };
  }, [mediaStream, isModelLoaded]);

  return { isAttentive, isModelLoaded };
}
