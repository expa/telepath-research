import { useEffect, useRef, useState } from "react";

// Copy of telepath.com: a full-screen Unicorn Studio scene (glow, logo, wordmark) with the pitch and a waitlist form on top.
const SCENE = "CbHFIFV3Ha4q38DuFzTP";
const SDK = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.5/dist/unicornStudio.umd.js";
const WAITLIST = "32473"; // getwaitlist.com waitlist, same one the Framer site posts to

type Scene = { destroy(): void };
type US = { addScene(o: object): Promise<Scene> };
declare global { interface Window { UnicornStudio?: US } }

let sdk: Promise<US> | undefined;
const loadSdk = () => (sdk ??= new Promise((ok, fail) => {
  const s = Object.assign(document.createElement("script"), { src: SDK, async: true });
  s.onload = () => ok(window.UnicornStudio!);
  s.onerror = fail;
  document.head.append(s);
}));

export default function Home() {
  const bg = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  useEffect(() => {
    let scene: Scene | undefined, gone = false;
    loadSdk()
      .then((us) => us.addScene({ element: bg.current, projectId: SCENE, dpi: 1.5, scale: 1, fps: 60, fixed: true }))
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
        <h1>Intelligence<br />that evolves</h1>
        <p>We are building the first, biologically-plausible intelligence that learns continuously through experience, adapting locally as it operates.</p>
        {state === "done" ? (
          <p className="landing-thanks" role="status">You’re on the list.</p>
        ) : (
          <form className="landing-form" onSubmit={join}>
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
