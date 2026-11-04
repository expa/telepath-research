export function riseDiscs(root: HTMLDivElement | null, at: number, skip?: boolean): (() => void) | undefined;
export function riseDiscs(root: HTMLDivElement, at: number, skip: boolean, motion: { duration: number; delay: number; out: boolean }): Animation[];
export function riseDiscs(root: HTMLDivElement | null, at: number, skip = false, motion?: { duration: number; delay: number; out: boolean }) {
  if (!root) return;
  const els = [...root.children] as HTMLElement[];
  const P = 600; // perspective on .landing-discs, px; its vanishing point sits on the bottom spot
  const START = 16; // apparent size when a disc first pops in, far away, px
  // size: real diameter at rest; rise: resting height above the bottom spot; tilt: resting angle, solved through
  // the 600px perspective so the visible ellipses match the mark (top ≈ 0.30 of its width, middle ≈ 0.5)
  const discs = [
    { size: 88, rise: 56.5, tilt: 67, delay: 0 },
    { size: 44, rise: 26.5, tilt: 57.5, delay: 420 },
    { size: 22, rise: 0, tilt: 0, delay: 840 },
  ].map((d) => ({ ...d, far: P * (d.size / START - 1) })); // start this far back so every disc pops in at the same small size
  const NEAR = 140; // how close the path's control point pulls toward the camera, px
  const POP = 200, FLOAT = 700, TURN = 780, TURN_AT = 0.1; // ms; the tilt starts 10% into the float and finishes after it

  // cubic-bezier easing (x1, y1, x2, y2), solved by bisection
  const bezier = (x1: number, y1: number, x2: number, y2: number) => {
    const f = (t: number, a: number, b: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
    return (x: number) => {
      let lo = 0, hi = 1;
      for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (f(m, x1, x2) < x) lo = m; else hi = m; }
      return f((lo + hi) / 2, y1, y2);
    };
  };
  const float = bezier(0.3, 0, 0.15, 1); // eases in, then a long, slowing glide: floating up through water
  const settle = bezier(0.45, 0, 0.2, 1);
  const pop = (t: number) => { const c = 2.2; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; }; // back-out: overshoots then settles
  const clamp = (t: number) => Math.min(1, Math.max(0, t));

  els.forEach((el, i) => {
    const d = discs[i];
    Object.assign(el.style, {
      width: `calc(${d.size}px * var(--disc-scale))`, height: `calc(${d.size}px * var(--disc-scale))`,
      marginLeft: `calc(${-d.size / 2}px * var(--disc-scale))`, marginTop: `calc(${-d.size / 2}px * var(--disc-scale))`,
    });
  });

  const draw = (now: number) => {
    els.forEach((el, i) => {
      const d = discs[i], t = now - d.delay;
      const u = float(clamp(t / FLOAT));
      // quadratic Bezier in (depth, height): far & low → pulled near the camera, a little up → resting depth, full height
      const z = (1 - u) ** 2 * -d.far + 2 * u * (1 - u) * NEAR;
      const y = 2 * u * (1 - u) * d.rise * 0.25 + u * u * d.rise;
      const tilt = d.tilt * settle(clamp((t - TURN_AT * FLOAT) / (TURN - TURN_AT * FLOAT)));
      const s = t <= 0 ? 0 : pop(clamp(t / POP));
      el.style.opacity = `${clamp(t / 120)}`;
      el.style.transform = `translate3d(0, calc(${-y}px * var(--disc-scale)), calc(${z}px * var(--disc-scale))) rotateX(${tilt}deg) scale(${s})`;
    });
  };
  if (motion) {
    // Sample the original 3D bubble path for each disc. Reverse each path,
    // while preserving top-to-bottom ordering when the symbol leaves.
    return els.map((el, i) => {
      const frames = Array.from({ length: 49 }, (_, step) => {
        draw(discs[i].delay + (step / 48) * Math.max(FLOAT, TURN));
        return { transform: el.style.transform, opacity: el.style.opacity };
      });
      if (motion.out) frames.reverse();
      return el.animate(frames, {
        duration: motion.duration, delay: motion.delay + i * motion.duration * .22,
        easing: "linear", fill: "both",
      });
    });
  }
  if (skip || matchMedia("(prefers-reduced-motion: reduce)").matches) return draw(1e9);
  const end = discs[discs.length - 1].delay + Math.max(FLOAT, TURN);
  let raf = 0;
  const start = performance.now() + at;
  const tick = (t: number) => {
    const elapsed = (t - start) * 1.35;
    draw(elapsed);
    if (elapsed < end + 100) raf = requestAnimationFrame(tick);
  };
  draw(0);
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

