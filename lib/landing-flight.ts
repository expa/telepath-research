// The landing ↔ research hand-off: the landing logo becomes the header brand and the landing title
// becomes the research page title. Clones of the landing pieces fly between the two layouts; played
// forward (home → research) or reversed (research → home) by the two transitions.

export const FLY = 850; // ms
const EASE = "cubic-bezier(0.65, 0, 0.2, 1)";
export const REVEAL_EVENT = "landing:reveal"; // tells a returning landing to load the rest of its content

/** Union of the discs' on-screen (projected) boxes: what the eye reads as the symbol. */
function symbolBox(discs: HTMLElement) {
  const rs = [...discs.children].map((c) => c.getBoundingClientRect());
  const left = Math.min(...rs.map((r) => r.left)), top = Math.min(...rs.map((r) => r.top));
  return { left, top, width: Math.max(...rs.map((r) => r.right)) - left };
}

/** Fixed-position copy of `el` sitting exactly where it is now, above both pages. */
function lift<E extends HTMLElement>(el: E): E {
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  const c = el.cloneNode(true) as E;
  Object.assign(c.style, {
    position: "fixed", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: "0",
    zIndex: "60", pointerEvents: "none", transformOrigin: "0 0", animation: "none", visibility: "visible", opacity: "1", filter: "none",
    font: cs.font, letterSpacing: cs.letterSpacing, color: cs.color, lineHeight: cs.lineHeight,
  });
  document.body.appendChild(c);
  return c;
}

const textRects = (el: Node) => { const r = document.createRange(); r.selectNodeContents(el); return [...r.getClientRects()]; };
/** Transform that moves `clone` (transform-origin 0 0) so its glyphs at `from` land exactly on `to`. */
function onto(clone: HTMLElement, from: DOMRect, to: DOMRect) {
  const o = clone.getBoundingClientRect(), s = to.height / from.height;
  return `translate(${to.left - o.left - s * (from.left - o.left)}px, ${to.top - o.top - s * (from.top - o.top)}px) scale(${s})`;
}
const em = (cs: CSSStyleDeclaration) => `${(parseFloat(cs.letterSpacing) || 0) / parseFloat(cs.fontSize)}em`;

export function landingFlight(landing: HTMLElement, header: HTMLElement, title: HTMLElement | null, t: { delay: number; duration: number; reverse?: boolean }) {
  const anims: Animation[] = [], clones: HTMLElement[] = [], hidden: HTMLElement[] = [];
  const opts: KeyframeAnimationOptions = { duration: t.duration, delay: t.delay, easing: EASE, fill: "both", direction: t.reverse ? "reverse" : "normal" };
  const hide = (...els: HTMLElement[]) => els.forEach((el) => { el.style.visibility = "hidden"; hidden.push(el); });
  const brand = header.querySelector<HTMLElement>(".brand"), mark = brand?.querySelector("svg");
  const discs = landing.querySelector<HTMLElement>(".landing-discs"), word = landing.querySelector<HTMLElement>(".landing-logo b");

  if (brand && mark && discs && word) {
    // symbol: projected disc box → the drawn ellipses of the 24-unit mark (x 2–22, y 2–21)
    const a = symbolBox(discs), m = mark.getBoundingClientRect(), u = m.width / 24;
    const fly = lift(discs), c = fly.getBoundingClientRect(), s = (20 * u) / a.width;
    const tx = m.left + 2 * u - c.left - (a.left - c.left) * s, ty = m.top + 2 * u - c.top - (a.top - c.top) * s;
    clones.push(fly);
    anims.push(fly.animate([{ transform: "none" }, { transform: `translate(${tx}px, ${ty}px) scale(${s})` }], opts));
    // each disc gains a layer in the mark's gradient that fades up on the way: cream → orange
    for (const disc of fly.children) {
      const tint = document.createElement("i");
      Object.assign(tint.style, { position: "absolute", inset: "0", borderRadius: "inherit", background: "linear-gradient(#ffb36b, #ed6300)" });
      disc.appendChild(tint);
      anims.push(tint.animate([{ opacity: 0 }, { opacity: 0, offset: 0.25 }, { opacity: 1, offset: 0.95 }, { opacity: 1 }], { ...opts, easing: "linear" }));
    }

    // wordmark → the header's "Telepath"
    const text = [...brand.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
    if (text) {
      const wfly = lift(word), a = getComputedStyle(word), b = getComputedStyle(brand);
      Object.assign(wfly.style, { width: "auto", whiteSpace: "nowrap" });
      clones.push(wfly);
      anims.push(wfly.animate([
        { transform: "none", color: a.color, letterSpacing: em(a) },
        { transform: onto(wfly, textRects(wfly)[0], textRects(text)[0]), color: b.color, letterSpacing: em(b) },
      ], opts));
    }
    hide(discs, word, brand);
  }

  // title: each landing line flies onto the matching line of the research title
  const h1 = landing.querySelector<HTMLElement>("h1");
  const lines = h1 ? [...h1.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim()) : [];
  const targets = title ? textRects(title) : [];
  if (h1 && title && lines.length === targets.length) {
    const a = getComputedStyle(h1), b = getComputedStyle(title);
    lines.forEach((line, i) => {
      const from = textRects(line)[0], to = targets[i];
      const span = document.createElement("span");
      span.textContent = line.textContent!.trim();
      Object.assign(span.style, {
        position: "fixed", left: `${from.left}px`, top: `${from.top}px`, zIndex: "60", pointerEvents: "none", whiteSpace: "nowrap",
        transformOrigin: "0 0", fontFamily: a.fontFamily, fontSize: a.fontSize, fontWeight: a.fontWeight, letterSpacing: a.letterSpacing, lineHeight: "1",
      });
      document.body.appendChild(span);
      const own = textRects(span)[0]; // line boxes and glyph boxes differ a little; line the glyphs up exactly
      span.style.left = `${2 * from.left - own.left}px`;
      span.style.top = `${2 * from.top - own.top}px`;
      clones.push(span);
      anims.push(span.animate([
        { transform: "none", color: a.color, fontWeight: a.fontWeight, letterSpacing: em(a) },
        { transform: onto(span, from, to), color: b.color, fontWeight: b.fontWeight, letterSpacing: em(b) },
      ], opts));
    });
    hide(h1, title);
  }

  return {
    anims,
    /** Show the real elements again and fade the clones off them. */
    async land(duration: number) {
      hidden.forEach((el) => (el.style.visibility = ""));
      await Promise.all(clones.map((c) => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: "ease-out", fill: "forwards" }).finished)).catch(() => {});
      clones.forEach((c) => c.remove());
    },
    /** Remove everything at once (navigation superseded). */
    abort() { hidden.forEach((el) => (el.style.visibility = "")); clones.forEach((c) => c.remove()); },
  };
}
