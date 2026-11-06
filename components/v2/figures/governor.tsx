"use client";
import { useEffect, useRef } from "react";
import * as k from "@/components/iso/iso-kit";
import type { Flat, Plan, Point3 } from "@/components/iso/iso-kit";
import { Plate } from "@/components/iso/react/draw";
import { useReadout } from "@/components/iso/react/live";
import { basePlate, bindingPost, knob, labelPlate } from "@/components/figures/parts";
import { C_CRIT, SIGMA2, edgeOf, gainStar, governorStep, type Governor } from "@/lib/gain";

// ---- truth: the top mode and the gain unit of the paper (σ² = 0.1), shown at RATE model time units per second ----
const C_LO = 0.4, C_HI = 3;
const RATE = 5, H = 0.002;
const readoutOf = (c: number, a: number) => {
  const e = edgeOf(c, a);
  return `coupling ${c.toFixed(2)} · gain ${a.toFixed(2)} · top eigenvalue ${e.toFixed(2)}${c > C_CRIT ? "" : " (below the edge)"}`;
};

// ---- world ----
const WIDTH = 620, HEIGHT = 400;
const BASE: Plan = { x: -150, y: -62, w: 290, d: 124, r: 9 };
const BOX: Plan = { x: -72, y: -20, w: 40, d: 40, r: 3 };
const BOX_H = 24;
const SX = -52, SY = 0; // spindle
const TOP = 126; // pivot of the arms
const ARM = 46, LINK = 25, BALL = 7;
const MOTOR: Plan = { x: -136, y: -14, w: 34, d: 28, r: 4 };
const DIAL = { x: 62, y: -8, r: 30, z: 26 };
const PED: Plan = { x: DIAL.x - 16, y: DIAL.y - 16, w: 32, d: 32, r: 3 };
const KNOB: Flat = [104, 40];
const KPLATE: Plan = { x: KNOB[0] - 15, y: KNOB[1] - 15, w: 30, d: 30, r: 3 };
const LABEL: Plan = { x: -128, y: 38, w: 48, d: 12, r: 1.5 };
const DIAL_MAX = 1.5, FROM = -0.75 * Math.PI, SPAN = 1.5 * Math.PI;
const KFROM = -0.8 * Math.PI, KSPAN = 1.6 * Math.PI;

const P = k.fitProjection([...k.boxCorners(BASE, -14, 0), [SX, SY, TOP + 10], [SX - ARM, SY, TOP - 10], [SX + ARM, SY, TOP - 10]], WIDTH, HEIGHT, { pad: 30, azimuth: 50 });
const at = (p: Point3) => k.iso(p, P);
const K = k.cameraOf(P).k;
const r1 = (v: number) => v.toFixed(1);

