"use client";
import { useEffect, useRef } from "react";
import * as k from "@/components/iso/iso-kit";
import type { Plan, Point3 } from "@/components/iso/iso-kit";
import { Plate } from "@/components/iso/react/draw";
import { useReadout } from "@/components/iso/react/live";
import { basePlate, bindingPost, knob, labelPlate } from "@/components/figures/parts";
import { Range, useRange } from "@/components/widgets/slider";
import { ORG, pairStep } from "@/lib/gain";

// ---- truth ----
// Two one-neuron circuits get the same input z and the same self-feedback w.
// Plain:      ẏ = −y + w·y + z                       → runs away for any w > 1.
// Normalized: ẏ = −y + w(1 − √a)·y + z, τa ȧ = −a + σ² + a·y²   (ORGaNICs, Eq. 3, n = 1) → settles for every w.
const Z = 0.5, S2 = ORG.sigma ** 2;
const W_MAX = 2.5, Y_MAX = 3;
const RATE = 2; // model time units per second
const CYCLE = 10; // seconds before both circuits are reset and switched on again
const fmt = (y: number) => (Math.abs(y) > Y_MAX ? "off the scale" : y.toFixed(2));
const readoutOf = (w: number, plain: number, norm: number) => `feedback ${w.toFixed(2)} · plain ${fmt(plain)} · normalized ${fmt(norm)}`;

// ---- world: two upright dials in the x–z plane ----
const WIDTH = 620, HEIGHT = 400;
const BASE: Plan = { x: -120, y: -40, w: 240, d: 84, r: 8 };
const GZ = 64, IN = 12, OUT = 42;
const DIALS = [-56, 56];
const SWEEP = (2 * Math.PI) / 3, PHI0 = Math.PI / 2 + SWEEP / 2; // 0 at upper left, Y_MAX at upper right
const phiOf = (y: number) => PHI0 - SWEEP * Math.min(1.04, Math.max(0, y / Y_MAX));
const KNOB = [0, 18] as const;
const LAMP_Y = 16;

const P = k.fitProjection(
  [...k.boxCorners(BASE, -14, 0), ...DIALS.flatMap((x) => [[x - OUT, 0, GZ + OUT], [x + OUT, 0, GZ + OUT]] as Point3[])],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 62 },
);
const at = (p: Point3) => k.iso(p, P);
const r1 = (v: number) => v.toFixed(1);
const rot = (cx: number, r: number, phi: number, dy = 0): Point3 => [cx + r * Math.cos(phi), dy, GZ + r * Math.sin(phi)];

function plate(pts: (dy: number) => Point3[], tone: k.Tone = "hi", depth = 2) {
  const back = k.pathOf(pts(-depth).map(at), true), front = k.pathOf(pts(0).map(at), true);
  return `<path class="iso-shade" data-shade="1" d="${back}"/><path class="iso-line" data-tone="lo" d="${back}"/><path class="iso-fill" d="${front}"/><path class="iso-top" d="${front}"/><path class="iso-line" data-tone="${tone}" d="${front}"/>`;
}

function dial(cx: number, warn: boolean) {
  const lo = PHI0 + 0.16, hi = PHI0 - SWEEP - 0.16, n = 36;
  const arc = (r: number) => Array.from({ length: n + 1 }, (_, i) => lo + ((hi - lo) * i) / n).map((phi) => rot(cx, r, phi, -4));
  let s = k.solidSvg(k.cylinder(cx, -4, 3.2, 0, GZ - IN + 4, P, 20), { tone: "hi", crease: "none" });
  s += k.solidSvg(k.cylinder(cx, -4, 9, 0, 3, P, 32, 0.5), { tone: "mid", crease: "lo" });
  s += plate((d) => [...arc(OUT), ...arc(IN).reverse()].map(([x, y, z]) => [x, y + d, z] as Point3), "mid", 2.6);
  const ticks: string[] = [], majors: string[] = [];
  for (let v = 0; v <= Y_MAX * 4; v++) {
    const phi = phiOf(v / 4), big = v % 4 === 0;
    (big ? majors : ticks).push(k.segment(rot(cx, OUT - 2, phi, -4), rot(cx, OUT - (big ? 9 : 5), phi, -4), P));
  }
  s += k.lineSvg(ticks.join(""), { tone: "lo" }) + k.lineSvg(majors.join(""), { tone: "hi" });
  // the band past the top of the scale, where a circuit has blown up
  const red = Array.from({ length: 7 }, (_, i) => phiOf(Y_MAX) - 0.02 - (0.16 * i) / 6);
  s += k.lineSvg(k.pathOf(red.map((phi) => at(rot(cx, OUT - 4, phi, -4)))), { tone: warn ? "red" : "faint" });
  // end stop
  // end stop pin
  s += k.dotsSvg([at(rot(cx, OUT - 6, phiOf(Y_MAX) - 0.2, -1))], { size: 1.2, tone: "hi" });
  return s;
}

function art() {
  let s = basePlate(BASE, 10, P);
  s += labelPlate({ x: -108, y: 22, w: 40, d: 11, r: 1.5 }, P) + labelPlate({ x: 68, y: 22, w: 40, d: 11, r: 1.5 }, P);
  s += bindingPost(-20, 26, 0, P) + bindingPost(20, 26, 0, P);
  for (const cx of DIALS) s += dial(cx, cx < 0);
  return s;
}

