import type { SharedPair, TransitionRunContext } from "modulato";

const EASE = "cubic-bezier(0.65, 0, 0.2, 1)";
const T = { out: 260, move: 640, in: 420 }; // ms: fade out, travel, fade in
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One shared text block travels from its old layout to its new one. Both layouts wrap at the same
 * width in em (see globals.css), so a translate + scale lands exactly on the new text.
 */
function fly(pair: SharedPair, delay: number, duration: number) {
  const { from, to, fromRect: a, toRect: b } = pair;
  const s = parseFloat(getComputedStyle(to).fontSize) / parseFloat(getComputedStyle(from).fontSize);
  const clone = from.cloneNode(true) as HTMLElement;
  clone.removeAttribute("data-shared");
  clone.querySelectorAll("a").forEach((el) => Object.assign(el.style, { color: "inherit", textDecoration: "none" }));
  const cs = getComputedStyle(from);
  Object.assign(clone.style, {
    position: "fixed", margin: "0", zIndex: "50", pointerEvents: "none", transformOrigin: "0 0",
    top: `${a.top}px`, left: `${a.left}px`, width: `${a.width}px`, maxWidth: "none",
    font: cs.font, letterSpacing: cs.letterSpacing, color: cs.color, textAlign: cs.textAlign, textWrap: cs.textWrap,
  });
  document.body.appendChild(clone);
  from.style.visibility = "hidden";
  to.style.visibility = "hidden";
  const travel = clone.animate(
    [{ transform: "none" }, { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${s})` }],
    { duration, delay, easing: EASE, fill: "both" },
  ).finished;
  return {
    landed: travel.then(() => {
      to.style.visibility = "";
      // hand over: the copy dissolves while the page (and the real text in it) fades in
      return clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T.in * (duration ? 1 : 0), easing: "ease-in", fill: "forwards" }).finished;
    }),
    done: () => clone.remove(),
  };
}

/** Index ⇄ post: fade what doesn't travel, move the title and summary, then fade in the rest. */
export async function titleFlight({ from, to, shared }: TransitionRunContext) {
  const d = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;
  const flights = shared.map((p) => fly(p, T.out * 0.6 * d, T.move * d));
  const out = from.element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T.out * d, easing: "ease-out", fill: "forwards" }).finished;
  const fadeIn = to.element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T.in * d, delay: (T.out * 0.6 + T.move) * d, easing: "ease-out", fill: "backwards" }).finished;
  try {
    await Promise.all([out, fadeIn, ...flights.map((f) => f.landed)]);
  } catch { /* cancelled by a newer navigation */ }
  flights.forEach((f) => f.done());
  await wait(0);
}
