"use client";
import { useEffect, useRef } from "react";
import { N, PHASES, driveOf, makeRing, responses, step, type Phase } from "@/lib/organics";

const COLS = 360; // columns in the space-time plot
const SCRIPT: { phase: Phase; secs: number; label: string }[] = [
  { phase: "rest", secs: 0.3, label: "" },
  { phase: "present", secs: 0.35, label: "Target" },
  { phase: "hold", secs: 1.2, label: "Hold" },
  { phase: "shift", secs: 0.9, label: "Eye moves" },
  { phase: "hold", secs: 1.0, label: "Hold" },
  { phase: "clear", secs: 0.6, label: "Clear" },
];
const TOTAL = SCRIPT.reduce((s, p) => s + p.secs, 0);
const TARGET = Math.PI * 0.6;

/** One double-step trial of the ring circuit, every neuron over time. Simulated once, drawn once. */
export function OrganicsLab() {
  const heat = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = heat.current!.getContext("2d")!;
    const img = ctx.createImageData(COLS, N);
    const ring = makeRing();
    const y = new Float64Array(N);
    const dt = 0.001, perCol = TOTAL / dt / COLS;
    let col = 0, n = 0;
    for (const s of SCRIPT) {
      ring.target = { ...PHASES[s.phase] };
      const drive = s.phase === "present" ? driveOf([TARGET]) : driveOf([]);
      for (let i = 0; i < Math.round(s.secs / dt); i++, n++) {
        step(ring, drive, dt);
        if (n >= col * perCol && col < COLS) {
          responses(ring, y);
          for (let j = 0; j < N; j++) img.data.set([...ramp(Math.max(0, Math.min(1, y[j]))), 255], ((N - 1 - j) * COLS + col) * 4);
          col++;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }, []);

  let t = 0;
  return (
    <figure className="post-fig wide">
      <canvas ref={heat} width={COLS} height={N} className="spacetime" aria-label="Space-time plot of one trial: a bump of activity appears, holds, slides to a new place, holds, and is cleared" />
      <div className="spacetime-phases" aria-hidden="true">
        {SCRIPT.map((s, i) => {
          const left = (t / TOTAL) * 100;
          t += s.secs;
          return s.label ? <span key={i} style={{ left: `${left}%`, width: `${(s.secs / TOTAL) * 100}%` }}>{s.label}</span> : null;
        })}
      </div>
      <figcaption>
        One trial, simulated from the equations above. Each row is a neuron, ordered by its preferred direction; time runs left to right. The bright band is the memory: flat while it is held with no input, slanted while the derivative weights shift it, gone when <i>a</i> rises.
      </figcaption>
    </figure>
  );
}

function ramp(v: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0, [251, 247, 242]],
    [0.35, [255, 200, 150]],
    [0.7, [237, 99, 0]],
    [1, [140, 30, 10]],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [a, ca] = stops[i - 1], [b, cb] = stops[i];
      const t = (v - a) / (b - a);
      return [0, 1, 2].map((c) => Math.round(ca[c] + (cb[c] - ca[c]) * t)) as [number, number, number];
    }
  }
  return stops[stops.length - 1][1];
}
