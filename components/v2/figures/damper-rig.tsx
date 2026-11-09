"use client";
import { useEffect, useRef, useState } from "react";
import * as k from "@/components/iso/iso-kit";
import type { Plan, Point3 } from "@/components/iso/iso-kit";
import { Plate } from "@/components/iso/react/draw";
import { useReadout } from "@/components/iso/react/live";
import { basePlate, knob, labelPlate } from "@/components/figures/parts";
import { Range, useRange } from "@/components/widgets/slider";
import { dampingOf, PUSH_MAX, SPRING, shakeStep } from "@/lib/gain";

// ---- truth: a mass on a spring, ẍ + Bẋ + Kx = 0, the form the paper reduces the circuit to near rest ----
// The motor pushes along with the motion (feedback); the damper is the normalization. See dampingOf in lib/gain.
const RATE = 1.4; // model time units per second
const STOP = 1; // end stops, in units of travel
const statusOf = (B: number, hitting: boolean, energy: number) =>
  hitting ? "hitting the stops" : energy < 0.002 ? "at rest" : B < 0 ? "shaking harder" : "settling";
const readoutOf = (push: number, on: boolean, status: string) => `push ${push.toFixed(2)} · damper ${on ? "on" : "off"} · ${status}`;

// ---- world: the rail runs along x; +y is toward the viewer ----
const WIDTH = 620, HEIGHT = 400;
const BASE: Plan = { x: -132, y: -56, w: 264, d: 116, r: 9 };
const RY = -18, RZ = 4; // rail center line and top
const X0 = -14, AMP = 34; // carriage rest position and travel per unit
const CAR = { w: 20, d: 16, h: 12 };
const CZ = RZ + CAR.h / 2; // spring, rod and dashpot axis height
const ANCHOR = -112;
const POT = { x: 50, w: 46, r: 6.5, travel: 26 };
const PAPER: Plan = { x: X0 - AMP - 16, y: -2, w: 2 * AMP + 32, d: 52, r: 1.5 };
const PEN_Y = PAPER.y + 4, FEED = 9; // trace scrolls toward the viewer at FEED units per second
const MOTOR: Plan = { x: -40, y: -52, w: 52, d: 20, r: 3 };
const KNOB_AT = [MOTOR.x + 14, MOTOR.y + 10] as const;
const LAMP_AT = [MOTOR.x + 38, MOTOR.y + 10] as const;

const P = k.fitProjection(
  [...k.boxCorners(BASE, -14, 0), [ANCHOR, RY, 30], [POT.x + POT.w + POT.travel, RY, 30], [MOTOR.x, MOTOR.y, 24]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 56 },
);
const at = (p: Point3) => k.iso(p, P);
const KS = k.cameraOf(P).k;
const r1 = (v: number) => v.toFixed(1);

function under() {
  let s = basePlate(BASE, 10, P);
  s += labelPlate({ x: 74, y: 40, w: 46, d: 11, r: 1.5 }, P);
  // the chart paper and its roller
  s += k.solidSvg(k.slabOf(PAPER, 0, 0.6, P, 2), { tone: "hi", crease: "none" });
  const grid: string[] = [];
  for (let i = -2; i <= 2; i++) grid.push(k.lineOnTop([X0 + (AMP * i) / 2, PAPER.y + 1], [X0 + (AMP * i) / 2, PAPER.y + PAPER.d - 1], 0.6, P));
  s += k.lineSvg(grid.join(""), { tone: "faint" });
  s += k.lineSvg(k.lineOnTop([X0, PAPER.y + 1], [X0, PAPER.y + PAPER.d - 1], 0.6, P), { tone: "lo", dashed: true });
  s += k.solidSvg(k.slabOf({ x: PAPER.x - 4, y: PAPER.y - 3, w: PAPER.w + 8, d: 6, r: 3 }, 0, 6, P, 6, 0.4), { tone: "mid", crease: "lo" });
  return s;
}

function over() {
  let s = "";
  // the motor that pushes the carriage along with its motion, with the push knob and the warning lamp
  s += k.solidSvg(k.slabOf(MOTOR, 0, 16, P, 4, 0.8), { tone: "mid", inner: k.lineSvg(k.sideSeam(MOTOR, 10, P, 4), { tone: "faint" }) });
  s += k.lineSvg(k.planOutline(k.insetPlan(MOTOR, 2.5), 16, P, 3), { tone: "faint" });
  const kt = k.radialTicks(KNOB_AT[0], KNOB_AT[1], 8.6, 16, 4, 16, [1, 2], P, -0.8 * Math.PI, 1.6 * Math.PI);
  s += k.lineSvg(kt.minor, { tone: "lo" }) + k.lineSvg(kt.major, { tone: "mid" });
  s += k.solidSvg(k.cylinder(LAMP_AT[0], LAMP_AT[1], 4.4, 16, 2, P, 24, 0.4), { tone: "mid", crease: "lo" });
  // the rail, the spring anchor and the two end stops
  s += k.solidSvg(k.slabOf({ x: ANCHOR - 4, y: RY - 4, w: POT.x + POT.w + POT.travel - ANCHOR + 10, d: 8, r: 1.5 }, 0, RZ, P, 3, 0.4), { tone: "lo" });
  s += k.solidSvg(k.slabOf({ x: ANCHOR - 8, y: RY - 7, w: 8, d: 14, r: 1.5 }, 0, CZ + 8, P, 3, 0.5), { tone: "mid" });
  for (const x of [X0 - AMP * STOP - CAR.w / 2 - 4, X0 + AMP * STOP + CAR.w / 2]) {
    s += k.solidSvg(k.slabOf({ x, y: RY + 5, w: 4, d: 5, r: 1 }, 0, RZ + 6, P, 2, 0.4), { tone: "mid" });
  }
  // the dashpot's slide
  s += k.solidSvg(k.slabOf({ x: POT.x - 2, y: RY - 6, w: POT.w + POT.travel + 4, d: 12, r: 1.5 }, RZ, 1.6, P, 3), { tone: "mid" });
  return s;
}

