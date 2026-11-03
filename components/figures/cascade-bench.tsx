"use client";
import { useEffect, useRef, useState } from "react";
import * as k from "../iso/iso-kit";
import type { Plan, Point3 } from "../iso/iso-kit";
import { Plate } from "../iso/react/draw";
import { useReadout } from "../iso/react/live";
import { cascadeLag, cascadeStep } from "@/lib/rqf";
import { basePlate, knob, labelPlate } from "./parts";

// ---- truth: six leaky layers (RQF with γ = 1), τ = 20 ms, driven by a 4 Hz sine, ZOH at 1 ms ----
const LAYERS = 6;
const TAU = 0.02;
const HZ = 4;
const H = 0.001;
const SLOW = 0.18; // shown at 0.18× real time
const readoutOf = (pros: boolean) =>
  pros ? `prospective · layer 6 lag 0 ms` : `instantaneous · layer 6 lag ${Math.round(cascadeLag(LAYERS, HZ, TAU) * 1000)} ms`;

// ---- world ----
const WIDTH = 620, HEIGHT = 400;
const BASE: Plan = { x: -156, y: -74, w: 312, d: 150, r: 9 };
const ROWS = LAYERS + 1; // row 0 is the input
const ROW_Y = (r: number) => 48 - r * 16;
const ROW_Z = (r: number) => r * 4.5;
const RAIL_X0 = -100, RAIL_W = 212;
const X0 = 6, AMP = 66;
const CAR = { w: 16, d: 10, h: 6 };
const DRIVE: Plan = { x: -146, y: ROW_Y(0) - 9, w: 30, d: 18, r: 3 };
const SWITCH: Plan = { x: 122, y: 52, w: 22, d: 14, r: 2 };
const LABEL: Plan = { x: -60, y: 60, w: 50, d: 11, r: 1.5 };

const P = k.fitProjection(
  [...k.boxCorners(BASE, -14, 0), [RAIL_X0, ROW_Y(LAYERS) - 6, ROW_Z(LAYERS) + 14], [RAIL_X0 + RAIL_W, ROW_Y(LAYERS) - 6, ROW_Z(LAYERS) + 14]],
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
  const rail: Plan = { x: RAIL_X0, y: y - 2.5, w: RAIL_W, d: 5, r: 1 };
  s += k.solidSvg(k.slabOf(rail, z, 3, P, 3, 0.4), { tone: "mid" });
  // ruler on the plinth's front face, hanging from its top edge
  if (z > 0) {
    const t = k.sideTicks(RAIL_X0 + 4, RAIL_X0 + RAIL_W - 4, 4, 5, plinth.y + plinth.d, z, [1.4, 2.6], P);
    s += k.lineSvg(t.minor, { tone: "lo" }) + k.lineSvg(t.major, { tone: "mid" });
  }
  for (const x of [RAIL_X0 - 5, RAIL_X0 + RAIL_W + 1]) {
    s += k.solidSvg(k.slabOf({ x, y: y - 5, w: 4, d: 10, r: 1 }, z, 7, P, 3, 0.4), { tone: "mid" });
    s += k.dotsSvg([at([x + 2, y, z + 7])], { size: 0.5 });
  }
  s += k.dotsSvg(k.pointsAt([[RAIL_X0 + 20, y, z + 3], [RAIL_X0 + RAIL_W - 20, y, z + 3]], P), { size: 0.45 });
  return s;
}

