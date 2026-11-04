"use client";
import { useEffect, useRef } from "react";
import * as k from "@/components/iso/iso-kit";
import type { Plan, Point3 } from "@/components/iso/iso-kit";
import { Plate } from "@/components/iso/react/draw";
import { useReadout } from "@/components/iso/react/live";
import { N, PHASES, decode, driveOf, makeRing, responses, step, type Phase } from "@/lib/organics";
import { basePlate, labelPlate } from "@/components/figures/parts";

const WIDTH = 620, HEIGHT = 420;
const BASE: Plan = { x: -140, y: -140, w: 280, d: 280, r: 14 };
const PLATTER_R = 118, PLATTER_Z = 0, PLATTER_H = 6;
const TOP = PLATTER_Z + PLATTER_H;
const RING_R = 96;
const SLEEVE_H = 5;
const ROD_R = 3, CAP_R = 4.4;
const LIFT = 52;
const HUB_R = 34, HUB_H = 12;
const DIAL_R = 8.5;
const AZ = 40;

const P = k.fitProjection(
  [...k.boxCorners(BASE, -14, 0), [0, -RING_R, TOP + SLEEVE_H + LIFT + 4], [-RING_R, 0, TOP + SLEEVE_H + LIFT + 4]],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: AZ, elevation: 32 },
);
const at = (p: Point3) => k.iso(p, P);
const angleOf = (j: number) => (j / N) * Math.PI * 2;
// the ring's angle 0 points toward −y (away), clockwise seen from above, like radialTicks
const posOf = (th: number, r: number): [number, number] => [r * Math.sin(th), -r * Math.cos(th)];
const depth = (j: number) => k.depthOf([...posOf(angleOf(j), RING_R), 0] as Point3, P);
const HUB_DEPTH = k.depthOf([0, 0, 0], P);
const SORTED = Array.from({ length: N }, (_, j) => j).sort((a, b) => depth(a) - depth(b));
const BEHIND = SORTED.filter((j) => depth(j) < HUB_DEPTH);
const INFRONT = SORTED.filter((j) => depth(j) >= HUB_DEPTH);

const DIALS: { key: "a" | "b" | "r"; at: [number, number]; max: number }[] = [
  { key: "a", at: [-15, 6], max: 2 },
  { key: "b", at: [0, -14], max: 1 },
  { key: "r", at: [15, 6], max: 0.025 },
];

function staticArt() {
  let s = basePlate(BASE, 10, P, { label: { x: 70, y: 112, w: 52, d: 12, r: 1.5 } });
  s += k.solidSvg(k.cylinder(0, 0, PLATTER_R + 4, PLATTER_Z, 2, P, 96), { tone: "lo" });
  s += k.solidSvg(k.cylinder(0, 0, PLATTER_R, PLATTER_Z + 2, PLATTER_H - 2, P, 96, 0.8), { tone: "mid" });
  const t = k.radialTicks(0, 0, PLATTER_R - 0.3, N * 4, 4, TOP, [2.2, 4.4], P);
  s += k.lineSvg(t.minor, { tone: "lo" }) + k.lineSvg(t.major, { tone: "mid" });
  s += k.lineSvg(k.ring(0, 0, PLATTER_R - 8, TOP, P, 96), { tone: "faint" });
  s += k.lineSvg(k.ring(0, 0, PLATTER_R - 0.3, TOP, P, 120), { tone: "faint" });
  s += k.lineSvg(k.ring(0, 0, HUB_R + 10, TOP, P, 72), { tone: "faint" });
  return s;
}
const sleeve = (j: number) => {
  const [x, y] = posOf(angleOf(j), RING_R);
  return k.solidSvg(k.cylinder(x, y, CAP_R + 1.2, TOP, SLEEVE_H, P, 18, 0.3), { tone: "mid" }) + k.lineSvg(k.ring(x, y, ROD_R + 0.4, TOP + SLEEVE_H, P, 12), { tone: "lo" });
};
const piston = (j: number, v: number, lit: boolean) => {
  const [x, y] = posOf(angleOf(j), RING_R);
  const h = 1 + LIFT * Math.max(0, Math.min(1, v));
  return (
    k.solidSvg(k.cylinder(x, y, ROD_R, TOP + SLEEVE_H, h, P, 16), { tone: "hi", crease: "none" }) +
    k.solidSvg(k.cylinder(x, y, CAP_R, TOP + SLEEVE_H + h, 2.2, P, 18, 0.3), { tone: "hi", crease: "lo", lit })
  );
};
function hub() {
  let s = k.solidSvg(k.cylinder(0, 0, HUB_R + 3, TOP, 2, P, 64), { tone: "lo" });
  s += k.solidSvg(k.cylinder(0, 0, HUB_R, TOP + 2, HUB_H, P, 64, 0.8), { tone: "mid", inner: k.lineSvg(k.sideArc(0, 0, HUB_R, TOP + 6, P, 40), { tone: "faint" }) });
  const z = TOP + 2 + HUB_H;
  s += k.lineSvg(k.ring(0, 0, HUB_R - 3, z, P, 64), { tone: "faint" });
  for (const d of DIALS) {
    const [x, y] = d.at;
    s += k.solidSvg(k.cylinder(x, y, DIAL_R, z, 2.4, P, 32, 0.4), { tone: "hi", crease: "lo" });
    const t = k.radialTicks(x, y, DIAL_R - 1.2, 10, 5, z + 2.4, [0.9, 1.8], P, -Math.PI * 0.75, Math.PI * 1.5);
    s += k.lineSvg(t.minor, { tone: "lo" }) + k.lineSvg(t.major, { tone: "mid" });
  }
  s += k.dotsSvg(k.pointsAt([0, 1, 2, 3, 4, 5].map((i) => [Math.cos(i + 0.3) * (HUB_R - 6), Math.sin(i + 0.3) * (HUB_R - 6), z] as Point3), P), { size: 0.5 });
  return s;
}
const needles = (m: { a: number; b: number; r: number }) =>
  DIALS.map((d) => {
    const [x, y] = d.at;
    const z = TOP + 2 + HUB_H + 2.4;
    const v = Math.max(0, Math.min(1, m[d.key] / d.max));
    const th = -Math.PI * 0.75 + v * Math.PI * 1.5;
    const tip: [number, number] = [x + Math.sin(th) * (DIAL_R - 2), y - Math.cos(th) * (DIAL_R - 2)];
    return k.lineSvg(k.lineOnTop([x, y], tip, z + 0.1, P), { tone: "lit", free: "end" }) + k.dotsSvg([at([x, y, z + 0.1])], { size: 0.9, tone: "hi" });
  }).join("");
