"use client";
import { useEffect, useRef } from "react";
import * as k from "@/components/iso/iso-kit";
import type { Plan, Point3 } from "@/components/iso/iso-kit";
import { Plate } from "@/components/iso/react/draw";
import { useReadout } from "@/components/iso/react/live";
import { gain, phase, type Rqf } from "@/lib/rqf";
import { basePlate, bindingPost, knob, labelPlate } from "@/components/figures/parts";
import { Range, useRange } from "@/components/widgets/slider";

const HZ_U = (hz: number) => Math.log(hz) / Math.log(40);

// ---- truth: 16 RQFs, constant Q, centres log-spaced over the EEG range ----
const COUNT = 16;
const TAU = 0.01;
const Q = 3;
const F_LO = 1, F_HI = 40;
const FREQS = Array.from({ length: COUNT }, (_, i) => F_LO * (F_HI / F_LO) ** (i / (COUNT - 1)));
const FILTERS: Rqf[] = FREQS.map((hz) => {
  const w0 = 2 * Math.PI * hz;
  const gamma = (w0 / (2 * Q)) * TAU;
  return { tau: TAU, gamma, omega: w0 / (1 - gamma) };
});
const BAND = (hz: number) => (hz < 4 ? "delta" : hz < 8 ? "theta" : hz < 13 ? "alpha" : hz < 30 ? "beta" : "gamma");
const readoutOf = (hz: number, best: number) => `input ${hz.toFixed(1)} Hz · loudest reed ${FREQS[best].toFixed(1)} Hz (${BAND(FREQS[best])})`;

// ---- world ----
const WIDTH = 620, HEIGHT = 370;
const BASE: Plan = { x: -152, y: -46, w: 304, d: 96, r: 9 };
const BASE_H = 10;
const COMB: Plan = { x: -130, y: -9, w: 260, d: 8, r: 1.5 };
const STRIP: Plan = { x: -130, y: 1.6, w: 260, d: 4, r: 1 };
const REED_Z = 6, REED_Y = 0.2, REED_D = 1.2, REED_W = 7;
const REED_X = (i: number) => -112.5 + i * 15;
const REED_H = (i: number) => 84 - (i / (COUNT - 1)) * 42;
const POSTS = [-142, 142];
const RAIL: Plan = { x: -147, y: -19, w: 294, d: 8, r: 2 };
const RAIL_Z = 96;
const COIL: [number, number] = [-128, 30];
const KNOB: [number, number] = [130, 30];
const LABEL: Plan = { x: 58, y: 24, w: 46, d: 12, r: 1.5 };
const SCALE: Plan = { x: -120, y: 12, w: 240, d: 6, r: 1 };
const SWING = 7;

const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - 4, 0), ...k.boxCorners(RAIL, RAIL_Z, RAIL_Z + 8)],
  WIDTH,
  HEIGHT,
  { pad: 34, azimuth: 62 },
);
const at = (p: Point3) => k.iso(p, P);
const EX = k.axisVector(P, [1, 0, 0]);
const EY = k.axisVector(P, [0, 1, 0]);
const EZ = k.axisVector(P, [0, 0, 1]);
// covector w with w·EX = 0, w·EZ = 1: reads "height" from a screen vector
const DET = EX[0] * EZ[1] - EX[1] * EZ[0];
const W_UP: [number, number] = [-EX[1] / DET, EX[0] / DET];

