// Draws the deck's isometric figures, in the anatomy style of the site's figures:
// slide 10's 2×4 grid of devices, slide 2's 20-watt bench (a lamp wired to a wattmeter)
// the drawings above the columns of slides 9, 28 and 31, and slide 29's voice-to-every-device scene.
// It also lays out slide 3's flat grid of 2,000 houses.
// Usage: `node scripts/deck-devices.ts` rewrites them, and their styles, inside public/deck/index.html.
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
  draw(P, id) {
    const zr = 0;
    let s = "";
    if (id !== "bare") { // "bare" draws the car without its stretch of road
      s += S(k.slabOf({ x: -70, y: -38, w: 140, d: 76, r: 6 }, -2.4, 2.4, P, 6), { tone: "lo", crease: "none" });
      s += L(k.lineOnTop([-64, -30], [64, -30], zr, P), { tone: "mid", dashed: true });
      s += L(k.lineOnTop([-64, 33], [64, 33], zr, P), { tone: "faint" });
    }
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

function plate(P: Projection, base: Plan = PLATE, lab: Plan = { x: -70, y: 34, w: 52, d: 11, r: 1.5 }) {
  const h = 8, foot = 4, z0 = -h - foot;
  let s = "";
  for (const [x, y] of k.corners(base, 16).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) {
    s += S(k.cylinder(x, y, 6.5, z0, 1.4, P, 24), { tone: "lo" });
    s += S(k.cylinder(x, y, 5, z0 + 1.4, foot - 1.4, P, 24), { tone: "mid", crease: "none" });
  }
  s += S(k.slabOf(base, -h, h, P, 8, 1.4), { tone: "mid" });
  s += L(k.planOutline(k.insetPlan(base, 4.5), 0, P), { tone: "faint" });
  const screws = k.corners(base, 7);
  s += L(screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" });
  s += k.dotsSvg(k.pointsAt(screws.map(([x, y]) => [x, y, 0] as Point3), P), { size: 0.55 });
  // a label plate on the front edge
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

// ---------- slide 9: four places it learns ----------
// One drawing above each column, in the slide 10 style: a robot arm, a desk microphone, a laptop agent and the satellite.
const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const unit3 = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** A rounded bar from a to b, w wide (along y) and t thick. */
function link(a: V3, b: V3, w: number, t: number, P: Projection, tone: k.Tone = "hi") {
  const n = unit3(sub3(b, a)), u: V3 = [0, 1, 0], v = unit3(cross3(n, u));
  return prism(k.roundedPlan({ x: -w / 2, y: -t / 2, w, d: t, r: Math.min(w, t) / 2.4 }, 5), a, u, v, n, Math.hypot(...sub3(b, a)), P, { tone, crease: "lo" });
}

const arm: Device = {
  name: "Robotics", line: "", label: "A robot arm lowering its gripper towards a dish, a camera lit on its wrist",
  bounds: [[-22, -22, 0], [22, 22, 0], [-22, 22, 0], [62, -16, 0], [62, 16, 0], [26, 0, 66], [-22, 0, 30]],
  draw(P) {
    const SH: V3 = [0, 0, 24], EL: V3 = [24, 0, 58], WR: V3 = [48, 0, 40], DX = 50;
    let s = "";
    // the dish waiting below
    s += S(k.cylinder(DX, 0, 13, 0, 1.6, P, 48, 0.4), { tone: "hi", crease: "lo" });
    s += L(k.ring(DX, 0, 8.5, 1.6, P, 40), { tone: "lo" });
    s += S(k.cylinder(DX - 2, 1, 9, 1.6, 1.2, P, 40, 0.3), { tone: "mid", crease: "faint" });
    // base and turret
    s += S(k.cylinder(0, 0, 20, 0, 4, P, 56, 0.6), { tone: "mid", crease: "faint" });
    s += L(k.knurl(0, 0, 20, 0, 4, 64, P, 0.8), { tone: "faint" });
    s += S(k.cylinder(0, 0, 13, 4, 12, P, 48, 0.8), { tone: "hi", crease: "lo", inner: L(k.sideArc(0, 0, 13, 10, P, 32), { tone: "faint" }) });
    // links, then the joints over their ends
    s += link(SH, EL, 9, 7.5, P) + lying(SH, 8.5, 15, "y", P, { tone: "hi", hub: 0.45 });
    s += link(EL, WR, 7.5, 6.5, P) + lying(EL, 6.2, 12, "y", P, { tone: "hi", hub: 0.45 });
    for (const y of [-2.6, 2.6]) s += S(k.slabOf({ x: WR[0] - 1.4, y: y - 1, w: 2.8, d: 2, r: 0.8 }, WR[2] - 13, 9, P, 2), { tone: "hi", crease: "none" });
    s += S(k.cylinder(WR[0], WR[1], 4.6, WR[2] - 6, 4, P, 28, 0.4), { tone: "mid", crease: "faint" });
    s += lying(WR, 4.6, 9, "y", P, { tone: "hi" });
    s += L(k.sideRing([WR[0], WR[1] + 4.55, WR[2]], 2.6, "y", P, 24), { tone: "lit" }) + `<path class="litf" d="${k.sideRing([WR[0], WR[1] + 4.6, WR[2]], 1.3, "y", P, 20)}"/>`;
    return s;
  },
};

const mic: Device = {
  name: "Speech", line: "", label: "A desk microphone, rings of sound spreading across the desk around it",
  bounds: [[-40, -40, 0], [40, 40, 0], [-40, 40, 0], [40, -40, 0], [0, 0, 66]],
  draw(P) {
    let s = "";
    for (const [i, r] of [24, 31, 38].entries()) s += L(arcTop(0, 0, r, -0.35, 1.9, 0, P), { tone: "lit", dotted: true, className: `w${i}` });
    s += S(k.cylinder(0, 0, 17, 0, 3.4, P, 56, 0.8), { tone: "hi", crease: "lo" });
    s += S(k.cylinder(0, 0, 13, 3.4, 1.2, P, 48, 0.3), { tone: "mid", crease: "faint" });
    s += S(k.cylinder(0, 0, 2, 4.6, 22, P, 20, 0.2), { tone: "mid", crease: "none" });
    s += S(k.cylinder(0, 0, 5.6, 25, 4, P, 32, 0.4), { tone: "hi", crease: "lo" });
    // the capsule: a body, a grille band and a domed top
    // the grille is drawn inside the capsule, before its outline, so the side edges stay crisp
    const grille = L([37, 39.5, 42, 44.5, 47, 49.5].map((z) => k.sideArc(0, 0, 9, z, P, 36)).join("") + k.knurl(0, 0, 9, 35, 52, 40, P, 0.6), { tone: "faint" });
    s += S(k.cylinder(0, 0, 9, 29, 24, P, 48, 0.6), { tone: "hi", crease: "lo", inner: grille });
    const prof: [number, number][] = [];
    for (let a = 0; a <= 90; a += 6) prof.push([53 + 9 * Math.sin((a * Math.PI) / 180), 9 * Math.cos((a * Math.PI) / 180)]);
    const dome = lathe(0, 0, prof, P, 48);
    s += `<path class="iso-fill" d="${dome.outline}"/><path class="iso-top" d="${dome.outline}"/>` + L(dome.outline, { tone: "hi" });
    s += L(k.ring(0, 0, 9, 53, P, 48), { tone: "lo" });
    s += `<path class="litf" d="${k.sideRing([0, 9.05, 31.5], 1.1, "y", P, 16)}"/>`;
    return s;
  },
};

const laptop: Device = {
  name: "Agents", line: "", label: "An open laptop showing an agent's task list, the finished tasks ticked and the current one lit",
  bounds: [[-34, -26, 0], [34, -26, 0], [-34, 24, 0], [34, 24, 3], [-34, -34, 42], [34, -34, 42]],
  draw(P) {
    const tilt = 0.24, back = -22, z0 = 3.2;
    const v: V3 = [0, -Math.sin(tilt), Math.cos(tilt)], n: V3 = [0, Math.cos(tilt), Math.sin(tilt)], o: V3 = [0, back, z0];
    const on = (a: number, b: number): Flat => at([o[0] + a, o[1] + b * v[1] + 1.65 * n[1], o[2] + b * v[2] + 1.65 * n[2]], P);
    const seg = (pts: [number, number][]) => k.pathOf(pts.map(([a, b]) => on(a, b)));
    // the lid, its screen and the agent's task list
    let s = prism(k.roundedPlan({ x: -32, y: 0, w: 64, d: 42, r: 3 }, 5), o, [1, 0, 0], v, n, 1.6, P, { tone: "hi", crease: "lo" });
    s += L(k.pathOf(k.roundedPlan({ x: -29, y: 3, w: 58, d: 36.5, r: 1.6 }, 4).map(([a, b]) => on(a, b)), true), { tone: "mid" });
    s += L(seg([[-21, 4], [-21, 38.5]]), { tone: "faint" });
    s += L(seg([[-27, 35], [-24, 35]]) + seg([[-27, 31], [-24, 31]]) + seg([[-27, 27], [-24, 27]]), { tone: "lo" });
    const rows = [33, 26, 19, 12];
    rows.forEach((b, i) => {
      const done = i < 3;
      s += L(k.pathOf(k.roundedPlan({ x: -17, y: b - 1.8, w: 3.6, d: 3.6, r: 0.8 }, 3).map(([a, c]) => on(a, c)), true), { tone: done ? "mid" : "lit" });
      if (done) s += L(seg([[-16.2, b], [-15.3, b - 1], [-13.9, b + 1.1]]), { tone: "mid" });
      s += L(seg([[-10, b + 0.6], [-10 + [26, 18, 22, 20][i], b + 0.6]]), { tone: done ? "lo" : "lit", className: done ? undefined : "thick" });
      s += L(seg([[-10, b - 1.2], [-10 + [14, 20, 10, 12][i], b - 1.2]]), { tone: "faint" });
    });
    // the base with its keyboard and trackpad
    const B: Plan = { x: -32, y: back, w: 64, d: 44, r: 3 };
    s += S(k.slabOf(B, 0, z0, P, 5, 0.6), { tone: "hi", crease: "lo" });
    let keys = "";
    for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) keys += k.planOutline({ x: -27 + c * 4.6, y: back + 4 + r * 4.4, w: 3.8, d: 3.6, r: 0.6 }, z0, P, 2);
    s += L(keys, { tone: "faint" });
    s += L(k.planOutline({ x: -11, y: back + 23, w: 22, d: 14, r: 1.6 }, z0, P, 3), { tone: "lo" });
    return s;
  },
};

const NINE_ITEMS: [Device, string, string][] = [
  [arm, "01", "A home robot that learns your kitchen, your dishes and your dog."],
  [mic, "02", "An assistant that learns how you speak: your accent, your words, the way you pause."],
  [laptop, "03", "An agent that learns your work on the job. You would never hire someone who couldn’t."],
  [{ ...satellite, name: "Satellites" }, "04", "A satellite that learns a changing planet from orbit, without waiting for a new model from the ground."],
];
const NW = 400, NH = 330;
/** A row of columns, each with an iso drawing above its rule and caption, like slide 9's. */
function figCols(marker: string, items: [Device, string, string, string][], pad = 12) {
  return `<!--${marker}--><div class="grp cols dcols" style="--r:2;align-self:end;--n:${items.length}">${items.map(([dev, label, labelClass, text], i) => {
    const P = k.fitProjection(dev.bounds, NW, NH, { pad: dev.pad ?? pad, azimuth: AZ });
    return `<div class="dcol"><svg class="iso-svg u" style="--i:${i + 1}" viewBox="0 0 ${NW} ${NH}" role="img" aria-label="${dev.label}">${dev.draw(P, `${marker}${i}`)}</svg><div class="st rule"><p class="${labelClass}">${label}</p><p class="t">${dev.name}</p><p class="s">${text}</p></div></div>`;
  }).join("")}</div><!--/${marker}-->`;
}
const FIG9 = figCols("fig9", NINE_ITEMS.map(([dev, num, text]) => [dev, num, "s", text] as [Device, string, string, string]));

// ---------- slide 31: three phases ----------
// One drawing above each phase, in the slide 10 style: racks proving it at scale, an edge board, and a frozen model with a learning layer on top.
function rackAt(cx: number, H: number, P: Projection, litAt: number[]) {
  const R: Plan = { x: cx - 18, y: -15, w: 36, d: 30, r: 2 };
  let s = S(k.slabOf(R, 0, H, P, 3, 1), { tone: "hi", crease: "lo" });
  s += L(k.planOutline(k.insetPlan(R, 3), H, P, 3), { tone: "faint" });
  s += L([-8, -4, 0, 4, 8].map((x) => k.lineOnTop([cx + x, -9], [cx + x, 9], H, P)).join(""), { tone: "faint" });
  const yf = R.y + R.d + 0.05, units = Math.floor((H - 4) / 8);
  let seams = "", vents = "";
  for (let n = 0; n < units; n++) {
    const z = 3 + n * 8;
    if (n) seams += k.segment([R.x + 2, yf, z], [R.x + R.w - 2, yf, z], P);
    for (let v = 0; v < 5; v++) vents += k.segment([R.x + 5 + v * 2.2, yf, z + 2.4], [R.x + 5 + v * 2.2, yf, z + 5.6], P);
  }
  s += L(seams, { tone: "lo" }) + L(vents, { tone: "faint" });
  for (let n = 0; n < units; n++) {
    const z = 3 + n * 8 + 4;
    s += litAt.includes(n) ? `<path class="litf" d="${k.sideRing([R.x + R.w - 6, yf, z], 1.1, "y", P, 14)}"/>` : dots([[R.x + R.w - 6, yf, z]], P, 0.8, "mid");
    s += dots([[R.x + R.w - 10, yf, z]], P, 0.7, "lo");
  }
  return s;
}
const racks: Device = {
  name: "Prove it at scale", line: "", label: "Two server racks of stacked units, a few status lights lit orange",
  bounds: [[-60, -16, 0], [60, 16, 0], [-60, 16, 0], [60, -16, 0], [-22, 0, 84], [22, 0, 70]],
  draw(P) { return rackAt(-21, 82, P, [2, 7]) + rackAt(21, 66, P, [1, 5]); },
};

const board: Device = {
  name: "Put it on devices", line: "", label: "A small edge computing board with a chip whose die is lit orange",
  bounds: [[-42, -30, 0], [42, -30, 0], [-42, 30, 0], [42, 30, 0], [0, 0, 12]],
  draw(P) {
    const B: Plan = { x: -40, y: -28, w: 80, d: 56, r: 3 }, z = 2.4;
    let s = S(k.slabOf(B, 0, z, P, 4, 0.4), { tone: "mid", crease: "faint" });
    s += L(k.corners(B, 4).map(([x, y]) => k.ring(x, y, 1.6, z, P, 16)).join(""), { tone: "lo" });
    // traces from the chip out to the parts
    s += L(k.onTop([[14, -4], [24, -4], [28, -12], [34, -12]], z, P) + k.onTop([[14, 4], [22, 4], [26, 12], [34, 12]], z, P) + k.onTop([[-14, 6], [-24, 6], [-28, 18]], z, P) + k.onTop([[4, -14], [4, -22], [10, -24]], z, P), { tone: "faint" });
    // pins along the chip's edges
    let pins = "";
    for (let i = -10; i <= 10; i += 2.5) pins += k.lineOnTop([i, -14], [i, -16.4], z, P) + k.lineOnTop([i, 14], [i, 16.4], z, P) + k.lineOnTop([-14, i], [-16.4, i], z, P) + k.lineOnTop([14, i], [16.4, i], z, P);
    s += L(pins, { tone: "lo" });
    // small parts, a pin header and a port
    for (const [x, y] of [[24, -20], [24, 20], [-26, -20], [30, 0]] as const) s += S(k.slabOf({ x: x - 2.4, y: y - 1.4, w: 4.8, d: 2.8, r: 0.6 }, z, 2, P, 2), { tone: "mid", crease: "none" });
    for (let i = 0; i < 7; i++) s += S(k.cylinder(-30 + i * 4, 22, 1.1, z, 3.2, P, 10), { tone: "mid", crease: "none" });
    s += S(k.slabOf({ x: -42, y: -8, w: 9, d: 16, r: 1 }, z, 5, P, 2, 0.3), { tone: "hi", crease: "lo" });
    // the chip, its die lit
    s += S(k.slabOf({ x: -14, y: -14, w: 28, d: 28, r: 1.5 }, z, 3.4, P, 3, 0.5), { tone: "hi", crease: "lo" });
    s += S(k.slabOf({ x: -6.5, y: -6.5, w: 13, d: 13, r: 1 }, z + 3.4, 0.8, P, 3), { tone: "hi", crease: "none", lit: true });
    s += dots([[-10.5, -10.5, z + 3.4]], P, 0.8, "hi");
    return s;
  },
};

const stack: Device = {
  name: "Bring it to today’s models", line: "", label: "A stack of grey layers, the frozen model, with a thin orange learning layer on top",
  bounds: [[-38, -28, 0], [38, 28, 0], [-38, 28, 0], [38, -28, 0], [0, 0, 44]],
  draw(P) {
    const L0: Plan = { x: -36, y: -26, w: 72, d: 52, r: 3 };
    let s = "";
    for (let n = 0; n < 5; n++) {
      const z = n * 7;
      s += S(k.slabOf(L0, z, 4.4, P, 4, 0.5), { tone: "mid", crease: "faint" });
      let grid = "";
      for (let x = -28; x <= 28; x += 8) grid += k.lineOnTop([x, -22], [x, 22], z + 4.4, P);
      s += L(grid, { tone: "faint" });
      if (n < 4) for (const [x, y] of k.corners(L0, 5)) s += S(k.cylinder(x, y, 1.2, z + 4.4, 2.6, P, 10), { tone: "lo", crease: "none" });
    }
    // the learning layer: thin, lit, set slightly in
    const top = k.insetPlan(L0, 3), zt = 5 * 7 + 1.2;
    for (const [x, y] of k.corners(L0, 5)) s += S(k.cylinder(x, y, 1.2, 4 * 7 + 4.4, zt - (4 * 7 + 4.4), P, 10), { tone: "lo", crease: "none" });
    s += S(k.slabOf(top, zt, 2.2, P, 4, 0.4), { tone: "hi", crease: "none", lit: true });
    s += k.dotsSvg(k.dotGrid(-24, -16, 7, 5, 8, zt + 2.2, P).map(([x, y]) => [x, y] as Flat), { size: 0.9, tone: "hi" }).replace('class="iso-dots"', 'class="iso-dots litdots"');
    return s;
  },
};

const PHASES: [Device, string, string][] = [
  [racks, "Phase 1", "Scale local learning on the speech model, and reach 100% accuracy on new speech, learned live."],
  [board, "Phase 2", "Live learning on phone- and edge-class hardware, and a local-learning decision model."],
  [stack, "Phase 3", "Cambium: continuous learning on top of frozen open-source models, with first design partners."],
];
const FIG31 = figCols("fig31", PHASES.map(([dev, label, text]) => [dev, label, "k", text] as [Device, string, string, string]), 14);

// ---------- slide 28: what zero error makes possible ----------
const implant: Device = {
  name: "Her voice, back", line: "", label: "A brain-computer interface: an implant puck joined by a ribbon cable to a small electrode array, a few electrodes lit orange",
  bounds: [[-36, -24, 0], [40, -24, 0], [-36, 30, 0], [40, 30, 0], [-18, -6, 10], [28, 16, 8]],
  draw(P) {
    const PX = -16, PY = -6, AX = 26, AY = 14;
    // a flat ribbon cable from the puck to the array, in a gentle S
    const path: Plane[] = [];
    for (let t = 0; t <= 1.0001; t += 0.04) {
      const x = PX + 15 + (AX - 10 - PX - 15) * t, y = PY + (AY - PY) * (3 * t * t - 2 * t * t * t);
      path.push([x, y]);
    }
    const edge = (o: number) => path.map(([x, y], i) => {
      const [x2, y2] = path[Math.min(path.length - 1, i + 1)], [x1, y1] = path[Math.max(0, i - 1)];
      const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1;
      return [x - (dy / l) * o, y + (dx / l) * o] as Plane;
    });
    const left = edge(3.2), right = edge(-3.2);
    let s = poly([...left, ...[...right].reverse()].map(([x, y]) => [x, y, 0.6] as Point3), P, "iso-shade", ' data-shade="1"');
    s += L(k.onTop(left, 0.6, P) + k.onTop(right, 0.6, P), { tone: "hi" });
    s += L(k.onTop(edge(1.1), 0.6, P) + k.onTop(edge(-1.1), 0.6, P), { tone: "lo" });
    // the implant puck: a flange, a body and a cap with a coil ring
    s += S(k.cylinder(PX, PY, 17, 0, 2.4, P, 64, 0.5), { tone: "mid", crease: "faint" });
    s += S(k.cylinder(PX, PY, 13.5, 2.4, 5.6, P, 64, 1.4), { tone: "hi", crease: "lo", inner: L(k.sideArc(PX, PY, 13.5, 5, P, 40), { tone: "faint" }) });
    s += L(k.ring(PX, PY, 10, 8, P, 56) + k.ring(PX, PY, 8.4, 8, P, 56), { tone: "faint" });
    s += S(k.cylinder(PX, PY, 4.6, 8, 1, P, 32, 0.2), { tone: "mid", crease: "none" });
    // the electrode array: a small die with a grid of fine pins, a few of them firing
    const A: Plan = { x: AX - 10, y: AY - 10, w: 20, d: 20, r: 1.2 };
    s += S(k.slabOf(A, 0, 2.6, P, 3, 0.4), { tone: "hi", crease: "lo" });
    const lit = new Set(["1,3", "2,2", "3,3", "2,4", "4,1"]);
    const pins: [number, number, boolean][] = [];
    for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) pins.push([A.x + 2.5 + i * 3, A.y + 2.5 + j * 3, lit.has(`${i},${j}`)]);
    pins.sort((p, q) => k.depthOf([p[0], p[1], 0], P) - k.depthOf([q[0], q[1], 0], P));
    for (const [x, y, on] of pins) s += S(k.cylinder(x, y, 0.75, 2.6, 4.6, P, 8), { tone: on ? "hi" : "mid", crease: "none", lit: on });
    for (const [x, y, on] of pins) if (on) s += litDot([x, y, 7.2], P, 1.3);
    return s;
  },
};

const speaker: Device = {
  name: "His words, after a stroke", line: "", label: "A tablet on a stand turning an uneven speech waveform into a clean transcript, beside a calendar with only its first three days marked orange",
  bounds: [[-34, -24, 0], [42, -24, 0], [-34, 14, 0], [42, 14, 0], [-34, -30, 40], [6, -30, 40]],
  draw(P) {
    // the tablet: leaning back on a small stand, its screen facing out
    const tilt = 0.3, back = -10, z0 = 1.6, X0 = -32, TW = 38, TH = 30;
    const v: V3 = [0, -Math.sin(tilt), Math.cos(tilt)], n: V3 = [0, Math.cos(tilt), Math.sin(tilt)], o: V3 = [0, back, z0];
    const on = (a: number, b: number): Flat => at([o[0] + a, o[1] + b * v[1] + 1.45 * n[1], o[2] + b * v[2] + 1.45 * n[2]], P);
    const seg = (pts: [number, number][]) => k.pathOf(pts.map(([a, b]) => on(a, b)));
    let s = S(k.slabOf({ x: X0 + 6, y: back - 12, w: TW - 12, d: 16, r: 2 }, 0, z0, P, 3, 0.3), { tone: "mid", crease: "faint" });
    s += prism(k.roundedPlan({ x: X0 + 10, y: 2, w: TW - 20, d: TH * 0.55, r: 1 }, 3), [0, back - 1.6, z0], [1, 0, 0], v, [0, -Math.cos(tilt), -Math.sin(tilt)], 1.2, P, { tone: "mid", crease: "faint" });
    s += prism(k.roundedPlan({ x: X0, y: 0, w: TW, d: TH, r: 2.4 }, 5), o, [1, 0, 0], v, n, 1.4, P, { tone: "hi", crease: "lo" });
    s += L(k.pathOf(k.roundedPlan({ x: X0 + 2, y: 2, w: TW - 4, d: TH - 4, r: 1.2 }, 4).map(([a, b]) => on(a, b)), true), { tone: "mid" });
    // the changed speech: an uneven waveform...
    const wave: [number, number][] = [];
    for (let i = 0; i <= 60; i++) { const t = i / 60, a = X0 + 5 + t * (TW - 10), amp = (0.6 + 2.6 * Math.abs(Math.sin(t * 7.3 + 1.2)) * (0.5 + 0.5 * Math.sin(t * 2.1))) * Math.sin(t * 61); wave.push([a, 22 + amp]); }
    s += L(seg(wave), { tone: "hi" });
    // ...turned into clean text, one word learned and underlined
    s += L(seg([[X0 + 5, 14], [X0 + 24, 14]]) + seg([[X0 + 5, 10], [X0 + 30, 10]]) + seg([[X0 + 5, 6], [X0 + 17, 6]]), { tone: "lo" });
    s += L(seg([[X0 + 26, 14], [X0 + 33, 14]]), { tone: "lit", className: "thick" }) + L(seg([[X0 + 26, 12.4], [X0 + 33, 12.4]]), { tone: "lit" });
    // the calendar: a month, and only its first three days marked
    const C: Plan = { x: 14, y: -13, w: 26, d: 22, r: 1.6 }, zc = 3.2;
    s += S(k.slabOf(C, 0, zc, P, 3, 0.4), { tone: "hi", crease: "lo", inner: L(k.sideSeam(C, 1.1, P, 3) + k.sideSeam(C, 2.2, P, 3), { tone: "faint" }) });
    for (const x of [18, 24, 30, 36]) s += S(k.cylinder(x, C.y + 1.6, 0.9, zc, 1.6, P, 10), { tone: "mid", crease: "none" });
    s += L(k.lineOnTop([C.x + 2, C.y + 4.4], [C.x + C.w - 2, C.y + 4.4], zc, P), { tone: "lo" });
    let grid = "";
    const cw = 3.1, ch = 3.4;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) {
      const x = C.x + 2.2 + c * (cw + 0.2), y = C.y + 6 + r * (ch + 0.4), day = r * 7 + c;
      if (day < 3) s += poly([[x, y, zc + 0.02], [x + cw, y, zc + 0.02], [x + cw, y + ch, zc + 0.02], [x, y + ch, zc + 0.02]], P, "litf");
      else grid += k.planOutline({ x, y, w: cw, d: ch, r: 0.3 }, zc, P, 1);
    }
    s += L(grid, { tone: "faint" });
    return s;
  },
};

