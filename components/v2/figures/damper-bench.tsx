"use client";
import { useEffect, useRef } from "react";
import * as k from "@/components/iso/iso-kit";
import type { Plan, Point3 } from "@/components/iso/iso-kit";
import { Plate } from "@/components/iso/react/draw";
import { useReadout } from "@/components/iso/react/live";
import { basePlate, knob, labelPlate } from "@/components/figures/parts";
import { organicsStep, poolGain, settled } from "@/lib/gain";

// ---- truth: five ORGaNICs units, W_r = I, one shared normalization pool (W = 1/n), σ = 0.2, τa = 3τy ----
const N = 5;
const PATTERN = [1, 0.6, -0.4, 0.8, -1];
const IN_LO = 0.05, IN_HI = 2;
const RATE = 4, H = 0.004;
const zOf = (input: number) => PATTERN.map((p) => p * input);
const readoutOf = (input: number, gain: number, ringing: boolean) => `input ${input.toFixed(2)} · pool gain ${gain.toFixed(2)} · ${ringing ? "ringing" : "settled"}`;

// ---- world ----
const WIDTH = 620, HEIGHT = 400;
const BASE: Plan = { x: -156, y: -74, w: 312, d: 150, r: 9 };
const ROW_Y = (r: number) => 28 - r * 16;
const ROW_Z = (r: number) => r * 7;
const RAIL_X0 = -104, RAIL_W = 212;
const X0 = 0, AMP = 44; // carriage travel per unit of response
const CAR = { w: 16, d: 10, h: 6 };
const ANCHOR_X = -102, POT_X = 80, POT_W = 22;
const DRIVE: Plan = { x: -146, y: 44, w: 34, d: 22, r: 3 };
const DIAL = { x: 46, y: 60, r: 13 };
const LABEL: Plan = { x: -70, y: 56, w: 50, d: 11, r: 1.5 };
const DIAL_LO = 0, DIAL_HI = 1.5, FROM = -0.75 * Math.PI, SPAN = 1.5 * Math.PI;

const P = k.fitProjection(
  [...k.boxCorners(BASE, -14, 0), [RAIL_X0, ROW_Y(N - 1) - 6, ROW_Z(N - 1) + 14], [RAIL_X0 + RAIL_W, ROW_Y(N - 1) - 6, ROW_Z(N - 1) + 14]],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 52 },
);
const at = (p: Point3) => k.iso(p, P);

function row(r: number) {
  const y = ROW_Y(r), z = ROW_Z(r);
  const plinth: Plan = { x: RAIL_X0 - 8, y: y - 6, w: RAIL_W + 16, d: 12, r: 1.5 };
  let s = "";
  if (z > 0) s += k.solidSvg(k.slabOf(plinth, 0, z, P, 3, 0.4), { tone: "lo" });
  s += k.solidSvg(k.slabOf({ x: RAIL_X0, y: y - 2.5, w: RAIL_W, d: 5, r: 1 }, z, 3, P, 3, 0.4), { tone: "mid" });
  if (z > 0) {
    const t = k.sideTicks(RAIL_X0 + 4, RAIL_X0 + RAIL_W - 4, 4, 5, plinth.y + plinth.d, z, [1.4, 2.6], P);
    s += k.lineSvg(t.minor, { tone: "lo" }) + k.lineSvg(t.major, { tone: "mid" });
  }
  // spring anchor at the left end
  const anchor: Plan = { x: ANCHOR_X - 6, y: y - 5, w: 6, d: 10, r: 1 };
  s += k.solidSvg(k.slabOf(anchor, z, 10, P, 3, 0.4), { tone: "mid" });
  s += k.dotsSvg(k.pointsAt([[ANCHOR_X - 3, y - 2.5, z + 10], [ANCHOR_X - 3, y + 2.5, z + 10]], P), { size: 0.45 });
  // dashpot at the right end: a cylinder lying along x on a saddle, with a gland
  const cz = z + 7;
  s += k.solidSvg(k.slabOf({ x: POT_X + 4, y: y - 4, w: POT_W - 8, d: 8, r: 1 }, z + 3, 2, P, 2), { tone: "lo" });
  s += k.solidSvg(k.slabOf({ x: POT_X, y: y - 3.4, w: POT_W, d: 6.8, r: 3.3 }, cz - 3.4, 6.8, P, 6, 0.3), {
    tone: "hi",
    crease: "lo",
    inner: k.lineSvg(k.sideRing([POT_X + POT_W - 4, y, cz], 3.4, "x", P, 16), { tone: "faint" }),
  });
  s += k.solidSvg(k.slabOf({ x: POT_X - 2, y: y - 2.2, w: 2, d: 4.4, r: 2 }, cz - 2.2, 4.4, P, 4), { tone: "mid" });
  s += k.solidSvg(k.slabOf({ x: POT_X + POT_W, y: y - 5, w: 4, d: 10, r: 1 }, z, 12, P, 3, 0.4), { tone: "mid" });
  s += k.dotsSvg(k.pointsAt([[POT_X + POT_W + 2, y - 2.5, z + 12], [POT_X + POT_W + 2, y + 2.5, z + 12]], P), { size: 0.45 });
  return s;
}