function art() {
  let back = basePlate(BASE, BASE_H, P);
  back += labelPlate(LABEL, P);
  // index scale: one mark per reed, rooted on the strip edge
  back += k.solidSvg(k.slabOf(SCALE, 0, 0.6, P, 3), { tone: "lo", crease: "none" });
  back += k.lineSvg(FREQS.map((_, i) => k.lineOnTop([REED_X(i), SCALE.y + 0.6], [REED_X(i), SCALE.y + (i % 5 === 0 ? 4.4 : 2.8)], 0.6, P)).join(""), { tone: "mid" });
  back += k.lineSvg(FREQS.map((_, i) => k.lineOnTop([REED_X(i) + 7.5, SCALE.y + 0.6], [REED_X(i) + 7.5, SCALE.y + 1.8], 0.6, P)).join(""), { tone: "lo" });
  // posts and the sight rail behind the tips
  for (const x of POSTS) {
    back += k.solidSvg(k.slabOf({ x: x - 7, y: RAIL.y - 2, w: 14, d: 12, r: 2 }, 0, 2, P, 3), { tone: "lo" });
    back += k.solidSvg(k.slabOf({ x: x - 4, y: RAIL.y + 0.5, w: 8, d: 7, r: 1.5 }, 2, RAIL_Z - 2, P, 3), { tone: "mid" });
    back += k.dotsSvg(k.pointsAt([[x - 5, RAIL.y + 4, 2], [x + 5, RAIL.y + 4, 2]], P), { size: 0.5 });
  }
  back += k.solidSvg(k.slabOf(RAIL, RAIL_Z, 7, P, 3, 0.6), { tone: "mid" });
  back += k.dotsSvg(k.pointsAt(POSTS.map((x) => [x, RAIL.y + 4, RAIL_Z + 7] as Point3), P), { size: 0.55 });
  const face = RAIL.y + RAIL.d;
  const ticks = k.sideTicks(RAIL.x + 6, RAIL.x + RAIL.w - 6, 3, 5, face, RAIL_Z + 7, [1.6, 3], P);
  back += k.lineSvg(ticks.minor, { tone: "lo" }) + k.lineSvg(ticks.major, { tone: "mid" });
  // comb block the reeds are clamped to
  back += k.solidSvg(k.slabOf(COMB, 0, 18, P, 3, 0.6), { tone: "mid" });
  back += k.lineSvg(k.sideSeam(COMB, 6, P, 3), { tone: "faint" });
  // exciter coil: a solenoid on a saddle, with its two terminals
  const [cx, cy] = COIL;
  back += k.solidSvg(k.slabOf({ x: cx - 12, y: cy - 10, w: 24, d: 20, r: 2 }, 0, 2, P, 3), { tone: "lo" });
  back += k.solidSvg(k.cylinder(cx, cy, 9.5, 2, 2, P, 36), { tone: "mid" });
  back += k.solidSvg(k.cylinder(cx, cy, 8, 4, 13, P, 36), { tone: "hi", crease: "none", inner: k.lineSvg(Array.from({ length: 9 }, (_, i) => k.sideArc(cx, cy, 8, 5.4 + i * 1.3, P, 24)).join(""), { tone: "faint" }) });
  back += k.solidSvg(k.cylinder(cx, cy, 9.5, 17, 2, P, 36, 0.4), { tone: "mid" });
  back += k.solidSvg(k.cylinder(cx, cy, 3.2, 19, 2.4, P, 20), { tone: "hi", crease: "lo" });
  const posts: [number, number][] = [[-104, 36], [-92, 36]];
  for (const [x, y] of posts) back += bindingPost(x, y, 0, P);
  back += k.wireSvg(at([-104, 36, 5.6]), at([cx + 6, cy + 4, 12]), { via: [at([-112, 40, 2.5])], tone: "mid", size: 0.9 });
  back += k.wireSvg(at([-92, 36, 5.6]), at([cx + 8, cy + 1, 15]), { via: [at([-100, 44, 1.5]), at([-114, 42, 3])], tone: "mid", size: 0.9 });
  return back;
}

function reeds() {
  return FREQS.map((_, i) => {
    const x = REED_X(i), h = REED_H(i);
    const reed = k.solidSvg(k.slabOf({ x: x - REED_W / 2 + 1.2, y: REED_Y, w: REED_W - 2.4, d: REED_D, r: 0.3 }, REED_Z, h - 6, P, 2), { tone: "hi", crease: "none" });
    const flag = k.solidSvg(k.slabOf({ x: x - REED_W / 2, y: REED_Y - 0.2, w: REED_W, d: REED_D + 0.4, r: 0.6 }, REED_Z + h - 6, 6, P, 2, 0.3), { tone: "hi", crease: "lo" });
    return { reed, flag, pivot: at([x, REED_Y, REED_Z]), h };
  });
}

function front() {
  let s = k.solidSvg(k.slabOf(STRIP, 6, 12, P, 3, 0.5), { tone: "mid" });
  s += k.dotsSvg(k.pointsAt(Array.from({ length: COUNT + 1 }, (_, i) => [REED_X(0) - 7.5 + i * 15, STRIP.y + 2, 18] as Point3), P), { size: 0.5 });
  s += k.lineSvg(k.sideSeam(STRIP, 10, P, 3), { tone: "faint" });
  return s;
}

const BACK = art();
const REEDS = reeds();
const FRONT = front();
const knobAt = (hz: number) => knob(KNOB[0], KNOB[1], 0, 8, P, -Math.PI * 0.8 + (Math.log(hz / F_LO) / Math.log(F_HI / F_LO)) * Math.PI * 1.6);

