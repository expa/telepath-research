// node --experimental-strip-types lib/gain.check.mjs  — the gain pins the edge; ORGaNICs settle on the normalization fixed point
import { C_CRIT, edgeOf, gainStar, governorStep, organicsStep, settled } from "./gain.ts";
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
console.log("gain ok");