function carriage(r: number) {
  const y = ROW_Y(r), z = ROW_Z(r) + 3;
  const plan: Plan = { x: X0 - CAR.w / 2, y: y - CAR.d / 2, w: CAR.w, d: CAR.d, r: 2 };
  let s = k.solidSvg(k.slabOf(plan, z, CAR.h, P, 4, 0.5), { tone: "hi", crease: "lo" });
  s += k.lineSvg(k.planOutline(k.insetPlan(plan, 2), z + CAR.h, P, 3), { tone: "faint" });
  // a weight on top: the mass of the oscillator
  s += k.solidSvg(k.cylinder(X0, y, 3.4, z + CAR.h, 4, P, 20, 0.4), { tone: "mid", crease: "lo" });
  s += k.dotsSvg(k.pointsAt([[plan.x + 2.4, plan.y + 2.4, z + CAR.h], [plan.x + plan.w - 2.4, plan.y + 2.4, z + CAR.h]], P), { size: 0.45 });
  s += k.lineSvg(k.segment([X0, plan.y + plan.d - 0.8, z + 1.5], [X0, plan.y + plan.d + 1, z - 3.5], P), { tone: "hi", free: "end" });
  return s;
}

/** Where this unit will come to rest: the normalization fixed point, on its ruler. */
const ghost = (r: number) => k.lineSvg(k.segment([X0, ROW_Y(r) + 6, ROW_Z(r) + 0.2], [X0, ROW_Y(r) + 6, ROW_Z(r) - 3.8], P), { tone: "mid", dotted: true, free: true });

/** The parts that stretch: the spring from the anchor and the piston rod into the dashpot. */
function stretch(r: number, x: number) {
  const y = ROW_Y(r), z = ROW_Z(r) + 3 + CAR.h / 2 + 1;
  const c = k.coil(ANCHOR_X, x - CAR.w / 2, [y, z], 2.8, 30, "x", P, 10);
  const from = x + CAR.w / 2, to = POT_X - 2;
  const rod = k.solidSvg(k.slabOf({ x: from, y: y - 0.9, w: Math.max(0.5, to - from), d: 1.8, r: 0.9 }, z + 0.1, 1.8, P, 2), { tone: "hi", crease: "none" });
  return { back: k.lineSvg(c.back, { tone: "lo" }), front: k.lineSvg(c.front, { tone: "mid" }) + rod };
}

function staticArt() {
  let s = basePlate(BASE, 10, P);
  s += labelPlate(LABEL, P);
  // input box with the contrast knob
  s += k.solidSvg(k.slabOf(DRIVE, 0, 12, P, 4, 0.8), { tone: "mid", inner: k.lineSvg(k.sideSeam(DRIVE, 8, P, 4), { tone: "faint" }) });
  s += k.lineSvg(k.planOutline(k.insetPlan(DRIVE, 2.5), 12, P, 3), { tone: "faint" });
  const kt = k.radialTicks(DRIVE.x + 12, DRIVE.y + 11, 9.6, 20, 5, 12, [1, 2], P, -0.8 * Math.PI, 1.6 * Math.PI);
  s += k.lineSvg(kt.minor, { tone: "lo" }) + k.lineSvg(kt.major, { tone: "mid" });
  s += k.dotsSvg(k.pointsAt([[DRIVE.x + 28, DRIVE.y + 4, 12], [DRIVE.x + 28, DRIVE.y + 18, 12]], P), { size: 0.5 });
  // pool gauge: the shared normalization signal √a
  const top = 14;
  s += k.solidSvg(k.cylinder(DIAL.x, DIAL.y, DIAL.r + 2, 0, 3, P, 40, 0.4), { tone: "lo" });
  s += k.solidSvg(k.cylinder(DIAL.x, DIAL.y, DIAL.r, 3, top - 3, P, 56, 0.6), { tone: "hi", crease: "lo" });
  s += k.lineSvg(k.knurl(DIAL.x, DIAL.y, DIAL.r, top - 3, top, 60, P, 0.3), { tone: "lo" });
  s += k.lineSvg(k.ring(DIAL.x, DIAL.y, DIAL.r - 1.8, top, P, 48), { tone: "lo" });
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2.6, 15, 5, top, [1, 2.2], P, FROM, SPAN);
  s += k.lineSvg(t.minor, { tone: "lo" }) + k.lineSvg(t.major, { tone: "mid" });
  return s;
}

