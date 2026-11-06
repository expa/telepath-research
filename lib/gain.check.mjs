// node --experimental-strip-types lib/gain.check.mjs  — the gain pins the edge; ORGaNICs settle on the normalization fixed point
import { C_CRIT, edgeOf, gainStar, governorStep, organicsStep, pairStep, settled } from "./gain.ts";
for (const c of [1, 1.5, 2.5]) {
  const s = { y: 0.05, a: 0.1 };
  for (let i = 0; i < 400000; i++) governorStep(s, c, 0.001);
  console.assert(Math.abs(edgeOf(c, s.a) - 1) < 1e-3, `top eigenvalue pinned at 1 for c=${c}`);
  console.assert(Math.abs(s.a - gainStar(c)) < 1e-3, `a → a* for c=${c}`);
}
console.assert(edgeOf(0.5, gainStar(0.5)) < 1 && C_CRIT > 0.78 && C_CRIT < 0.79, "below threshold the network stays under the edge");
for (const c of [0.05, 1, 3]) {
  const z = [1, 0.6, -0.4, 0.8, -1].map((p) => p * c), y = z.map(() => 0.7), a = z.map(() => 0.04);
  for (let i = 0; i < 40000; i++) organicsStep(y, a, z, 0.002);
  const ys = settled(z);
  console.assert(y.every((v, j) => Math.abs(v - ys[j]) < 1e-4), `ORGaNICs settle on y_s for c=${c}`);
}
// with any recurrence the normalized neuron settles; the plain one runs away past w_r = 1
for (const wr of [0.5, 1.2, 2, 2.5]) {
  const s = { plain: 0, y: 0, a: 0.04 }, tail = [];
  for (let i = 0; i < 6000; i++) { pairStep(s, wr, 0.5, 0.01); if (i >= 5000) tail.push(s.y); }
  console.assert(Math.max(...tail) - Math.min(...tail) < 0.02 && Math.abs(s.y) < 1.2, `ORGaNICs settle at w_r=${wr}`);
  console.assert(wr > 1 ? Math.abs(s.plain) > 1e3 : Math.abs(s.plain) < 2, `plain at w_r=${wr}`);
}
console.log("gain ok");
