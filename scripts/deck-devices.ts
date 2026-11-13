// Draws the deck's isometric figures, in the anatomy style of the site's figures:
// slide 10's 2×4 grid of devices and slide 2's 20-watt bench (a lamp wired to a wattmeter).
// Usage: `node scripts/deck-devices.ts` rewrites both, and their styles, inside public/deck/index.html.
import { readFileSync, writeFileSync } from "node:fs";
import * as k from "../components/iso/iso-kit.ts";
import type { Flat, Plan, Plane, Point3, Projection } from "../components/iso/iso-kit.ts";

const DECK = new URL("../public/deck/index.html", import.meta.url).pathname;
const W = 400, H = 190, AZ = 52;

// ---------- helpers ----------
const S = k.solidSvg, L = k.lineSvg;
const r1 = (v: number) => Math.round(v * 10) / 10;
const at = (p: Point3, P: Projection) => k.iso(p, P);
const poly = (pts: Point3[], P: Projection, cls: string, extra = "") => `<path class="${cls}"${extra} d="${k.pathOf(pts.map((p) => at(p, P)), true)}"/>`;
const dots = (pts: Point3[], P: Projection, size = 0.55, tone: k.Tone = "mid") => k.dotsSvg(k.pointsAt(pts, P), { size, tone });
const litDot = (p: Point3, P: Projection, r = 1.4) => { const [x, y] = at(p, P); return `<circle class="litf" cx="${r1(x)}" cy="${r1(y)}" r="${r}"/>`; };

function hull(points: Flat[]): Flat[] {
  const s = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Flat, a: Flat, b: Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Flat[] = [], up: Flat[] = [];
  for (const p of s) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = s.length - 1; i >= 0; i--) { const p = s[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}

/** A rounded rectangle centred on (cx, cy), turned by `ang` radians in the ground plane. */
function turned(cx: number, cy: number, w: number, d: number, r: number, ang: number, steps = 6): Plane[] {
  const c = Math.cos(ang), s = Math.sin(ang);
  return k.roundedPlan({ x: -w / 2, y: -d / 2, w, d, r }, steps).map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c] as Plane);
}

/** A rounded rectangle drawn on a vertical face: u runs along the face, v is height. */
function onFace(axis: "x" | "y", atv: number, plan: Plan, steps = 6): Point3[] {
  return k.roundedPlan(plan, steps).map(([u, v]) => (axis === "y" ? [u, atv, v] : [atv, u, v]) as Point3);
}

/** A cylinder lying on its side along x or y. Its +axis cap faces the viewer. */
function lying(c: Point3, r: number, len: number, axis: "x" | "y", P: Projection, { tone = "hi" as k.Tone, lit = false, steps = 36, hub = 0 } = {}) {
  const ends = [-len / 2, len / 2].map((o) => Array.from({ length: steps }, (_, i) => {
    const t = (i / steps) * Math.PI * 2, u = r * Math.cos(t), v = r * Math.sin(t);
    return (axis === "x" ? [c[0] + o, c[1] + u, c[2] + v] : [c[0] + u, c[1] + o, c[2] + v]) as Point3;
  }));
  const body = k.pathOf(hull([...ends[0], ...ends[1]].map((p) => at(p, P))), true);
  const cap = k.pathOf(ends[1].map((p) => at(p, P)), true);
  let s = `<g class="iso-solid"${lit ? ' data-lit=""' : ""}><path class="iso-fill" d="${body}"/><path class="iso-shade" data-shade="1" d="${body}"/><path class="iso-top" d="${cap}"/>`;
  s += `<path class="iso-line" data-tone="${lit ? "lit" : tone}" d="${body}"/><path class="iso-line" data-tone="${lit ? "lit" : tone}" d="${cap}"/></g>`;
  if (hub) {
    const face: Point3 = axis === "x" ? [c[0] + len / 2 + 0.05, c[1], c[2]] : [c[0], c[1] + len / 2 + 0.05, c[2]];
    s += L(k.sideRing(face, r * hub, axis, P, 28), { tone: "lo" });
  }
  return s;
}

/** An arc lying flat at height z, angles in radians measured from +x towards +y. */
function arcTop(cx: number, cy: number, r: number, a0: number, a1: number, z: number, P: Projection, steps = 40) {
  const pts: Plane[] = [];
  for (let i = 0; i <= steps; i++) { const a = a0 + ((a1 - a0) * i) / steps; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return k.onTop(pts, z, P);
}

const facing = (dx: number, dy: number, P: Projection) => { const [vx, vy] = k.towardViewer(P); return dx * vx + dy * vy > 0; };

interface Device { name: string; line: string; label: string; bounds: Point3[]; draw: (P: Projection, id: string) => string; pad?: number }

// ---------- 1. earbuds ----------
const CASE: Plan = { x: -60, y: -30, w: 50, d: 42, r: 15 };
function bud(cx: number, cy: number, ang: number, P: Projection, mic: boolean) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const stem = S(k.extrude(turned(cx + dx * 15, cy + dy * 15, 30, 7.5, 3.75, ang), 0, 6.4, P, { bevel: 0.6 }), { tone: "hi", crease: "lo" })
    + L(k.lineOnTop([cx + dx * 26 - dy * 1.6, cy + dy * 26 + dx * 1.6], [cx + dx * 26 + dy * 1.6, cy + dy * 26 - dx * 1.6], 6.4, P), { tone: "lo" })
    + (mic ? litDot([cx + dx * 27.6, cy + dy * 27.6, 6.4], P, 1.5) : dots([[cx + dx * 27.6, cy + dy * 27.6, 6.4]], P, 0.7, "hi"));
  let head = S(k.cylinder(cx, cy, 10, 0, 7, P, 44, 1.6), { tone: "hi", crease: "lo" });
  head += S(k.cylinder(cx, cy, 7, 7, 2.6, P, 40, 0.9), { tone: "mid", crease: "faint" });
  head += L(k.ring(cx, cy, 3.8, 9.6, P, 28), { tone: "lo" });
  head += k.dotsSvg(k.dotGrid(cx - 1.6, cy - 1.6, 3, 3, 1.6, 9.6, P), { size: 0.35, tone: "mid" });
  head += L(k.sideArc(cx, cy, 10, 3.5, P, 24), { tone: "faint" });
  return facing(dx, dy, P) ? head + stem : stem + head;
}
const earbuds: Device = {
  name: "Earbuds", line: "Learns your voice", label: "A charging case with two earbuds resting beside it, and rings of sound spreading from one of them",
  bounds: [...k.boxCorners(CASE, 0, 22), [64, -44, 0], [64, 44, 0], [-10, 46, 0], [36, -50, 10]],
  draw(P) {
    const b1: Plane = [8, -22], b2: Plane = [34, 12];
    let s = "";
    for (const [i, r] of [16, 23, 30].entries()) s += L(arcTop(b2[0], b2[1], r, -0.35, 1.55, 0, P), { tone: "lit", dotted: true, className: `w${i}` });
    s += S(k.slabOf(CASE, 0, 22, P, 10, 1.4), { tone: "hi", crease: "lo", inner: L(k.sideSeam(CASE, 15, P, 10), { tone: "mid" }) });
    s += L(k.planOutline(k.insetPlan(CASE, 5), 22, P, 10), { tone: "faint" });
    s += poly(onFace("y", CASE.y + CASE.d + 0.05, { x: -39, y: 3.4, w: 8, d: 2.4, r: 1.2 }), P, "inkf");
    s += litDot([CASE.x + CASE.w + 0.05, CASE.y + CASE.d / 2, 11], P, 1.3);
    s += bud(b1[0], b1[1], -0.75, P, false);
    s += bud(b2[0], b2[1], 2.6, P, true);
    return s;
  },
};