const book: Device = {
  name: "Every child understood", line: "", label: "An open picture book with an orange ribbon bookmark",
  bounds: [[-40, -26, 0], [40, -26, 0], [-40, 26, 0], [40, 26, 0], [0, 0, 8], [0, 38, 0]],
  draw(P) {
    let s = S(k.slabOf({ x: -40, y: -26, w: 80, d: 52, r: 2 }, 0, 1.6, P, 3, 0.3), { tone: "mid", crease: "faint" });
    for (const x0 of [-37, 1]) {
      const pg: Plan = { x: x0, y: -23, w: 36, d: 46, r: 1 };
      s += S(k.slabOf(pg, 1.6, 4, P, 2, 0.2), { tone: "hi", crease: "lo", inner: L(k.sideSeam(pg, 2.6, P, 2) + k.sideSeam(pg, 3.6, P, 2) + k.sideSeam(pg, 4.6, P, 2), { tone: "faint" }) });
      let lines = "";
      for (let r = 0; r < 6; r++) lines += k.lineOnTop([x0 + 4, -14 + r * 6], [x0 + 4 + [28, 24, 27, 18, 26, 21][r], -14 + r * 6], 5.6, P);
      s += L(lines, { tone: "lo" });
      s += L(k.planOutline({ x: x0 + 4, y: -20, w: 14, d: 3.6, r: 0.5 }, 5.6, P, 2), { tone: "mid" });
    }
    s += L(k.lineOnTop([0, -23], [0, 23], 5.6, P), { tone: "mid" });
    // the ribbon lies in the gutter, folds over the page edge and the cover's lip, and ends on the table in a notched tail
    const w = 1.3, fold = ' style="fill:#c9552c"';
    s += poly([[-w, -6, 5.65], [w, -6, 5.65], [w, 23, 5.65], [-w, 23, 5.65]], P, "litf");
    s += poly([[-w, 23.05, 5.65], [w, 23.05, 5.65], [w, 23.05, 1.65], [-w, 23.05, 1.65]], P, "litf", fold);
    s += poly([[-w, 23, 1.65], [w, 23, 1.65], [w, 26, 1.65], [-w, 26, 1.65]], P, "litf");
    s += poly([[-w, 26.05, 1.65], [w, 26.05, 1.65], [w, 26.05, 0], [-w, 26.05, 0]], P, "litf", fold);
    s += poly([[-w, 26, 0], [w, 26, 0], [w, 37, 0], [0, 34.4, 0], [-w, 37, 0]], P, "litf");
    return s;
  },
};