export function ReedBankFigure({ bare = false, speed = 1, amplitude = 1 }: { bare?: boolean; speed?: number; amplitude?: number } = {}) {
  const { anchor, say } = useReadout<SVGSVGElement>();
  const range = useRange();
  const groups = useRef<(SVGGElement | null)[]>([]);
  const flags = useRef<(SVGGElement | null)[]>([]);
  const knobRef = useRef<SVGGElement>(null);
  const state = useRef({ hz: 10, target: 10, phi: 0, touched: -1e9, visible: false, tour: 0 });

  useEffect(() => {
    const svg = anchor.current!;
    const io = new IntersectionObserver(([e]) => {
      state.current.visible = e.isIntersecting;
      if (e.isIntersecting && !raf) { last = 0; raf = requestAnimationFrame(tick); } // resume; the loop stops itself off-screen
    });
    io.observe(svg);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = 0, lastKnob = "";
    const tick = (now: number) => {
      const s = state.current;
      if (!s.visible) { raf = 0; return; }
      raf = requestAnimationFrame(tick);
      const dt = (last ? Math.min(0.05, (now - last) / 1000) : 1 / 60) * speed;
      last = now;
      if (!still && now - s.touched > 4000) {
        s.tour += dt * 0.07;
        s.target = F_LO * (F_HI / F_LO) ** (0.5 - 0.5 * Math.cos(s.tour * Math.PI * 2));
      }
      s.hz += (s.target - s.hz) * (1 - Math.exp(-dt / 0.25));
      s.phi += still ? 0 : dt * 2 * Math.PI * 2.2; // slowed: one visible beat ≈ 2.2 Hz
      const W = 2 * Math.PI * s.hz;
      let best = 0, bestA = 0;
      FILTERS.forEach((f, i) => {
        const A = gain(f, W);
        if (A > bestA) { bestA = A; best = i; }
        const d = (still ? A : A * Math.sin(s.phi + phase(f, W))) * SWING * amplitude;
        const c = d / REEDS[i].h;
        // shear: v → v + c (w·v) EY, about the reed's root
        const a = 1 + c * EY[0] * W_UP[0], b = c * EY[1] * W_UP[0], cc = c * EY[0] * W_UP[1], dd = 1 + c * EY[1] * W_UP[1];
        const [px, py] = REEDS[i].pivot;
        const e = px - (a * px + cc * py), f2 = py - (b * px + dd * py);
        groups.current[i]?.setAttribute("transform", `matrix(${a.toFixed(4)} ${b.toFixed(4)} ${cc.toFixed(4)} ${dd.toFixed(4)} ${e.toFixed(2)} ${f2.toFixed(2)})`);
      });
      flags.current.forEach((g, i) => {
        const lit = i === best && bestA > 0.6;
        const node = g?.firstElementChild;
        if (node && node.hasAttribute("data-lit") !== lit) lit ? node.setAttribute("data-lit", "") : node.removeAttribute("data-lit");
      });
      const kn = knobAt(s.hz);
      if (kn !== lastKnob && knobRef.current) { knobRef.current.innerHTML = kn; lastKnob = kn; }
      range.show(HZ_U(s.target), `${s.target.toFixed(1)} Hz`);
      say(readoutOf(s.hz, best));
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [anchor, say, speed, amplitude]);

  const setHz = (u: number) => {
    state.current.target = F_LO * (F_HI / F_LO) ** u;
    state.current.touched = performance.now();
  };

  return (
    <div className={bare ? "anatomy-wrap bare iso" : "anatomy-wrap iso"} data-theme="light">
      <Plate
        fig="Fig 1"
        title="A bank of tuned reeds"
        readout={readoutOf(10, FREQS.findIndex((f) => f > 9) - 1)}
        keys={bare ? [] : [
          { mark: "raised", label: "One reed = one RQF" },
          { mark: "lit", label: "The reed that answers loudest" },
          { mark: "flat", label: "Index scale, one mark per reed" },
        ]}
        caption={bare ? undefined : "Sixteen steel reeds on a common comb, each tuned to one frequency from 1 to 40 Hz with the same quality factor, the way an RQF layer tiles the EEG bands. The coil shakes the comb at the input frequency. Each reed’s swing is the true gain |H| of its filter at that frequency, and its timing is the true phase. Motion is slowed so you can follow it."}
      >
        <div className="iso-stage">
          <svg
            ref={anchor}
            className="iso-svg"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label="An isometric vibrating-reed frequency meter: sixteen reeds of decreasing length on a comb, a drive coil and a tuning knob"
          >
            <g suppressHydrationWarning dangerouslySetInnerHTML={{ __html: BACK }} />
            {REEDS.map((r, i) => (
              <g key={i} ref={(el) => { groups.current[i] = el; }}>
                <g suppressHydrationWarning dangerouslySetInnerHTML={{ __html: r.reed }} />
                <g ref={(el) => { flags.current[i] = el; }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: r.flag }} />
              </g>
            ))}
            <g suppressHydrationWarning dangerouslySetInnerHTML={{ __html: FRONT }} />
            <g ref={knobRef} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: knobAt(10) }} />
          </svg>
          <div className="controls">
            <Range range={range} label="Input frequency" min={0} max={1} step={0.001} initial={HZ_U(10)} text="10.0 Hz" onInput={setHz} />
          </div>
        </div>
      </Plate>
    </div>
  );
}