function carriage(r: number) {
  const y = ROW_Y(r), z = ROW_Z(r) + 3;
  const plan: Plan = { x: X0 - CAR.w / 2, y: y - CAR.d / 2, w: CAR.w, d: CAR.d, r: 2 };
  const top = r === LAYERS || r === 0;
  let s = k.solidSvg(k.slabOf(plan, z, CAR.h, P, 4, 0.5), { tone: "hi", crease: "lo", lit: r === LAYERS });
  s += k.lineSvg(k.planOutline(k.insetPlan(plan, 2), z + CAR.h, P, 3), { tone: "faint" });
  // the damper: a short piston can on the carriage, the integrator of this layer
  if (r > 0) {
    s += k.solidSvg(k.cylinder(X0, y, 3, z + CAR.h, 4, P, 20, 0.3), { tone: top ? "hi" : "mid", crease: "lo" });
    s += k.lineSvg(k.sideArc(X0, y, 3, z + CAR.h + 1.6, P, 14), { tone: "faint" });
  } else {
    s += k.solidSvg(k.slabOf({ x: X0 - 3, y: y - 3, w: 6, d: 6, r: 1 }, z + CAR.h, 2, P, 2), { tone: "mid" });
  }
  s += k.dotsSvg(k.pointsAt([[plan.x + 2.4, plan.y + 2.4, z + CAR.h], [plan.x + plan.w - 2.4, plan.y + 2.4, z + CAR.h]], P), { size: 0.45 });
  // pointer that reads the ruler
  s += k.lineSvg(k.segment([X0, plan.y + plan.d - 0.8, z + 1.5], [X0, plan.y + plan.d + 1, z - 3.5], P), { tone: r === LAYERS ? "lit" : "hi", free: "end" });
  return s;
}

/** The ghost index: where the input is now, shown on every layer's ruler. */
function ghost(r: number) {
  const y = ROW_Y(r) + 6, z = ROW_Z(r);
  return k.lineSvg(k.segment([X0, y, z + 0.2], [X0, y, z - 3.8], P), { tone: "mid", dotted: true, free: true });
}

function staticArt() {
  let s = basePlate(BASE, 10, P);
  s += labelPlate(LABEL, P);
  // drive box at the input rail's left end
  s += k.solidSvg(k.slabOf(DRIVE, 0, 14, P, 4, 0.8), { tone: "mid", inner: k.lineSvg(k.sideSeam(DRIVE, 10, P, 4), { tone: "faint" }) });
  s += k.lineSvg(k.planOutline(k.insetPlan(DRIVE, 2.5), 14, P, 3), { tone: "faint" });
  s += knob(DRIVE.x + 10, DRIVE.y + 9, 14, 5, P, 0.6);
  s += k.dotsSvg(k.pointsAt([[DRIVE.x + 22, DRIVE.y + 4, 14], [DRIVE.x + 22, DRIVE.y + 14, 14]], P), { size: 0.5 });
  s += k.solidSvg(k.slabOf({ x: DRIVE.x + DRIVE.w, y: ROW_Y(0) - 3, w: 3, d: 6, r: 0.8 }, 4, 6, P, 2), { tone: "mid" });
  // switch box
  s += k.solidSvg(k.slabOf(SWITCH, 0, 6, P, 3, 0.6), { tone: "mid" });
  s += k.lineSvg(k.planOutline(k.insetPlan(SWITCH, 2), 6, P, 3), { tone: "faint" });
  s += k.dotsSvg(k.pointsAt([[SWITCH.x + 3, SWITCH.y + 3, 6], [SWITCH.x + SWITCH.w - 3, SWITCH.y + SWITCH.d - 3, 6]], P), { size: 0.45 });
  return s;
}

const lever = (pros: boolean) => {
  const cx = SWITCH.x + SWITCH.w / 2, cy = SWITCH.y + SWITCH.d / 2;
  const tip: Point3 = [cx + (pros ? 7 : -7), cy, 18];
  return (
    k.solidSvg(k.cylinder(cx, cy, 3.4, 6, 1.6, P, 20), { tone: "lo" }) +
    k.lineSvg(k.segment([cx, cy, 7.6], tip, P), { tone: "hi" }) +
    k.dotsSvg([at([cx, cy, 7.6])], { size: 1.1, tone: "hi" }) +
    k.solidSvg(k.cylinder(tip[0], tip[1], 1.8, tip[2] - 1.2, 2.4, P, 16, 0.3), { tone: pros ? "hi" : "mid", lit: pros })
  );
};

const pushrod = (x: number) => {
  const from = DRIVE.x + DRIVE.w + 3, to = x - CAR.w / 2;
  return k.solidSvg(k.slabOf({ x: from, y: ROW_Y(0) - 1.2, w: Math.max(1, to - from), d: 2.4, r: 1 }, 6.2, 2.4, P, 2), { tone: "hi", crease: "none" });
};

