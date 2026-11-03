// Simple drawn metaphors for the short posts. Static SVG, computed on the server.

const pathOf = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");

/** Six layers following a 4 Hz rhythm with τ = 20 ms: each one is late and a little weaker, unless it looks ahead. */
export function LagWaves() {
  const W = 300, ROW = 34, LAYERS = 6, wt = 2 * Math.PI * 4 * 0.02;
  const lag = Math.atan(wt), gain = 1 / Math.hypot(1, wt);
  const panel = (ahead: boolean, x0: number, label: string) => (
    <g transform={`translate(${x0} 0)`}>
      <line x1={W / 2} x2={W / 2} y1={8} y2={ROW * LAYERS + 18} stroke="var(--accent)" strokeDasharray="3 4" strokeWidth={1.2} />
      {Array.from({ length: LAYERS }, (_, l) => {
        const ph = ahead ? 0 : lag * l, a = ahead ? 1 : gain ** l, cy = 22 + l * ROW;
        const pts: [number, number][] = Array.from({ length: 121 }, (_, i) => {
          const x = (i / 120) * W;
          return [x, cy - 11 * a * Math.sin(((x - W / 2) / W) * 4 * Math.PI - ph + Math.PI / 2)];
        });
        // marker: the peak nearest "now"
        const px = W / 2 + (ph / (4 * Math.PI)) * W;
        return (
          <g key={l}>
            <path d={pathOf(pts)} fill="none" stroke={l ? "var(--ink-2)" : "var(--ink)"} strokeWidth={l ? 1.4 : 2} opacity={l ? 0.85 : 1} />
            <circle cx={px} cy={cy - 11 * a} r={3.5} fill={l ? "var(--accent)" : "var(--ink)"} />
          </g>
        );
      })}
      <text x={W / 2} y={ROW * LAYERS + 40} textAnchor="middle">{label}</text>
    </g>
  );
  return (
    <svg className="metaphor" viewBox="0 0 680 250" role="img" aria-label="Six layers following a rhythm. Without look-ahead each layer peaks later than the one above; with look-ahead all peaks line up with now.">
      {panel(false, 10, "each layer follows the one before")}
      {panel(true, 370, "each layer looks ahead")}
    </svg>
  );
}

/** Circle area proportional to parameter count. */
export function SizeCircles({ models }: { models: { name: string; params: number; ours?: boolean }[] }) {
  const max = Math.max(...models.map((m) => m.params)), R = 120;
  let x = 0;
  const placed = models.map((m) => {
    const r = Math.max(2.5, R * Math.sqrt(m.params / max));
    const step = Math.max(2 * r, 120);
    const cx = x + step / 2;
    x += step + 24;
    return { ...m, r, cx };
  });
  const w = x - 24;
  const fmt = (n: number) => (n >= 1e6 ? `${Math.round(n / 1e6)} million` : `${Math.round(n / 1e3)} thousand`);
  return (
    <svg className="metaphor" viewBox={`0 0 ${w} ${2 * R + 64}`} role="img" aria-label={`Model sizes: ${placed.map((m) => `${m.name} ${fmt(m.params)} parameters`).join(", ")}`}>
      {placed.map((m) => (
        <g key={m.name}>
          <circle cx={m.cx} cy={2 * R - m.r} r={m.r} fill={m.ours ? "var(--accent)" : "var(--paper-2)"} stroke={m.ours ? "none" : "var(--rule)"} />
          <text x={m.cx} y={2 * R + 26} textAnchor="middle" style={m.ours ? { fill: "var(--ink)", fontWeight: 600 } : undefined}>{m.name}</text>
          <text x={m.cx} y={2 * R + 46} textAnchor="middle">{fmt(m.params)}</text>
        </g>
      ))}
    </svg>
  );
}
