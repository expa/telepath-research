"use client";
import { useEffect, useRef, useState } from "react";
import { N, PHASES, decode, driveOf, makeRing, responses, step, type Phase } from "@/lib/organics";

const HISTORY = 360; // columns in the space-time plot
const SCRIPT: { phase: Phase; secs: number; label: string }[] = [
  { phase: "rest", secs: 0.4, label: "Fixate" },
  { phase: "present", secs: 0.35, label: "Target flashes · b = 1" },
  { phase: "hold", secs: 1.4, label: "Delay · a = b = 0, memory holds" },
  { phase: "shift", secs: 0.9, label: "Eye moves · derivative weights on" },
  { phase: "hold", secs: 1.0, label: "Delay · updated memory holds" },
  { phase: "clear", secs: 0.6, label: "Respond · a high, memory cleared" },
];

const LABELS: Record<Phase, string> = { rest: "Rest", present: "Present", hold: "Hold", shift: "Shift", clear: "Clear" };

export function OrganicsLab() {
  const ring = useRef(makeRing());
  const [phase, setPhase] = useState<Phase>("rest");
  const [auto, setAuto] = useState(true);
  const [stepIx, setStepIx] = useState(0);
  const target = useRef(Math.PI * 0.25);
  const svg = useRef<SVGSVGElement>(null);
  const heat = useRef<HTMLCanvasElement>(null);
  const read = useRef<HTMLSpanElement>(null);
  const bars = useRef<(SVGLineElement | null)[]>([]);
  const marker = useRef<SVGCircleElement>(null);
  const live = useRef({ phase: "rest" as Phase, auto: true, clock: 0, ix: 0, visible: false });

  useEffect(() => {
    live.current.phase = phase;
    ring.current.target = { ...PHASES[phase] };
  }, [phase]);
  useEffect(() => {
    live.current.auto = auto;
    live.current.clock = 0;
    live.current.ix = 0;
  }, [auto]);

  useEffect(() => {
    const el = svg.current?.closest(".widget");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (live.current.visible = e.isIntersecting));
    io.observe(el);
    let raf = 0, last = 0;
    const y = new Float64Array(N);
    const ctx = heat.current!.getContext("2d")!;
    const col = ctx.createImageData(1, N);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!live.current.visible) { last = 0; return; }
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const L = live.current;
      if (L.auto && !still) {
        L.clock += dt;
        if (L.clock > SCRIPT[L.ix].secs) {
          L.clock = 0;
          L.ix = (L.ix + 1) % SCRIPT.length;
          if (L.ix === 0) target.current = Math.random() * Math.PI * 2;
          setStepIx(L.ix);
          setPhase(SCRIPT[L.ix].phase);
          return;
        }
      }
      const drive = L.phase === "present" ? driveOf([target.current]) : driveOf([]);
      const sim = still ? 0.2 : dt; // reduced motion: jump to the settled state
      for (let i = 0; i < Math.round(sim * 1000); i++) step(ring.current, drive, 0.001);
      responses(ring.current, y);
      for (let j = 0; j < N; j++) {
        const v = Math.max(0, Math.min(1, y[j]));
        const b = bars.current[j];
        if (b) {
          const th = (j / N) * Math.PI * 2 - Math.PI / 2;
          const r0 = 62, r1 = 62 + 4 + 46 * v;
          b.setAttribute("x2", (110 + r1 * Math.cos(th)).toFixed(1));
          b.setAttribute("y2", (110 + r1 * Math.sin(th)).toFixed(1));
          b.setAttribute("x1", (110 + r0 * Math.cos(th)).toFixed(1));
          b.setAttribute("y1", (110 + r0 * Math.sin(th)).toFixed(1));
          b.style.opacity = String(0.25 + 0.75 * v);
        }
        // paper → orange → deep red colour ramp
        const c = ramp(v);
        col.data.set([c[0], c[1], c[2], 255], j * 4);
      }
      // scroll the space-time plot by one column
      const cv = heat.current!;
      ctx.drawImage(cv, -1, 0);
      ctx.putImageData(col, cv.width - 1, 0);
      const d = decode(y);
      const th = target.current - Math.PI / 2;
      marker.current?.setAttribute("cx", (110 + 54 * Math.cos(th)).toFixed(1));
      marker.current?.setAttribute("cy", (110 + 54 * Math.sin(th)).toFixed(1));
      if (read.current) {
        const m = ring.current.mods;
        read.current.textContent = `a ${m.a.toFixed(2)} · b ${m.b.toFixed(2)} · shift ${m.r.toFixed(2)} · ${d.strength > 0.15 ? `remembers ${Math.round((d.angle * 180) / Math.PI)}°` : "empty"}`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 220 - 110, y = ((e.clientY - r.top) / r.height) * 220 - 110;
    target.current = (Math.atan2(y, x) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
    setAuto(false);
    setPhase("present");
  };

  return (
    <>
      <div className="widget" role="group" aria-label="A working-memory circuit of 36 neurons">
        <div className="widget-head">
          <span><b>A working-memory ring</b> · 36 neurons, each tuned to one direction</span>
          <span className="mono" ref={read}>a 1.00 · b 0.00 · empty</span>
        </div>
        <div className="widget-grid two">
          <div>
            <div className="panel-title"><span>Activity on the ring</span><span className="mono">click to flash a target</span></div>
            <svg ref={svg} className="plot" viewBox="0 0 220 220" onPointerDown={pick} style={{ cursor: "crosshair", touchAction: "none" }} aria-label="Ring of neurons; bar length is activity">
              <circle cx={110} cy={110} r={58} fill="none" className="grid" />
              <circle cx={110} cy={110} r={3} fill="var(--ink)" />
              {Array.from({ length: N }, (_, j) => (
                <line key={j} ref={(el) => { bars.current[j] = el; }} stroke="var(--accent)" strokeWidth={4} strokeLinecap="round" x1={110} y1={110} x2={110} y2={110} />
              ))}
              <circle ref={marker} r={4} fill="none" stroke="var(--ink)" strokeWidth={1.2} cx={110} cy={56} />
            </svg>
          </div>
          <div>
            <div className="panel-title"><span>Every neuron over time</span><span className="mono">↑ preferred direction · time →</span></div>
            <canvas ref={heat} width={HISTORY} height={N} style={{ width: "100%", height: 220, imageRendering: "pixelated", borderRadius: 8, background: "#fffcf8", boxShadow: "0 0 0 1px var(--rule)" }} aria-label="Space-time plot of the ring's activity" />
            <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, minHeight: 18 }}>
              {auto ? `Trial: ${SCRIPT[stepIx].label}` : `Manual: ${LABELS[phase]}`}
            </div>
          </div>
        </div>
        <div className="controls">
          <div className="seg" role="group" aria-label="Circuit state">
            <button type="button" aria-pressed={auto} onClick={() => setAuto(true)}>Play a trial</button>
            {(["present", "hold", "shift", "clear"] as Phase[]).map((p) => (
              <button key={p} type="button" aria-pressed={!auto && phase === p} onClick={() => { setAuto(false); setPhase(p); }}>
                {LABELS[p]}
              </button>
            ))}
          </div>
          <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>Same weights in every state. Only the modulators a, b and the shift gain change.</span>
        </div>
      </div>
      <p className="widget-caption">
        <b>A live simulation of Eq. 1.</b> The recurrent weights keep 19 spatial patterns with eigenvalue 1, so whatever the input writes into them stays there when both modulators are off. A derivative-shaped second set of recurrent weights, gated by its own modulator, slides the stored bump around the ring as a travelling wave: the memory is updated, not rewritten.
      </p>
    </>
  );
}

function ramp(v: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0, [255, 252, 248]],
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