function needle(v: number) {
  const ang = FROM + (SPAN * (Math.min(DIAL_HI, Math.max(DIAL_LO, v)) - DIAL_LO)) / (DIAL_HI - DIAL_LO);
  const top = 14.2, L = DIAL.r - 3.4;
  return (
    k.lineSvg(k.lineOnTop([DIAL.x - Math.sin(ang) * 3.5, DIAL.y + Math.cos(ang) * 3.5], [DIAL.x + Math.sin(ang) * L, DIAL.y - Math.cos(ang) * L], top, P), { tone: "lit", free: true }) +
    k.solidSvg(k.cylinder(DIAL.x, DIAL.y, 1.4, top - 0.2, 0.7, P, 14), { tone: "hi", crease: "none" })
  );
}

const STATIC = staticArt();
const ROWS = Array.from({ length: N }, (_, r) => ({ row: row(r), car: carriage(r), ghost: ghost(r) }));
const ORDER = Array.from({ length: N }, (_, r) => N - 1 - r); // back rows first
const knobAt = (input: number) => knob(DRIVE.x + 12, DRIVE.y + 11, 12, 6, P, -0.8 * Math.PI + (1.6 * Math.PI * Math.log(input / IN_LO)) / Math.log(IN_HI / IN_LO) - Math.PI / 2);
const START = 0.6;
const START_Y = settled(zOf(START));
const START_STRETCH = START_Y.map((v, r) => stretch(r, X0 + AMP * v));