// ---------- 2. watch ----------
const WCASE: Plan = { x: -18, y: -21, w: 36, d: 42, r: 11 };
const watch: Device = {
  name: "Watch", line: "Learns your body", label: "A smartwatch lying flat with its strap open, activity rings on its face",
  bounds: [[-14, -76, 0], [14, -76, 0], [-14, 76, 0], [14, 76, 0], ...k.boxCorners(WCASE, 0, 16), [26, 0, 10]],
  draw(P) {
    const z0 = 3, z1 = 14;
    let s = "";
    // back strap with its buckle
    const back: Plan = { x: -12.5, y: -74, w: 25, d: 56, r: 5 };
    s += S(k.slabOf(back, 0, 3, P, 6, 0.4), { tone: "mid", crease: "faint" });
    const buckle: Plan = { x: -15, y: -70, w: 30, d: 12, r: 4 };
    s += S(k.slabOf(buckle, 3, 1.6, P, 6, 0.3), { tone: "hi", crease: "lo" });
    s += S(k.slabOf(k.insetPlan(buckle, 2.6), 3, 1.6, P, 6), { tone: "mid", crease: "none", flat: true });
    s += L(k.lineOnTop([0, -64], [0, -52], 4.6, P), { tone: "hi" });
    s += L(k.lineOnTop([-9, -48], [9, -48], 3, P), { tone: "faint" });
    // case, glass and face
    s += S(k.slabOf(WCASE, z0, z1 - z0, P, 10, 1.6), { tone: "hi", crease: "lo" });
    const glass = k.insetPlan(WCASE, 2.4);
    s += S(k.slabOf(glass, z1, 1.4, P, 10, 0.5), { tone: "mid", crease: "faint" });
    const zf = z1 + 1.4;
    s += poly(k.roundedPlan(k.insetPlan(glass, 1.6), 10).map(([x, y]) => [x, y, zf] as Point3), P, "inkf screen");
    const rings: [number, number, k.LineTone][] = [[11.5, 4.6, "lit"], [8.4, 3.4, "lit"], [5.3, 2.2, "lit"]];
    for (const [r, end, tone] of rings) {
      s += L(k.ring(0, -1, r, zf, P, 48), { tone: "lo", className: "onink" });
      s += L(arcTop(0, -1, r, -Math.PI / 2, -Math.PI / 2 + end, zf, P), { tone, className: "thick" });
    }
    s += dots([[-6, 13, zf], [0, 13, zf], [6, 13, zf]], P, 0.6, "faint");
    // crown and side button on the near (+x) side
    s += S(k.slabOf({ x: 18, y: -12, w: 1.8, d: 7, r: 0.9 }, 6, 5, P, 3), { tone: "hi", crease: "none" });
    s += lying([21, 3, 8.5], 3.6, 5.2, "x", P, { hub: 0.45 });
    s += k.lineSvg(Array.from({ length: 9 }, (_, i) => { const t = -Math.PI / 2 + (i / 8) * Math.PI; return k.segment([18.6, 3 + 3.6 * Math.cos(t), 8.5 + 3.6 * Math.sin(t)], [23.4, 3 + 3.6 * Math.cos(t), 8.5 + 3.6 * Math.sin(t)], P); }).join(""), { tone: "faint" });
    // front strap with holes
    const front: Plan = { x: -12.5, y: 20.5, w: 25, d: 54, r: 5 };
    s += S(k.slabOf(front, 0, 3, P, 6, 0.4), { tone: "mid", crease: "faint" });
    s += L([36, 44, 52, 60].map((y) => k.ring(0, y, 1.4, 3, P, 18)).join(""), { tone: "mid" });
    s += L(k.lineOnTop([-9, 27], [9, 27], 3, P), { tone: "faint" });
    return s;
  },
};

// ---------- 3. glasses ----------
type V3 = [number, number, number];
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const viewOf = (P: Projection): V3 => { const { sinA, cosA, sinE, cosE } = k.cameraOf(P); return [cosA * cosE, sinA * cosE, sinE]; };

/** A prism along any axis: `ring` lives in the (u, v) plane at `o`, swept `depth` along n (u, v, n orthonormal). */
function prism(ring: Plane[], o: V3, u: V3, v: V3, n: V3, depth: number, P: Projection, { tone = "hi" as k.Tone, crease = "lo" as k.Tone | "none", lit = false } = {}) {
  const pt = ([a, b]: Plane, t: number): Point3 => [o[0] + a * u[0] + b * v[0] + t * n[0], o[1] + a * u[1] + b * v[1] + t * n[1], o[2] + a * u[2] + b * v[2] + t * n[2]];
  const V = viewOf(P);
  const { sinA, cosA } = k.cameraOf(P);
  const light: V3 = [-sinA, cosA, 0];
  const capT = dot3(n, V) > 0 ? depth : 0;
  const near = ring.map((q) => at(pt(q, capT), P)), far = ring.map((q) => at(pt(q, depth - capT), P));
  const ca = ring.reduce((m, q) => m + q[0], 0) / ring.length, cb = ring.reduce((m, q) => m + q[1], 0) / ring.length;
  const shades: string[] = ["", "", "", ""];
  ring.forEach((q, i) => {
    const r = ring[(i + 1) % ring.length];
    let na = r[1] - q[1], nb = -(r[0] - q[0]);
    if (na * ((q[0] + r[0]) / 2 - ca) + nb * ((q[1] + r[1]) / 2 - cb) < 0) { na = -na; nb = -nb; }
    const len = Math.hypot(na, nb) || 1;
    const N: V3 = [(na * u[0] + nb * v[0]) / len, (na * u[1] + nb * v[1]) / len, (na * u[2] + nb * v[2]) / len];
    if (dot3(N, V) <= 1e-9) return;
    const b = Math.min(3, Math.max(0, Math.floor(((dot3(N, light) + 1) / 2) * 4 + N[2] * 1.5)));
    shades[b] += k.pathOf([near[i], near[(i + 1) % ring.length], far[(i + 1) % ring.length], far[i]], true);
  });
  const fill = k.pathOf(hull([...near, ...far]), true), cap = k.pathOf(near, true);
  let s = `<g class="iso-solid"${lit ? ' data-lit=""' : ""}><path class="iso-fill" d="${fill}"/>`;
  shades.forEach((d, i) => { if (d) s += `<path class="iso-shade" data-shade="${i}" d="${d}"/>`; });
  s += `<path class="iso-top" d="${cap}"/>`;
  if (crease !== "none") s += `<path class="iso-line" data-tone="${crease}" d="${cap}"/>`;
  return s + `<path class="iso-line iso-edge" data-tone="${tone}" d="${fill}"/></g>`;
}