const clipboard: Device = {
  name: "Every word in the room", line: "", label: "A clipboard of notes, one line highlighted in orange",
  bounds: [[-28, -40, 0], [28, -40, 0], [-28, 36, 0], [28, 36, 0], [0, -38, 7]],
  draw(P) {
    let s = S(k.slabOf({ x: -27, y: -35, w: 54, d: 70, r: 3 }, 0, 2, P, 4, 0.4), { tone: "mid", crease: "faint" });
    const paper: Plan = { x: -22, y: -27, w: 44, d: 58, r: 0.6 };
    s += S(k.slabOf(paper, 2, 0.7, P, 2), { tone: "hi", crease: "none" });
    const z = 2.7, lens = [30, 22, 34, 26, 32, 18, 28, 24];
    let lines = "";
    lens.forEach((l, r) => { if (r !== 4) lines += k.lineOnTop([-17, -16 + r * 6], [-17 + l, -16 + r * 6], z, P); });
    s += L(k.lineOnTop([-17, -22], [-2, -22], z, P), { tone: "mid" }) + L(lines, { tone: "lo" });
    s += L(k.planOutline({ x: -19, y: 5.4, w: 36, d: 5.2, r: 1.4 }, z, P, 3), { tone: "lit" }) + L(k.lineOnTop([-17, 8], [15, 8], z, P), { tone: "lit", className: "thick" });
    const clip: Plan = { x: -11, y: -39, w: 22, d: 10, r: 2.5 };
    s += S(k.slabOf(clip, 2, 4.6, P, 4, 0.6), { tone: "hi", crease: "lo" });
    s += L(k.ring(0, -36, 2.2, 6.6, P, 20), { tone: "lo" });
    return s;
  },
};

