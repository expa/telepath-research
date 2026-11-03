// A synthetic, EEG-like probe: alternating "eyes closed" (strong 10 Hz alpha) and "eyes open"
// (weak alpha, more beta) epochs over 1/f background. Seeded, so server and client agree.
export const FS = 128;

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Four brain states with distinct spectra, each lasting 3–7 s: the persistence is what makes the
// near future predictable from the present.
const STATES = [
  { delta: 1.2, theta: 0.3, alpha: 0.15, beta: 0.1 }, // drowsy / slow
  { delta: 0.3, theta: 0.9, alpha: 0.3, beta: 0.15 }, // theta
  { delta: 0.2, theta: 0.2, alpha: 1.2, beta: 0.15 }, // eyes closed, alpha
  { delta: 0.2, theta: 0.2, alpha: 0.2, beta: 0.7 }, // alert, beta
];

export function eeg(seconds: number, seed = 7) {
  const r = rng(seed);
  const n = Math.round(seconds * FS);
  const out = new Float64Array(n);
  let pink = 0;
  let state = Math.floor(r() * STATES.length), until = 3 + r() * 4;
  const ph = [r(), r(), r(), r()].map((v) => v * 6.28);
  const mix = { ...STATES[state] };
  for (let i = 0; i < n; i++) {
    const t = i / FS;
    if (t > until) {
      state = (state + 1 + Math.floor(r() * (STATES.length - 1))) % STATES.length;
      until = t + 3 + r() * 4;
    }
    const goal = STATES[state];
    for (const key of ["delta", "theta", "alpha", "beta"] as const) mix[key] += (goal[key] - mix[key]) * 0.004;
    const env = 0.75 + 0.25 * Math.sin(2 * Math.PI * 0.4 * t + ph[0]);
    pink = 0.97 * pink + 0.12 * (r() - 0.5);
    out[i] =
      env * (mix.delta * Math.sin(2 * Math.PI * 2 * t + ph[0]) +
        mix.theta * Math.sin(2 * Math.PI * 6 * t + ph[1]) +
        mix.alpha * Math.sin(2 * Math.PI * (10 + 0.3 * Math.sin(t)) * t + ph[2]) +
        mix.beta * Math.sin(2 * Math.PI * 21 * t + ph[3])) +
      pink;
  }
  return out;
}
