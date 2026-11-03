// A 36-neuron ORGaNICs ring (Heeger & Mackey 2019, Eq. 1), solved in the eigenbasis of its recurrent weights.
//   τy ẏ = −y + (b/(1+b)) z + (1/(1+a)) ŷ,   ŷ = W y + r D y
// W is the circulant projection onto the 19 lowest spatial frequencies (k = 0..9): 19 eigenvalues equal 1,
// the rest 0, exactly the sustained-activity circuit in the paper. D is the derivative-like recurrent matrix
// (eigenvalue i·k on mode k): turned on by the modulator r, it moves the stored pattern round the ring.

export const N = 36;
export const K = 9;
export const TAU_Y = 0.01; // s
const TAU_MOD = 0.03;

export interface Mods { a: number; b: number; r: number }
export interface Ring { re: Float64Array; im: Float64Array; mods: Mods; target: Mods }

export const makeRing = (): Ring => ({ re: new Float64Array(K + 1), im: new Float64Array(K + 1), mods: { a: 1, b: 0, r: 0 }, target: { a: 1, b: 0, r: 0 } });

const WIDTH = 0.35; // bump width (rad) of a neuron's response field

/** Fourier coefficients of the input drive for targets at these angles (radians). */
export function driveOf(targets: number[]) {
  const re = new Float64Array(K + 1), im = new Float64Array(K + 1);
  for (let k = 0; k <= K; k++) {
    const g = Math.exp(-0.5 * (k * WIDTH) ** 2);
    for (const t of targets) {
      re[k] += g * Math.cos(k * t);
      im[k] -= g * Math.sin(k * t);
    }
  }
  return { re, im };
}

/** One Euler step of dt seconds. `drive` is from driveOf. */
export function step(s: Ring, drive: { re: Float64Array; im: Float64Array }, dt: number) {
  const m = s.mods, t = s.target;
  const e = 1 - Math.exp(-dt / TAU_MOD);
  m.a += (t.a - m.a) * e;
  m.b += (t.b - m.b) * e;
  m.r += (t.r - m.r) * e;
  const gb = m.b / (1 + m.b), ga = 1 / (1 + m.a);
  const h = dt / TAU_Y;
  for (let k = 0; k <= K; k++) {
    const re = s.re[k], im = s.im[k];
    // ŷ_k = (1 + i k r) y_k
    const yr = re + k * m.r * im, yi = im - k * m.r * re;
    s.re[k] = re + h * (-re + gb * drive.re[k] + ga * yr);
    s.im[k] = im + h * (-im + gb * drive.im[k] + ga * yi);
  }
}

/** Neuron responses y_j, j = 0..N−1. */
export function responses(s: Ring, out = new Float64Array(N)) {
  for (let j = 0; j < N; j++) {
    const th = (j / N) * Math.PI * 2;
    let v = s.re[0];
    for (let k = 1; k <= K; k++) v += 2 * (s.re[k] * Math.cos(k * th) - s.im[k] * Math.sin(k * th));
    out[j] = v / 0.9;
  }
  return out;
}

/** Decoded location of the strongest stored item (radians) and its strength. */
export function decode(y: Float64Array) {
  let best = 0;
  for (let j = 1; j < N; j++) if (y[j] > y[best]) best = j;
  return { angle: (best / N) * Math.PI * 2, strength: y[best] };
}

export type Phase = "rest" | "present" | "hold" | "shift" | "clear";
export const PHASES: Record<Phase, Mods> = {
  rest: { a: 1, b: 0, r: 0 },
  present: { a: 1, b: 1, r: 0 },
  hold: { a: 0, b: 0, r: 0 },
  shift: { a: 0, b: 0, r: 0.02 },
  clear: { a: 6, b: 0, r: 0 },
};
