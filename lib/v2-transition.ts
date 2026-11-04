import { transition } from "modulato";

const SLIDE = 48; // px
const OUT = "cubic-bezier(0.4, 0, 1, 1)";
const IN = "cubic-bezier(0, 0, 0.2, 1)";

/** Rail and content of a page; pages without the post frame are all content. */
function parts(page: HTMLElement) {
  const main = page.querySelector("main");
  if (!main?.classList.contains("post")) return { rail: [] as Element[], content: main ? [main] : [page] };
  const kids = [...main.children];
  // The glow stays put (see glowMorph) and so do the fixed logo and the fade behind it, which every post page shares; everything else slides.
  const content = kids.filter((k) => !k.classList.contains("post-rail") && !k.classList.contains("glow") && !k.classList.contains("post-brand") && !k.classList.contains("post-topfade"));
  return { rail: kids.filter((k) => k.classList.contains("post-rail")), content };
}

const GLOW = ["--glow-1", "--glow-2", "--glow-3"];

/** Post ↔ walkthrough: one header glow that morphs its colors (orange ↔ gray) instead of two crossfading. */
function glowMorph(from: HTMLElement, to: HTMLElement, duration: number): Animation[] {
  const a = from.querySelector<HTMLElement>(".post > .glow"), b = to.querySelector<HTMLElement>(".post > .glow");
  if (!a || !b) return [];
  // keep the drift where it was so the blobs don't jump back to their start
  const drifts = (el: HTMLElement) => el.getAnimations({ subtree: true }).filter((an) => (an as CSSAnimation).animationName === "drift");
  const olds = drifts(a);
  drifts(b).forEach((an, i) => { if (olds[i]) an.currentTime = olds[i].currentTime; });
  a.style.visibility = "hidden";
  const was = getComputedStyle(a), now = getComputedStyle(b);
  const frame = (cs: CSSStyleDeclaration) => Object.fromEntries(GLOW.map((p) => [p, cs.getPropertyValue(p).trim()]));
  return [b.animate([frame(was), frame(now)], { duration, easing: "ease", fill: "both" })];
}

/** Page → page: the sidebar stays put and crossfades to the new page's details; the old content slides out left, the new slides in from the right. */
export default transition({
  async run(context) {
    const { from, to } = context;
    const d = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;
    // Each page keeps its own logo; the homepage lockup travels with its content.
    const goingHome = to.route.id === "home";
    if (goingHome || from.route.id === "home") {
      const direction = goingHome ? -1 : 1;
      const center = (page: HTMLElement) => page.querySelectorAll(
        ".landing-logo, .landing-copy, .landing-papers, .post-rail, .post-head, .post-body, .post > .article",
      );
      const shifts: Animation[] = [];
      for (const el of center(from.element)) shifts.push(el.animate([
        { transform: "translateY(0)" }, { transform: `translateY(${-32 * direction}px)` },
      ], { duration: 650 * d, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "both" }));
      for (const el of center(to.element)) shifts.push(el.animate([
        { transform: `translateY(${32 * direction}px)` }, { transform: "translateY(0)" },
      ], { duration: 750 * d, delay: 80 * d, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "both" }));
      const incoming = to.element.querySelector("main") ?? to.element;
      const outgoing = from.element.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 500 * d, easing: "ease-out", fill: "forwards",
      });
      const reveal = incoming.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 650 * d, delay: 80 * d, easing: "ease-out", fill: "both",
      });
      try {
        await Promise.all([outgoing.finished, reveal.finished, ...shifts.map(a => a.finished)]);
      } catch { /* A newer navigation can interrupt this transition. */ }
      finally {
        reveal.cancel();
        shifts.forEach(a => {
          if (to.element.contains((a.effect as KeyframeEffect).target as Node)) a.cancel();
        });
      }
      return;
    }
    const a = parts(from.element), b = parts(to.element);
    // Leaving a detailed walkthrough for a lighter page reads as going back: slide the other way.
    const detailed = (id: string) => id.endsWith("/detailed");
    const dir = (to.route.id === "home" || (detailed(from.route.id) && !detailed(to.route.id))) ? -1 : 1;
    // the outgoing page lies on top; its opaque background would hide the incoming content as it fades in
    const fm = from.element.querySelector("main");
    if (fm) fm.style.background = "transparent";
    const all: Animation[] = glowMorph(from.element, to.element, 700 * d);
    const run = (els: Element[], x: [number, number], o: [number, number], duration: number, delay: number, easing: string) =>
      els.forEach((el) =>
        all.push(el.animate(
          [{ opacity: o[0], transform: `translateX(${x[0]}px)` }, { opacity: o[1], transform: `translateX(${x[1]}px)` }],
          { duration: duration * d, delay: delay * d, easing, fill: "both" },
        )),
      );
    run(a.rail, [0, 0], [1, 0], 360, 120, "ease");
    run(b.rail, [0, 0], [0, 1], 360, 120, "ease");
    run(a.content, [0, -SLIDE * dir], [1, 0], 300, 0, OUT);
    run(b.content, [SLIDE * dir, 0], [0, 1], 460, 240, IN);
    await Promise.all(all.map((an) => an.finished)).catch(() => {});
    // Drop the incoming page's fills so it keeps no leftover transform (it would break position: sticky/fixed inside).
    // Leave the outgoing page's alone: cancelling them would flash it back to full opacity for a frame before it unmounts.
    all.forEach((an) => to.element.contains((an.effect as KeyframeEffect).target as Node) && an.cancel());
  },
});
