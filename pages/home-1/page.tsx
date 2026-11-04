import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigation } from "modulato";
import { REVEAL_EVENT } from "@/lib/landing-flight";

// Copy of telepath.com: the full-screen Unicorn Studio glow, with a coded logo, the pitch and a waitlist form on top.
const SCENE = "https://storage.googleapis.com/unicornstudio-production/embeds/CbHFIFV3Ha4q38DuFzTP";
const SDK = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.5/dist/unicornStudio.umd.js";
const WAITLIST = "32473"; // getwaitlist.com waitlist, same one the Framer site posts to

type Scene = { destroy(): void };
type US = { addScene(o: object): Promise<Scene> };
declare global { interface Window { UnicornStudio?: US } }

/** The scene minus its baked-in logo (3D model layers) and wordmark (image layer); we draw those in the DOM. */
async function backgroundOnly(): Promise<string> {
  const id = "telepath-scene";
  if (document.getElementById(id)) return id;
  const json = await (await fetch(SCENE)).json();
  json.history = json.history.filter((l: { layerType: string }) => l.layerType !== "model" && l.layerType !== "image");
  document.head.append(Object.assign(document.createElement("script"), { type: "application/json", id, text: JSON.stringify(json) }));
  return id;
}

/**
 * Logo intro, as storyboarded from the side (camera looking at the discs face-on):
 * 1. a disc pops into view far away at the bottom spot (snappy, like a bubble);
 * 2. it floats toward the camera and up, growing as it comes closer;
 * 3. it slows, drifting back from the camera to its resting depth while tipping back about x,
 *    which from the front reads as the flattened ellipse of the mark.
 * Depth and height follow one curved (Bezier) path, so the motion arcs rather than going straight.
 * The three discs play this in turn, top first, each tuned to end on its own resting spot.
 * Driven per frame in JS: CSS custom-property animations don't repaint transforms reliably everywhere.
 */
function riseDiscs(root: HTMLDivElement | null, at: number, skip = false) {
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
    Object.assign(el.style, { width: `${d.size}px`, height: `${d.size}px`, marginLeft: `${-d.size / 2}px`, marginTop: `${-d.size / 2}px` });
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
      el.style.transform = `translate3d(0, ${-y}px, ${z}px) rotateX(${tilt}deg) scale(${s})`;
    });
  };
  if (skip || matchMedia("(prefers-reduced-motion: reduce)").matches) return draw(1e9);
  const end = discs[discs.length - 1].delay + Math.max(FLOAT, TURN);
  let raf = 0;
  const start = performance.now() + at;
  const tick = (t: number) => {
    draw(t - start);
    if (t - start < end + 100) raf = requestAnimationFrame(tick);
  };
  draw(0);
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/**
 * Liquid-glass pill: every property is a spring chasing a target, so pointer moves, hover and press
 * retarget mid-flight instead of restarting an animation. Swells on hover, leans and glints toward
 * the pointer, squishes on press.
 */
function liquidGlass(el: HTMLFormElement | null) {
  if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // ponytail: one shared stiffness/damping; per-property tuning if some motion feels off.
  const K = 600, C = 40; // damping ratio ~0.8: quick to respond, soft settle, no snap
  const keys = ["s", "sx", "sy", "dx", "dy", "mx", "my", "glint", "b"] as const;
  type Key = (typeof keys)[number];
  const rest: Record<Key, number> = { s: 1, sx: 1, sy: 1, dx: 0, dy: 0, mx: 50, my: 50, glint: 0, b: 1 };
  const button = el.querySelector("button")!;
  let pressed = false;
  const at = { ...rest }, to = { ...rest }, v = Object.fromEntries(keys.map((k) => [k, 0])) as Record<Key, number>;
  let raf = 0, last = 0;
  const tick = (t: number) => {
    const dt = Math.min((t - last) / 1000, 1 / 30);
    last = t;
    let moving = false;
    for (const k of keys) {
      v[k] += (K * (to[k] - at[k]) - C * v[k]) * dt;
      at[k] += v[k] * dt;
      if (Math.abs(to[k] - at[k]) > 1e-4 || Math.abs(v[k]) > 1e-3) moving = true;
      else { at[k] = to[k]; v[k] = 0; }
    }
    el.style.transform = `translate(${at.dx}px, ${at.dy}px) scale(${at.s * at.sx}, ${at.s * at.sy})`;
    el.style.setProperty("--mx", `${at.mx}%`);
    el.style.setProperty("--my", `${at.my}%`);
    el.style.setProperty("--glint", `${at.glint}`);
    button.style.transform = `scale(${at.b})`;
    raf = moving ? requestAnimationFrame(tick) : 0;
  };
  const go = (next: Partial<Record<Key, number>>) => {
    Object.assign(to, next);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  };
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const onButton = button.contains(e.target as Node);
    go({ s: 1.035, glint: 1, mx: x * 100, my: y * 100, dx: (x - 0.5) * 6, dy: (y - 0.5) * 3, b: onButton ? (pressed ? 0.94 : 1.06) : 1 });
  };
  const leave = () => { pressed = false; go({ s: 1, sx: 1, sy: 1, dx: 0, dy: 0, glint: 0, b: 1 }); };
  const down = (e: Event) => { pressed = true; go({ sx: 1.02, sy: 0.95, ...(button.contains(e.target as Node) && { b: 0.94 }) }); };
  const up = (e: Event) => { pressed = false; go({ sx: 1, sy: 1, b: button.contains(e.target as Node) ? 1.06 : 1 }); };
  const on: [string, EventListener][] = [["pointermove", move as EventListener], ["pointerleave", leave], ["pointerdown", down], ["pointerup", up], ["pointercancel", up]];
  on.forEach(([n, f]) => el.addEventListener(n, f));
  return () => { cancelAnimationFrame(raf); on.forEach(([n, f]) => el.removeEventListener(n, f)); };
}

