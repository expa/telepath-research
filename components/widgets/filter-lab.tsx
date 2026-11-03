"use client";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { alphaOf, gain, impulse, omega0Of, qOf, type Rqf } from "@/lib/rqf";
import { lin, logSample, logScale, pathOf, sample } from "@/lib/plot";
import { Slider } from "./slider";

const Helix3D = dynamic(() => import("./helix3d"), { ssr: false, loading: () => <div className="canvas3d" /> });

const TAU = 0.01; // 10 ms base time constant
const TWO_PI = Math.PI * 2;

export function FilterLab({ initialHz = 10, initialGamma = 0.12, show3d = true }: { initialHz?: number; initialGamma?: number; show3d?: boolean }) {
  const [hz, setHz] = useState(initialHz);
  const [gamma, setGamma] = useState(initialGamma);
  const f: Rqf = useMemo(() => ({ tau: TAU, omega: TWO_PI * hz, gamma }), [hz, gamma]);
  const a = alphaOf(f);
  const f0 = omega0Of(f) / TWO_PI;
  const tau0 = TAU / gamma;
  const span = Math.min(4 * tau0, 1.2);

  return (
    <>
      <div className="widget" role="group" aria-label="Recursive Quadrature Filter explorer">
        <div className="widget-head">
          <span><b>Filter lab</b> · one RQF, τ = 10 ms</span>
          <span className="mono">
            resonance {f0.toFixed(1)} Hz · band {((2 * a) / TWO_PI).toFixed(1)} Hz · Q {qOf(f).toFixed(1)} · memory τ/γ = {(tau0 * 1000).toFixed(0)} ms
          </span>
        </div>
        {show3d ? <Helix3D f={f} span={Math.min(3 * tau0, 0.9)} /> : null}
        <div className="widget-grid">
          <Spiral f={f} span={span} />
          <Impulse f={f} span={span} />
          <Response f={f} />
        </div>
        <div className="controls">
          <Slider label="Phase-prior frequency ω/2π" value={hz} min={2} max={40} step={0.5} onChange={setHz} format={(v) => `${v.toFixed(1)} Hz`} />
          <Slider label="Bandwidth γ" value={gamma} min={0.03} max={0.8} step={0.01} onChange={setGamma} format={(v) => v.toFixed(2)} />
        </div>
      </div>
    </>
  );
}

const W = 300, H = 210, P = 26;

function Spiral({ f, span }: { f: Rqf; span: number }) {
  const a = alphaOf(f);
  const s = lin(-1.1, 1.1, P, W - P);
  const sy = lin(-1.1, 1.1, H - 12, 12);
  const pts = sample(500, 0, span).map((t) => {
    const [x, y] = impulse(f, t);
    return [s(x / a), sy(y / a)] as [number, number];
  });
  return (
    <div>
      <div className="panel-title"><span>State in the complex plane</span><span className="mono">y(t)/α</span></div>
      <svg className="plot" viewBox={`0 0 ${W} ${H}`} aria-label="Impulse response spiralling into the origin of the complex plane">
        <line className="axis" x1={s(-1.1)} x2={s(1.1)} y1={sy(0)} y2={sy(0)} />
        <line className="axis" x1={s(0)} x2={s(0)} y1={sy(-1.1)} y2={sy(1.1)} />
        <circle cx={s(0)} cy={sy(0)} r={(s(1) - s(0))} fill="none" className="grid" strokeDasharray="2 3" />
        <path d={pathOf(pts)} fill="none" stroke="var(--accent)" strokeWidth={1.4} />
        <circle cx={pts[0][0]} cy={pts[0][1]} r={3.5} fill="var(--accent)" />
        <text x={s(1.1) - 2} y={sy(0) - 5} textAnchor="end">Re</text>
        <text x={s(0) + 5} y={sy(1.1) + 8}>Im</text>
      </svg>
    </div>
  );
}

function Impulse({ f, span }: { f: Rqf; span: number }) {
  const a = alphaOf(f);
  const sx = lin(0, span, P, W - 8);
  const sy = lin(-1.05, 1.05, H - 18, 10);
  const ts = sample(500, 0, span);
  const re = ts.map((t) => [sx(t), sy(impulse(f, t)[0] / a)] as [number, number]);
  const im = ts.map((t) => [sx(t), sy(impulse(f, t)[1] / a)] as [number, number]);
  const env = ts.map((t) => [sx(t), sy(Math.exp(-a * t))] as [number, number]);
  return (
    <div>
      <div className="panel-title"><span>Impulse response</span><span className="mono">0 – {(span * 1000).toFixed(0)} ms</span></div>
      <svg className="plot" viewBox={`0 0 ${W} ${H}`} aria-label="In-phase and quadrature components ringing inside a decaying envelope">
        <line className="axis" x1={P} x2={W - 8} y1={sy(0)} y2={sy(0)} />
        <path d={pathOf(env)} fill="none" stroke="#c4b2a2" strokeDasharray="3 3" />
        <path d={pathOf(env.map(([x, y]) => [x, 2 * sy(0) - y]))} fill="none" stroke="#c4b2a2" strokeDasharray="3 3" />
        <path d={pathOf(im)} fill="none" stroke="#f0a46a" strokeWidth={1.3} />
        <path d={pathOf(re)} fill="none" stroke="var(--ink)" strokeWidth={1.3} />
        <text x={W - 8} y={H - 4} textAnchor="end">time</text>
        <text x={P} y={10}>Re ─ Im ─</text>
      </svg>
    </div>
  );
}

function Response({ f }: { f: Rqf }) {
  const lo = 0.5, hi = 100;
  const sx = logScale(lo, hi, P, W - 8);
  const sy = lin(0, 1.05, H - 18, 10);
  const fs = logSample(400, lo, hi);
  const g = fs.map((hz) => [sx(hz), sy(gain(f, TWO_PI * hz))] as [number, number]);
  const f0 = omega0Of(f) / TWO_PI;
  const band = alphaOf(f) / TWO_PI;
  const x0 = sx(Math.max(lo, f0 - band)), x1 = sx(Math.min(hi, f0 + band));
  return (
    <div>
      <div className="panel-title"><span>Frequency response |H|</span><span className="mono">log Hz</span></div>
      <svg className="plot" viewBox={`0 0 ${W} ${H}`} aria-label={`Band-pass response peaking at ${f0.toFixed(1)} Hz`}>
        <rect x={x0} y={10} width={Math.max(1, x1 - x0)} height={H - 28} fill="var(--accent-soft)" opacity={0.6} />
        <line className="axis" x1={P} x2={W - 8} y1={sy(0)} y2={sy(0)} />
        {[1, 10, 100].map((t) => (
          <g key={t}>
            <line className="grid" x1={sx(t)} x2={sx(t)} y1={10} y2={sy(0)} />
            <text x={sx(t)} y={H - 4} textAnchor="middle">{t} Hz</text>
          </g>
        ))}
        <line x1={P} x2={W - 8} y1={sy(Math.SQRT1_2)} y2={sy(Math.SQRT1_2)} stroke="#e6cdb6" strokeDasharray="2 3" />
        <path d={pathOf(g)} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
        <circle cx={sx(f0)} cy={sy(1)} r={3} fill="var(--accent)" />
      </svg>
    </div>
  );
}
