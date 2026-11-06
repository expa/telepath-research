// The two circuits behind the gain-control papers, as written in them.

// ---- Long timescales without fine tuning (McClain, Rawat et al. 2026), Eq. 3 reduced to the top mode ----
// τ = 1. ẏ = −(1 − (1−a)λ) y,  ȧ = −a + σ² + a y²,  λ = √2 c is the top eigenvalue of a GOE matrix of strength c.
export const SIGMA2 = 0.1;
export const C_CRIT = 1 / (Math.SQRT2 * (1 - SIGMA2));
export const topOf = (c: number) => Math.SQRT2 * c;

/** Fixed-point gain a* (Eq. 6): pinned so the effective top eigenvalue (1−a*)λ is exactly 1, for any c above threshold. */
export const gainStar = (c: number) => (c > C_CRIT ? 1 - 1 / topOf(c) : SIGMA2);
export const edgeOf = (c: number, a: number) => (1 - a) * topOf(c);

export interface Governor { y: number; a: number }
/** Explicit Euler on the top mode and the gain. A tiny floor on |y| stands for the noise that starts growth. */
export function governorStep(s: Governor, c: number, dt: number) {
  const L = topOf(c);
  const dy = -(1 - (1 - s.a) * L) * s.y;
  const da = -s.a + SIGMA2 + s.a * s.y * s.y;
  s.y += dy * dt;
  s.a += da * dt;
  if (Math.abs(s.y) < 1e-3) s.y = s.y < 0 ? -1e-3 : 1e-3;
}

// ---- Unconditional stability of ORGaNICs (Rawat, Heeger & Martiniani 2024), Eq. 3: W_r = I, W = α·ones ----
// τy ẏ = −√a ⊙ y + b z,  τa ȧ = −a + b0²σ² + W (y² ⊙ a).  Here b = b0 = 1.
export const ORG = { sigma: 0.2, tauY: 1, tauA: 3 };

/** The normalization fixed point (Eq. 4): y_s = z / √(σ² + α Σ z²). */
export function settled(z: number[]) {
  const pool = z.reduce((t, v) => t + v * v, 0) / z.length;
  return z.map((v) => v / Math.sqrt(ORG.sigma ** 2 + pool));
}
export const poolGain = (z: number[]) => Math.sqrt(ORG.sigma ** 2 + z.reduce((t, v) => t + v * v, 0) / z.length);

export function organicsStep(y: number[], a: number[], z: number[], dt: number) {
  const n = y.length;
  let pool = 0;
  for (let j = 0; j < n; j++) pool += (y[j] * y[j] * Math.max(a[j], 0)) / n;
  for (let j = 0; j < n; j++) {
    const dy = (-Math.sqrt(Math.max(a[j], 0)) * y[j] + z[j]) / ORG.tauY;
    a[j] += (dt * (-a[j] + ORG.sigma ** 2 + pool)) / ORG.tauA;
    y[j] += dt * dy;
  }
}

// ---- The 2D circuit with recurrence w_r (Eq. 16, b = b0 = w = 1) next to a plain recurrent neuron ----
export interface Pair { plain: number; y: number; a: number }
/** Plain: ẏ = −y + w_r y + z, which diverges for w_r > 1. ORGaNICs: ẏ = −y + w_r(1 − √a) y + z, τa ȧ = −a + σ² + a y². */
export function pairStep(s: Pair, wr: number, z: number, dt: number) {
  if (Math.abs(s.plain) < 1e6) s.plain += dt * (-s.plain + wr * s.plain + z);
  const dy = -s.y + wr * (1 - Math.sqrt(Math.max(s.a, 0))) * s.y + z;
  s.a += (dt * (-s.a + ORG.sigma ** 2 + s.a * s.y * s.y)) / ORG.tauA;
  s.y += dt * dy;
}