const X: V3 = [1, 0, 0], Y: V3 = [0, 1, 0], Z: V3 = [0, 0, 1];
const FRONT = 0, RIM = 4.2; // the frame stands in the x–z plane, its face towards +y
const LENS_L: Plan = { x: -53, y: 0, w: 45, d: 31, r: 12 }, LENS_R: Plan = { x: 8, y: 0, w: 45, d: 31, r: 12 };
const ARM_Z = 22.5, ARM_BACK = -80; // temples run straight back at hinge height

/** A lens rim standing upright, its glass set back inside the opening. */
function rim(plan: Plan, P: Projection, id: string) {
  let s = prism(k.roundedPlan(plan, 10), [0, FRONT - RIM, 0], X, Z, Y, RIM, P, { tone: "hi", crease: "lo" });
  const hole = k.roundedPlan(k.insetPlan(plan, 3.2), 10);
  const face = hole.map(([a, b]) => at([a, FRONT + 0.02, b], P)), glass = hole.map(([a, b]) => at([a, FRONT - RIM * 0.55, b], P));
  const faceD = k.pathOf(face, true), glassD = k.pathOf(glass, true);
  const g = (fx: number, fz: number, tx: number, tz: number) => k.segment([plan.x + plan.w * fx, FRONT - RIM * 0.55, plan.y + plan.d * fz], [plan.x + plan.w * tx, FRONT - RIM * 0.55, plan.y + plan.d * tz], P);
  s += `<clipPath id="${id}"><path d="${faceD}"/></clipPath><path class="iso-shade" data-shade="0" d="${faceD}"/>`;
  s += `<g clip-path="url(#${id})"><path class="glass" d="${glassD}"/>`;
  s += L(g(0.52, 0.86, 0.78, 0.3) + g(0.62, 0.86, 0.88, 0.3) + g(0.2, 0.62, 0.32, 0.36), { tone: "faint" });
  s += L(glassD, { tone: "lo" }) + `</g>` + L(faceD, { tone: "mid" });
  return s;
}

/** One temple: a straight bar from the hinge back. */
const temple = (x: number, P: Projection, w = 3.6) => S(k.slabOf({ x: x - w / 2, y: ARM_BACK, w, d: -ARM_BACK - 2, r: 1.8 }, ARM_Z, 4, P, 4, 0.3), { tone: "mid", crease: "faint" });

const glasses: Device = {
  name: "Glasses", line: "Learns what you see", label: "A pair of smart glasses standing open on the table, a small camera lit at the corner of the frame",
  bounds: [[-56, ARM_BACK, 0], [56, ARM_BACK, 0], [-56, 2, 0], [56, 2, 0], [-56, 2, 32], [56, 2, 32], [-56, ARM_BACK, ARM_Z + 4], [56, ARM_BACK, ARM_Z + 4]],
  pad: 12,
  draw(P, id) {
    let s = "";
    // temples, back to front; the right one carries the electronics in a thicker pod
    s += temple(-50, P) + temple(50.5, P);
    const pod: Plan = { x: 47.2, y: -48, w: 6.6, d: 40, r: 3 };
    s += S(k.slabOf(pod, ARM_Z - 1.6, 7.2, P, 6, 0.6), { tone: "hi", crease: "lo" });
    s += L(k.planOutline({ x: 48.7, y: -40, w: 3.6, d: 20, r: 1.8 }, ARM_Z + 5.6, P, 6), { tone: "faint" });
    s += L([-26, -22.5, -19].map((y) => k.lineOnTop([48.6, y], [52.4, y], ARM_Z + 5.6, P)).join(""), { tone: "lo" });
    // hinges at the outer corners
    for (const x of [-56, 49]) s += S(k.slabOf({ x, y: -9, w: 7, d: 9, r: 2 }, ARM_Z - 1.4, 7.4, P, 4, 0.4), { tone: "hi", crease: "lo" });
    // nose pads, tucked behind the bridge
    for (const x of [-8.5, 8.5]) s += S(k.cylinder(x, -6, 2.6, 7, 6, P, 20, 0.4), { tone: "mid", crease: "faint" });
    // the frame front: bridge, then the two rims
    s += prism(k.roundedPlan({ x: -10, y: 21, w: 20, d: 5.4, r: 2.4 }, 4), [0, FRONT - RIM + 0.6, 0], X, Z, Y, RIM - 1.2, P, { tone: "hi", crease: "lo" });
    s += rim(LENS_L, P, `${id}a`) + rim(LENS_R, P, `${id}b`);
    // camera on the right hinge's face, indicator on the left
    const yc = 0.05;
    s += `<path class="litf" style="opacity:.18" d="${k.sideRing([52.5, yc, 26.2], 2.8, "y", P, 28)}"/>`;
    s += L(k.sideRing([52.5, yc, 26.2], 2.8, "y", P, 28), { tone: "lit" }) + `<path class="litf" d="${k.sideRing([52.5, yc, 26.2], 1.3, "y", P, 20)}"/>`;
    s += dots([[-52.5, yc, 26.2]], P, 0.9, "hi");
    return s;
  },
};