/** Everything that moves: spring, carriage, pen, dashpot (slid in by `engage`), knob and lamp. */
function moving(x: number, engage: number, push: number, warn: boolean) {
  const cx = X0 + AMP * x;
  let s = knob(KNOB_AT[0], KNOB_AT[1], 16, 5.4, P, -0.8 * Math.PI + (1.6 * Math.PI * push) / PUSH_MAX - Math.PI / 2);
  if (warn) { const [lx, ly] = at([LAMP_AT[0], LAMP_AT[1], 18]); s += `<ellipse cx="${r1(lx)}" cy="${r1(ly)}" rx="${r1(3.4 * KS)}" ry="${r1(1.9 * KS)}" style="fill:var(--anatomy-red)"/>`; }
  // spring from the anchor to the carriage
  const c = k.coil(ANCHOR, cx - CAR.w / 2, [RY, CZ], 4.2, 11, "x", P, 14);
  s += k.lineSvg(c.back, { tone: "lo" });
  // dashpot: a cylinder on the slide, its rod reaching for the carriage
  const px = POT.x + (1 - engage) * POT.travel;
  const rodFrom = engage > 0.98 ? cx + CAR.w / 2 : px - 10;
  s += k.solidSvg(k.slabOf({ x: rodFrom, y: RY - 1, w: Math.max(0.5, px - rodFrom), d: 2, r: 1 }, CZ - 1, 2, P, 2), { tone: "hi", crease: "none" });
  s += k.solidSvg(k.slabOf({ x: px, y: RY - POT.r, w: POT.w, d: 2 * POT.r, r: POT.r - 0.2 }, CZ - POT.r, 2 * POT.r, P, 8, 0.4), {
    tone: "hi", crease: "lo", lit: engage > 0.98,
    inner: k.lineSvg(k.sideRing([px + POT.w - 6, RY, CZ], POT.r, "x", P, 20) + k.sideRing([px + 6, RY, CZ], POT.r, "x", P, 20), { tone: "faint" }),
  });
  s += k.solidSvg(k.slabOf({ x: px - 3, y: RY - 3, w: 3, d: 6, r: 3 }, CZ - 3, 6, P, 4), { tone: "mid" });
  // carriage, its weight and the pen arm reaching over the paper
  const plan: Plan = { x: cx - CAR.w / 2, y: RY - CAR.d / 2, w: CAR.w, d: CAR.d, r: 2 };
  s += k.solidSvg(k.slabOf(plan, RZ, CAR.h, P, 4, 0.6), { tone: "hi", crease: "lo" });
  s += k.lineSvg(k.planOutline(k.insetPlan(plan, 2.2), RZ + CAR.h, P, 3), { tone: "faint" });
  s += k.solidSvg(k.cylinder(cx, RY, 5, RZ + CAR.h, 6, P, 24, 0.5), { tone: "mid", crease: "lo" });
  s += k.lineSvg(c.front, { tone: "mid" });
  s += k.solidSvg(k.slabOf({ x: cx - 1.2, y: RY + CAR.d / 2, w: 2.4, d: PEN_Y - RY - CAR.d / 2, r: 0.6 }, RZ + 5, 2, P, 2), { tone: "hi", crease: "none" });
  s += k.lineSvg(k.segment([cx, PEN_Y, RZ + 5], [cx, PEN_Y, 0.8], P), { tone: "hi", free: "end" });
  return s;
}

/** The pen's record: x(t) on the paper, newest at the pen, older nearer the viewer. */
function traceOf(xs: number[], now: number, ts: number[]) {
  const pts: k.Flat[] = [];
  for (let i = xs.length - 1; i >= 0; i--) {
    const y = PEN_Y + (now - ts[i]) * FEED;
    if (y > PAPER.y + PAPER.d - 1) break;
    pts.push(at([X0 + AMP * xs[i], y, 0.7]));
  }
  return pts.length > 1 ? k.lineSvg(k.pathOf(pts), { tone: "lit", free: true }) : "";
}

