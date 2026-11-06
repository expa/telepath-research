"use client";
import { useEffect, useRef } from "react";
import * as k from "@/components/iso/iso-kit";
import type { Flat, Plan, Point3 } from "@/components/iso/iso-kit";
import { Plate } from "@/components/iso/react/draw";
import { useReadout } from "@/components/iso/react/live";
import { basePlate, bindingPost, knob, labelPlate } from "@/components/figures/parts";
import { Range, useRange } from "@/components/widgets/slider";
import { energy2, fixed2, organicsStep, roundOf } from "@/lib/gain";

// ---- truth: the paper's 2D circuit (one y, one a, w = 1, σ = 0.2, τa = 3τy) and its energy, Eq. 14 ----
const Z_LO = 0.2, Z_HI = 2;
const RATE = 4, H = 0.004;
const readoutOf = (z: number, y: number, v: number) => `input ${z.toFixed(2)} · response ${y.toFixed(2)} · energy ${v.toFixed(3)}`;

// ---- world ----
const WIDTH = 620, HEIGHT = 400;
const BASE: Plan = { x: -150, y: -84, w: 300, d: 168, r: 9 };
const C: Flat = [-22, -2]; // dish centre
const STEPS: [number, number][] = [[46, 5], [58, 5], [68, 5], [76, 8]]; // turned body: radius, height
const TOP = STEPS.reduce((t, [, h]) => t + h, 0);
const RIN = 70, DEPTH = 13;
const surface = (rho: number) => TOP - DEPTH * (1 - Math.min(1, (rho / RIN) ** 2));
const SCALE = 78, REACH = 0.82 * RIN; // world units per unit of √energy; the marble never climbs past here
const BALL = 6;
const STRIKER_Y = C[1], STRIKER_X = C[0] - 101, STRIKER_Z = TOP + 4;
const DIAL = { x: 104, y: -40, r: 22, z: 8 };
const KNOB: Flat = [108, 46];
const KPLATE: Plan = { x: KNOB[0] - 15, y: KNOB[1] - 15, w: 30, d: 30, r: 3 };
const LABEL: Plan = { x: -134, y: 60, w: 48, d: 12, r: 1.5 };
const FROM = -0.75 * Math.PI, SPAN = 1.5 * Math.PI, DIAL_MAX = 1.2;

const P = k.fitProjection([...k.boxCorners(BASE, -14, 0), [C[0], C[1], TOP + 12]], WIDTH, HEIGHT, { pad: 26, azimuth: 48 });
const at = (p: Point3) => k.iso(p, P);
const K = k.cameraOf(P).k;
const r1 = (v: number) => v.toFixed(1);

function dish() {
  let s = "";
  let z = 0;
  STEPS.forEach(([r, h], i) => {
    s += k.solidSvg(k.cylinder(C[0], C[1], r, z, h, P, 72, i ? 0.6 : 0.3), { tone: i === STEPS.length - 1 ? "hi" : "mid", crease: "lo", halo: i === 0 });
    if (i === STEPS.length - 1) s += k.lineSvg(k.sideArc(C[0], C[1], r, z + 3, P, 48), { tone: "faint" });
    z += h;
  });
  // the bowl: filled bands from the rim down, then the energy contours engraved on top
  const BANDS = 7;
  for (let b = 0; b < BANDS; b++) {
    const rho = RIN * (1 - b / BANDS);
    const tone = b === 0 ? `class="iso-shade" data-shade="1"` : b < 3 ? `class="iso-shade" data-shade="2"` : b < 5 ? `class="iso-shade" data-shade="3"` : `class="iso-top"`;
    s += `<path ${tone} d="${k.ring(C[0], C[1], rho, surface(rho), P, 72)}"/>`;
  }
  // contours of V: |u| = const, i.e. equal-energy rings
  s += k.lineSvg([0.2, 0.4, 0.6, 0.8].map((f) => k.ring(C[0], C[1], RIN * f, surface(RIN * f), P, 64)).join(""), { tone: "faint" });
  s += k.lineSvg(k.ring(C[0], C[1], RIN, TOP, P, 72), { tone: "lo" });
  s += k.lineSvg(k.ring(C[0], C[1], 73, TOP, P, 72), { tone: "faint" });
  s += k.dotsSvg([at([C[0], C[1], surface(0)])], { size: 0.7, tone: "mid" });
  return s;
}

