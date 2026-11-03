import type { SharedPair, TransitionRunContext } from "modulato";

const EASE = "cubic-bezier(0.65, 0, 0.2, 1)";

/**
 * A headline that changes size between pages. Box-FLIP would reflow the text mid-flight,
 * so the old headline scales into the new one's place and dissolves into it instead.
 */
function morph(pair: SharedPair, duration: number) {
  const { from, to, fromRect: a, toRect: b } = pair;
  const s = parseFloat(getComputedStyle(to).fontSize) / parseFloat(getComputedStyle(from).fontSize);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const clone = from.cloneNode(true) as HTMLElement;
  clone.removeAttribute("data-shared");
  const cs = getComputedStyle(from);
  Object.assign(clone.style, {
    position: "fixed", margin: "0", zIndex: "50", pointerEvents: "none",
    top: `${a.top}px`, left: `${a.left}px`, width: `${a.width}px`,
    font: cs.font, letterSpacing: cs.letterSpacing, color: cs.color, textAlign: cs.textAlign,
  });
  clone.querySelectorAll("a").forEach((a) => Object.assign(a.style, { color: "inherit", textDecoration: "none" }));
  document.body.appendChild(clone);
  from.style.visibility = "hidden";
  const opts = { duration, easing: EASE, fill: "both" as const };
  const out = clone.animate(
    [{ transform: "none", opacity: 1 }, { opacity: 1, offset: 0.35 }, { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0 }],
    opts,
  ).finished.finally(() => clone.remove());
  const inn = to.animate(
    [{ transform: `translate(${-dx}px, ${-dy}px) scale(${1 / s})`, opacity: 0 }, { opacity: 0, offset: 0.3 }, { transform: "none", opacity: 1 }],
    opts,
  ).finished;
  return Promise.all([out, inn]);
}

/** Index ⇄ post: the headline travels between its two layouts while the pages crossfade underneath. */
export async function titleFlight({ from, to, shared }: TransitionRunContext) {
  const d = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;
  await Promise.all([
    ...shared.map((p) => morph(p, 760 * d)),
    from.element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 * d, easing: "ease-out", fill: "forwards" }).finished,
    to.element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 560 * d, delay: 160 * d, easing: EASE, fill: "backwards" }).finished,
  ]).catch(() => {});
}