function art() {
  let s = basePlate(BASE, 10, P);
  s += labelPlate(LABEL, P);
  // motor with cooling fins, on a saddle, driving the gearbox through a shaft
  s += k.solidSvg(k.slabOf({ x: MOTOR.x - 2, y: MOTOR.y - 3, w: MOTOR.w + 4, d: MOTOR.d + 6, r: 2 }, 0, 3, P, 3, 0.4), { tone: "lo" });
  s += k.solidSvg(k.slabOf(MOTOR, 3, 22, P, 5, 0.8), {
    tone: "mid",
    inner: k.lineSvg([8, 11, 14, 17, 20].map((z) => k.sideSeam(MOTOR, z, P, 5)).join(""), { tone: "faint" }),
  });
  s += k.lineSvg(k.planOutline(k.insetPlan(MOTOR, 3), 25, P, 3), { tone: "faint" });
  s += k.dotsSvg(k.pointsAt(k.corners(MOTOR, 4).map(([x, y]) => [x, y, 25] as Point3), P), { size: 0.45 });
  for (const [x, y] of [[-126, 22], [-114, 22]] as Flat[]) s += bindingPost(x, y, 0, P);
  s += k.wireSvg(at([-126, 22, 7.4]), at([MOTOR.x + 6, MOTOR.y + MOTOR.d, 12]), { via: [at([-128, 26, 3])], tone: "mid", size: 0.9 });
  s += k.wireSvg(at([-114, 22, 7.4]), at([MOTOR.x + 14, MOTOR.y + MOTOR.d, 12]), { via: [at([-112, 26, 3])], tone: "mid", size: 0.9 });
  s += k.solidSvg(k.slabOf({ x: MOTOR.x + MOTOR.w, y: -2.5, w: BOX.x - MOTOR.x - MOTOR.w, d: 5, r: 2.4 }, 11, 5, P, 3), { tone: "hi", crease: "none" });
  s += k.solidSvg(k.slabOf({ x: BOX.x - 4, y: -5, w: 4, d: 10, r: 1 }, 9, 9, P, 3, 0.4), { tone: "mid" });
  // gearbox with a lid, under the spindle
  s += k.solidSvg(k.slabOf(BOX, 0, BOX_H, P, 4, 0.8), { tone: "mid", inner: k.lineSvg(k.sideSeam(BOX, BOX_H - 6, P, 4), { tone: "faint" }) });
  s += k.lineSvg(k.planOutline(k.insetPlan(BOX, 3), BOX_H, P, 3), { tone: "faint" });
  s += k.dotsSvg(k.pointsAt(k.corners(BOX, 4).map(([x, y]) => [x, y, BOX_H] as Point3), P), { size: 0.5 });
  s += k.solidSvg(k.cylinder(SX, SY, 9, BOX_H, 3, P, 32, 0.4), { tone: "mid" });
  s += k.solidSvg(k.cylinder(SX, SY, 6, BOX_H + 3, 4, P, 28, 0.4), { tone: "hi", crease: "lo" });
  // dial pedestal
  s += k.solidSvg(k.slabOf(PED, 0, DIAL.z - 4, P, 4, 0.6), { tone: "mid", inner: k.lineSvg(k.sideSeam(PED, 6, P, 4), { tone: "faint" }) });
  s += k.dotsSvg(k.pointsAt(k.corners(PED, 3.5).map(([x, y]) => [x, y, DIAL.z - 4] as Point3), P), { size: 0.45 });
  // the dial gauge, face up: top eigenvalue of the effective connections, 0 to 1.5, edge of stability at 1
  const top = DIAL.z + 8;
  // crown on the far side, behind the puck
  s += k.solidSvg(k.slabOf({ x: DIAL.x - 3, y: DIAL.y - DIAL.r - 5, w: 6, d: 6, r: 1 }, top - 8, 5, P, 2, 0.3), { tone: "mid" });
  s += k.solidSvg(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z - 4, 12, P, 72, 0.8), { tone: "hi", crease: "lo" });
  s += k.lineSvg(k.knurl(DIAL.x, DIAL.y, DIAL.r, top - 3.4, top, 90, P, 0.3), { tone: "lo" });
  s += k.lineSvg(k.sideArc(DIAL.x, DIAL.y, DIAL.r, top - 3.4, P, 48), { tone: "faint" });
  s += k.lineSvg(k.ring(DIAL.x, DIAL.y, DIAL.r - 2.4, top, P, 72), { tone: "lo" });
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 3.4, 30, 5, top, [1.4, 3], P, FROM, SPAN);
  s += k.lineSvg(t.minor, { tone: "lo" }) + k.lineSvg(t.major, { tone: "mid" });
  // the edge: a heavy mark at 1, and a band over the unstable side
  const ang = (v: number) => FROM + (SPAN * v) / DIAL_MAX;
  const onDial = (v: number, rad: number): [number, number] => [DIAL.x + Math.sin(ang(v)) * rad, DIAL.y - Math.cos(ang(v)) * rad];
  s += k.lineSvg(k.lineOnTop(onDial(1, DIAL.r - 3.4), onDial(1, DIAL.r - 9), top, P), { tone: "hi" });
  const band = (rad: number) => Array.from({ length: 13 }, (_, i) => onDial(1 + (0.5 * i) / 12, rad));
  s += k.lineSvg(k.onTop([...band(DIAL.r - 7.2), ...band(DIAL.r - 8.8).reverse(), onDial(1, DIAL.r - 7.2)], top, P), { tone: "mid" });
  s += k.lineSvg(k.ring(DIAL.x, DIAL.y, 6, top, P, 32), { tone: "faint" });
  // knob plate for the coupling c, ticks from 0.4 to 3
  s += k.solidSvg(k.slabOf(KPLATE, 0, 2, P, 4, 0.5), { tone: "lo" });
  const kt = k.radialTicks(KNOB[0], KNOB[1], 13, 26, 13, 2, [1.2, 2.4], P, KFROM, KSPAN);
  s += k.lineSvg(kt.minor, { tone: "lo" }) + k.lineSvg(kt.major, { tone: "mid" });
  const crit = KFROM + (KSPAN * (C_CRIT - C_LO)) / (C_HI - C_LO);
  s += k.lineSvg(k.lineOnTop([KNOB[0] + Math.sin(crit) * 9.8, KNOB[1] - Math.cos(crit) * 9.8], [KNOB[0] + Math.sin(crit) * 13, KNOB[1] - Math.cos(crit) * 13], 2, P), { tone: "hi" });
  s += k.dotsSvg(k.pointsAt(k.corners(KPLATE, 2.6).map(([x, y]) => [x, y, 2] as Point3), P), { size: 0.45 });
  return s;
}