function art() {
  let s = basePlate(BASE, 10, P);
  s += labelPlate(LABEL, P);
  // response gauge, face up on a collar
  const top = DIAL.z + 8;
  s += k.solidSvg(k.cylinder(DIAL.x, DIAL.y, DIAL.r + 3, 0, DIAL.z, P, 56, 0.6), { tone: "mid", crease: "lo" });
  s += k.solidSvg(k.slabOf({ x: DIAL.x - 3, y: DIAL.y - DIAL.r - 5, w: 6, d: 6, r: 1 }, top - 7, 5, P, 2, 0.3), { tone: "mid" });
  s += k.solidSvg(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, 8, P, 64, 0.6), { tone: "hi", crease: "lo" });
  s += k.lineSvg(k.knurl(DIAL.x, DIAL.y, DIAL.r, top - 3, top, 70, P, 0.3), { tone: "lo" });
  s += k.lineSvg(k.ring(DIAL.x, DIAL.y, DIAL.r - 2, top, P, 56), { tone: "lo" });
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2.8, 24, 4, top, [1.2, 2.6], P, FROM, SPAN);
  s += k.lineSvg(t.minor, { tone: "lo" }) + k.lineSvg(t.major, { tone: "mid" });
  for (const [x, y] of [[DIAL.x - 30, DIAL.y + 18], [DIAL.x - 30, DIAL.y + 28]] as Flat[]) s += bindingPost(x, y, 0, P);
  // input knob plate
  s += k.solidSvg(k.slabOf(KPLATE, 0, 2, P, 4, 0.5), { tone: "lo" });
  const kt = k.radialTicks(KNOB[0], KNOB[1], 13, 24, 6, 2, [1.2, 2.4], P, -0.8 * Math.PI, 1.6 * Math.PI);
  s += k.lineSvg(kt.minor, { tone: "lo" }) + k.lineSvg(kt.major, { tone: "mid" });
  s += k.dotsSvg(k.pointsAt(k.corners(KPLATE, 2.6).map(([x, y]) => [x, y, 2] as Point3), P), { size: 0.45 });
  s += k.wireSvg(at([DIAL.x - 30, DIAL.y + 28, 7.4]), at([KPLATE.x + 4, KPLATE.y, 2]), { via: [at([DIAL.x - 26, DIAL.y + 44, 1.5])], tone: "mid", size: 0.9 });
  return s;
}

/** The striker: a spring plunger on a post at the rim, which knocks the marble. Its plunger slides by `out`. */
function striker(out: number) {
  const y = STRIKER_Y, z = STRIKER_Z, x0 = STRIKER_X;
  let s = k.solidSvg(k.slabOf({ x: x0 - 10, y: y - 10, w: 20, d: 20, r: 2 }, 0, 3, P, 3, 0.4), { tone: "lo" });
  s += k.dotsSvg(k.pointsAt(k.corners({ x: x0 - 10, y: y - 10, w: 20, d: 20, r: 2 }, 2.5).map(([a, b]) => [a, b, 3] as Point3), P), { size: 0.45 });
  s += k.solidSvg(k.cylinder(x0, y, 3.4, 3, z - 6, P, 20), { tone: "mid", crease: "none" });
  s += k.solidSvg(k.slabOf({ x: x0 - 5, y: y - 5, w: 10, d: 10, r: 1.5 }, z - 5, 10, P, 3, 0.5), { tone: "mid" });
  // barrel along +x, the coil, then the plunger and its tip
  s += k.solidSvg(k.slabOf({ x: x0 + 5, y: y - 2.6, w: 8, d: 5.2, r: 2.5 }, z - 2.6, 5.2, P, 5, 0.3), { tone: "mid", crease: "lo" });
  const tip = x0 + 22 + out;
  const c = k.coil(x0 + 13, tip - 3, [y, z], 2.2, 6, "x", P, 12);
  s += k.lineSvg(c.back, { tone: "lo" });
  s += k.solidSvg(k.slabOf({ x: x0 + 13, y: y - 0.9, w: tip - x0 - 13, d: 1.8, r: 0.9 }, z - 0.9, 1.8, P, 2), { tone: "hi", crease: "none" });
  s += k.lineSvg(c.front, { tone: "mid" });
  s += k.solidSvg(k.slabOf({ x: tip, y: y - 2.4, w: 3, d: 4.8, r: 2.3 }, z - 2.4, 4.8, P, 5, 0.3), { tone: "hi", crease: "lo" });
  return s;
}