const UNDER = under(), OVER = over();
const START = 1.1;

export function DamperRigFigure({ bare = false, speed = 1, amplitude = 1 }: { bare?: boolean; speed?: number; amplitude?: number } = {}) {
  const { anchor, say } = useReadout<SVGSVGElement>();
  const movingRef = useRef<SVGGElement>(null);
  const traceRef = useRef<SVGGElement>(null);
  const range = useRange();
  const [damper, setDamper] = useState(false);
  const live = useRef({ push: START, on: false, engage: 0, x: 0.12, v: 0, t: 0, xs: [] as number[], ts: [] as number[], touched: -1e9, next: 7, hit: 0, visible: false });

  const kick = () => { live.current.v += 0.7 * amplitude * Math.sqrt(SPRING); };
  const choose = (on: boolean) => { live.current.on = on; setDamper(on); };

  useEffect(() => {
    const svg = anchor.current!;
    const io = new IntersectionObserver(([e]) => {
      live.current.visible = e.isIntersecting;
      if (e.isIntersecting && !raf) { last = 0; raf = requestAnimationFrame(tick); }
    });
    io.observe(svg);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = 0;
    const tick = (now: number) => {
      const L = live.current;
      if (!L.visible) { raf = 0; return; }
      raf = requestAnimationFrame(tick);
      const dt = (last ? Math.min(0.05, (now - last) / 1000) : 1 / 60) * speed;
      last = now;
      L.t += dt;
      // idle tour: switch the damper every few seconds, with a kick when it goes off
      if (!still && now - L.touched > 6000 && L.t > L.next) {
        choose(!L.on);
        if (!L.on) kick();
        L.next = L.t + (L.on ? 6 : 7);
      }
      L.engage += ((L.on ? 1 : 0) - L.engage) * (1 - Math.exp(-dt / 0.12));
      const B = dampingOf(L.push, L.engage > 0.98);
      if (still) { L.x = 0; L.v = 0; }
      else {
        const n = Math.max(1, Math.ceil((dt * RATE) / 0.005)), h = (dt * RATE) / n;
        for (let i = 0; i < n; i++) {
          shakeStep(L, B, h);
          if (Math.abs(L.x) > STOP) { L.x = Math.sign(L.x) * STOP; L.v = -0.85 * L.v; L.hit = L.t; }
        }
      }
      L.xs.push(L.x); L.ts.push(L.t);
      if (L.xs.length > 600) { L.xs.splice(0, 100); L.ts.splice(0, 100); }
      const hitting = L.t - L.hit < 0.8;
      if (movingRef.current) movingRef.current.innerHTML = moving(L.x, L.engage, L.push, hitting);
      if (traceRef.current) traceRef.current.innerHTML = traceOf(L.xs, L.t, L.ts);
      range.show(L.push / PUSH_MAX, L.push.toFixed(2));
      say(readoutOf(L.push, L.on, statusOf(B, hitting, L.x * L.x + (L.v * L.v) / SPRING)));
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [anchor, say, speed, amplitude, range]);

  const touch = () => { live.current.touched = performance.now(); };

  return (
    <div className={bare ? "anatomy-wrap bare iso" : "anatomy-wrap iso"} data-theme="light">
      <Plate
        fig="Fig 1"
        title="A spring with and without its damper"
        readout={readoutOf(START, false, "shaking harder")}
        keys={bare ? [] : [
          { mark: "raised", label: "Carriage on a spring, pushed along by the motor" },
          { mark: "lit", label: "Pen trace of its motion" },
        ]}
        caption={bare ? undefined : "The motor pushes the carriage along with its own motion, the way recurrent feedback amplifies a neuron. Without the damper, past a certain push the shaking grows until the carriage hits the stops. With it, the shaking dies away for any push."}
      >
        <div className="iso-stage">
          <svg ref={anchor} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="An isometric test rig: a carriage on a spring along a rail, a motor that pushes it, a dashpot that can slide in to damp it, and a pen tracing its motion on a strip of paper">
            <g suppressHydrationWarning dangerouslySetInnerHTML={{ __html: UNDER }} />
            <g ref={traceRef} />
            <g suppressHydrationWarning dangerouslySetInnerHTML={{ __html: OVER }} />
            <g ref={movingRef} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: moving(0.12, 0, START, false) }} />
          </svg>
          <div className="controls">
            <Range range={range} label="Feedback push" min={0} max={1} step={0.001} initial={START / PUSH_MAX} text={START.toFixed(2)} onInput={(u) => { live.current.push = u * PUSH_MAX; touch(); }} />
            <div className="seg" role="group" aria-label="Damper">
              <button type="button" aria-pressed={!damper} onClick={() => { choose(false); touch(); }}>Damper off</button>
              <button type="button" aria-pressed={damper} onClick={() => { choose(true); touch(); }}>Damper on</button>
            </div>
            <button type="button" className="figure-button" onClick={() => { kick(); touch(); }}>Kick it</button>
          </div>
        </div>
      </Plate>
    </div>
  );
}
