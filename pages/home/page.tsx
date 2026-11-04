import { useEffect, useRef, useState } from "react";

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
 * Liquid-glass pill: every property is a spring chasing a target, so pointer moves, hover and press
 * retarget mid-flight instead of restarting an animation. Swells on hover, leans and glints toward
 * the pointer, squishes on press.
 */
function liquidGlass(el: HTMLFormElement | null) {
  if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // ponytail: one shared stiffness/damping; per-property tuning if some motion feels off.
  const K = 260, C = 26; // gently underdamped: a soft settle, no snap
  const keys = ["s", "sx", "sy", "dx", "dy", "mx", "my", "glint"] as const;
  type Key = (typeof keys)[number];
  const rest: Record<Key, number> = { s: 1, sx: 1, sy: 1, dx: 0, dy: 0, mx: 50, my: 50, glint: 0 };
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
    raf = moving ? requestAnimationFrame(tick) : 0;
  };
  const go = (next: Partial<Record<Key, number>>) => {
    Object.assign(to, next);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  };
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    go({ s: 1.035, glint: 1, mx: x * 100, my: y * 100, dx: (x - 0.5) * 6, dy: (y - 0.5) * 3 });
  };
  const leave = () => go({ s: 1, sx: 1, sy: 1, dx: 0, dy: 0, glint: 0 });
  const down = () => go({ sx: 1.02, sy: 0.95 });
  const up = () => go({ sx: 1, sy: 1 });
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

export default function Home() {
  const bg = useRef<HTMLDivElement>(null);
  const glass = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  useEffect(() => liquidGlass(glass.current), [state === "done"]);

  useEffect(() => {
    let scene: Scene | undefined, gone = false;
    Promise.all([loadSdk(), backgroundOnly()])
      .then(([us, filePath]) => us.addScene({ element: bg.current, filePath, dpi: 1.5, scale: 1, fps: 60, fixed: true }))
      .then((s) => (gone ? s.destroy() : (scene = s)))
      .catch(() => {}); // the CSS gradient underneath stands in
    return () => { gone = true; scene?.destroy(); };
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
    <main className="landing">
      <div className="landing-bg" ref={bg} aria-hidden="true" />
      <div className="landing-content">
        <div className="landing-logo" aria-label="Telepath" role="img">
          <span /><span /><span />
          <b aria-hidden="true">Telepath</b>
        </div>
        <h1>Intelligence<br />that evolves</h1>
        <p>We are building the first, biologically-plausible intelligence that learns continuously through experience, adapting locally as it operates.</p>
        {state === "done" ? (
          <p className="landing-thanks" role="status">You’re on the list.</p>
        ) : (
          <form className="landing-form" onSubmit={join} ref={glass}>
            <input type="email" name="email" required placeholder="Enter your email" aria-label="Email" autoComplete="email" />
            <button type="submit" disabled={state === "sending"}>Join</button>
          </form>
        )}
        {state === "error" ? <p className="landing-error" role="alert">Something went wrong. Try again.</p> : null}
        <a className="landing-research" href="/research">Read our research →</a>
      </div>
    </main>
  );
}