const SPINDLE =
  k.solidSvg(k.cylinder(SX, SY, 2.4, BOX_H + 7, TOP - BOX_H - 7, P, 20), { tone: "hi", crease: "none" }) +
  k.solidSvg(k.cylinder(SX, SY, 4.6, TOP - 3, 6, P, 24, 0.4), { tone: "mid", crease: "lo" }) +
  k.solidSvg(k.cylinder(SX, SY, 2, TOP + 3, 4, P, 16, 0.3), { tone: "hi", crease: "lo" });

/** A sphere: its silhouette is a circle in any orthographic view. Paper fill, a shade crescent, a lit cap. */
function ball([x, y]: Flat, r: number) {
  const R = r * K;
  return (
    `<circle class="iso-shade" data-shade="1" cx="${r1(x)}" cy="${r1(y)}" r="${r1(R)}"/>` +
    `<circle class="iso-shade" data-shade="3" cx="${r1(x - R * 0.12)}" cy="${r1(y - R * 0.14)}" r="${r1(R * 0.8)}"/>` +
    `<circle class="iso-top" cx="${r1(x - R * 0.3)}" cy="${r1(y - R * 0.34)}" r="${r1(R * 0.36)}"/>` +
    `<circle class="iso-line" data-tone="hi" cx="${r1(x)}" cy="${r1(y)}" r="${r1(R)}" fill="none"/>`
  );
}

/** The flyball head at gain a and spin angle φ, painted back to front. */
function head(a: number, phi: number) {
  const theta = ((12 + 58 * Math.min(1, Math.max(0, (a - SIGMA2) / (1 - SIGMA2)))) * Math.PI) / 180;
  const zs = TOP - 2 * LINK * Math.cos(theta);
  const sleeve = k.solidSvg(k.cylinder(SX, SY, 4.2, zs - 6, 6, P, 24, 0.4), { tone: "hi", crease: "lo" }) + k.lineSvg(k.sideArc(SX, SY, 4.2, zs - 3, P, 16), { tone: "faint" });
  const items: [number, string][] = [[k.depthOf([SX, SY, TOP], P), SPINDLE + sleeve]];
  for (const side of [0, Math.PI]) {
    const u: Point3 = [Math.sin(theta) * Math.cos(phi + side), Math.sin(theta) * Math.sin(phi + side), -Math.cos(theta)];
    const end: Point3 = [SX + ARM * u[0], SY + ARM * u[1], TOP + ARM * u[2]];
    const knee: Point3 = [SX + LINK * u[0], SY + LINK * u[1], TOP + LINK * u[2]];
    const g =
      k.lineSvg(k.segment([SX, SY, TOP], end, P), { tone: "hi" }) +
      k.lineSvg(k.segment(knee, [SX, SY, zs], P), { tone: "mid" }) +
      k.dotsSvg([at(knee)], { size: 0.8, tone: "hi" }) +
      ball(at(end), BALL);
    items.push([k.depthOf(end, P), g]);
  }
  return items.sort((p, q) => p[0] - q[0]).map(([, g]) => g).join("");
}

function needle(e: number) {
  const ang = FROM + (SPAN * Math.min(DIAL_MAX, Math.max(0, e))) / DIAL_MAX;
  const top = DIAL.z + 8.2, L = DIAL.r - 5;
  return (
    k.lineSvg(k.lineOnTop([DIAL.x - Math.sin(ang) * 6, DIAL.y + Math.cos(ang) * 6], [DIAL.x + Math.sin(ang) * L, DIAL.y - Math.cos(ang) * L], top, P), { tone: "lit", free: true }) +
    k.solidSvg(k.cylinder(DIAL.x, DIAL.y, 1.8, top - 0.2, 0.8, P, 16), { tone: "hi", crease: "none" })
  );
}

const ART = art();
const toC = (u: number) => C_LO + (C_HI - C_LO) * u;
const knobAt = (c: number) => knob(KNOB[0], KNOB[1], 2, 7, P, KFROM + (KSPAN * (c - C_LO)) / (C_HI - C_LO) - Math.PI / 2);
const START_C = 1.6;