// ---------- 4. phone ----------
const PH: Plan = { x: -25, y: -50, w: 50, d: 100, r: 11 };
const phone: Device = {
  name: "Phone", line: "Learns how you write", label: "A phone lying face up with a message being typed, a word suggestion lit above the keyboard",
  bounds: [...k.boxCorners(PH, 0, 6)],
  pad: 12,
  draw(P) {
    const z = 5.4;
    let s = "";
    s += S(k.slabOf(PH, 0, z, P, 10, 1.1), { tone: "hi", crease: "lo" });
    for (const [y, d] of [[-30, 11], [-15, 7]] as const) s += S(k.slabOf({ x: 25, y, w: 1.2, d, r: 0.6 }, 1.6, 2.2, P, 3), { tone: "hi", crease: "none" });
    const scr = k.insetPlan(PH, 2.4);
    s += L(k.planOutline(scr, z, P, 10), { tone: "mid" });
    s += poly(k.roundedPlan({ x: -7.5, y: -45, w: 15, d: 4.4, r: 2.2 }, 6).map(([x, y]) => [x, y, z] as Point3), P, "inkf");
    const top = (pts: Plane[], tone: k.LineTone = "lo", extra: k.LineStyle = {}) => L(k.onTop(pts, z, P), { tone, ...extra });
    const box = (p: Plan, tone: k.LineTone = "lo") => L(k.planOutline(p, z, P, 5), { tone });
    // conversation
    s += top([[-17, -36], [-6, -36]], "mid");
    s += box({ x: -18, y: -31, w: 25, d: 9, r: 3 }, "lo") + top([[-15, -26.5], [3, -26.5]], "lo");
    s += poly(k.roundedPlan({ x: -4, y: -19, w: 22, d: 9, r: 3 }, 5).map(([x, y]) => [x, y, z] as Point3), P, "bub") + top([[-1, -14.5], [15, -14.5]], "mid");
    s += box({ x: -18, y: -7, w: 18, d: 9, r: 3 }, "lo") + top([[-15, -2.5], [-4, -2.5]], "lo");
    // the line being written, with its caret
    s += box({ x: -19, y: 6, w: 38, d: 8, r: 4 }, "mid");
    s += top([[-15.5, 10], [1.5, 10]], "hi");
    s += top([[4, 8], [4, 12]], "lit", { className: "thick" });
    // suggestions: the model's next word is lit
    s += top([[-17.5, 18.5], [-10.5, 18.5]], "lo") + top([[11, 18.5], [17.5, 18.5]], "lo");
    s += L(k.planOutline({ x: -6.5, y: 15.8, w: 13, d: 5.4, r: 2.7 }, z, P, 5), { tone: "lit" }) + top([[-3.5, 18.5], [3.5, 18.5]], "lit");
    s += top([[-8.5, 16.2], [-8.5, 20.8]], "faint") + top([[8.5, 16.2], [8.5, 20.8]], "faint");
    // keyboard
    const kw = 3.7, gap = 0.75;
    for (const [row, n, off] of [[0, 10, 0], [1, 9, 0.5], [2, 7, 1.5]] as const) {
      for (let i = 0; i < n; i++) s += box({ x: -21.6 + (off + i) * (kw + gap), y: 24 + row * 6, w: kw, d: 4.8, r: 1 }, "faint");
    }
    s += box({ x: -21.6, y: 42, w: 8.5, d: 4.8, r: 1 }, "faint") + box({ x: -11.6, y: 42, w: 23, d: 4.8, r: 1 }, "faint") + box({ x: 13, y: 42, w: 8.6, d: 4.8, r: 1 }, "faint");
    return s;
  },
};