const FIG28 = figCols("fig28", [
  [implant, "01", "s", "A woman with ALS speaks to her kids through a BCI that never mishears her, and understands her better every week."],
  [speaker, "02", "s", "An assistant that learns a stroke survivor’s changed speech in days, not the months a new model would take."],
  [book, "03", "s", "A reading tutor that understands a four-year-old’s speech, lisp and all, and grows up alongside them."],
  [clipboard, "04", "s", "Clinical notes, cockpits, factory floors: places where a single wrong word matters, and the speaker never changes."],
]);

// ---------- slide 29: the interface to every device ----------
// Voice as the input to everything: the microphone in the middle, linked to a car, a home, glasses and an agent's laptop.
// The implant sits faded above on a fainter line: thought is next. Each piece keeps its own drawing, placed at its own spot.
const house: Device = {
  name: "Home", line: "", label: "A small house",
  bounds: [[-20, -16, 0], [20, 16, 0], [-20, 16, 0], [20, -16, 0], [0, 0, 34]],
  draw(P) {
    const B: Plan = { x: -18, y: -14, w: 36, d: 28, r: 1 }, h = 18, H = 32;
    let s = S(k.slabOf(B, 0, h, P, 2, 0.4), { tone: "hi", crease: "lo" });
    // a gable roof: the far slope, the near slope and the gable end
    const f = (pts: Point3[], cls: string, extra = "") => poly(pts, P, cls, extra);
    s += f([[-20, -16, h], [20, -16, h], [20, 0, H], [-20, 0, H]], "iso-shade", ' data-shade="2"');
    s += f([[-20, 16, h], [20, 16, h], [20, 0, H], [-20, 0, H]], "iso-top");
    s += f([[18, -14, h], [18, 14, h], [18, 0, H - 1.6]], "iso-shade", ' data-shade="0"');
    s += L(k.pathOf(([[-20, 16, h], [20, 16, h], [20, 0, H], [-20, 0, H]] as Point3[]).map((q) => at(q, P)), true) + k.pathOf(([[20, -16, h], [20, 0, H], [20, 16, h]] as Point3[]).map((q) => at(q, P))), { tone: "hi" });
    s += L(k.pathOf(([[18, -14, h], [18, 0, H - 1.6], [18, 14, h]] as Point3[]).map((q) => at(q, P))), { tone: "lo" });
    // a door and two windows on the front, a chimney on the roof
    const yf = B.y + B.d + 0.05;
    s += L(k.pathOf(onFace("y", yf, { x: -3, y: 0, w: 6, d: 10, r: 0.6 }).map((q) => at(q, P)), true), { tone: "mid" });
    s += L(k.pathOf(onFace("y", yf, { x: -14, y: 8, w: 6, d: 5, r: 0.4 }).map((q) => at(q, P)), true) + k.pathOf(onFace("y", yf, { x: 8, y: 8, w: 6, d: 5, r: 0.4 }).map((q) => at(q, P)), true), { tone: "lo" });
    s += S(k.slabOf({ x: 8, y: -8, w: 5, d: 5, r: 0.5 }, H - 9, 9, P, 2), { tone: "hi", crease: "lo" });
    return s;
  },
};

