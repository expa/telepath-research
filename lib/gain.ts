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

// ---- The 2D circuit (one y, one a; w = 1) and its energy, Eq. 14 ----
/** Fixed point of the 2D circuit for input z: y_s = z/√(σ²+z²), a_s = σ²+z². */
export const fixed2 = (z: number) => ({ ys: z / Math.sqrt(ORG.sigma ** 2 + z * z), as: ORG.sigma ** 2 + z * z });

/** V(y, a) = (τy/τa)√a_s (y − y_s)² + (√a y − z)², minimized at the fixed point. */
export function energy2(y: number, a: number, z: number) {
  const { ys, as } = fixed2(z);
  return (ORG.tauY / ORG.tauA) * Math.sqrt(as) * (y - ys) ** 2 + (Math.sqrt(Math.max(a, 0)) * y - z) ** 2;
}

/**
 * Coordinates in which V is round to second order: u = Lᵀ d with d = (y − y_s, a − a_s) and LLᵀ the
 * Hessian of V over 2, so |u|² ≈ V near the fixed point.
 */
export function roundOf(y: number, a: number, z: number): [number, number] {
  const { ys, as } = fixed2(z);
  const m11 = (ORG.tauY / ORG.tauA) * Math.sqrt(as) + as, m12 = ys / 2, m22 = (ys * ys) / (4 * as);
  const l11 = Math.sqrt(m11), l21 = m12 / l11, l22 = Math.sqrt(Math.max(1e-9, m22 - l21 * l21));
  const dy = y - ys, da = a - as;
  return [l11 * dy + l21 * da, l22 * da];
}
