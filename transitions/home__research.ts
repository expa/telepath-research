import { transition } from "modulato";

const EASE = "cubic-bezier(0.65, 0, 0.2, 1)";
const T = { fly: 850, bg: 500, handoff: 260, rise: 600, stagger: 80, gone: 300 }; // ms

/** Union of the discs' on-screen (projected) boxes: what the eye reads as the symbol. */
function symbolBox(discs: HTMLElement) {
  const rs = [...discs.children].map((c) => c.getBoundingClientRect());
  const left = Math.min(...rs.map((r) => r.left)), top = Math.min(...rs.map((r) => r.top));
  return { left, top, width: Math.max(...rs.map((r) => r.right)) - left, height: Math.max(...rs.map((r) => r.bottom)) - top };
}

/** Fixed-position copy of `el` sitting exactly where it is now, for flying above both pages. */
function lift<E extends HTMLElement>(el: E): E {
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  const c = el.cloneNode(true) as E;
  Object.assign(c.style, {
    position: "fixed", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: "0",
    zIndex: "60", pointerEvents: "none", transformOrigin: "0 0", animation: "none",
    font: cs.font, letterSpacing: cs.letterSpacing, color: cs.color, lineHeight: cs.lineHeight,
  });
  document.body.appendChild(c);
  return c;
}

/**
 * Home → research: the landing logo flies to the header. The discs shrink onto the static mark and blend
 * from cream into its orange gradient; "Telepath" lands on the header's "Telepath". Both copies
 * then hand over to the real header brand. Order: landing copy fades and the logo flies; once it lands the
 * orange background gives way to paper and the nav fades in; then the research content rises in, staggered.
 */
export default transition({
  async run({ from, to }) {
    const d = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;
    const header = document.querySelector<HTMLElement>(".site-header");
    const brand = header?.querySelector<HTMLElement>(".brand");
    const mark = brand?.querySelector("svg");
    const discs = from.element.querySelector<HTMLElement>(".landing-discs");
    const word = from.element.querySelector<HTMLElement>(".landing-logo b");

    // The header mounts with the new route and pushes the outlet down; keep the landing where it was.
    if (header) from.element.style.top = `${(parseFloat(from.element.style.top) || 0) - header.offsetHeight}px`;

    const all: Animation[] = [];
    const clones: HTMLElement[] = [];
    const BG = T.fly * d; // background + nav start once the logo has landed
    if (header) all.push(header.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T.bg * d, delay: BG, easing: "ease-out", fill: "both" }));
    if (brand) brand.style.opacity = "0";
    // the landing paints html/body orange (html:has(.landing)); ease them to the paper color meanwhile
    const paper = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() || "#fbf7f2";
    for (const el of [document.documentElement, document.body]) all.push(el.animate([{ backgroundColor: getComputedStyle(el).backgroundColor }, { backgroundColor: paper }], { duration: T.bg * d, delay: BG, easing: "ease-out", fill: "forwards" }));

    if (discs && word && brand && mark) {
      // symbol: projected disc box → the drawn ellipses of the 24-unit mark (x 2–22, y 2–21)
      const a = symbolBox(discs), m = mark.getBoundingClientRect(), u = m.width / 24;
      const b = { left: m.left + 2 * u, top: m.top + 2 * u, width: 20 * u };
      const fly = lift(discs);
      const c = fly.getBoundingClientRect(), s = b.width / a.width;
      const tx = b.left - c.left - (a.left - c.left) * s, ty = b.top - c.top - (a.top - c.top) * s;
      // each disc gains a layer in the mark's gradient that fades up on the way: cream → orange
      const tints = [...fly.children].map((disc) => {
        const t = document.createElement("i");
        Object.assign(t.style, { position: "absolute", inset: "0", borderRadius: "inherit", background: "linear-gradient(#ffb36b, #ed6300)", opacity: "0" });
        disc.appendChild(t);
        return t;
      });
      discs.style.visibility = "hidden";
      clones.push(fly);
      all.push(fly.animate([{ transform: "none" }, { transform: `translate(${tx}px, ${ty}px) scale(${s})` }], { duration: T.fly * d, easing: EASE, fill: "both" }));
      tints.forEach((t) => all.push(t.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T.fly * 0.7 * d, delay: T.fly * 0.25 * d, easing: "ease-in-out", fill: "both" })));

      // wordmark: "Telepath" → the header's "Telepath"
      const text = [...brand.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
      if (text) {
        const range = document.createRange();
        const start = text.textContent!.indexOf("Telepath");
        range.setStart(text, start);
        range.setEnd(text, start + "Telepath".length);
        const w = range.getBoundingClientRect(), wa = word.getBoundingClientRect();
        const ws = w.height / wa.height;
        const wfly = lift(word);
        word.style.visibility = "hidden";
        clones.push(wfly);
        all.push(wfly.animate(
          [{ transform: "none", color: getComputedStyle(word).color }, { transform: `translate(${w.left - wa.left}px, ${w.top - wa.top}px) scale(${ws})`, color: getComputedStyle(brand).color }],
          { duration: T.fly * d, easing: EASE, fill: "both" },
        ));
      }
    }

    // 1. the landing's copy and signup leave while the logo flies
    for (const el of from.element.querySelectorAll(".landing-copy, .landing-signup"))
      all.push(el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T.gone * d, easing: "ease-out", fill: "forwards" }));
    // 2. after landing: the orange scene fades to paper (nav and html/body above)
    all.push(from.element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T.bg * d, delay: BG, easing: "ease-out", fill: "forwards" }));
    // 3. then the research content rises in, one block after another
    const rise = BG + T.bg * 0.6 * d;
    const glow = to.element.querySelector(".glow");
    if (glow) all.push(glow.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T.bg * d, delay: BG, easing: "ease-out", fill: "both" }));
    [...to.element.querySelectorAll(".hero-grid > *, .post-row")].forEach((el, i) => all.push(el.animate(
      [{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }],
      { duration: T.rise * d, delay: rise + Math.min(i, 6) * T.stagger * d, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "both" },
    )));

    try {
      await Promise.all(all.map((an) => an.finished));
      // hand over to the real header brand
      if (brand) brand.style.opacity = "";
      await Promise.all(clones.map((c) => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T.handoff * d, easing: "ease-out", fill: "forwards" }).finished));
    } catch { /* cancelled by a newer navigation */ }
    clones.forEach((c) => c.remove());
    if (brand) brand.style.opacity = "";
    from.element.querySelector(".landing")?.classList.remove("landing"); // stop html:has(.landing) before the fills go
    // drop fills on persistent / incoming elements so nothing keeps a leftover style
    all.forEach((an) => !from.element.contains((an.effect as KeyframeEffect).target as Node) && an.cancel());
  },
});