const HW = 400, HH = 300;
function hubScene() {
  // place a device so its drawing fills a w×h box centred on (cx, cy)
  const place = (dev: Device, cx: number, cy: number, w: number, h: number, id: string) => {
    const P = k.fitProjection(dev.bounds, w, h, { pad: 2, azimuth: AZ });
    const Q: Projection = { ...P, origin: [P.origin[0] + cx - w / 2, P.origin[1] + cy - h / 2] };
    return { svg: dev.draw(Q, id), base: at([0, 0, 0], Q) };
  };
  const hub = place({ ...mic, bounds: [[-17, -17, 0], [17, 17, 0], [-17, 17, 0], [17, -17, 0], [0, 0, 64]] }, 200, 160, 70, 118, "hubmic"); // sized to the mic itself; its sound rings spread past
  const spots: [Device, number, number, number, number, string][] = [
    [car, 76, 98, 146, 86, "bare"], [house, 326, 92, 104, 92, "hubhouse"],
    [glasses, 76, 238, 142, 80, "hubglasses"], [laptop, 326, 234, 124, 92, "hublaptop"],
  ];
  const placed = spots.map(([d, x, y, w, h, id]) => place(d, x, y, w, h, id));
  const thought = place(implant, 200, 30, 92, 58, "hubimplant");
  const line = (a: Flat, b: Flat) => k.pathOf([a, b]);
  let s = L(placed.map((p) => line(hub.base, p.base)).join(""), { tone: "lit", dotted: true });
  s += `<g opacity=".45">${L(line(hub.base, thought.base), { tone: "mid", dashed: true })}</g>`;
  s += `<g opacity=".45">${thought.svg}</g>`;
  s += placed.map((p) => p.svg).join("") + hub.svg;
  return s;
}
const FIG29 = `<!--fig29--><div class="isofig hubfig"><svg class="iso-svg" viewBox="0 0 ${HW} ${HH}" role="img" aria-label="A microphone at the centre, linked by dotted lines to a car, a house, glasses and a laptop; a faded brain implant above on a dashed line">${hubScene()}</svg></div><!--/fig29-->`;