let sdk: Promise<US> | undefined;
const loadSdk = () => (sdk ??= new Promise((ok, fail) => {
  const s = Object.assign(document.createElement("script"), { src: SDK, async: true });
  s.onload = () => ok(window.UnicornStudio!);
  s.onerror = fail;
  document.head.append(s);
}));

// Intro timeline (ms after the scene has warmed up, see WARM): the logo plays centered on screen (discs, then
// wordmark) while the scene fades in on the base orange; then it slides up into place while the copy un-blurs in,
// then the signup.
const LOGO_AT = 200;
const WORD_AT = LOGO_AT + 1200;
const REVEAL_AT = LOGO_AT + 1800;
// Creating the WebGL scene blocks the main thread, and its first drawn frames stall the GPU, freezing anything
// animating at the time. So the intro waits until the scene exists and has drawn a few (invisible) frames,
// or at most this long after mount if the scene is slow or fails.
const WARM = 700, GO_MAX = 2500; // ponytail: fixed warm-up guess from measuring (stall lands 0–700ms after creation); watch frame gaps if it varies more

export default function Home() {
  const bg = useRef<HTMLDivElement>(null);
  const glass = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  useEffect(() => liquidGlass(glass.current), [state === "done"]);
  // Back from /research the logo and title fly in from the page we left (transitions/research-1__home-1.ts):
  // skip the intro, sit in the final layout, and load the rest once they land.
  const nav = useNavigation();
  const returning = useRef(nav.from?.id === "research-1").current;
  const [go, setGo] = useState(false);
  const discs = useRef<HTMLDivElement>(null);
  const still = () => returning || matchMedia("(prefers-reduced-motion: reduce)").matches;
  useLayoutEffect(() => { if (still()) riseDiscs(discs.current, 0, true); }, []); // layout effect: placed before the transition measures
  useEffect(() => { if (go && !still()) return riseDiscs(discs.current, LOGO_AT); }, [go]);
  const logo = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  // Park the logo at the center of the screen until the reveal.
  useLayoutEffect(() => {
    if (!returning && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const el = logo.current!, r = el.getBoundingClientRect();
      el.style.setProperty("--to-center", `${innerHeight / 2 - (r.top + r.height / 2)}px`);
    }
  }, []);
  useLayoutEffect(() => {
    if (returning) {
      const show = () => setRevealed(true), t = setTimeout(show, 3000); // fallback if the transition never signals
      addEventListener(REVEAL_EVENT, show, { once: true });
      return () => { clearTimeout(t); removeEventListener(REVEAL_EVENT, show); };
    }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setRevealed(true);
    if (!go) return;
    const t = setTimeout(() => setRevealed(true), REVEAL_AT);
    return () => clearTimeout(t);
  }, [go]);

  useEffect(() => {
    let scene: Scene | undefined, gone = false;
    const start = () => setGo(true), t = setTimeout(start, GO_MAX);
    Promise.all([loadSdk(), backgroundOnly()])
      .then(([us, filePath]) => us.addScene({ element: bg.current, filePath, dpi: 1.5, scale: 1, fps: 60, fixed: true }))
      .then((s) => {
        if (gone) return s.destroy();
        scene = s;
        setTimeout(start, WARM);
        // The scene has its own 1s entrance (its nebula fades in over a paler gradient). Keep the canvas hidden
        // until that's done so only finished colors fade in over the base orange; otherwise it reads as a flash.
        setTimeout(() => bg.current?.classList.add("is-ready"), 1000);
      })
      .catch(start); // the CSS gradient underneath stands in
    return () => { gone = true; clearTimeout(t); scene?.destroy(); };
  }, []);

  async function join(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const email = new FormData(e.currentTarget).get("email");
    try {
      const r = await fetch("https://api.getwaitlist.com/api/v1/waiter/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ api_key: WAITLIST, email, referral_link: document.URL }),
      });
      setState(r.ok ? "done" : "error");
    } catch { setState("error"); }
  }

  return (
    <main className={`landing${revealed ? " revealed" : ""}${returning ? " returning" : ""}`}>
      <div className="landing-bg" ref={bg} aria-hidden="true" />
      <div className="landing-content">
        <div className="landing-logo" ref={logo} aria-label="Telepath" role="img">
          <div className="landing-discs" ref={discs}><span /><span /><span /></div>
          <b aria-hidden="true" style={{ animationDelay: `${WORD_AT}ms`, animationPlayState: go ? "running" : "paused" }}>Telepath</b>
        </div>
        <div className="landing-copy">
          <h1>Intelligence<br />that evolves</h1>
          <p>We are building the first, biologically-plausible intelligence that learns continuously through experience, adapting locally as it operates.</p>
          <a className="landing-research" href="/research-1">Read our research →</a>
        </div>
        <div className="landing-signup">
          {state === "done" ? (
            <p className="landing-thanks" role="status">You’re on the list.</p>
          ) : (
            <>
              <label className="landing-label" htmlFor="landing-email">Subscribe for updates</label>
              <form className="landing-form" onSubmit={join} ref={glass}>
                <input id="landing-email" type="email" name="email" required placeholder="Enter your email" autoComplete="email" />
                <button type="submit" disabled={state === "sending"} aria-label="Subscribe">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
                  </svg>
                </button>
              </form>
            </>
          )}
          {state === "error" ? <p className="landing-error" role="alert">Something went wrong. Try again.</p> : null}
        </div>
      </div>
    </main>
  );
}