/** A sphere: a circle in any orthographic view, with a shade crescent and a lit cap. */
function ball([x, y]: Flat, r: number) {
  const R = r * K;
  return (
    `<circle class="iso-shade" data-shade="1" cx="${r1(x)}" cy="${r1(y)}" r="${r1(R)}"/>` +
    `<circle class="iso-shade" data-shade="3" cx="${r1(x - R * 0.12)}" cy="${r1(y - R * 0.14)}" r="${r1(R * 0.8)}"/>` +
    `<circle class="iso-top" cx="${r1(x - R * 0.3)}" cy="${r1(y - R * 0.34)}" r="${r1(R * 0.36)}"/>` +
    `<circle class="iso-line" data-tone="hi" cx="${r1(x)}" cy="${r1(y)}" r="${r1(R)}" fill="none"/>`
  );
}

/** Where the state sits on the dish: plan offset from the centre, clamped to the reach. */
function planOf(y: number, a: number, z: number): Flat {
  const [u1, u2] = roundOf(y, a, z);
  let px = u1 * SCALE, py = u2 * SCALE;
  const m = Math.hypot(px, py);
  if (m > REACH) { px *= REACH / m; py *= REACH / m; }
  return [px, py];
}
const onDish = ([px, py]: Flat): Point3 => [C[0] + px, C[1] + py, surface(Math.hypot(px, py)) + BALL * 0.9];

function marble(trail: Flat[], now: Flat) {
  let s = "";
  // the path it rolled: a fading line on the dish, newest darkest
  const pts = trail.map((p) => at(onDish(p)));
  const CH = 6, n = pts.length;
  for (let c = 0; c < CH; c++) {
    const a = Math.floor((c * (n - 1)) / CH), b = Math.floor(((c + 1) * (n - 1)) / CH);
    if (b - a < 1) continue;
    s += `<g opacity="${(0.15 + (0.75 * (c + 1)) / CH).toFixed(2)}">${k.lineSvg(k.pathOf(pts.slice(a, b + 1)), { tone: "mid", free: true })}</g>`;
  }
  const p = onDish(now);
  s += `<ellipse class="iso-halo" cx="${r1(at([p[0], p[1], p[2] - BALL * 0.9])[0])}" cy="${r1(at([p[0], p[1], p[2] - BALL * 0.9])[1])}" rx="${r1(BALL * K)}" ry="${r1(BALL * K * 0.5)}"/>`;
  return s + ball(at(p), BALL);
}

function needle(y: number) {
  const ang = FROM + (SPAN * Math.min(DIAL_MAX, Math.max(0, y))) / DIAL_MAX;
  const top = DIAL.z + 8.2, L = DIAL.r - 3.6;
  return (
    k.lineSvg(k.lineOnTop([DIAL.x - Math.sin(ang) * 4, DIAL.y + Math.cos(ang) * 4], [DIAL.x + Math.sin(ang) * L, DIAL.y - Math.cos(ang) * L], top, P), { tone: "lit", free: true }) +
    k.solidSvg(k.cylinder(DIAL.x, DIAL.y, 1.5, top - 0.2, 0.7, P, 14), { tone: "hi", crease: "none" })
  );
}

const ART = art();
const DISH = dish();
const STRIKER_FIRST = k.depthOf([STRIKER_X, STRIKER_Y, 0], P) < k.depthOf([C[0], C[1], 0], P);
const zToU = (z: number) => Math.log(z / Z_LO) / Math.log(Z_HI / Z_LO);
const uToZ = (u: number) => Z_LO * (Z_HI / Z_LO) ** u;
const knobAt = (z: number) => knob(KNOB[0], KNOB[1], 2, 7, P, -0.8 * Math.PI + 1.6 * Math.PI * zToU(z) - Math.PI / 2);
const START = 1;
const S0 = fixed2(START);
const zText = (z: number) => z.toFixed(2);