const pointerArm = (th: number, on: number) => {
  if (on < 0.02) return "";
  const a = posOf(th, HUB_R + 12), b = posOf(th, RING_R - CAP_R - 4);
  return `<g opacity="${on.toFixed(2)}">${k.lineSvg(k.lineOnTop(a, b, TOP + 0.1, P), { tone: "lit" })}${k.dotsSvg([at([...b, TOP + 0.1] as Point3)], { size: 1.3, tone: "hi" })}</g>`;
};

const STATIC = staticArt();
const SLEEVES = Array.from({ length: N }, (_, j) => sleeve(j));
function Unit({ j, refs }: { j: number; refs: React.RefObject<(SVGGElement | null)[]> }) {
  return (
    <g>
      <g suppressHydrationWarning dangerouslySetInnerHTML={{ __html: SLEEVES[j] }} />
      <g ref={(el) => { refs.current[j] = el; }} />
    </g>
  );
}
const HUB = hub();

const SCRIPT: { phase: Phase; secs: number; say: string }[] = [
  { phase: "present", secs: 0.7, say: "present" },
  { phase: "hold", secs: 2.2, say: "hold" },
  { phase: "shift", secs: 1.6, say: "shift" },
  { phase: "hold", secs: 1.6, say: "hold" },
  { phase: "clear", secs: 0.9, say: "clear" },
  { phase: "rest", secs: 0.8, say: "rest" },
];
const readoutOf = (word: string, angle: number | null) => `${word} · ${angle === null ? "empty" : `remembers ${angle}°`}`;

