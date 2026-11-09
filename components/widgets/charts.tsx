"use client";
import { useState } from "react";
import { lin, logScale } from "@/lib/plot";
import { Seg } from "./slider";

export interface Bench {
  key: string;
  label: string;
  metric: string;
  lo: number;
  hi: number;
  points: { name: string; params: number; score: number; ours?: boolean; external?: boolean }[];
  note: string;
}

/** Score versus parameter count, log x. One benchmark at a time. */
export function ParamScatter({ benches }: { benches: Bench[] }) {
  const [key, setKey] = useState(benches[0].key);
  const [hover, setHover] = useState<string | null>(null);
  const b = benches.find((x) => x.key === key)!;
  const W = 760, H = 380, PL = 54, PR = 20, PT = 18, PB = 40;
  const sx = logScale(1e3, 1e9, PL, W - PR);
  const sy = lin(b.lo, b.hi, H - PB, PT);
  const ours = b.points.find((p) => p.ours)!;
  const ticks = Array.from({ length: 6 }, (_, i) => b.lo + ((b.hi - b.lo) * i) / 5);
  return (
    <>
      <div className="widget" role="group" aria-label="Benchmark score against model size">
        <div className="widget-head">
          <span><b>{b.label}</b> · {b.metric}</span>
          <span className="mono">RQF: {ours.score.toFixed(4)} with {fmt(ours.params)} parameters</span>
        </div>
        <div style={{ padding: "8px 18px 6px" }}>
          <svg className="plot" viewBox={`0 0 ${W} ${H}`} aria-label={`${b.label}: our model against published models by parameter count`}>
            {ticks.map((t) => (
              <g key={t}>
                <line className="grid" x1={PL} x2={W - PR} y1={sy(t)} y2={sy(t)} />
                <text x={PL - 8} y={sy(t) + 3} textAnchor="end">{t.toFixed(2)}</text>
              </g>
            ))}
            {[1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9].map((t) => (
              <g key={t}>
                <line className="grid" x1={sx(t)} x2={sx(t)} y1={PT} y2={H - PB} />
                <text x={sx(t)} y={H - PB + 16} textAnchor="middle">{fmt(t)}</text>
              </g>
            ))}
            <text x={(PL + W - PR) / 2} y={H - 4} textAnchor="middle">parameters (log scale) → smaller is to the left</text>
            {b.points.map((p) => {
              const x = sx(p.params), y = sy(p.score);
              const on = hover === p.name;
              return (
                <g key={p.name} onPointerEnter={() => setHover(p.name)} onPointerLeave={() => setHover(null)} style={{ cursor: "default" }}>
                  {p.external ? (
                    <rect x={x - 5} y={y - 5} width={10} height={10} rx={2} fill={p.ours ? "var(--accent)" : "#fff"} stroke={p.ours ? "var(--accent)" : "#a8978a"} />
                  ) : (
                    <circle cx={x} cy={y} r={p.ours ? 7 : 5} fill={p.ours ? "var(--accent)" : "#fff"} stroke={p.ours ? "#fff" : "#a8978a"} strokeWidth={p.ours ? 2 : 1} />
                  )}
                  {p.ours ? <circle cx={x} cy={y} r={14} fill="none" stroke="var(--accent)" opacity={0.35} /> : null}
                  {(on || p.ours) ? (
                    <text x={x + 10} y={y - 9} style={{ fill: p.ours ? "var(--deep)" : "var(--ink)", fontSize: 11 }}>
                      {p.name} · {p.score.toFixed(3)} · {fmt(p.params)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="controls">
          <Seg label="Benchmark" value={key} onChange={setKey} options={benches.map((x) => ({ value: x.key, label: x.label.split(",")[0] }))} />
          <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>○ trained on the benchmark corpus · □ pretrained on external corpora · hover for names</span>
        </div>
      </div>
      <p className="widget-caption">{b.note}</p>
    </>
  );
}

const fmt = (n: number) => (n >= 1e9 ? `${n / 1e9}B` : n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : `${n}`);

/** Grouped bars: a control against our variant at several settings. */
export function PairedBars({ title, unit, groups, a, b, lo, hi, caption }: { title: string; unit: string; groups: { label: string; a: number; b: number }[]; a: string; b: string; lo: number; hi: number; caption: React.ReactNode }) {
  const W = 640, H = 240, PL = 44, PB = 30, PT = 16;
  const sy = lin(lo, hi, H - PB, PT);
  const gw = (W - PL - 10) / groups.length;
  const ticks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);
  return (
    <>
      <div className="widget">
        <div className="widget-head">
          <span><b>{title}</b></span>
          <span className="mono">{unit}</span>
        </div>
        <div style={{ padding: "8px 18px 12px" }}>
          <svg className="plot" viewBox={`0 0 ${W} ${H}`} aria-label={title}>
            {ticks.map((t) => (
              <g key={t}>
                <line className="grid" x1={PL} x2={W - 10} y1={sy(t)} y2={sy(t)} />
                <text x={PL - 6} y={sy(t) + 3} textAnchor="end">{+t.toFixed(2)}</text>
              </g>
            ))}
            {groups.map((g, i) => {
              const x = PL + i * gw;
              const bw = gw * 0.3;
              const d = g.b - g.a;
              return (
                <g key={g.label}>
                  <rect x={x + gw * 0.18} y={+sy(g.a).toFixed(2)} width={bw} height={+(sy(lo) - sy(g.a)).toFixed(2)} rx={3} fill="#d9cbbf" />
                  <rect x={x + gw * 0.18 + bw + 4} y={+sy(g.b).toFixed(2)} width={bw} height={+(sy(lo) - sy(g.b)).toFixed(2)} rx={3} fill="var(--accent)" />
                  <text x={x + gw * 0.18 + bw + 4 + bw / 2} y={sy(g.b) - 6} textAnchor="middle" style={{ fill: d >= 0 ? "var(--deep)" : "var(--muted)", fontSize: 11 }}>
                    {d >= 0 ? "+" : ""}{d.toFixed(2)}
                  </text>
                  <text x={x + gw / 2} y={H - 8} textAnchor="middle">{g.label}</text>
                </g>
              );
            })}
          </svg>
          <div className="mono" style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 18, flexWrap: "wrap" }}>
            <span><span style={{ color: "#c9b8aa" }}>■</span> {a}</span>
            <span><span style={{ color: "var(--accent)" }}>■</span> {b}</span>
          </div>
        </div>
      </div>
      <p className="widget-caption">{caption}</p>
    </>
  );
}

/** One horizontal bar per model; ours in the accent color. */
export function HBars({ title, unit, rows, lo, hi, caption }: { title: string; unit: string; rows: { label: string; value: number; note?: string; ours?: boolean }[]; lo: number; hi: number; caption: React.ReactNode }) {
  const W = 640, ROW = 30, PL = 230, PR = 60, H = rows.length * ROW + 8;
  const sx = lin(lo, hi, PL, W - PR);
  return (
    <>
      <div className="widget">
        <div className="widget-head">
          <span><b>{title}</b></span>
          <span className="mono">{unit}</span>
        </div>
        <div style={{ padding: "8px 18px 12px" }}>
          <svg className="plot" viewBox={`0 0 ${W} ${H}`} aria-label={`${title}: ${rows.map((r) => `${r.label} ${r.value}%`).join(", ")}`}>
            {rows.map((r, i) => {
              const y = 4 + i * ROW;
              return (
                <g key={r.label}>
                  <text x={PL - 10} y={y + 15} textAnchor="end" style={r.ours ? { fill: "var(--ink)" } : undefined}>{r.label}</text>
                  <rect x={PL} y={y + 4} width={+(sx(r.value) - PL).toFixed(2)} height={ROW - 12} rx={3} fill={r.ours ? "var(--accent)" : "#d9cbbf"} />
                  <text x={sx(r.value) + 6} y={y + 15} style={r.ours ? { fill: "var(--deep)" } : undefined}>{r.value.toFixed(1)}%{r.note ? ` · ${r.note}` : ""}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      <p className="widget-caption">{caption}</p>
    </>
  );
}

/**
 * C(t)/C(0) in the critical phase, log–log. Finite N: the N−1 transverse rates μ = 1 − λ/λ_N taken at the
 * semicircle quantiles (Eq. 10), against the parameter-free prediction √(2/πt) (Eq. 11).
 */
export function CorrelationPlot({ sizes, caption }: { sizes: number[]; caption: React.ReactNode }) {
  const W = 640, H = 300, PL = 54, PR = 20, PT = 14, PB = 40;
  const T0 = 1, T1 = 1e4, Y0 = 1e-3, Y1 = 1;
  const sx = logScale(T0, T1, PL, W - PR), sy = logScale(Y0, Y1, H - PB, PT);
  const ts = Array.from({ length: 81 }, (_, i) => 10 ** (Math.log10(T0) + (i / 80) * Math.log10(T1 / T0)));
  // semicircle CDF on [-1, 1], inverted by bisection; eigenvalue i sits at quantile (i + 0.5)/N
  const cdf = (x: number) => 0.5 + (x * Math.sqrt(1 - x * x) + Math.asin(x)) / Math.PI;
  const quantile = (q: number) => { let a = -1, b = 1; for (let k = 0; k < 50; k++) { const m = (a + b) / 2; cdf(m) < q ? (a = m) : (b = m); } return (a + b) / 2; };
  const curve = (n: number) => {
    const top = quantile((n - 0.5) / n);
    const mus = Array.from({ length: n - 1 }, (_, i) => 1 - quantile((i + 0.5) / n) / top);
    const c0 = mus.reduce((s, m) => s + 1 / m, 0);
    return ts.map((t) => [t, mus.reduce((s, m) => s + Math.exp(-m * t) / m, 0) / c0] as [number, number]).filter(([, c]) => c > Y0);
  };
  const path = (pts: [number, number][]) => pts.map(([t, c], i) => `${i ? "L" : "M"}${sx(t).toFixed(1)} ${sy(c).toFixed(1)}`).join("");
  const theory = ts.map((t) => [t, Math.sqrt(2 / (Math.PI * t))] as [number, number]).filter(([, c]) => c <= Y1);
  const shades = ["#e4d6ca", "#c9b3a2", "#a8978a", "var(--accent)"];
  return (
    <>
      <div className="widget">
        <div className="widget-head">
          <span><b>Correlations decay as a power law</b></span>
          <span className="mono">C(t)/C(0), log–log</span>
        </div>
        <div style={{ padding: "8px 18px 12px" }}>
          <svg className="plot" viewBox={`0 0 ${W} ${H}`} aria-label="Normalized autocorrelation against time on log–log axes: finite networks follow the t to the minus one half line up to a cutoff that grows with network size">
            {[1e-3, 1e-2, 1e-1, 1].map((v) => (
              <g key={v}>
                <line className="grid" x1={PL} x2={W - PR} y1={sy(v)} y2={sy(v)} />
                <text x={PL - 8} y={sy(v) + 3} textAnchor="end">{v >= 1 ? "1" : v.toString()}</text>
              </g>
            ))}
            {[1, 10, 100, 1e3, 1e4].map((v) => (
              <g key={v}>
                <line className="grid" x1={sx(v)} x2={sx(v)} y1={PT} y2={H - PB} />
                <text x={sx(v)} y={H - PB + 16} textAnchor="middle">{v >= 1e3 ? `${v / 1e3}k` : v}</text>
              </g>
            ))}
            <text x={(PL + W - PR) / 2} y={H - 4} textAnchor="middle">time, in units of a single neuron’s time constant</text>
            {sizes.map((n, i) => <path key={n} d={path(curve(n))} fill="none" stroke={shades[i % shades.length]} strokeWidth={2} />)}
            <path d={path(theory)} fill="none" stroke="var(--ink)" strokeWidth={1.2} strokeDasharray="4 4" />
          </svg>
          <div className="mono" style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 18, flexWrap: "wrap" }}>
            {sizes.map((n, i) => <span key={n}><span style={{ color: shades[i % shades.length] }}>■</span> N = {n.toLocaleString("en-US")}</span>)}
            <span>- - √(2/πt), no free parameters</span>
          </div>
        </div>
      </div>
      <p className="widget-caption">{caption}</p>
    </>
  );
}
