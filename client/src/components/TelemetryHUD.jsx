import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

// ── Info tooltip component ───────────────────────────────────────

function InfoTip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex ml-1">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        onBlur={() => setShow(false)}
        className="h-3.5 w-3.5 rounded-full border border-neuro-muted/40 text-neuro-muted/60 hover:text-neuro-accent hover:border-neuro-accent/50 transition-colors flex items-center justify-center text-[8px] font-bold"
      >
        i
      </button>
      {show && (
        <span className="absolute top-5 right-0 w-48 rounded-lg bg-neuro-surface border border-neuro-border px-3 py-2 text-[10px] text-neuro-muted leading-relaxed shadow-xl z-[70] whitespace-normal">
          {text}
          <span className="absolute -top-1 right-2 w-2 h-2 bg-neuro-surface border-l border-t border-neuro-border rotate-45" />
        </span>
      )}
    </span>
  );
}

// ── Metric card ──────────────────────────────────────────────────

function MetricCard({ label, value, unit, color, info }) {
  return (
    <div className="rounded-lg bg-neuro-surface/60 px-3 py-2 border border-neuro-border/50">
      <div className="flex items-center">
        <span className="text-[10px] text-neuro-muted uppercase tracking-wider">{label}</span>
        <InfoTip text={info} />
      </div>
      <p className={`text-base font-mono font-bold ${color} mt-0.5`}>
        {value} <span className="text-[9px] font-sans text-neuro-muted">{unit}</span>
      </p>
    </div>
  );
}

// ── Custom chart tooltip ─────────────────────────────────────────

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-neuro-bg/95 border border-neuro-border rounded-lg px-3 py-2 text-[10px] shadow-xl backdrop-blur-sm">
      <p className="text-cyan-400">↑ Tx: {Math.round(payload[0]?.value / 1000)} kbps</p>
      <p className="text-emerald-400">↓ Rx: {Math.round(payload[1]?.value / 1000)} kbps</p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────

export default function TelemetryHUD({ history = [], aggregated, cognitiveMode, expanded, setExpanded }) {

  const sentKbps = aggregated ? (aggregated.totalBytesSentDelta * 8) / 1000 : 0;
  const recvKbps = aggregated ? (aggregated.totalBytesReceivedDelta * 8) / 1000 : 0;
  const jitterMs = aggregated ? aggregated.avgJitter * 1000 : 0;
  const rttMs = aggregated ? aggregated.avgRTT * 1000 : 0;
  const lossRate = aggregated ? aggregated.avgPacketLossRate : 0;

  // Collapsed: just a small toggle button
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-neuro-surface/80 backdrop-blur-md px-3 py-2 text-xs text-neuro-muted ring-1 ring-neuro-border hover:ring-neuro-accent/40 hover:text-neuro-text transition-all shadow-lg"
        title="Show telemetry (Ctrl+Shift+D)"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
        <span className="font-mono">{sentKbps.toFixed(0)} kbps</span>
        {cognitiveMode === 'throttled' && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />}
      </button>
    );
  }

  // Expanded: side panel (right edge, doesn't overlap video grid)
  return (
    <div className="fixed top-14 right-0 bottom-16 w-72 z-50 flex flex-col bg-neuro-bg/95 backdrop-blur-xl border-l border-neuro-border shadow-2xl overflow-visible">
      {/* Header with close button */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neuro-border/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-neuro-success animate-pulse" />
          <span className="text-[11px] font-semibold text-neuro-text uppercase tracking-wider">Telemetry</span>
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="rounded-md p-1 text-neuro-muted hover:text-neuro-text hover:bg-neuro-surface transition-colors"
          title="Collapse (Ctrl+Shift+D)"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Cognitive state indicator */}
      {cognitiveMode && (
        <div className={`mx-3 mt-3 rounded-lg px-3 py-2 text-[10px] font-medium ring-1 ${
          cognitiveMode === 'throttled' ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20' :
          cognitiveMode === 'disabled' ? 'bg-neuro-surface text-neuro-muted ring-neuro-border' :
          'bg-neuro-success/10 text-neuro-success ring-neuro-success/20'
        }`}>
          {cognitiveMode === 'throttled' && 'AI Engine: ⚡ Throttled (saving bandwidth)'}
          {cognitiveMode === 'disabled' && 'AI Engine: ⏸ Inactive (no camera to optimize)'}
          {cognitiveMode === 'full' && 'AI Engine: ✓ Full Quality'}
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2 px-3 pt-3">
        <MetricCard label="Tx" value={sentKbps.toFixed(0)} unit="kbps" color="text-cyan-400"
          info="Outbound bitrate — data you're sending to peers. Drops when AI throttles." />
        <MetricCard label="Rx" value={recvKbps.toFixed(0)} unit="kbps" color="text-emerald-400"
          info="Inbound bitrate — data received from peers. Never affected by your AI engine." />
        <MetricCard label="Jitter" value={jitterMs.toFixed(1)} unit="ms" color="text-amber-400"
          info="Network jitter — variation in packet arrival time. Lower is better. >50ms causes visible stuttering." />
        <MetricCard label="RTT" value={rttMs.toFixed(0)} unit="ms" color="text-rose-400"
          info="Round-trip time — how long a signal takes to reach the peer and back. <100ms is good." />
        <MetricCard label="Loss" value={lossRate.toFixed(0)} unit="pkts" color="text-purple-400"
          info="Packet loss count per polling interval. Non-zero values may indicate network congestion." />
      </div>

      {/* Chart */}
      <div className="px-3 pt-3 pb-3">
        <p className="text-[10px] text-neuro-muted uppercase tracking-wider mb-1">Bitrate (60s window)</p>
        <div className="h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="timestamp" hide />
              <YAxis
                tick={{ fontSize: 9, fill: '#6b7280' }}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
                formatter={(val) => val === 'sentBps' ? 'Tx (send)' : 'Rx (recv)'}
              />
              <Line type="monotone" dataKey="sentBps" stroke="#22d3ee" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="recvBps" stroke="#34d399" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
