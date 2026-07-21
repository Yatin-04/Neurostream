import { useState, useEffect, useRef } from 'react';

export default function useWebRTCStats(peerConnections, intervalMs = 1000, cameraTrackId = null) {
  const [stats, setStats] = useState(new Map());
  const [history, setHistory] = useState([]);
  const [aggregated, setAggregated] = useState({
    totalBytesSentDelta: 0,
    totalBytesReceivedDelta: 0,
    avgJitter: 0,
    avgPacketLossRate: 0,
    avgRTT: 0,
  });
  
  const [isPolling, setIsPolling] = useState(false);
  const previousStatsRef = useRef(new Map());

  useEffect(() => {
    if (!peerConnections) {
      setIsPolling(false);
      return;
    }

    let active = true;
    setIsPolling(true);

    const pollStats = async () => {
      const currentStats = new Map();
      let totalBytesSentDelta = 0;
      let totalBytesReceivedDelta = 0;
      let sumJitter = 0;
      let sumPacketLossRate = 0;
      let sumRTT = 0;
      let peerCount = 0;

      // Clean up previousStatsRef for disconnected peers
      for (const key of previousStatsRef.current.keys()) {
        if (!peerConnections.has(key)) {
          previousStatsRef.current.delete(key);
        }
      }

      for (const [peerId, pc] of peerConnections.entries()) {
        try {
          if (pc.signalingState === 'closed') continue;
          
          const report = await pc.getStats();
          const prev = previousStatsRef.current.get(peerId) || {
            bytesSent: 0,
            bytesReceived: 0,
            packetsLost: 0,
            framesEncoded: 0,
            timestamp: 0
          };

          let bytesSent = 0;
          let bytesReceived = 0;
          let jitter = 0;
          let packetsLost = 0;
          let framesEncoded = 0;
          let availableOutgoingBitrate = 0;
          let currentRoundTripTime = 0;
          let timestamp = Date.now();

          report.forEach(stat => {
            if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
              // Only track the camera feed, ignore screen share.
              // To do this, we check if the track corresponds to the camera.
              // We'll use the trackId to look up the track stat, or just assume the first video track if no cameraTrackId is provided.
              // Wait, a better way is to check the track's id directly if we pass it, or we can look at the sender.
              // For now, let's just use the `cameraTrackId` from props.
              if (cameraTrackId) {
                const trackStat = stat.trackId ? report.get(stat.trackId) : null;
                const mediaSourceStat = stat.mediaSourceId ? report.get(stat.mediaSourceId) : null;
                const statTrackIdentifier = (trackStat && trackStat.trackIdentifier) || (mediaSourceStat && mediaSourceStat.trackIdentifier);
                
                if (statTrackIdentifier && statTrackIdentifier !== cameraTrackId) {
                  return; // Skip screen share track
                }
              }
              bytesSent = stat.bytesSent || prev.bytesSent;
              framesEncoded = stat.framesEncoded || prev.framesEncoded;
              timestamp = stat.timestamp;
            }
            if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
              bytesReceived = stat.bytesReceived || prev.bytesReceived;
              jitter = stat.jitter || 0;
              packetsLost = stat.packetsLost || prev.packetsLost;
            }
            if (stat.type === 'candidate-pair' && stat.state === 'succeeded' && stat.nominated) {
              availableOutgoingBitrate = stat.availableOutgoingBitrate || 0;
              currentRoundTripTime = stat.currentRoundTripTime || 0;
            }
          });

          // Calculate deltas
          let bytesSentDelta = bytesSent - prev.bytesSent;
          if (bytesSentDelta < 0) bytesSentDelta = bytesSent;
          
          let bytesReceivedDelta = bytesReceived - prev.bytesReceived;
          if (bytesReceivedDelta < 0) bytesReceivedDelta = bytesReceived;

          let packetsLostDelta = packetsLost - prev.packetsLost;
          if (packetsLostDelta < 0) packetsLostDelta = packetsLost;
          
          let framesEncodedDelta = framesEncoded - prev.framesEncoded;
          if (framesEncodedDelta < 0) framesEncodedDelta = framesEncoded;

          const packetLossRate = packetsLostDelta;

          currentStats.set(peerId, {
            bytesSent,
            bytesSentDelta,
            bytesReceived,
            bytesReceivedDelta,
            jitter,
            packetsLost,
            packetLossRate,
            availableOutgoingBitrate,
            framesEncoded,
            framesEncodedDelta,
            currentRoundTripTime
          });

          previousStatsRef.current.set(peerId, {
            bytesSent,
            bytesReceived,
            packetsLost,
            framesEncoded,
            timestamp
          });

          totalBytesSentDelta += bytesSentDelta;
          totalBytesReceivedDelta += bytesReceivedDelta;
          sumJitter += jitter;
          sumPacketLossRate += packetLossRate;
          sumRTT += currentRoundTripTime;
          peerCount++;

        } catch (err) {
          console.error(`[WebRTCStats] Failed to poll peer ${peerId}`, err);
        }
      }

      if (active) {
        setStats(currentStats);

        const currentAggregated = {
          totalBytesSentDelta,
          totalBytesReceivedDelta,
          avgJitter: peerCount > 0 ? sumJitter / peerCount : 0,
          avgPacketLossRate: peerCount > 0 ? sumPacketLossRate / peerCount : 0,
          avgRTT: peerCount > 0 ? sumRTT / peerCount : 0,
        };
        
        setAggregated(currentAggregated);

        setHistory(prev => {
          const newHistory = [...prev, { 
            timestamp: Date.now(), 
            // Convert delta bytes to bits per second (assuming intervalMs = 1000)
            sentBps: (currentAggregated.totalBytesSentDelta * 8) / (intervalMs / 1000),
            recvBps: (currentAggregated.totalBytesReceivedDelta * 8) / (intervalMs / 1000),
            ...currentAggregated 
          }];
          if (newHistory.length > 60) {
            newHistory.shift();
          }
          return newHistory;
        });
      }
    };

    const intervalId = setInterval(pollStats, intervalMs);
    pollStats();

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [peerConnections, intervalMs, cameraTrackId]);

  return { stats, aggregated, history, isPolling };
}