// ---------- slide 3: 2,000 homes ----------
// One flat house per US home that a single training run could power for a year, 50 across and 40 down.
const COLS = 50, ROWS = 40, CW = 20, CH = 23.5; // cells a touch taller than wide, so the grid fills its 945×888 slot
// A minimal filled house; its window takes the <use>'s fill, which the slide animates from unlit to lit.
const HOUSE = `<g id="hs"><path class="hbody" d="M2.5 10.2 10 3.6l7.5 6.6v10.6h-15Z"/><path d="M8.2 12.6h3.6v3.6H8.2Z"/></g>`;

/** Each house switches on in a wave from the top-left, with a little jitter so it feels like a grid coming alive. */
function town() {
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let s = `<defs>${HOUSE}</defs>`;
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) s += `<use href="#hs" x="${i * CW}" y="${r1(j * CH)}" style="--d:${Math.round(350 + (i + j) * 24 + rand() * 260)}"/>`;
  }
  return s;
}

const FIG3 = `<!--fig3--><div class="townfig" style="--c:6/13;--r:1/4"><svg viewBox="0 0 ${COLS * CW} ${ROWS * CH}" preserveAspectRatio="xMaxYMid meet" role="img" aria-label="2,000 small houses in a grid of 50 by 40, one for each US home powered for a year">${town()}</svg></div><!--/fig3-->`;