/** The parts that move: both needles, the warning lamps and the feedback knob. */
function moving(w: number, plain: number, norm: number) {
  let s = knob(KNOB[0], KNOB[1], 0, 7, P, -2.4 + (4.8 * w) / W_MAX);
  [plain, norm].forEach((y, i) => {
    const cx = DIALS[i], blown = Math.abs(y) > Y_MAX;
    // lamp in front of each dial: lit when the circuit has run off the scale
    s += k.solidSvg(k.cylinder(cx, LAMP_Y, 4.2, 0, 3, P, 24, 0.4), { tone: "mid", crease: "lo" });
    s += k.solidSvg(k.cylinder(cx, LAMP_Y, 2.8, 3, 3, P, 24, 0.6), { tone: "hi", crease: "none" });
    if (blown) { const [x, yy] = at([cx, LAMP_Y, 6]); s += `<ellipse cx="${r1(x)}" cy="${r1(yy)}" rx="${r1(2.8 * k.cameraOf(P).k)}" ry="${r1(1.6 * k.cameraOf(P).k)}" style="fill:var(--anatomy-red)"/>`; }
    const jitter = blown ? (Math.random() - 0.5) * 0.04 : 0;
    const phi = phiOf(y) + jitter;
    s += k.lineSvg(k.segment(rot(cx, -6, phi, 1), rot(cx, OUT - 3, phi, 1), P), { tone: i ? "lit" : "hi", free: true });
    s += `<path class="iso-fill" d="${k.sideRing([cx, 1, GZ], 3.4, "y", P, 20)}"/><path class="iso-line" data-tone="hi" d="${k.sideRing([cx, 1, GZ], 3.4, "y", P, 20)}"/>`;
  });
  return s;
}

const START = 1.6;

export function TwinGaugeFigure({ bare = false, speed = 1 }: { bare?: boolean; speed?: number; amplitude?: number } = {}) {
  const { anchor, say } = useReadout<SVGSVGElement>();
  const movingRef = useRef<SVGGElement>(null);
  const range = useRange();
  const live = useRef({ w: START, plain: 0, y: 0, a: S2, t: 0, touched: -1e9, step: 0, visible: false });

  const restart = () => { const L = live.current; L.plain = 0; L.y = 0; L.a = S2; L.t = 0; };

  useEffect(() => {
    const svg = anchor.current!;
    const io = new IntersectionObserver(([e]) => {
      live.current.visible = e.isIntersecting;
      if (e.isIntersecting && !raf) { last = 0; raf = requestAnimationFrame(tick); }
    });
    io.observe(svg);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = 0;
    const step = (h: number) => pairStep(live.current, live.current.w, Z, h);
    const tick = (now: number) => {
      const L = live.current;
      if (!L.visible) { raf = 0; return; }
      raf = requestAnimationFrame(tick);
      const dt = (last ? Math.min(0.05, (now - last) / 1000) : 1 / 60) * speed;
      last = now;
      if (still) { restart(); for (let i = 0; i < 3000; i++) step(0.01); }
      else {
        L.t += dt;
        if (L.t > CYCLE) {
          restart();
          if (now - L.touched > 6000) L.w = [0.6, 1.6, 2.4, 1.2][++L.step % 4]; // idle tour
        }
        const n = Math.max(1, Math.ceil((dt * RATE) / 0.01)), h = (dt * RATE) / n;
        for (let i = 0; i < n; i++) step(h);
      }
      if (movingRef.current) movingRef.current.innerHTML = moving(L.w, L.plain, L.y);
      range.show(L.w / W_MAX, L.w.toFixed(2));
      say(readoutOf(L.w, L.plain, L.y));
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [anchor, say, speed, range]);

  const touch = () => { live.current.touched = performance.now(); };

  return (
    <div className={bare ? "anatomy-wrap bare iso" : "anatomy-wrap iso"} data-theme="light">
      <Plate
        fig="Fig 1"
        title="Same feedback, two circuits"
        readout={readoutOf(START, 0, 0)}
        keys={bare ? [] : [
          { mark: "raised", label: "Left: a plain circuit" },
          { mark: "lit", label: "Right: the same circuit with normalization" },
        ]}
        caption={bare ? undefined : `Both circuits get the same input and the same self-feedback w, set by the knob. The plain one, ẏ = −y + wy + z, runs off the scale whenever w > 1. The normalized one divides its feedback down as it gets busier and settles for every w.`}
      >
        <div className="iso-stage">
          <svg ref={anchor} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Two isometric dial gauges on one base sharing a feedback knob: the left needle runs off the scale and its warning lamp lights, the right needle swings and settles">
            <g suppressHydrationWarning dangerouslySetInnerHTML={{ __html: ART }} />
            <g ref={movingRef} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: moving(START, 0, 0) }} />
          </svg>
          <div className="controls">
            <Range range={range} label="Feedback strength" min={0} max={1} step={0.001} initial={START / W_MAX} text={START.toFixed(2)} onInput={(u) => { live.current.w = u * W_MAX; touch(); }} />
            <button type="button" className="figure-button" onClick={() => { restart(); touch(); }}>Switch on again</button>
          </div>
        </div>
      </Plate>
    </div>
  );
}

const ART = art();
