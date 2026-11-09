"use client";
import { useState } from "react";
import { lin, pathOf, sample } from "@/lib/plot";
import { Slider } from "./slider";

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
  return (
    <>
      <div className="widget" role="group" aria-label="The prospective operator on a sine wave">
        <div className="widget-head">
          <span><b>The look-ahead operator</b> · χτ = 1 + τ d/dt</span>
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
        Adding τ times the slope pushes the signal forward by about τ. For small τ the dashed look-ahead rides on the true future; push τ up and the first-order guess overshoots. It corrects lag, it doesn’t predict.
      </p>
    </>
  );
}

/** Per-hop prefactor under spatial-only backprop, (h/τ)γ versus (1 + h/τ)γ, at the paper's h/τ = 0.2. */
export function GradientDepth() {
  const ratio = 0.2, gamma = 0.5;
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
          <span><b>Error reaching each layer</b> · six layers, h/τ = 0.2, γ = 0.5</span>
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
      </div>
      <p className="widget-caption">
        Log scale. With instantaneous input, the error reaching layer 1 is about {(gnp ** (L - 1)).toExponential(0)} of what arrives at the top; with prospective input it is about {(gp ** (L - 1)).toExponential(0)}. Only the discretization factor is shown: weights and activation slopes scale both the same way.
      </p>
    </>
  );
}
