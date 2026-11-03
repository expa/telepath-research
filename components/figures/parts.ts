import * as k from "../iso/iso-kit";
import type { Plan, Projection, Point3, Plane } from "../iso/iso-kit";

/** Shared recipes from the anatomy craft notes, as SVG strings. */
export function basePlate(plan: Plan, h: number, P: Projection, { label }: { label?: Plan } = {}) {
  const foot = 4;
  const z0 = -h - foot;
  const feet = k.corners(plan, 16).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  const screws = k.corners(plan, 7);
  let s = `<path class="iso-halo" d="${k.haloOf(plan, z0, h, P)}"/>`;
  for (const [x, y] of feet) {
    s += k.solidSvg(k.cylinder(x, y, 6.5, z0, 1.4, P, 24), { tone: "lo" });
    s += k.solidSvg(k.cylinder(x, y, 5, z0 + 1.4, foot - 1.4, P, 24), { tone: "mid", crease: "none" });
  }
  s += k.solidSvg(k.slabOf(plan, -h, h, P, 8, 1.4), { tone: "mid" });
  s += k.lineSvg(k.planOutline(k.insetPlan(plan, 4.5), 0, P), { tone: "faint" });
  s += k.lineSvg(screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" });
  s += k.dotsSvg(k.pointsAt(screws.map(([x, y]) => [x, y, 0] as Point3), P), { size: 0.55 });
  if (label) s += labelPlate(label, P);
  return s;
}

export function labelPlate(plan: Plan, P: Projection, z = 0) {
  let s = k.solidSvg(k.slabOf(plan, z, 0.8, P, 4), { tone: "lo" });
  s += k.lineSvg(k.planOutline(k.insetPlan(plan, 1.5), z + 0.8, P, 4), { tone: "faint" });
  const rows = [0.62, 0.38, 0.5];
  s += rows
    .map((len, i) => k.lineSvg(k.lineOnTop([plan.x + 6, plan.y + 3.2 + i * ((plan.d - 6.4) / 2)], [plan.x + 6 + (plan.w - 12) * len, plan.y + 3.2 + i * ((plan.d - 6.4) / 2)], z + 0.8, P), { tone: "lo", free: true }))
    .join("");
  s += k.dotsSvg(k.pointsAt([[plan.x + 2.8, plan.y + plan.d / 2, z + 0.8], [plan.x + plan.w - 2.8, plan.y + plan.d / 2, z + 0.8]], P), { size: 0.45 });
  return s;
}

/** A ruler strip with ticks hanging from its edge. */
export function rulerStrip(plan: Plan, z: number, P: Projection, step = 4, every = 5) {
  let s = k.solidSvg(k.slabOf(plan, z, 0.6, P, 3), { tone: "lo", crease: "none" });
  const t = k.topTicks(plan.x + 3, plan.x + plan.w - 3, step, every, plan.y + 0.6, z + 0.6, [1.8, 3.4], P);
  s += k.lineSvg(t.minor, { tone: "lo" }) + k.lineSvg(t.major, { tone: "mid" });
  return s;
}

/** A knurled knob with a pointer, standing on a collar. */
export function knob(cx: number, cy: number, z: number, r: number, P: Projection, angle = 0) {
  let s = k.solidSvg(k.cylinder(cx, cy, r + 1.4, z, 2, P, 28), { tone: "lo" });
  s += k.solidSvg(k.cylinder(cx, cy, r, z + 2, 5, P, 36, 0.5), { tone: "hi", crease: "lo" });
  s += k.lineSvg(k.knurl(cx, cy, r, z + 2, z + 7, 40, P), { tone: "lo" });
  s += pointer(cx, cy, z + 7, r, P, angle);
  return s;
}
export const pointer = (cx: number, cy: number, z: number, r: number, P: Projection, angle: number) =>
  k.lineSvg(k.lineOnTop([cx, cy], [cx + Math.cos(angle) * (r - 1), cy + Math.sin(angle) * (r - 1)], z, P), { tone: "lit" }) +
  k.lineSvg(k.ring(cx, cy, 1.2, z, P, 12), { tone: "mid" });

/** A binding post: a hex-ish collar, a threaded body and a knurled cap. */
export function bindingPost(x: number, y: number, z: number, P: Projection) {
  let s = k.solidSvg(k.cylinder(x, y, 3.4, z, 1.2, P, 6), { tone: "lo" });
  s += k.solidSvg(k.cylinder(x, y, 1.4, z + 1.2, 3, P, 14), { tone: "mid", crease: "none" });
  s += k.solidSvg(k.cylinder(x, y, 2.6, z + 4.2, 3.2, P, 20, 0.3), { tone: "hi", crease: "lo" });
  s += k.lineSvg(k.knurl(x, y, 2.6, z + 4.2, z + 7.4, 16, P), { tone: "lo" });
  return s;
}

export const byDepth = <T extends Plane>(pts: T[], P: Projection, z = 0) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], z], P) - k.depthOf([b[0], b[1], z], P));
