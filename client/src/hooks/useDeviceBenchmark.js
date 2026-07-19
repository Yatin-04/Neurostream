import { useState, useEffect, useRef } from 'react';

const MIN_BENCHMARK_FPS = 24;
const BENCHMARK_DURATION_MS = 5000;

/**
 * useDeviceBenchmark(localStream)
 *
 * Runs a 5-second benchmark measuring requestAnimationFrame throughput
 * while MediaPipe FaceLandmarker runs inference on the local video feed.
 * If measured FPS drops below 24, the device is classified as "low-end"
 * and the cognitive AI engine should be disabled.
 *
 * Returns:
 *   - benchmarkComplete: boolean — true once the 5s test finishes
 *   - isLowEnd: boolean — true if device can't sustain 24fps under AI load
 *   - measuredFps: number — the FPS measured during benchmark
 *   - isBenchmarking: boolean — true while test is running
 */
export default function useDeviceBenchmark(localStream) {
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkComplete, setBenchmarkComplete] = useState(false);
  const [isLowEnd, setIsLowEnd] = useState(false);
  const [measuredFps, setMeasuredFps] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    // Only run once, and only when we have a video stream
    if (hasRun.current || !localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) {
      // No video track — can't benchmark, assume capable
      setBenchmarkComplete(true);
      return;
    }

    hasRun.current = true;
    setIsBenchmarking(true);

    let frameCount = 0;
    let rafId = null;
    const startTime = performance.now();

    const countFrame = () => {
      frameCount++;
      const elapsed = performance.now() - startTime;

      if (elapsed < BENCHMARK_DURATION_MS) {
        rafId = requestAnimationFrame(countFrame);
      } else {
        // Benchmark complete
        const fps = Math.round((frameCount / elapsed) * 1000);
        const lowEnd = fps < MIN_BENCHMARK_FPS;

        console.log(`[Benchmark] ${fps} fps over ${Math.round(elapsed)}ms — ${lowEnd ? 'LOW-END' : 'OK'}`);

        setMeasuredFps(fps);
        setIsLowEnd(lowEnd);
        setIsBenchmarking(false);
        setBenchmarkComplete(true);
      }
    };

    rafId = requestAnimationFrame(countFrame);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [localStream]);

  return { benchmarkComplete, isLowEnd, measuredFps, isBenchmarking };
}
