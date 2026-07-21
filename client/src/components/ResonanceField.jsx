// Precomputed points on the sphere's equator (r=260, center 400,400), 8 evenly spaced —
// mirrors the product's real <=4-peer mesh (drawn at 8 for a fuller ring at rest),
// cycling through the three brand hues.
const HUES = ['#E07A5F', '#F4A261', '#E76F51']; // Terracotta, Sand, Coral

const NODES = [
  { x: 660,    y: 400 },
  { x: 583.85, y: 583.85 },
  { x: 400,    y: 660 },
  { x: 216.15, y: 583.85 },
  { x: 140,    y: 400 },
  { x: 216.15, y: 216.15 },
  { x: 400,    y: 140 },
  { x: 583.85, y: 216.15 },
];

export default function ResonanceField() {
  return (
    <div className="resonance-field" aria-hidden="true">
      <div className="resonance-glow glow-1" />
      <div className="resonance-glow glow-2" />

      <svg className="resonance-sphere-svg" viewBox="0 0 800 800" fill="none">
        {/* Expanding rings — voice-activity waveform, doesn't rotate with the sphere */}
        <g stroke="#E07A5F" strokeWidth="1">
          {[0, 1.5, 3, 4.5].map((delay) => (
            <circle
              key={delay}
              className="resonance-ring"
              cx="400" cy="400" r="30"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </g>

        {/* Wireframe sphere — gaze / head-pose (yaw+pitch are spherical coordinates) */}
        <g className="resonance-mesh" stroke="#a8a29e" strokeOpacity="0.3" strokeWidth="1">
          <circle cx="400" cy="400" r="260" />
          <ellipse cx="400" cy="400" rx="260" ry="99"  transform="rotate(0 400 400)" />
          <ellipse cx="400" cy="400" rx="260" ry="99"  transform="rotate(45 400 400)" />
          <ellipse cx="400" cy="400" rx="260" ry="99"  transform="rotate(90 400 400)" />
          <ellipse cx="400" cy="400" rx="260" ry="99"  transform="rotate(135 400 400)" />

          {NODES.map((n, i) => (
            <circle
              key={i}
              className="resonance-node"
              cx={n.x} cy={n.y} r="3.5"
              fill={HUES[i % HUES.length]}
              stroke="none"
              style={{ animationDelay: `${i * 0.4}s` }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
