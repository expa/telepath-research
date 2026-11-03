"use client";
import { useMemo, useState } from "react";
import { FS, eeg } from "@/lib/eeg";
import { lin, pathOf } from "@/lib/plot";
import { Slider } from "./slider";

const SECONDS = 32;
const WIN = 1; // s
const BANDS = [2, 4, 6, 8, 10, 13, 20, 30];
const BETA = 6;

/** Run a bank of RQFs (ZOH, exact) and return per-window log-power summaries, standardised. */
export function summaries(x: Float64Array) {
  const h = 1 / FS, tau = 0.01;
  const nW = Math.floor(x.length / (WIN * FS));
  const S = BANDS.map((hz) => {
    const gamma = Math.min(0.9, (2 * Math.PI * hz * 0.25 * tau) / 1); // bandwidth ∝ centre: constant Q ≈ 2
    const alpha = gamma / tau;
    const w0 = 2 * Math.PI * hz;
    // λ = −α + iω0;  A = e^{λh};  B = (α/λ)(A − 1)
    const er = Math.exp(-alpha * h);
    const Ar = er * Math.cos(w0 * h), Ai = er * Math.sin(w0 * h);
    const lr = -alpha, li = w0, l2 = lr * lr + li * li;
    const qr = (alpha * lr) / l2, qi = (-alpha * li) / l2;
    const Br = qr * (Ar - 1) - qi * Ai, Bi = qr * Ai + qi * (Ar - 1);
    let yr = 0, yi = 0;
    const pow = new Float64Array(nW);
    for (let n = 0; n < nW * WIN * FS; n++) {
      const nr = Ar * yr - Ai * yi + Br * x[n], ni = Ar * yi + Ai * yr + Bi * x[n];
      yr = nr; yi = ni;
      pow[Math.floor(n / (WIN * FS))] += yr * yr + yi * yi;
    }
    return Array.from(pow, (p) => Math.log(1e-6 + p / (WIN * FS)));
  });
  // standardise each filter over windows, then each window vector to unit length
  for (const row of S) {
    const m = row.reduce((a, b) => a + b, 0) / row.length;
    const sd = Math.sqrt(row.reduce((a, b) => a + (b - m) ** 2, 0) / row.length) || 1;
    row.forEach((v, i) => (row[i] = (v - m) / sd));
  }
  return Array.from({ length: nW }, (_, w) => {
    const v = BANDS.map((_, b) => S[b][w]);
    const n = Math.hypot(...v) || 1;
    return v.map((u) => u / n);
  });
}

const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);

export function score(sum: number[][], j: number, hw: number) {
  const t = j + hw;
  const sims = sum.map((v) => dot(sum[j], v));
  const pool = sims.map((s, i) => (i === j ? -Infinity : s));
  const z = pool.reduce((a, s) => a + Math.exp(BETA * s), 0);
  const p = Math.exp(BETA * sims[t]) / z;
  const rank = 1 + pool.filter((s, i) => i !== t && s > sims[t]).length;
  return { sims, p, rank };
}

export function PredictLab() {
  const x = useMemo(() => eeg(SECONDS, 11), []);
  const sum = useMemo(() => summaries(x), [x]);
  const nW = sum.length;
  const [hw, setHw] = useState(1);
  const [j, setJ] = useState(3);
  const src = Math.min(j, nW - 1 - hw);
  const { sims, rank } = score(sum, src, hw);
  const acc = useMemo(() => {
    let ranks = 0, nll = 0, n = 0;
    for (let s = 0; s + hw < nW; s++) {
      const r = score(sum, s, hw);
      ranks += r.rank;
      nll += -Math.log(r.p);
      n++;
    }
    return { rank: ranks / n, loss: nll / n };
  }, [sum, hw, nW]);

  const W = 760, Hh = 200, P = 10;
  const sx = lin(0, x.length, P, W - P);
  const sy = lin(-3, 3, 120, 10);
  const step = 2;
  const pts: [number, number][] = [];
  for (let i = 0; i < x.length; i += step) pts.push([sx(i), sy(x[i])]);
  const ww = sx(WIN * FS) - sx(0);
  const by = lin(-1, 1, 192, 140);

  return (
    <>
      <div className="widget" role="group" aria-label="Predicting a later window from an earlier one">
        <div className="widget-head">
          <span><b>Predict the future window</b> · 32 s of synthetic EEG, 1 s windows, 8 RQFs</span>
          <span className="mono">true future ranks #{rank} of {nW - 1}</span>
        </div>
        <div style={{ padding: "8px 18px 12px" }}>
          <svg className="plot" viewBox={`0 0 ${W} ${Hh}`} aria-label="Signal split into windows; bars show how similar each window is to the source">
            {sum.map((_, w) => {
              const isSrc = w === src, isT = w === src + hw;
              return (
                <g key={w} onPointerDown={() => setJ(w)} style={{ cursor: "pointer" }}>
                  <rect x={sx(w * WIN * FS) + 1} y={6} width={ww - 2} height={118} rx={4} fill={isSrc ? "#2a211b0f" : isT ? "var(--accent-soft)" : "transparent"} stroke={isSrc ? "var(--ink)" : isT ? "var(--accent)" : "#f0e6dc"} strokeWidth={isSrc || isT ? 1.2 : 1} />
                  <rect x={sx(w * WIN * FS) + ww * 0.2} y={Math.min(by(0), by(sims[w]))} width={ww * 0.6} height={Math.abs(by(sims[w]) - by(0))} rx={1.5} fill={isSrc ? "#2a211b" : isT ? "var(--accent)" : "#d9cbbf"} />
                </g>
              );
            })}
            <line className="axis" x1={P} x2={W - P} y1={by(0)} y2={by(0)} />
            <path d={pathOf(pts)} fill="none" stroke="var(--ink)" strokeWidth={0.8} pointerEvents="none" />
            <text x={P} y={Hh - 1}>cosine similarity to the source window ↑</text>
          </svg>
          <div className="mono" style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 18, flexWrap: "wrap" }}>
            <span><span style={{ color: "var(--ink)" }}>▢</span> source window j (click any window)</span>
            <span><span style={{ color: "var(--accent)" }}>▢</span> target j + h</span>
            <span><span style={{ color: "#c9b8aa" }}>■</span> negatives</span>
            <span>all sources at this horizon: mean rank {acc.rank.toFixed(1)} (chance {(nW / 2).toFixed(1)}) · InfoNCE {acc.loss.toFixed(2)}</span>
          </div>
        </div>
        <div className="controls">
          <Slider label="Horizon h (windows ahead)" value={hw} min={1} max={10} step={1} onChange={setHw} format={(v) => `${v} s`} />
        </div>
      </div>
      <p className="widget-caption">
        <b>The pretext task, in miniature.</b> Each window is summarised by the log-power of eight RQFs. The summary of window j has to pick out window j + h from every other window, scored with the InfoNCE loss of Eq. 2. Here the “predictor” is just the identity, so the present only points to the future while the brain state persists: watch the true future slide down the ranking as the horizon grows, and notice it can’t tell apart windows from other stretches of the same state. In the paper a learned head makes the prediction and the loss also tunes every filter’s frequency and bandwidth.
      </p>
    </>
  );
}