export function OrganicsCarouselFigure({ bare = false, speed = 1, amplitude = 1 }: { bare?: boolean; speed?: number; amplitude?: number } = {}) {
  const { anchor, say } = useReadout<SVGSVGElement>();
  const pistons = useRef<(SVGGElement | null)[]>([]);
  const needle = useRef<SVGGElement>(null);
  const arm = useRef<SVGGElement>(null);
  const live = useRef({ ring: makeRing(), target: Math.PI * 0.3, ix: 0, clock: 0, touched: -1e9, visible: false, phase: "rest" as Phase, flash: 0 });

  useEffect(() => {
    const svg = anchor.current!;
    const io = new IntersectionObserver(([e]) => (live.current.visible = e.isIntersecting));
    io.observe(svg);
    const L = live.current;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const y = new Float64Array(N);
    const shown = new Float64Array(N).fill(-1);
    let litWas = -1;
    let raf = 0, last = 0;
    const setPhase = (p: Phase) => { L.phase = p; L.ring.target = { ...PHASES[p] }; };
    setPhase("present");
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!L.visible && last) return;
      const dt = (last ? Math.min(0.05, (now - last) / 1000) : 1 / 60) * speed;
      last = now;
      L.clock += dt;
      if (L.clock > SCRIPT[L.ix].secs && (now - L.touched > 3500 || L.phase !== "hold")) {
        L.clock = 0;
        L.ix = (L.ix + 1) % SCRIPT.length;
        if (SCRIPT[L.ix].phase === "present") L.target = Math.round(Math.random() * N) * ((Math.PI * 2) / N);
        setPhase(SCRIPT[L.ix].phase);
      }
      L.flash += ((L.phase === "present" ? 1 : 0) - L.flash) * (1 - Math.exp(-dt / 0.15));
      const drive = L.phase === "present" ? driveOf([L.target]) : driveOf([]);
      const sim = still ? 0.4 : dt * 0.5; // half speed
      for (let i = 0; i < Math.round(sim * 1000); i++) step(L.ring, drive, 0.001);
      responses(L.ring, y);
      const d = decode(y);
      const best = d.strength > 0.3 ? Math.round((d.angle / (Math.PI * 2)) * N) % N : -1;
      for (let j = 0; j < N; j++) {
        if (Math.abs(y[j] - shown[j]) > 0.008 || (j === best) !== (j === litWas)) {
          shown[j] = y[j];
          const g = pistons.current[j];
          if (g) g.innerHTML = piston(j, y[j] * amplitude, j === best);
        }
      }
      litWas = best;
      if (needle.current) needle.current.innerHTML = needles(L.ring.mods);
      if (arm.current) arm.current.innerHTML = pointerArm(L.target, L.flash);
      say(readoutOf(SCRIPT[L.ix].say === L.phase ? L.phase : L.phase, best < 0 ? null : Math.round((best / N) * 360)));
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [anchor, say, speed, amplitude]);

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = anchor.current!;
    const r = svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * WIDTH, sy = ((e.clientY - r.top) / r.height) * HEIGHT;
    // invert the projection on the platter plane
    const o = at([0, 0, TOP]), ex = k.axisVector(P, [1, 0, 0]), ey = k.axisVector(P, [0, 1, 0]);
    const det = ex[0] * ey[1] - ex[1] * ey[0];
    const dx = sx - o[0], dy = sy - o[1];
    const wx = (dx * ey[1] - dy * ey[0]) / det, wy = (ex[0] * dy - ex[1] * dx) / det;
    const th = (Math.atan2(wx, -wy) + Math.PI * 2) % (Math.PI * 2);
    const L = live.current;
    L.target = Math.round((th / (Math.PI * 2)) * N) * ((Math.PI * 2) / N);
    L.touched = performance.now();
    L.ix = 0;
    L.clock = 0;
    L.phase = "present";
    L.ring.target = { ...PHASES.present };
  };

  return (
    <div className={bare ? "anatomy-wrap bare iso" : "anatomy-wrap iso"} data-theme="light">
      <Plate
        fig="Fig 1"
        title="A memory you can turn"
        hint="Click a direction on the platter to flash a target"
        readout={readoutOf("present", null)}
        keys={bare ? [] : [
          { mark: "raised", label: "36 neurons, one per 10° of direction" },
          { mark: "lit", label: "The remembered direction" },
          { mark: "flat", label: "Modulator dials: a, b, shift" },
        ]}
        caption={bare ? undefined : "Each piston is one neuron of an ORGaNICs circuit; its height is the neuron’s response y. The three dials on the hub are the modulators: b opens the input, a turns the recurrent drive down (reset), and the third gates derivative-shaped recurrent weights. A target flashes, the bump of activity it leaves is held with no input at all, then slides round the ring while the shift dial is up, and is wiped when a rises. The heights come from the circuit’s equation, at half speed."}
      >
        <div className="iso-stage">
          <svg ref={anchor} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="An isometric turntable with 36 pistons on a ring and three dials on a central hub. Piston heights show a bump of neural activity that is held, moved and cleared." onPointerDown={pick} style={{ cursor: "crosshair" }}>
            <g suppressHydrationWarning dangerouslySetInnerHTML={{ __html: STATIC }} />
            <g ref={arm} />
            {BEHIND.map((j) => <Unit key={j} j={j} refs={pistons} />)}
            <g suppressHydrationWarning dangerouslySetInnerHTML={{ __html: HUB }} />
            <g ref={needle} />
            {INFRONT.map((j) => <Unit key={j} j={j} refs={pistons} />)}
          </svg>
        </div>
      </Plate>
    </div>
  );
}
