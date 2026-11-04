import { V2Scope } from "@/components/v2/scope";
import { riseDiscs } from "@/lib/logo-bubbles";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigation } from "modulato";
import { REVEAL_EVENT } from "@/lib/landing-flight";
import { ResearchCards } from "./research-cards";

// Telepath's original glow and logo intro, contained in the hero above the research.
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
  const button = el.querySelector<HTMLButtonElement>("button[type=submit]")!;
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
    // Hover translates only; pressing adds the original spring compression.
    el.style.transform = `translate(${at.dx}px, ${at.dy}px) scale(${at.sx}, ${at.sy})`;
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
    if (e.pointerType === "touch") return;
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
  return () => {
    cancelAnimationFrame(raf);
    on.forEach(([n, f]) => el.removeEventListener(n, f));
    el.style.removeProperty("transform");
    el.style.removeProperty("--glint");
    button.style.removeProperty("transform");
  };
}

let sdk: Promise<US> | undefined;
const loadSdk = () => (sdk ??= new Promise((ok, fail) => {
  const s = Object.assign(document.createElement("script"), { src: SDK, async: true });
  s.onload = () => ok(window.UnicornStudio!);
  s.onerror = fail;
  document.head.append(s);
}));

// Intro timeline (ms after the scene has warmed up, see WARM): the horizontal logo plays in the top
// row (discs, then wordmark), followed by the copy and floating signup.
const LOGO_AT = 0;
const WORD_AT = LOGO_AT + 300;
const REVEAL_AT = LOGO_AT + 420;
// Creating the WebGL scene blocks the main thread, and its first drawn frames stall the GPU, freezing anything
// animating at the time. So the intro waits until the scene exists and has drawn a few (invisible) frames,
// or at most this long after mount if the scene is slow or fails.
const WARM = 700, GO_MAX = 2500; // ponytail: fixed warm-up guess from measuring (stall lands 0–700ms after creation); watch frame gaps if it varies more

function Home() {
  const bg = useRef<HTMLDivElement>(null);
  const glass = useRef<HTMLFormElement>(null);
  const [signupOpen, setSignupOpen] = useState(false);
  const openSignup = () => {
    setSignupOpen(true);
    requestAnimationFrame(() => glass.current?.querySelector("input")?.focus());
  };
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  useEffect(() => {
    if (state !== "sending" && state !== "done") return liquidGlass(glass.current);
  }, [state]);
  // Back from /research the logo and title fly in from the page we left (transitions/research__home.ts):
  // skip the intro, sit in the final layout, and load the rest once they land.
  const nav = useNavigation();
  const flyingBack = useRef(nav.from?.id === "research-2").current;
  const returning = useRef(Boolean(nav.from)).current;
  const [go, setGo] = useState(false);
  const discs = useRef<HTMLDivElement>(null);
  const still = () => returning || matchMedia("(prefers-reduced-motion: reduce)").matches;
  useLayoutEffect(() => { if (still()) riseDiscs(discs.current, 0, true); }, []); // layout effect: placed before the transition measures
  useEffect(() => { if (go && !still()) return riseDiscs(discs.current, LOGO_AT); }, [go]);
  const [revealed, setRevealed] = useState(false);
  useLayoutEffect(() => {
    if (returning) {
      if (!flyingBack) return setRevealed(true);
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
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGo(true);
      return;
    }
    let scene: Scene | undefined, gone = false;
    let warm: ReturnType<typeof setTimeout>, ready: ReturnType<typeof setTimeout>;
    const start = () => { if (!gone) setGo(true); }, t = setTimeout(start, GO_MAX);
    Promise.all([loadSdk(), backgroundOnly()])
      .then(([us, filePath]) => gone ? undefined : us.addScene({ element: bg.current, filePath, dpi: 1.5, scale: 1, fps: 60, fixed: false }))
      .then((s) => {
        if (!s) return;
        if (gone) return s.destroy();
        scene = s;
        warm = setTimeout(start, WARM);
        // The scene has its own 1s entrance (its nebula fades in over a paler gradient). Keep the canvas hidden
        // until that's done so only finished colors fade in over the base orange; otherwise it reads as a flash.
        ready = setTimeout(() => bg.current?.classList.add("is-ready"), WARM);
      })
      .catch(start); // the CSS gradient underneath stands in
    return () => { gone = true; clearTimeout(t); clearTimeout(warm); clearTimeout(ready); scene?.destroy(); };
  }, []);

  async function join(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
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
    <main id="top" className={`landing${revealed ? " revealed" : ""}${returning ? " returning" : ""}${go ? " intro-running" : ""}`}>
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-atmosphere" aria-hidden="true">
          <div className="landing-bg" ref={bg} />
        </div>
        <div className="landing-content">
          <div className="landing-logo" aria-label="Telepath" role="img">
            <div className="landing-discs" ref={discs}><span /><span /><span /></div>
            <b aria-hidden="true" style={{ animationDelay: `${WORD_AT}ms`, animationPlayState: go ? "running" : "paused" }}>Telepath</b>
          </div>
          <div className="landing-copy">
            <h1 id="landing-title">Pioneering biologically plausible intelligence that learns continuously through experience, adapting locally as it operates.</h1>
            <a className="landing-research" href="#research">Our Research <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </section>
      <ResearchCards />
      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Telepath</span>
        <a href="#top">Back to top <span aria-hidden="true">↑</span></a>
      </footer>
      <div className="landing-signup">
        {state === "done" ? (
          <p className="landing-thanks" role="status">You’re on the list.</p>
        ) : (
          <form className={`landing-form${signupOpen ? " is-open" : ""}`} onSubmit={join} ref={glass} aria-busy={state === "sending"}
            onMouseEnter={() => setSignupOpen(true)}
            onMouseLeave={() => {
              if (!glass.current?.contains(document.activeElement) && !glass.current?.querySelector("input")?.value) setSignupOpen(false);
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(":hover") && !event.currentTarget.querySelector("input")?.value) setSignupOpen(false);
            }}>
            <button className="landing-subscribe-trigger" type="button" onClick={openSignup} tabIndex={signupOpen ? -1 : 0} aria-expanded={signupOpen}>
              Subscribe for updates
            </button>
            <div className="landing-form-field">
              <input id="landing-email" tabIndex={signupOpen ? 0 : -1} type="email" name="email" required placeholder=" " aria-label="Subscribe for updates" autoComplete="email" aria-describedby={state === "error" ? "landing-error" : undefined} />
              <span className="landing-placeholder landing-placeholder-idle" aria-hidden="true">Subscribe for updates</span>
              <span className="landing-placeholder landing-placeholder-active" aria-hidden="true">Enter your email</span>
            </div>
            <button type="submit" tabIndex={signupOpen ? 0 : -1} disabled={state === "sending"} aria-label={state === "sending" ? "Subscribing" : "Subscribe"}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12.5 5.5 19 12l-6.5 6.5" />
              </svg>
            </button>
          </form>
        )}
        {state === "error" ? <p className="landing-error" id="landing-error" role="alert">Something went wrong. Try again.</p> : null}
      </div>
    </main>
  );
}

export default function VersionTwo() { return <V2Scope><Home /></V2Scope>; }