// ---------- 5. drone ----------
const DB: Plan = { x: -16, y: -16, w: 32, d: 32, r: 9 };
const ARM = 44, PROP = 19;
const MOTORS: Plane[] = [[-1, 0], [0, -1], [1, 0], [0, 1]];
const drone: Device = {
  name: "Drone", line: "Learns the terrain", label: "A quadcopter hovering above its shadow, a camera slung under its nose",
  bounds: [...MOTORS.flatMap(([dx, dy]) => Array.from({ length: 12 }, (_, i) => [dx * ARM + PROP * Math.cos(i * 0.52), dy * ARM + PROP * Math.sin(i * 0.52), 23] as Point3)), [0, 0, -3], [18, 12, -3], [-12, 12, 0], [12, -12, 0]],
  pad: 10,
  draw(P) {
    const zb = 10, hb = 10, zt = zb + hb, zp = zt + 2.4;
    const arm = ([dx, dy]: Plane) => {
      const mx = dx * ARM, my = dy * ARM, ang = Math.atan2(dy, dx);
      let s = S(k.extrude(turned(dx * (ARM / 2 + 7), dy * (ARM / 2 + 7), ARM - 14, 5.6, 2.4, ang), zb + 3, 3.4, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" });
      s += L(k.lineOnTop([dx * 20 - dy * 1.2, dy * 20 + dx * 1.2], [dx * (ARM - 8) - dy * 1.2, dy * (ARM - 8) + dx * 1.2], zb + 6.4, P), { tone: "faint" });
      s += S(k.cylinder(mx, my, 6.4, zb + 1, 3, P, 32, 0.4), { tone: "mid", crease: "faint" });
      s += S(k.cylinder(mx, my, 5.2, zb + 4, 6.4, P, 32, 0.5), { tone: "hi", crease: "lo" });
      s += L(k.sideArc(mx, my, 5.2, zb + 7, P, 20), { tone: "faint" });
      s += S(k.slabOf({ x: mx - 1, y: my - 1, w: 2, d: 2, r: 0.8 }, 0, zb + 1, P, 2), { tone: "mid", crease: "none" });
      return s;
    };
    const prop = ([dx, dy]: Plane, i: number) => {
      const mx = dx * ARM, my = dy * ARM;
      let s = L(k.ring(mx, my, PROP, zp + 0.4, P, 64), { tone: "lo", dotted: true });
      s += S(k.extrude(turned(mx, my, PROP * 2, 4.4, 2.2, 0.4 + i * 1.1), zp, 0.9, P), { tone: "mid", crease: "none" });
      s += S(k.cylinder(mx, my, 2.4, zt - 0.4, 3.6, P, 20, 0.3), { tone: "hi", crease: "lo" });
      return s;
    };
    let s = "";
    s += MOTORS.slice(0, 2).map(arm).join("");
    // body
    s += S(k.slabOf(DB, zb, hb, P, 10, 1.4), { tone: "hi", crease: "lo", inner: L(k.sideSeam(DB, zb + 4, P, 10), { tone: "faint" }) });
    s += L(k.planOutline(k.insetPlan(DB, 4.5), zt, P, 8), { tone: "faint" });
    s += S(k.cylinder(-6, -6, 4.2, zt, 1.8, P, 28, 0.3), { tone: "mid", crease: "faint" });
    s += L([3, 6, 9].map((y) => k.lineOnTop([2, y], [9, y], zt, P)).join(""), { tone: "lo" });
    s += dots([[-9, 9, zt], [-6, 9, zt]], P, 0.6, "hi");
    // camera gimbal under the nose, looking forward between the front arms
    s += S(k.slabOf({ x: 4, y: 4, w: 9, d: 9, r: 2 }, zb - 3.4, 3.4, P, 3), { tone: "mid", crease: "none" });
    s += lying([12, 8.5, zb - 7.6], 5, 10, "x", P, { tone: "hi" });
    s += L(k.sideRing([17.05, 8.5, zb - 7.6], 3.6, "x", P, 28), { tone: "lit" });
    s += `<path class="litf" d="${k.sideRing([17.1, 8.5, zb - 7.6], 1.9, "x", P, 24)}"/>`;
    s += MOTORS.slice(2).map(arm).join("");
    s += MOTORS.map((d, i) => ({ d, i, z: k.depthOf([d[0], d[1], 0], P) })).sort((a, b) => a.z - b.z).map(({ d, i }) => prop(d, i)).join("");
    return s;
  },
};

// ---------- 6. car ----------
const CB: Plan = { x: -48, y: -21, w: 96, d: 42, r: 11 };
const CC: Plan = { x: -30, y: -18, w: 54, d: 36, r: 11 };
const car: Device = {
  name: "Car", line: "Learns your roads", label: "A car on a stretch of road, a lidar sensor lit on its roof",
  bounds: [[-70, -38, 0], [70, -38, 0], [-70, 38, 0], [70, 38, 0], [0, 0, 42]],
  pad: 20,
  draw(P) {
    const zr = 0;
    let s = S(k.slabOf({ x: -70, y: -38, w: 140, d: 76, r: 6 }, -2.4, 2.4, P, 6), { tone: "lo", crease: "none" });
    s += L(k.lineOnTop([-64, -30], [64, -30], zr, P), { tone: "mid", dashed: true });
    s += L(k.lineOnTop([-64, 33], [64, 33], zr, P), { tone: "faint" });
    const wheel = (x: number, y: number) => lying([x, y, 9.5], 9.5, 7.5, "y", P, { tone: "hi", hub: 0.6 });
    s += wheel(-29, -18.5) + wheel(29, -18.5);
    // lower body
    s += S(k.slabOf(CB, 5, 14, P, 10, 1.6), { tone: "hi", crease: "lo", inner: L(k.sideSeam(CB, 11, P, 10), { tone: "faint" }) });
    const yf = CB.y + CB.d + 0.05;
    for (const x of [-29, 29]) {
      const arch: Point3[] = [];
      for (let i = 0; i <= 24; i++) { const t = Math.PI * (i / 24); arch.push([x + 12.5 * Math.cos(t), yf, 9.5 + 12.5 * Math.sin(t) * 0.86]); }
      s += poly([...arch.filter((p) => p[2] >= 5), [x - 12.5, yf, 5]], P, "iso-shade", ' data-shade="0"');
      s += L(k.pathOf(arch.filter((p) => p[2] >= 5).map((p) => at(p, P))), { tone: "mid" });
    }
    s += L(k.segment([-3, yf, 6], [-3, yf, 18.6], P) + k.segment([-21, yf, 6.5], [-21, yf, 18.6], P), { tone: "lo" });
    s += L(k.segment([-16, yf, 15.5], [-11, yf, 15.5], P) + k.segment([3, yf, 15.5], [8, yf, 15.5], P), { tone: "mid" });
    // nose: lamps and grille on the +x face
    const xf = CB.x + CB.w + 0.05;
    for (const y of [-11, 4.5]) s += L(k.pathOf(onFace("x", xf, { x: y, y: 13.5, w: 6.5, d: 3, r: 1.5 }).map((p) => at(p, P)), true), { tone: "hi" });
    s += L(k.segment([xf, -7, 9], [xf, 7, 9], P), { tone: "lo" });
    // cabin with its glass
    s += S(k.slabOf(CC, 19, 13, P, 10, 1.4), { tone: "hi", crease: "lo" });
    s += L(k.planOutline(k.insetPlan(CC, 5), 32, P, 8), { tone: "faint" });
    const ys = CC.y + CC.d + 0.05, xs = CC.x + CC.w + 0.05;
    s += poly([[-17.5, ys, 21.5], [-3, ys, 21.5], [-3, ys, 30], [-13.5, ys, 30]], P, "glass2") + poly([[-0.5, ys, 21.5], [12.5, ys, 21.5], [12.5, ys, 30], [-0.5, ys, 30]], P, "glass2");
    s += L(k.pathOf(([[-17.5, ys, 21.5], [-3, ys, 21.5], [-3, ys, 30], [-13.5, ys, 30]] as Point3[]).map((p) => at(p, P)), true) + k.pathOf(([[-0.5, ys, 21.5], [12.5, ys, 21.5], [12.5, ys, 30], [-0.5, ys, 30]] as Point3[]).map((p) => at(p, P)), true), { tone: "mid" });
    s += poly([[xs, -7, 21.5], [xs, 7, 21.5], [xs, 6, 30], [xs, -6, 30]], P, "glass2") + L(k.pathOf(([[xs, -7, 21.5], [xs, 7, 21.5], [xs, 6, 30], [xs, -6, 30]] as Point3[]).map((p) => at(p, P)), true), { tone: "mid" });
    s += S(k.slabOf({ x: 17, y: 18, w: 4, d: 5, r: 1.5 }, 19.5, 3.4, P, 3), { tone: "hi", crease: "none" });
    // lidar on the roof
    s += S(k.cylinder(-3, 0, 5.6, 32, 2.6, P, 32, 0.4), { tone: "mid", crease: "faint" });
    s += S(k.cylinder(-3, 0, 4.4, 34.6, 4.6, P, 32, 0.4), { tone: "hi", crease: "lo", lit: true });
    s += L(k.sideArc(-3, 0, 4.4, 37, P, 20), { tone: "lit" });
    s += wheel(-29, 19.5) + wheel(29, 19.5);
    return s;
  },
};

// ---------- 7. robot ----------
const robot: Device = {
  name: "Robot", line: "Learns your home", label: "A small home robot on a round base, its visor showing two lit eyes",
  bounds: [[-26, -26, 0], [26, 26, 0], [-26, 26, 0], [26, -26, 0], [0, 0, 74], [26, 0, 40]],
  pad: 10,
  draw(P) {
    let s = "";
    // far arm
    s += S(k.slabOf({ x: -23.5, y: -3.5, w: 6, d: 7, r: 3 }, 17, 17, P, 4, 0.5), { tone: "mid", crease: "faint" });
    // base
    s += S(k.cylinder(0, 0, 24, 0, 11, P, 64, 1.2), { tone: "hi", crease: "lo", inner: L(k.sideArc(0, 0, 24, 4.5, P, 48), { tone: "mid" }) });
    s += L(k.ring(0, 0, 19.5, 11, P, 64), { tone: "faint" });
    s += L(k.pathOf(Array.from({ length: 13 }, (_, i) => { const a = 0.35 + (i / 12) * 0.9; return at([24.05 * Math.cos(a), 24.05 * Math.sin(a), 8], P); })), { tone: "lo" });
    // torso
    const T: Plan = { x: -15, y: -12, w: 30, d: 24, r: 8 };
    s += S(k.slabOf(T, 11, 26, P, 10, 1.2), { tone: "hi", crease: "lo" });
    s += L(k.pathOf(onFace("y", T.y + T.d + 0.05, { x: -6.5, y: 18, w: 13, d: 13, r: 2.5 }).map((p) => at(p, P)), true), { tone: "faint" });
    s += dots([[-3, 12.05, 27.5], [0, 12.05, 27.5], [3, 12.05, 27.5]], P, 0.7, "hi");
    s += L(k.segment([-4, 12.05, 22], [4, 12.05, 22], P), { tone: "lo" });
    // neck and head
    s += S(k.cylinder(0, 0, 4.5, 37, 5, P, 28, 0.3), { tone: "mid", crease: "faint" });
    const HD: Plan = { x: -17, y: -13, w: 34, d: 26, r: 10 };
    s += S(k.slabOf(HD, 42, 21, P, 10, 1.4), { tone: "hi", crease: "lo" });
    const yh = HD.y + HD.d + 0.05;
    s += poly(onFace("y", yh, { x: -7.5, y: 46.5, w: 15, d: 12, r: 4 }), P, "inkf");
    for (const x of [-3.4, 3.4]) s += `<path class="litf" d="${k.sideRing([x, yh, 52.5], 1.9, "y", P, 20)}"/>`;
    s += lying([18.5, 0, 52.5], 4.4, 3, "x", P, { tone: "hi", hub: 0.5 });
    s += L(k.segment([-5, -4, 63], [-5, -4, 70.5], P), { tone: "hi" });
    s += S(k.cylinder(-5, -4, 1.7, 70.5, 2.4, P, 16, 0.2), { tone: "hi", crease: "none" });
    // near arm
    s += lying([17, 0, 33], 4.2, 4, "x", P, { tone: "hi" });
    s += S(k.slabOf({ x: 17.5, y: -3.5, w: 6, d: 7, r: 3 }, 17, 15, P, 4, 0.5), { tone: "hi", crease: "lo" });
    s += S(k.cylinder(20.5, 0, 3.6, 13, 4, P, 24, 0.3), { tone: "mid", crease: "faint" });
    return s;
  },
};

// ---------- 8. satellite ----------
const satellite: Device = {
  name: "Satellite", line: "Learns a changing planet", label: "A satellite with two long solar wings and a dish on top",
  bounds: [[-94, -16, 15], [94, -16, 15], [-94, 16, 15], [94, 16, 15], [0, 0, 52], [0, 0, -6], [14, 14, 0]],
  pad: 8,
  draw(P) {
    const wing = (sgn: 1 | -1) => {
      let s = S(k.slabOf({ x: sgn > 0 ? 14 : -28, y: -1.6, w: 14, d: 3.2, r: 1.2 }, 14, 3, P, 3), { tone: "mid", crease: "none" });
      for (let i = 0; i < 3; i++) {
        const x0 = sgn > 0 ? 28 + i * 22 : -28 - 20 - i * 22;
        const panel: Plan = { x: x0, y: -15, w: 20, d: 30, r: 1 };
        s += S(k.slabOf(panel, 14.6, 1.6, P, 2, 0.3), { tone: "hi", crease: "lo" });
        const zt = 16.2;
        let g = "";
        for (let x = x0 + 5; x < x0 + 20; x += 5) g += k.lineOnTop([x, -14], [x, 14], zt, P);
        for (let y = -7.5; y < 15; y += 7.5) g += k.lineOnTop([x0 + 1, y], [x0 + 19, y], zt, P);
        s += L(g, { tone: "faint" });
        if (i < 2) s += S(k.slabOf({ x: sgn > 0 ? x0 + 20 : x0 - 2, y: -4, w: 2, d: 8, r: 0.6 }, 14.8, 1.4, P, 2), { tone: "mid", crease: "none" });
      }
      return s;
    };
    let s = wing(-1);
    for (const [x, y] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) s += S(k.cylinder(x, y, 2.4, -5, 5, P, 18, 0.2), { tone: "mid", crease: "none" });
    const BUS: Plan = { x: -14, y: -14, w: 28, d: 28, r: 3 };
    s += S(k.slabOf(BUS, 0, 30, P, 4, 1.2), { tone: "hi", crease: "lo", inner: L(k.sideSeam(BUS, 8, P, 4) + k.sideSeam(BUS, 24, P, 4), { tone: "faint" }) });
    s += L(k.planOutline(k.insetPlan(BUS, 3.5), 30, P, 4), { tone: "faint" });
    s += L([12, 14.5, 17].map((z) => k.segment([14.05, -9, z], [14.05, -2, z], P)).join(""), { tone: "lo" });
    s += lying([5, 16, 16], 3.4, 4, "y", P, { tone: "hi", hub: 0.5 });
    // dish
    s += S(k.cylinder(0, 0, 2.2, 30, 7, P, 20, 0.2), { tone: "mid", crease: "none" });
    s += S(k.cylinder(0, 0, 14, 37, 2.6, P, 56, 0.8), { tone: "hi", crease: "lo" });
    s += L(k.ring(0, 0, 10, 39.6, P, 48) + k.ring(0, 0, 6, 39.6, P, 40), { tone: "faint" });
    const feed: Point3 = [0, 0, 49];
    s += L([0, 2.1, 4.2].map((a) => k.segment([14 * Math.cos(a), 14 * Math.sin(a), 39.6], feed, P)).join(""), { tone: "mid" });
    s += S(k.cylinder(0, 0, 2, 47.5, 3, P, 20, 0.2), { tone: "hi", crease: "none", lit: true });
    s += wing(1);
    return s;
  },
};

const DEVICES = [earbuds, watch, glasses, phone, drone, car, robot, satellite];

// ---------- slide 2: the 20-watt bench ----------
// A lamp on an instrument bench, wired to a wattmeter whose needle sits low on the dial.
const BW = 900, BH = 520;
const PLATE: Plan = { x: -96, y: -54, w: 192, d: 108, r: 9 };
const LAMP: Plane = [-38, -6], METER: Plan = { x: 22, y: -30, w: 58, d: 46, r: 5 };

/** A surface of revolution about a vertical axis: profile is [z, r] pairs. Returns its silhouette and rings. */
function lathe(cx: number, cy: number, profile: [number, number][], P: Projection, steps = 56) {
  const rings = profile.map(([z, r]) => Array.from({ length: steps }, (_, i) => { const a = (i / steps) * Math.PI * 2; return at([cx + r * Math.cos(a), cy + r * Math.sin(a), z], P); }));
  return { outline: k.pathOf(hull(rings.flat()), true), rings };
}

function plate(P: Projection) {
  const h = 8, foot = 4, z0 = -h - foot;
  let s = "";
  for (const [x, y] of k.corners(PLATE, 16).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) {
    s += S(k.cylinder(x, y, 6.5, z0, 1.4, P, 24), { tone: "lo" });
    s += S(k.cylinder(x, y, 5, z0 + 1.4, foot - 1.4, P, 24), { tone: "mid", crease: "none" });
  }
  s += S(k.slabOf(PLATE, -h, h, P, 8, 1.4), { tone: "mid" });
  s += L(k.planOutline(k.insetPlan(PLATE, 4.5), 0, P), { tone: "faint" });
  const screws = k.corners(PLATE, 7);
  s += L(screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" });
  s += k.dotsSvg(k.pointsAt(screws.map(([x, y]) => [x, y, 0] as Point3), P), { size: 0.55 });
  // a label plate on the front edge
  const lab: Plan = { x: -70, y: 34, w: 52, d: 11, r: 1.5 };
  s += S(k.slabOf(lab, 0, 0.8, P, 4), { tone: "lo" });
  s += L([0.62, 0.38].map((len, i) => k.lineOnTop([lab.x + 6, lab.y + 3.6 + i * 3.8], [lab.x + 6 + (lab.w - 12) * len, lab.y + 3.6 + i * 3.8], 0.8, P)).join(""), { tone: "lo" });
  s += dots([[lab.x + 2.8, lab.y + lab.d / 2, 0.8], [lab.x + lab.w - 2.8, lab.y + lab.d / 2, 0.8]], P, 0.45);
  return s;
}

function post(x: number, y: number, z: number, P: Projection) {
  let s = S(k.cylinder(x, y, 3.4, z, 1.2, P, 6), { tone: "lo" });
  s += S(k.cylinder(x, y, 1.4, z + 1.2, 3, P, 14), { tone: "mid", crease: "none" });
  s += S(k.cylinder(x, y, 2.6, z + 4.2, 3.2, P, 20, 0.3), { tone: "hi", crease: "lo" });
  s += L(k.knurl(x, y, 2.6, z + 4.2, z + 7.4, 16, P), { tone: "lo" });
  return s;
}

function lamp(P: Projection) {
  const [cx, cy] = LAMP;
  let s = "";
  // socket: a collar, a knurled body and the brass-like screw base with its threads
  s += S(k.cylinder(cx, cy, 17, 0, 3, P, 56, 0.5), { tone: "mid", crease: "faint" });
  s += S(k.cylinder(cx, cy, 13, 3, 13, P, 56, 0.8), { tone: "hi", crease: "lo", inner: L(k.sideArc(cx, cy, 13, 7, P, 40), { tone: "faint" }) });
  s += L(k.knurl(cx, cy, 13, 9, 15.4, 44, P, 0.6), { tone: "faint" });
  s += S(k.cylinder(cx, cy, 9.6, 16, 11, P, 48, 0.4), { tone: "mid", crease: "lo" });
  s += L([18, 20.4, 22.8, 25.2].map((z) => k.sideArc(cx, cy, 9.6, z, P, 32)).join(""), { tone: "lo" });
  // glass: a sphere on a short neck
  const R = 21, zc = 50;
  const prof: [number, number][] = [[27, 9.2], [30, 9.6]];
  for (let z = 33; z <= zc + R; z += 1.5) prof.push([z, Math.sqrt(Math.max(0, R * R - (z - zc) ** 2))]);
  const g = lathe(cx, cy, prof, P);
  const [fx, fy] = at([cx, cy, 47], P), kk = Math.hypot(...k.axisVector(P, [1, 0, 0]));
  s += `<defs><radialGradient id="bulbGlow"><stop offset="0" stop-color="var(--hot)" stop-opacity=".42"/><stop offset=".45" stop-color="var(--hot)" stop-opacity=".14"/><stop offset="1" stop-color="var(--hot)" stop-opacity="0"/></radialGradient></defs>`;
  s += `<path class="bulbglass" d="${g.outline}"/>`;
  s += `<circle cx="${r1(fx)}" cy="${r1(fy)}" r="${r1(R * 1.25 * kk)}" fill="url(#bulbGlow)"/>`;
  // inside: the glass stem, two lead wires and the coiled filament
  s += S(k.cylinder(cx, cy, 3.6, 27, 9, P, 24, 0.3), { tone: "lo", crease: "none" });
  s += L(k.pathOf([at([cx - 1.6, cy, 36], P), at([cx - 6, cy, 47], P)]) + k.pathOf([at([cx + 1.6, cy, 36], P), at([cx + 6, cy, 47], P)]), { tone: "mid" });
  const coil = k.coil(cx - 6, cx + 6, [cy, 47], 1.5, 8, "x", P, 14);
  s += L(coil.back, { tone: "lit" }) + L(coil.front, { tone: "lit", className: "thick" });
  // the glass outline and a soft highlight
  s += L(g.outline, { tone: "mid" });
  const [sx, sy] = at([cx, cy, zc], P), hr = R * 0.74 * kk;
  const arc = Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (1.08 + i * 0.026); return [sx + hr * Math.cos(a), sy + hr * Math.sin(a)] as Flat; });
  s += L(k.pathOf(arc), { tone: "lo" });
  return s;
}

function meter(P: Projection) {
  const m = METER, top = 18;
  let s = S(k.slabOf(m, 0, top, P, 6, 1.2), { tone: "hi", crease: "lo", inner: L(k.sideSeam(m, 13, P, 6), { tone: "faint" }) });
  s += L(k.planOutline(k.insetPlan(m, 3.5), top, P, 4), { tone: "faint" });
  // the dial: a raised disc with ticks, and the needle resting low
  const dx = m.x + 32, dy = m.y + 20, from = -2.3, span = 4.6;
  s += S(k.cylinder(dx, dy, 17, top, 0.8, P, 48, 0.2), { tone: "lo", crease: "none" });
  const t = k.radialTicks(dx, dy, 15.5, 20, 5, top + 0.8, [1.6, 3.4], P, from, span);
  s += L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" });
  s += L(k.onTop(Array.from({ length: 41 }, (_, i) => { const a = from + (span * i) / 40; return [dx + 11.6 * Math.sin(a), dy - 11.6 * Math.cos(a)] as Plane; }), top + 0.8, P), { tone: "faint" });
  const a = from + span * 0.2;
  s += L(k.lineOnTop([dx, dy], [dx + 13 * Math.sin(a), dy - 13 * Math.cos(a)], top + 1.2, P), { tone: "lit", className: "thick" });
  s += S(k.cylinder(dx, dy, 1.8, top + 0.8, 1, P, 16), { tone: "hi", crease: "none" });
  // terminals on the front of the lid
  s += post(m.x + 8, m.y + 12, top, P) + post(m.x + 8, m.y + 30, top, P);
  return s;
}

function bench(P: Projection) {
  let s = plate(P);
  // two leads from the lamp's socket to the meter's terminals, lying on the bench
  const [lx, ly] = LAMP;
  const lead = (dy: number, tx: number, ty: number) => k.onTop([[lx + 16, ly + dy], [lx + 30, ly + dy * 1.6], [tx - 18, ty + 6], [tx - 9, ty + 2]], 0.6, P);
  s += L(lead(-3, METER.x + 8, METER.y + 12), { tone: "mid" }) + L(lead(4, METER.x + 8, METER.y + 30), { tone: "mid" });
  s += k.lineSvg(k.segment([METER.x + 8 - 9, METER.y + 14, 0.6], [METER.x + 8, METER.y + 12, 24], P) + k.segment([METER.x + 8 - 9, METER.y + 32, 0.6], [METER.x + 8, METER.y + 30, 24], P), { tone: "mid" });
  s += lamp(P) + meter(P);
  return s;
}

const BENCH_P = k.fitProjection([...k.boxCorners(PLATE, -12, 0), [LAMP[0], LAMP[1], 74], [LAMP[0] - 22, LAMP[1], 50], [LAMP[0], LAMP[1] - 22, 50]], BW, BH, { pad: 12, azimuth: AZ });
const FIG2 = `<!--fig2--><div class="isofig u" style="--c:1/8;--r:2;align-self:end;--i:2"><svg class="iso-svg" viewBox="0 0 ${BW} ${BH}" role="img" aria-label="A light bulb glowing on an instrument bench, wired to a wattmeter whose needle rests low on its dial">${bench(BENCH_P)}</svg></div><!--/fig2-->`;

// ---------- page ----------
function card(dev: Device, i: number) {
  const P = k.fitProjection(dev.bounds, W, H, { pad: dev.pad ?? 8, azimuth: AZ });
  const id = `dv${i}`;
  return `<figure class="bx u" style="--i:${i + 2}"><figcaption><p class="t">${dev.name}</p><p class="s">${dev.line}</p></figcaption>`
    + `<svg class="iso-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${dev.label}">${dev.draw(P, id)}</svg></figure>`;
}

// The top bar matches the one on every other slide (see the "top bar" styles in the deck).
const BAR = `<header class="tbar" aria-hidden="true"><svg class="tbm" viewBox="0 0 19 20" aria-hidden="true"><rect width="19" height="5.7" rx="2.85"/><rect x="6.7" y="7.15" width="5.6" height="5.7" rx="2.8"/><rect x="6.7" y="14.3" width="5.6" height="5.7" rx="2.8"/></svg><span class="tbn">Telepath</span><span class="tbt">The vision</span><span class="tbc">Private &amp; Confidential</span><span class="tbf">10</span></header>`;
const SLIDE = `<section class="pg sl" data-title="The vision" aria-label="Slide 10: Telepath on eight devices, from earbuds, watch, glasses and phone to drone, car, robot and satellite">${BAR}<div class="in">`
  + `<div class="hd" style="--c:1/8;--r:1"><h2>From the data center <em>to every device.</em></h2></div>`
  + `<p class="l" style="--c:8/13;--r:1;align-self:end">Small enough to run on a phone, an earbud or a robot, and to keep learning there from the person using it.</p>`
  + `<div class="bento" style="--r:2">${DEVICES.map(card).join("")}</div>`
  + `</div><div class="dfolio">10</div></section>`;

const CSS = `/* devices:start */
.bento{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:0;min-height:0;border-top:1px solid var(--rule)}
.bento,.isofig{
 --anatomy-paper:#fffcf8;--anatomy-face:#fff;--anatomy-top:#fffdfa;--anatomy-shade-0:#e3d9cf;--anatomy-shade-1:#ebe2d9;--anatomy-shade-2:#f2eae2;--anatomy-shade-3:#f8f2ec;
 --anatomy-lit-top:#fff3e6;--anatomy-lit-shade:#ffe0c2;--anatomy-hi:#6f6157;--anatomy-mid:#93857a;--anatomy-lo:#bfb2a7;--anatomy-faint:#ddd2c8;--anatomy-lit:var(--hot);
 --anatomy-dot:#3a2e26;--anatomy-weight:.75px}
.bx{position:relative;min-height:0;border-bottom:1px solid var(--rule);border-right:1px solid var(--rule)}
.bx:nth-child(4n){border-right:0}
.bx figcaption{position:absolute;left:32px;right:24px;bottom:24px;display:flex;flex-direction:column;gap:2px;z-index:1}
.bx figcaption .t{line-height:1.15}
.bx figcaption .s{white-space:nowrap}
.bx .iso-svg{position:absolute;left:16px;top:12px;width:calc(100% - 32px);height:calc(100% - 100px);overflow:visible}
.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}
.iso-fill{fill:var(--anatomy-paper);stroke:none}
.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}
.iso-shade,.iso-top{stroke:none}
.iso-shade[data-shade="0"]{fill:var(--anatomy-shade-0)}.iso-shade[data-shade="1"]{fill:var(--anatomy-shade-1)}
.iso-shade[data-shade="2"]{fill:var(--anatomy-shade-2)}.iso-shade[data-shade="3"]{fill:var(--anatomy-shade-3)}
.iso-top{fill:var(--anatomy-top)}
.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}
.iso-solid[data-lit]>.iso-edge,.iso-solid[data-lit]>.iso-line{stroke:var(--anatomy-lit)}
.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}
.iso-line[data-tone="hi"]{stroke:var(--anatomy-hi)}.iso-line[data-tone="mid"]{stroke:var(--anatomy-mid)}
.iso-line[data-tone="lo"]{stroke:var(--anatomy-lo)}.iso-line[data-tone="faint"]{stroke:var(--anatomy-faint)}
.iso-line[data-tone="lit"]{stroke:var(--anatomy-lit)}
.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1.2}
.iso-line[data-dashed]{stroke-dasharray:6 6}
.iso-line.thick{stroke-width:2.2}
.iso-line.onink{stroke:#4a3d33}
.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}
.iso-dots[data-tone="hi"] circle{opacity:.85}.iso-dots[data-tone="mid"] circle{opacity:.45}
.iso-dots[data-tone="lo"] circle{opacity:.22}.iso-dots[data-tone="faint"] circle{opacity:.5;fill:#8a7a6f}
.bx .inkf{fill:#2a211b;stroke:none}
.bx .litf,.isofig .litf{fill:var(--anatomy-lit);stroke:none}
.isofig{min-height:0;display:flex;align-items:flex-end}
.isofig .iso-svg{display:block;width:100%;height:auto;max-height:100%;overflow:visible}
.isofig .bulbglass{fill:#fffcf8;fill-opacity:.6;stroke:none}
.bx .bub{fill:var(--anatomy-shade-1);stroke:none}
.bx .glass{fill:#efe6dd;stroke:none}
.bx .glass2{fill:var(--anatomy-shade-1);stroke:none}
/* devices:end */`;

const preview = process.argv.indexOf("--preview");
if (preview > 0) {
  const page = `<!doctype html><meta charset="utf-8"><style>:root{--hot:#E8693A;--paper:#FAF9F6}body{margin:0;background:#FAF9F6;font:20px Geist,system-ui,sans-serif}
${CSS}
.bento{display:block}.bx{width:780px;height:470px;margin:0 auto}.bx .iso-svg{height:calc(100% - 100px)}figcaption .t{font-size:28px}figcaption .s{color:#8A7A6F}p{margin:0}</style>
<div class="bento">${DEVICES.map(card).join("")}</div><div class="isofig" style="width:900px;margin:40px auto">${FIG2}</div>`;
  writeFileSync(process.argv[preview + 1], page);
  console.log("preview written");
  process.exit(0);
}

let html = readFileSync(DECK, "utf8");
const slide = /<section class="pg sl ?"(?: data-title="[^"]*")? aria-label="Slide 10:[\s\S]*?<\/section>/;
if (!slide.test(html)) throw new Error("slide 10 not found");
html = html.replace(slide, SLIDE);
html = html.replace(".reach{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}\n", "").replace(".fig .tx.nm2{font-size:28px;letter-spacing:-.01em}\n", "");
const block = /\/\* devices:start \*\/[\s\S]*?\/\* devices:end \*\//;
html = block.test(html) ? html.replace(block, CSS) : html.replace(/\n<\/style>\s*\n<main class="deck">/, (m) => `\n${CSS}${m}`);
if (!html.includes("/* devices:start */")) throw new Error("could not place the device styles");
const two = /(<section class="pg sl ?"(?: data-title="[^"]*")? aria-label="Slide 2">[\s\S]*?)(?:<!--fig2-->[\s\S]*?<!--\/fig2-->)?(<\/div><div class="dfolio">02<\/div><\/section>)/;
if (!two.test(html)) throw new Error("slide 2 not found");
html = html.replace(two, (_, head, tail) => head + FIG2 + tail);
writeFileSync(DECK, html);
console.log(`slide 10: ${DEVICES.length} devices, ${(SLIDE.length / 1024).toFixed(0)} KB`);
