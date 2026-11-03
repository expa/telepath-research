"use client";
import { useMemo, useState } from "react";
import { cascadeLag, cascadeStep } from "@/lib/rqf";
import { lin, pathOf, sample } from "@/lib/plot";
import { Seg, Slider } from "./slider";

const TAU = 0.02; // 20 ms per layer
const H_STEP = 0.001;

/** χτ on a sine: z + τż leads z by about τ. */
export function LookAhead() {
  const [tauMs, setTau] = useState(40);
  const tau = tauMs / 1000;
  const fHz = 3;
  const W = 640, Hh = 200, P = 28;
  const sx = lin(0, 0.6, P, W - 10);
  const amp = Math.hypot(1, 2 * Math.PI * fHz * tau);
  const sy = lin(-amp * 1.05, amp * 1.05, Hh - 16, 10);
  const ts = sample(400, 0, 0.6);
  const w = 2 * Math.PI * fHz;
  const z = ts.map((t) => [sx(t), sy(Math.sin(w * t))] as [number, number]);
  const look = ts.map((t) => [sx(t), sy(Math.sin(w * t) + tau * w * Math.cos(w * t))] as [number, number]);
  const shifted = ts.map((t) => [sx(t), sy(Math.sin(w * (t + tau)))] as [number, number]);
  const lead = Math.atan(w * tau) / w;
  return (
    <>
      <div className="widget" role="group" aria-label="The prospective operator on a sine wave">
        <div className="widget-head">
          <span><b>The look-ahead operator</b> · χτ = 1 + τ d/dt</span>
          <span className="mono">phase lead {(lead * 1000).toFixed(1)} ms of τ = {tauMs} ms</span>
        </div>
        <div style={{ padding: "8px 18px 12px" }}>
          <svg className="plot" viewBox={`0 0 ${W} ${Hh}`} aria-label="A sine wave, its look-ahead, and the true future">
            <line className="axis" x1={P} x2={W - 10} y1={sy(0)} y2={sy(0)} />
            <path d={pathOf(shifted)} fill="none" stroke="#e6cdb6" strokeWidth={6} strokeLinecap="round" opacity={0.6} />
            <path d={pathOf(z)} fill="none" stroke="var(--ink)" strokeWidth={1.4} />
            <path d={pathOf(look)} fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeDasharray="5 4" />
            <text x={W - 10} y={Hh - 2} textAnchor="end">time →</text>
          </svg>
          <div className="mono" style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 18, flexWrap: "wrap" }}>
            <span><span style={{ color: "var(--ink)" }}>━</span> z(t), the input now</span>
            <span><span style={{ color: "var(--accent)" }}>╍</span> z + τż, the look-ahead</span>
            <span><span style={{ color: "#e6cdb6" }}>█</span> z(t + τ), the true future</span>
          </div>
        </div>
        <div className="controls">
          <Slider label="Look-ahead τ" value={tauMs} min={0} max={80} step={1} onChange={setTau} format={(v) => `${v} ms`} />
        </div>
      </div>
      <p className="widget-caption">
        <b>Extrapolate along the tangent.</b> Adding τ times the slope pushes the signal forward by about τ. For small τ the dashed curve rides on the true future; push τ up and the first-order guess overshoots, which is why it is a correction for lag, not a crystal ball.
      </p>
    </>
  );
}

export function CascadeLab() {
  const [depth, setDepth] = useState(4);
  const [hz, setHz] = useState(4);
  const [mode, setMode] = useState<"inst" | "pros">("inst");
  const { traces, input } = useMemo(() => {
    const ys = new Array(depth).fill(0);
    const prev = new Array(depth).fill(0);
    const total = 1.6, keep = 0.6;
    const n = Math.round(total / H_STEP);
    const traces: number[][] = Array.from({ length: depth }, () => []);
    const input: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = Math.sin(2 * Math.PI * hz * i * H_STEP);
      cascadeStep(ys, prev, x, H_STEP, TAU, mode === "pros");
      if (i * H_STEP >= total - keep && i % 3 === 0) {
        input.push(x);
        ys.forEach((y, l) => traces[l].push(y));
      }
    }
    return { traces, input };
  }, [depth, hz, mode]);

  const W = 640, Hh = 240, P = 28;
  const sx = lin(0, input.length - 1, P, W - 10);
  const sy = lin(-1.1, 1.1, Hh - 16, 10);
  const lag = mode === "pros" ? 0 : cascadeLag(depth, hz, TAU);
  const shrink = mode === "pros" ? 1 : Math.pow(1 / Math.hypot(1, 2 * Math.PI * hz * TAU), depth);

  return (
    <>
      <div className="widget" role="group" aria-label="Lag through a deep stack of leaky integrators">
        <div className="widget-head">
          <span><b>Lag through depth</b> · {depth} leaky layers, τ = 20 ms each</span>
          <span className="mono">top layer: {(lag * 1000).toFixed(0)} ms behind · amplitude ×{shrink.toFixed(2)}</span>
        </div>
        <div style={{ padding: "8px 18px 12px" }}>
          <svg className="plot" viewBox={`0 0 ${W} ${Hh}`} aria-label="Each deeper layer's response, compared to the input">
            <line className="axis" x1={P} x2={W - 10} y1={sy(0)} y2={sy(0)} />
            <path d={pathOf(input.map((v, i) => [sx(i), sy(v)]))} fill="none" stroke="var(--ink)" strokeWidth={1.6} strokeDasharray="4 4" />
            {traces.map((tr, l) => (
              <path
                key={l}
                d={pathOf(tr.map((v, i) => [sx(i), sy(v)]))}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={l === depth - 1 ? 2 : 1.1}
                opacity={0.25 + (0.75 * (l + 1)) / depth}
              />
            ))}
            <text x={W - 10} y={Hh - 2} textAnchor="end">time →</text>
          </svg>
          <div className="mono" style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 18, flexWrap: "wrap" }}>
            <span><span style={{ color: "var(--ink)" }}>╍</span> input</span>
            <span><span style={{ color: "var(--accent)", opacity: 0.4 }}>━</span> layer 1 … <span style={{ color: "var(--accent)" }}>━</span> layer {depth}</span>
          </div>
        </div>
        <div className="controls">
          <Seg label="Bottom-up input" value={mode} onChange={setMode} options={[{ value: "inst", label: "Instantaneous" }, { value: "pros", label: "Prospective" }]} />
          <Slider label="Depth L" value={depth} min={1} max={8} step={1} onChange={setDepth} format={(v) => `${v} layers`} />
          <Slider label="Input frequency" value={hz} min={1} max={12} step={0.5} onChange={setHz} format={(v) => `${v.toFixed(1)} Hz`} />
        </div>
      </div>
      <p className="widget-caption">
        <b>A live simulation of the paper’s update rule.</b> Each layer is a leaky integrator (an RQF with γ = 1), discretised with zero-order hold at 1 ms. With instantaneous input, the lag adds up layer after layer, roughly Lτ, and the signal shrinks. Switch to prospective input, the two-tap rule of Eq. 16, and every layer is driven by where its input is heading, so the stack lines up with the input again.
      </p>
    </>
  );
}

