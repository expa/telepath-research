// node --experimental-strip-types lib/rqf.check.mjs  — smallest check that the math is the paper's
import { gain, impulse, cascadeStep, qOf } from "./rqf.ts";
const f = { tau: 1, omega: 0.65, gamma: 0.1 };
const w0 = 0.9 * 0.65;
console.assert(Math.abs(gain(f, w0) - 1) < 1e-12, "unit peak gain at ω0");
console.assert(Math.abs(impulse(f, 0)[0] - 0.1) < 1e-12, "y(0+) = α");
console.assert(Math.abs(Math.hypot(...impulse(f, 10)) - 0.1 / Math.E) < 1e-12, "|y| = α/e at τ0 = τ/γ");
// prospective leaky cascade reproduces its input exactly once started at rest on it
const ys = [0, 0, 0], prev = [0, 0, 0];
let worst = 0;
for (let n = 1; n < 2000; n++) { const x = Math.sin(n * 0.01 * 2 * Math.PI * 3); cascadeStep(ys, prev, x, 0.01, 0.05, true); worst = Math.max(worst, Math.abs(ys[2] - x)); }
console.assert(worst < 1e-9, "prospective cascade has no lag");
console.assert(qOf(f) > 2, "γ=0.1 is a sharp resonance");
console.log("rqf ok");