export function EnergyDishFigure({ bare = false, speed = 1, amplitude = 1 }: { bare?: boolean; speed?: number; amplitude?: number } = {}) {
  const { anchor, say } = useReadout<SVGSVGElement>();
  const marbleRef = useRef<SVGGElement>(null);
  const strikerRef = useRef<SVGGElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const knobRef = useRef<SVGGElement>(null);
  const range = useRange();
  const live = useRef({
    z: START, target: START, y: [S0.ys], a: [S0.as], out: 0, trail: [] as Flat[],
    touched: -1e9, clock: 0, next: 1.2, step: 0, visible: false,
  });

  const knock = () => {
    const L = live.current;
    L.step++;
    const { ys, as } = fixed2(L.z);
    L.y[0] += ys * (L.step % 2 ? 0.7 : -0.45) * amplitude;
    L.a[0] *= L.step % 2 ? 0.35 : 1.9;
    L.out = 3;
  };

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
      // idle tour: a knock, then a new input, every few seconds, until someone uses the controls
      if (!still && now - L.touched > 6000 && L.clock > L.next) {
        if (L.step % 2 === 0) knock();
        else { L.step++; L.target = [1.6, 0.45, 1.1, 0.3][(L.step >> 1) % 4]; }
        L.next = L.clock + 3.4;
      }
      L.z += (L.target - L.z) * (1 - Math.exp(-dt / 0.2));
      if (still) { const f = fixed2(L.z); L.y[0] = f.ys; L.a[0] = f.as; }
      else for (let i = 0, n = Math.round((dt * RATE) / H); i < n; i++) organicsStep(L.y, L.a, [L.z], H);
      L.out *= Math.exp(-dt / 0.12);
      const p = planOf(L.y[0], L.a[0], L.z);
      L.trail.push(p);
      if (L.trail.length > 140) L.trail.shift();
      if (marbleRef.current) marbleRef.current.innerHTML = marble(L.trail, p);
      if (strikerRef.current) strikerRef.current.innerHTML = striker(L.out);
      if (needleRef.current) needleRef.current.innerHTML = needle(L.y[0]);
      const kn = knobAt(L.z);
      if (kn !== lastKnob && knobRef.current) { knobRef.current.innerHTML = kn; lastKnob = kn; }
      range.show(zToU(L.target), zText(L.target));
      say(readoutOf(L.z, L.y[0], energy2(L.y[0], L.a[0], L.z)));
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [anchor, say, speed, amplitude, range]);

  const touch = () => { live.current.touched = performance.now(); };
  const strikerG = <g ref={strikerRef} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: striker(0) }} />;

  return (
    <div className={bare ? "anatomy-wrap bare iso" : "anatomy-wrap iso"} data-theme="light">
      <Plate
        fig="Fig 1"
        title="A marble in a dish"
        readout={readoutOf(START, S0.ys, 0)}
        keys={bare ? [] : [
          { mark: "raised", label: "Marble: the circuit’s state (y, a)" },
          { mark: "flat", label: "Rings: equal energy" },
          { mark: "lit", label: "Gauge: the response y" },
        ]}
        caption={bare ? undefined : "The dish is the circuit’s energy, Eq. 14 of the paper, drawn in coordinates where it is round; its rings are levels of equal energy. The marble is the state of a one-neuron ORGaNICs circuit, the response y and the normalization signal a. Knock it and it rolls round and back down, the damped spiral of the paper’s phase portraits. Change the input and the bottom of the dish moves, so the marble rolls to the new normalized response, read on the gauge."}
      >
        <div className="iso-stage">
          <svg ref={anchor} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="An isometric turned dish with a marble rolling in it, a spring striker at its rim, a response gauge and an input knob">
            <g suppressHydrationWarning dangerouslySetInnerHTML={{ __html: ART }} />
            {STRIKER_FIRST ? strikerG : null}
            <g suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DISH }} />
            <g ref={marbleRef} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: marble([], planOf(S0.ys, S0.as, START)) }} />
            {STRIKER_FIRST ? null : strikerG}
            <g ref={needleRef} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: needle(S0.ys) }} />
            <g ref={knobRef} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: knobAt(START) }} />
          </svg>
          <div className="controls">
            <Range range={range} label="Input strength" min={0} max={1} step={0.001} initial={zToU(START)} text={zText(START)} onInput={(u) => { live.current.target = uToZ(u); touch(); }} />
            <button type="button" className="figure-button" onClick={() => { knock(); touch(); }}>Knock the marble</button>
          </div>
        </div>
      </Plate>
    </div>
  );
}
