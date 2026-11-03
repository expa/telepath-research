export const lin = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
export const logScale = (d0: number, d1: number, r0: number, r1: number) => {
  const a = Math.log10(d0), b = Math.log10(d1);
  return (v: number) => r0 + ((Math.log10(v) - a) / (b - a)) * (r1 - r0);
};
const f = (v: number) => Math.round(v * 10) / 10;
export const pathOf = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${f(x)} ${f(y)}`).join("");
export const sample = (n: number, from: number, to: number) => Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));
export const logSample = (n: number, from: number, to: number) => sample(n, Math.log10(from), Math.log10(to)).map((v) => 10 ** v);