const STATIC = staticArt();
const ROWS_ART = Array.from({ length: ROWS }, (_, r) => ({ row: row(r), car: carriage(r), ghost: r > 0 ? ghost(r) : "" }));
const ORDER = Array.from({ length: ROWS }, (_, r) => ROWS - 1 - r); // back rows first

export function CascadeBenchFigure() {
  const { anchor, say } = useReadout<SVGSVGElement>();
  const [pros, setPros] = useState(false);
  const cars = useRef<(SVGGElement | null)[]>([]);
  const ghosts = useRef<(SVGGElement | null)[]>([]);
  const rod = useRef<SVGGElement>(null);
  const live = useRef({ pros: false, t: 0, ys: new Array(LAYERS).fill(0), prev: new Array(LAYERS).fill(0), visible: false });

  useEffect(() => {
    live.current.pros = pros;
    say(readoutOf(pros));
  }, [pros, say]);

  useEffect(() => {
    const svg = anchor.current!;
    const io = new IntersectionObserver(([e]) => (live.current.visible = e.isIntersecting));
    io.observe(svg);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const L = live.current;
    // settle into steady state before the first frame
    for (let i = 0; i < 1500; i++) { L.t += H; cascadeStep(L.ys, L.prev, Math.sin(2 * Math.PI * HZ * L.t), H, TAU, L.pros); }
    let raf = 0, last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!L.visible && last) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const n = still ? 0 : Math.round((dt * SLOW) / H);
      for (let i = 0; i < n; i++) { L.t += H; cascadeStep(L.ys, L.prev, Math.sin(2 * Math.PI * HZ * L.t), H, TAU, L.pros); }
      const input = Math.sin(2 * Math.PI * HZ * L.t);
      const move = (g: SVGGElement | null, v: number) => g?.setAttribute("transform", k.translateAlong(P, [AMP * v, 0, 0]));
      move(cars.current[0], input);
      for (let l = 0; l < LAYERS; l++) { move(cars.current[l + 1], L.ys[l]); move(ghosts.current[l + 1], input); }
      if (rod.current) rod.current.innerHTML = pushrod(X0 + AMP * input);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [anchor]);

  return (
    <div className="anatomy-wrap iso" data-theme="light">
      <Plate
        fig="Fig 1"
        title="Six followers on a bench"
        hint="Click the bench, or use the switch below"
        readout={readoutOf(false)}
        keys={[
          { mark: "raised", label: "Front rail: the input" },
          { mark: "lit", label: "Top layer" },
          { mark: "dotted", label: "Where the input is now" },
        ]}
        caption="Each rail is one layer. Its carriage follows the carriage in front of it through a damper, the way a leaky integrator follows its input, so every rail adds a little lag. The dotted index on each ruler shows where the input is right now. Flip the switch to drive every layer with the look-ahead z + τż, and the six carriages fall into line. The motion is the paper’s own update rule, τ = 20 ms, a 4 Hz input, shown at 0.18× speed."
      >
        <div className="iso-stage">
          <svg ref={anchor} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="An isometric bench with seven stepped rails. The front carriage is driven back and forth; each carriage behind follows the one in front with a delay." onClick={() => setPros((p) => !p)} style={{ cursor: "pointer" }}>
            <g dangerouslySetInnerHTML={{ __html: STATIC }} />
            {ORDER.map((r) => (
              <g key={r}>
                <g dangerouslySetInnerHTML={{ __html: ROWS_ART[r].row }} />
                {r > 0 ? <g ref={(el) => { ghosts.current[r] = el; }} dangerouslySetInnerHTML={{ __html: ROWS_ART[r].ghost }} /> : <g ref={rod} />}
                <g ref={(el) => { cars.current[r] = el; }} dangerouslySetInnerHTML={{ __html: ROWS_ART[r].car }} />
              </g>
            ))}
            <g dangerouslySetInnerHTML={{ __html: lever(pros) }} />
          </svg>
          <div className="figure-buttons">
            <div className="seg" role="group" aria-label="Bottom-up input">
              <button type="button" aria-pressed={!pros} onClick={() => setPros(false)}>Instantaneous input</button>
              <button type="button" aria-pressed={pros} onClick={() => setPros(true)}>Prospective input</button>
            </div>
          </div>
        </div>
      </Plate>
    </div>
  );
}