/** Per-hop prefactor under spatial-only backprop: (h/τ)γ versus (1 + h/τ)γ. */
export function GradientDepth() {
  const [ratio, setRatio] = useState(0.2);
  const [gamma, setGamma] = useState(0.5);
  const L = 6;
  const gnp = ratio * gamma;
  const gp = (1 + ratio) * gamma;
  const W = 640, Hh = 230, P = 40;
  const lo = -12;
  const sy = lin(lo, 0, Hh - 26, 12);
  const bw = (W - P - 10) / L;
  const v = (g: number, k: number) => Math.max(lo, k * Math.log10(g));
  return (
    <>
      <div className="widget" role="group" aria-label="How much error signal reaches each layer">
        <div className="widget-head">
          <span><b>Error reaching each layer</b> · spatial-only backprop, L = 6</span>
          <span className="mono">layer 1 receives {(gnp ** (L - 1)).toExponential(0)} vs {(gp ** (L - 1)).toExponential(0)}</span>
        </div>
        <div style={{ padding: "8px 18px 12px" }}>
          <svg className="plot" viewBox={`0 0 ${W} ${Hh}`} aria-label="Bars on a log scale: error attenuates geometrically with instantaneous input">
            {[0, -3, -6, -9, -12].map((e) => (
              <g key={e}>
                <line className="grid" x1={P} x2={W - 10} y1={sy(e)} y2={sy(e)} />
                <text x={P - 6} y={sy(e) + 3} textAnchor="end">1e{e}</text>
              </g>
            ))}
            {Array.from({ length: L }, (_, i) => {
              const k = L - 1 - i;
              const x = P + i * bw;
              return (
                <g key={i}>
                  <rect x={x + bw * 0.16} y={+sy(v(gnp, k)).toFixed(2)} width={bw * 0.32} height={+(sy(lo) - sy(v(gnp, k))).toFixed(2)} fill="#d9cbbf" rx={2} />
                  <rect x={x + bw * 0.52} y={+sy(v(gp, k)).toFixed(2)} width={bw * 0.32} height={+(sy(lo) - sy(v(gp, k))).toFixed(2)} fill="var(--accent)" rx={2} />
                  <text x={x + bw / 2} y={Hh - 8} textAnchor="middle">layer {i + 1}</text>
                </g>
              );
            })}
          </svg>
          <div className="mono" style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 18, flexWrap: "wrap" }}>
            <span><span style={{ color: "#c9b8aa" }}>■</span> instantaneous, ×(h/τ)γ per hop</span>
            <span><span style={{ color: "var(--accent)" }}>■</span> prospective, ×(1 + h/τ)γ per hop</span>
          </div>
        </div>
        <div className="controls">
          <Slider label="Step / time constant h/τ" value={ratio} min={0.02} max={1} step={0.01} onChange={setRatio} format={(x) => x.toFixed(2)} />
          <Slider label="Bandwidth γ" value={gamma} min={0.05} max={1} step={0.01} onChange={setGamma} format={(x) => x.toFixed(2)} />
        </div>
      </div>
      <p className="widget-caption">
        <b>The discretisation prefactor only.</b> The paper’s experiments use τ = 5h, so h/τ = 0.2. With instantaneous input every hop down the stack multiplies the error by a factor that vanishes as the step shrinks; with prospective input that factor stays order one. Weights and activation slopes multiply both the same way and are left out here.
      </p>
    </>
  );
}