// ---------- page ----------
function card(dev: Device, i: number) {
  const P = k.fitProjection(dev.bounds, W, H, { pad: dev.pad ?? 8, azimuth: AZ });
  const id = `dv${i}`;
  return `<figure class="bx u" style="--i:${i + 2}"><svg class="iso-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${dev.label}">${dev.draw(P, id)}</svg>`
    + `<figcaption><p class="t">${dev.name}</p><p class="s">${dev.line}</p></figcaption></figure>`;
}

// The top bar matches the one on every other slide (see the "top bar" styles in the deck).
const BAR = `<header class="tbar" aria-hidden="true"><svg class="tbm" viewBox="0 0 19 20" aria-hidden="true"><rect width="19" height="5.7" rx="2.85"/><rect x="6.7" y="7.15" width="5.6" height="5.7" rx="2.8"/><rect x="6.7" y="14.3" width="5.6" height="5.7" rx="2.8"/></svg><span class="tbn">Telepath</span><span class="tbt">The vision</span><span class="tbc">Private &amp; Confidential</span><span class="tbf">10</span></header>`;
const SLIDE = `<section class="pg sl" data-title="The vision" aria-label="Slide 10: Telepath on eight devices, from earbuds, watch, glasses and phone to drone, car, robot and satellite">${BAR}<div class="in">`
  + `<div class="hd" style="--c:1/8;--r:1"><h2>From the data center <em>to every device.</em></h2></div>`
  + `<p class="l" style="--c:8/13;--r:1;align-self:end">Small enough to run on a phone, an earbud or a robot, and to keep learning there from the person using it.</p>`
  + `<div class="bento" style="--r:2">${DEVICES.map(card).join("")}</div>`
  + `</div><div class="dfolio">10</div></section>`;

