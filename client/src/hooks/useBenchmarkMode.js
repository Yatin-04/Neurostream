import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Scripted benchmark sequence (60 seconds total):
 * Each entry: [startTimeSec, isAttentive, isSpeaking]
 */
const SCRIPT = [
  [0,  true,  false],  // Baseline — attentive, silent
  [10, false, false],  // Trigger throttle (after 3s hysteresis → throttles at t=13)
  [20, true,  false],  // Instant restore
  [30, false, true],   // VAD override — speaking prevents throttle
  [40, false, false],  // Throttle again (fires at t=43)
  [50, true,  true],   // Full restore
  [60, null,  null],   // END marker
];

const BENCHMARK_DURATION_MS = 60000;

/**
 * useBenchmarkMode(isActive, history, aggregated, cognitiveState)
 *
 * When active, overrides attention/VAD sensors with scripted values,
 * captures telemetry every 500ms, and exports JSON at completion.
 *
 * Returns:
 *   - isBenchmarkActive: boolean
 *   - scriptedAttentive: boolean | null (null = not overriding)
 *   - scriptedSpeaking: boolean | null
 *   - progress: number (0-100)
 *   - elapsedSec: number
 *   - currentPhase: string
 */
export default function useBenchmarkMode(isActive, history) {
  const [progress, setProgress] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [scriptedAttentive, setScriptedAttentive] = useState(null);
  const [scriptedSpeaking, setScriptedSpeaking] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const startTimeRef = useRef(null);
  const snapshotsRef = useRef([]);
  const timerRef = useRef(null);

  // Start the benchmark
  useEffect(() => {
    if (!isActive || isRunning || isComplete) return;

    setIsRunning(true);
    startTimeRef.current = Date.now();
    snapshotsRef.current = [];

    // Tick every 500ms to capture snapshots and update scripted state
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const elapsedS = elapsed / 1000;
      setElapsedSec(Math.floor(elapsedS));
      setProgress(Math.min(100, (elapsed / BENCHMARK_DURATION_MS) * 100));

      // Determine current scripted state from the timeline
      let attentive = true;
      let speaking = false;
      let phase = 'baseline';

      for (let i = SCRIPT.length - 1; i >= 0; i--) {
        if (elapsedS >= SCRIPT[i][0]) {
          if (SCRIPT[i][1] === null) {
            // END
            phase = 'complete';
            break;
          }
          attentive = SCRIPT[i][1];
          speaking = SCRIPT[i][2];
          phase = `t=${SCRIPT[i][0]}s: ${attentive ? 'attentive' : 'inattentive'}, ${speaking ? 'speaking' : 'silent'}`;
          break;
        }
      }

      setScriptedAttentive(attentive);
      setScriptedSpeaking(speaking);
      setCurrentPhase(phase);

      // Capture snapshot
      snapshotsRef.current.push({
        timestampMs: elapsed,
        isAttentive: attentive,
        isSpeaking: speaking,
        historyEntry: history.length > 0 ? history[history.length - 1] : null,
      });

      // Check completion
      if (elapsed >= BENCHMARK_DURATION_MS) {
        clearInterval(timerRef.current);
        setIsRunning(false);
        setIsComplete(true);
        setScriptedAttentive(null);
        setScriptedSpeaking(null);
        setCurrentPhase('complete');
        setProgress(100);
      }
    }, 500);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Export results as JSON download
  const exportResults = useCallback(() => {
    const data = {
      metadata: {
        timestamp: new Date().toISOString(),
        duration: BENCHMARK_DURATION_MS,
        snapshotCount: snapshotsRef.current.length,
        script: SCRIPT,
        userAgent: navigator.userAgent,
      },
      snapshots: snapshotsRef.current,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    isBenchmarkActive: isActive && isRunning,
    isComplete,
    scriptedAttentive: isRunning ? scriptedAttentive : null,
    scriptedSpeaking: isRunning ? scriptedSpeaking : null,
    progress,
    elapsedSec,
    currentPhase,
    exportResults,
  };
}