export function GovernorFigure({ bare = false, speed = 1, amplitude = 1 }: { bare?: boolean; speed?: number; amplitude?: number } = {}) {
  const { anchor, say } = useReadout<SVGSVGElement>();
  const headRef = useRef<SVGGElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const knobRef = useRef<SVGGElement>(null);
  const state = useRef({ c: START_C, target: START_C, s: { y: 0.9, a: gainStar(START_C) } as Governor, phi: 0, touched: -1e9, tour: 0, visible: false });

  useEffect(() => {
    const svg = anchor.current!;
    const io = new IntersectionObserver(([e]) => {
      state.current.visible = e.isIntersecting;
      if (e.isIntersecting && !raf) { last = 0; raf = requestAnimationFrame(tick); }
    });
    io.observe(svg);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = 0, lastKnob = "";
    const tick = (now: number) => {
      const S = state.current;
      if (!S.visible) { raf = 0; return; }
      raf = requestAnimationFrame(tick);
      const dt = (last ? Math.min(0.05, (now - last) / 1000) : 1 / 60) * speed;
      last = now;
      // idle tour: the coupling wanders between weak and strong, across the threshold
      if (!still && now - S.touched > 4000) {
        S.tour += dt * 0.05;
        S.target = C_LO + (C_HI - C_LO) * (0.5 - 0.5 * Math.cos(S.tour * Math.PI * 2 + 1.2));
      }
      S.c += (S.target - S.c) * (1 - Math.exp(-dt / 0.3));
      if (still) { S.s.a = gainStar(S.c); S.s.y = Math.sqrt(Math.max(0, 1 - SIGMA2 / S.s.a)); }
      else for (let i = 0, n = Math.round((dt * RATE) / H); i < n; i++) governorStep(S.s, S.c, H);
      // activity spins the head; the spin is cosmetic, the opening is the gain
      S.phi += still ? 0 : dt * 2 * Math.PI * (0.25 + 0.9 * Math.min(1.5, Math.abs(S.s.y))) * amplitude;
      if (headRef.current) headRef.current.innerHTML = head(S.s.a, S.phi);
      if (needleRef.current) needleRef.current.innerHTML = needle(edgeOf(S.c, S.s.a));
      const kn = knobAt(S.c);
      if (kn !== lastKnob && knobRef.current) { knobRef.current.innerHTML = kn; lastKnob = kn; }
      say(readoutOf(S.c, S.s.a));
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [anchor, say, speed, amplitude]);

  const setFrom = (clientX: number) => {
    const r = anchor.current!.getBoundingClientRect();
    state.current.target = toC(Math.max(0, Math.min(1, (clientX - r.left) / r.width)));
    state.current.touched = performance.now();
  };
  const onKey = (e: React.KeyboardEvent) => {
    const s = state.current;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") s.target = Math.min(C_HI, s.target + 0.1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") s.target = Math.max(C_LO, s.target - 0.1);
    else return;
    e.preventDefault();
    s.touched = performance.now();
  };

  return (
    <div className={bare ? "anatomy-wrap bare iso" : "anatomy-wrap iso"} data-theme="light">
      <Plate
        fig="Fig 1"
        title="A governor for the network"
        hint="Drag across, or ← → to change the coupling"
        readout={readoutOf(START_C, gainStar(START_C))}
        keys={bare ? [] : [
          { mark: "raised", label: "Flyballs: the one gain unit" },
          { mark: "lit", label: "Top eigenvalue of the effective connections" },
          { mark: "flat", label: "Knob: coupling strength c" },
        ]}
        caption={bare ? undefined : "A flyball governor stands in for the paper’s single gain unit. The more the network is active, the faster the head spins and the further the balls fly out, lifting the sleeve that scales every connection by (1 − a). The dial reads the top eigenvalue of the effective connection matrix, (1 − a)λ. Below the threshold c ≈ 0.79 it sits short of the edge; above it the needle settles on exactly 1 for every coupling you choose, after a damped swing. The motion is the paper’s own equations for the top mode and the gain, σ² = 0.1."}
      >
        <div className="iso-stage" tabIndex={0} onKeyDown={onKey} aria-label="Flyball governor; use arrow keys to change the coupling strength" style={{ touchAction: "pan-y", cursor: "ew-resize" }}>
          <svg
            ref={anchor}
            className="iso-svg"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label="An isometric flyball governor on a gearbox driven by a motor, beside a dial gauge whose needle settles on the edge-of-stability mark, and a coupling knob"
            onPointerDown={(e) => setFrom(e.clientX)}
            onPointerMove={(e) => e.buttons && setFrom(e.clientX)}
          >
            <g suppressHydrationWarning dangerouslySetInnerHTML={{ __html: ART }} />
            <g ref={needleRef} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: needle(1) }} />
            <g ref={knobRef} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: knobAt(START_C) }} />
            <g ref={headRef} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: head(gainStar(START_C), 0.6) }} />
          </svg>
        </div>
      </Plate>
    </div>
  );
}