export function DamperBenchFigure({ bare = false, speed = 1, amplitude = 1 }: { bare?: boolean; speed?: number; amplitude?: number } = {}) {
  const { anchor, say } = useReadout<SVGSVGElement>();
  const cars = useRef<(SVGGElement | null)[]>([]);
  const ghosts = useRef<(SVGGElement | null)[]>([]);
  const backs = useRef<(SVGGElement | null)[]>([]);
  const fronts = useRef<(SVGGElement | null)[]>([]);
  const needleRef = useRef<SVGGElement>(null);
  const knobRef = useRef<SVGGElement>(null);
  const live = useRef({
    input: START, target: START, y: [...START_Y], a: START_Y.map(() => poolGain(zOf(START)) ** 2),
    touched: -1e9, nextKick: 1.5, clock: 0, kicks: 0, visible: false,
  });

  useEffect(() => {
    const svg = anchor.current!;
    const io = new IntersectionObserver(([e]) => {
      live.current.visible = e.isIntersecting;
      if (e.isIntersecting && !raf) { last = 0; raf = requestAnimationFrame(tick); }
    });
    io.observe(svg);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = 0, lastKnob = "";
    const tick = (now: number) => {
      const L = live.current;
      if (!L.visible) { raf = 0; return; }
      raf = requestAnimationFrame(tick);
      const dt = (last ? Math.min(0.05, (now - last) / 1000) : 1 / 60) * speed;
      last = now;
      L.clock += dt;
      // idle tour: alternate a kick with a new input level, every few seconds
      if (!still && now - L.touched > 5000 && L.clock > L.nextKick) {
        L.kicks++;
        if (L.kicks % 2) kick(L);
        else L.target = IN_LO * (IN_HI / IN_LO) ** [0.75, 0.3, 0.95, 0.55][(L.kicks / 2) % 4];
        L.nextKick = L.clock + 3.2;
      }
      L.input += (L.target - L.input) * (1 - Math.exp(-dt / 0.15));
      const z = zOf(L.input), ys = settled(z);
      if (still) { L.y = [...ys]; L.a = L.a.map(() => poolGain(z) ** 2); }
      else for (let i = 0, n = Math.round((dt * RATE) / H); i < n; i++) organicsStep(L.y, L.a, z, H);
      let off = 0;
      for (let r = 0; r < N; r++) {
        // end stops: the carriage can't run into the anchor or the dashpot
        const x = Math.max(ANCHOR_X + CAR.w / 2 + 12, Math.min(POT_X - CAR.w / 2 - 4, X0 + AMP * L.y[r] * amplitude));
        off = Math.max(off, Math.abs(L.y[r] - ys[r]));
        cars.current[r]?.setAttribute("transform", k.translateAlong(P, [x - X0, 0, 0]));
        ghosts.current[r]?.setAttribute("transform", k.translateAlong(P, [AMP * ys[r] * amplitude, 0, 0]));
        const st = stretch(r, x);
        if (backs.current[r]) backs.current[r]!.innerHTML = st.back;
        if (fronts.current[r]) fronts.current[r]!.innerHTML = st.front;
      }
      const g = L.a.reduce((t, v) => t + Math.sqrt(Math.max(v, 0)), 0) / N;
      if (needleRef.current) needleRef.current.innerHTML = needle(g);
      const kn = knobAt(L.input);
      if (kn !== lastKnob && knobRef.current) { knobRef.current.innerHTML = kn; lastKnob = kn; }
      say(readoutOf(L.input, g, off > 0.02));
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [anchor, say, speed, amplitude]);

  const kick = (L: typeof live.current) => {
    L.y = L.y.map((v, i) => v + [0.6, -0.5, 0.55, -0.6, 0.45][(i + L.kicks) % N]);
    L.a = L.a.map((v) => v * 0.25);
  };
  const setFrom = (clientX: number) => {
    const r = anchor.current!.getBoundingClientRect();
    live.current.target = IN_LO * (IN_HI / IN_LO) ** Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    live.current.touched = performance.now();
  };
  const onKey = (e: React.KeyboardEvent) => {
    const L = live.current;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") L.target = Math.min(IN_HI, L.target * 1.15);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") L.target = Math.max(IN_LO, L.target / 1.15);
    else if (e.key === " " || e.key === "Enter") { L.kicks++; kick(L); }
    else return;
    e.preventDefault();
    L.touched = performance.now();
  };

  return (
    <div className={bare ? "anatomy-wrap bare iso" : "anatomy-wrap iso"} data-theme="light">
      <Plate
        fig="Fig 1"
        title="Five oscillators, one pool"
        hint="Click to knock the carriages, drag ← → to change the input"
        readout={readoutOf(START, poolGain(zOf(START)), false)}
        keys={bare ? [] : [
          { mark: "raised", label: "Carriage: one neuron’s response y" },
          { mark: "dotted", label: "The normalization fixed point" },
          { mark: "lit", label: "Shared pool gain √a" },
        ]}
        caption={bare ? undefined : "Near its fixed point, an ORGaNICs circuit behaves like a set of masses on springs with dampers. Each rail is one excitatory neuron; its carriage is the neuron’s response. All five share one normalization pool, read on the gauge, which sets how stiff the springs are and how hard the dampers pull. Knock the carriages and they ring and settle; turn up the input and they move out but saturate, landing on the divisive-normalization answer marked on each ruler. The motion is the paper’s own equations with identity recurrence, σ = 0.2 and τa = 3τy."}
      >
        <div className="iso-stage" tabIndex={0} onKeyDown={onKey} aria-label="Damped oscillator bench; arrow keys change the input, Enter knocks the carriages" style={{ touchAction: "pan-y", cursor: "pointer" }}>
          <svg
            ref={anchor}
            className="iso-svg"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label="An isometric bench of five stepped rails. On each, a carriage is held between a coil spring and a dashpot; a gauge in front reads the shared normalization signal."
            onPointerDown={() => {
              const L = live.current;
              L.kicks++; kick(L);
              L.touched = performance.now();
            }}
            onPointerMove={(e) => e.buttons && e.movementX && setFrom(e.clientX)}
          >
            <g suppressHydrationWarning dangerouslySetInnerHTML={{ __html: STATIC }} />
            {ORDER.map((r) => (
              <g key={r}>
                <g suppressHydrationWarning dangerouslySetInnerHTML={{ __html: ROWS[r].row }} />
                <g ref={(el) => { ghosts.current[r] = el; }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: ROWS[r].ghost }} transform={k.translateAlong(P, [AMP * START_Y[r], 0, 0])} />
                <g ref={(el) => { backs.current[r] = el; }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: START_STRETCH[r].back }} />
                <g ref={(el) => { cars.current[r] = el; }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: ROWS[r].car }} transform={k.translateAlong(P, [AMP * START_Y[r], 0, 0])} />
                <g ref={(el) => { fronts.current[r] = el; }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: START_STRETCH[r].front }} />
              </g>
            ))}
            <g ref={needleRef} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: needle(poolGain(zOf(START))) }} />
            <g ref={knobRef} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: knobAt(START) }} />
          </svg>
        </div>
      </Plate>
    </div>
  );
}