const CSS = `/* devices:start */
/* cells read like slide 9's columns: drawing, then a short top rule, then the caption; space between columns, no grid lines */
.bento{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));column-gap:64px;row-gap:48px;min-height:0}
.bento,.isofig,.dcols{
 --anatomy-paper:#fffcf8;--anatomy-face:#fff;--anatomy-top:#fffdfa;--anatomy-shade-0:#e3d9cf;--anatomy-shade-1:#ebe2d9;--anatomy-shade-2:#f2eae2;--anatomy-shade-3:#f8f2ec;
 --anatomy-lit-top:#fff3e6;--anatomy-lit-shade:#ffe0c2;--anatomy-hi:#6f6157;--anatomy-mid:#93857a;--anatomy-lo:#bfb2a7;--anatomy-faint:#ddd2c8;--anatomy-lit:var(--hot);
 --anatomy-dot:#3a2e26;--anatomy-weight:.75px}
.bx{display:flex;flex-direction:column;gap:24px;min-height:0;min-width:0}
.bx figcaption{border-top:1px solid var(--rule);padding-top:24px;display:flex;flex-direction:column;gap:2px}
.bx figcaption .t{line-height:1.15}
.bx figcaption .s{white-space:nowrap}
.bx .iso-svg{flex:1 1 0;min-height:0;width:100%;overflow:visible}
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
.bx .inkf,.isofig .inkf{fill:#2a211b;stroke:none}
.litf{fill:var(--anatomy-lit);stroke:none} /* unscoped: reused <use> copies can't match a parent selector */
.isofig{min-height:0;display:flex;align-items:flex-end}
.isofig .iso-svg{display:block;width:100%;height:auto;max-height:100%;overflow:visible}
.isofig .bulbglass{fill:#fffcf8;fill-opacity:.6;stroke:none}
.dcol{display:flex;flex-direction:column;gap:40px;min-width:0}
.hubfig{display:block;margin-top:24px;--anatomy-weight:.6px}.hubfig .iso-svg{display:block;width:100%;height:auto;max-height:290px;overflow:visible}
.litdots circle{fill:var(--anatomy-lit);opacity:.9}
.dcol .iso-svg{display:block;width:100%;height:auto;max-height:340px;overflow:visible}
.townfig{min-height:0;display:flex}
.townfig svg{display:block;width:100%;height:100%}
/* unscoped: reused <use> copies can't match a parent selector */
.hbody{fill:#ddd5cd;stroke:#ddd5cd;stroke-width:.8;stroke-linejoin:round}
.townfig use{fill:var(--hot)}
@keyframes power{from{fill:var(--paper)}60%{fill:#ffb183}to{fill:var(--hot)}}
.sl.on .townfig use{animation:power .7s ease both;animation-delay:calc(var(--d)*1ms)}
.bx .bub,.isofig .bub{fill:var(--anatomy-shade-1);stroke:none}
.bx .glass,.isofig .glass{fill:#efe6dd;stroke:none}
.bx .glass2,.isofig .glass2{fill:var(--anatomy-shade-1);stroke:none}
/* devices:end */`;

const preview = process.argv.indexOf("--preview");
if (preview > 0) {
  const page = `<!doctype html><meta charset="utf-8"><style>:root{--hot:#E8693A;--paper:#FAF9F6}body{margin:0;background:#FAF9F6;font:20px Geist,system-ui,sans-serif}
${CSS}
.bento{display:block}.bx{width:780px;height:470px;margin:0 auto}figcaption .t{font-size:28px}figcaption .s{color:#8A7A6F}p{margin:0}</style>
<div class="bento">${DEVICES.map(card).join("")}</div><div class="isofig" style="width:900px;margin:40px auto">${FIG2}</div><div style="width:900px;height:720px;margin:40px auto;--gray:#CFC6BD;--paper:#FAF9F6">${FIG3}</div>`;
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
const three = /<!--fig3-->[\s\S]*?<!--\/fig3-->|<div class="homes"[^>]*>(?:<i[^>]*><\/i>)*<\/div>/;
if (!three.test(html)) throw new Error("slide 3's figure not found");
const nine = /<!--fig9-->[\s\S]*?<!--\/fig9-->|<div class="grp cols" style="--r:2;align-self:end;--n:4"><div class="st rule"><p class="s">01<\/p><p class="t">Robotics<\/p>[\s\S]*?<\/p><\/div><\/div>(?=<\/div><div class="dfolio">09)/;
if (!nine.test(html)) throw new Error("slide 9's columns not found");
html = html.replace(nine, () => FIG9);
const thirtyone = /<!--fig31-->[\s\S]*?<!--\/fig31-->|<div class="grp cols" style="--r:2;align-self:end;--n:3"><div class="st rule"><p class="k">Phase 1<\/p>[\s\S]*?<\/p><\/div><\/div>(?=<p class="ft">Each phase)/;
if (!thirtyone.test(html)) throw new Error("slide 31's columns not found");
html = html.replace(thirtyone, () => FIG31);
const twentyeight = /<!--fig28-->[\s\S]*?<!--\/fig28-->|<div class="grp cols" style="--r:2;align-self:end;--n:4"><div class="st rule"><p class="s">01<\/p><p class="t">Her voice, back<\/p>[\s\S]*?<\/p><\/div><\/div>(?=<p class="ft">Product visions)/;
if (!twentyeight.test(html)) throw new Error("slide 28's columns not found");
html = html.replace(twentyeight, () => FIG28);
const twentynine = /(Whoever gets to zero error owns the input\.<\/p>)(?:<!--fig29-->[\s\S]*?<!--\/fig29-->)?/;
if (!twentynine.test(html)) throw new Error("slide 29's larger-prize column not found");
html = html.replace(twentynine, (_, p) => p + FIG29);
html = html.replace(three, () => FIG3).replace("Each square is one US home for a year.", "Each house is one US home for a year.");
writeFileSync(DECK, html);
console.log(`slide 10: ${DEVICES.length} devices, ${(SLIDE.length / 1024).toFixed(0)} KB`);
