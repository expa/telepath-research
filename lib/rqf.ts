// The RQF, exactly as written in the papers: τẏ = −y + γz + (1−γ)(1+iωτ)y  ⇒  ẏ = λy + αz
// with α = γ/τ, ω0 = (1−γ)ω, λ = −α + iω0.

export interface Rqf { tau: number; omega: number; gamma: number }

export const alphaOf = ({ tau, gamma }: Rqf) => gamma / tau;
export const omega0Of = ({ omega, gamma }: Rqf) => (1 - gamma) * omega;

/** Impulse response y(t) = α e^{λt}: returns [re, im]. */
export function impulse(f: Rqf, t: number): [number, number] {
  const a = alphaOf(f);
  const w0 = omega0Of(f);
  const env = a * Math.exp(-a * t);
  return [env * Math.cos(w0 * t), env * Math.sin(w0 * t)];
}

/** |H(iΩ)| = α / |iΩ − λ|, unit peak at Ω = ω0. */
export function gain(f: Rqf, Omega: number) {
  const a = alphaOf(f);
  return a / Math.hypot(a, Omega - omega0Of(f));
}

/** arg H(iΩ) = −atan((Ω − ω0)/α). */
export function phase(f: Rqf, Omega: number) {
  return -Math.atan2(Omega - omega0Of(f), alphaOf(f));
}

/** Quality factor of the resonance: ω0 / (2α). */
export const qOf = (f: Rqf) => omega0Of(f) / (2 * alphaOf(f));

/**
 * A stack of leaky integrators (the RQF with γ = 1), discretised with ZOH at step h.
 * Instantaneous input:  y[n+1] = A y[n] + (1 − A) z[n+1]
 * Prospective input (paper eq. 16 with γ = 1): y[n+1] = A y[n] + z[n+1] − A z[n]
 */
export function cascadeStep(ys: number[], prevIn: number[], input: number, h: number, tau: number, prospective: boolean) {
  const A = Math.exp(-h / tau);
  let z = input;
  for (let l = 0; l < ys.length; l++) {
    const y = prospective ? A * ys[l] + z - A * prevIn[l] : A * ys[l] + (1 - A) * z;
    prevIn[l] = z;
    ys[l] = y;
    z = y;
  }
}

/** Steady-state lag of an L-stage leaky cascade for a sine at f Hz (seconds). */
export const cascadeLag = (L: number, f: number, tau: number) => (L * Math.atan(2 * Math.PI * f * tau)) / (2 * Math.PI * f);
