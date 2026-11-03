import { transition } from "modulato";

const SLIDE = 48; // px
const OUT = "cubic-bezier(0.4, 0, 1, 1)";
const IN = "cubic-bezier(0, 0, 0.2, 1)";

/** Rail and content of a page; pages without the post frame are all content. */
function parts(page: HTMLElement) {
  const main = page.querySelector("main");
  if (!main?.classList.contains("post")) return { rail: [] as Element[], content: main ? [main] : [page] };
  const kids = [...main.children];
  return { rail: kids.filter((k) => k.classList.contains("post-rail")), content: kids.filter((k) => !k.classList.contains("post-rail")) };
}

/** Page → page: the sidebar stays put and crossfades to the new page's details; the old content slides out left, the new slides in from the right. */
export default transition({
  async run({ from, to }) {
    const d = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;
    const a = parts(from.element), b = parts(to.element);
    // the outgoing page lies on top; its opaque background would hide the incoming content as it fades in
    const fm = from.element.querySelector("main");
    if (fm) fm.style.background = "transparent";
    const all: Animation[] = [];
    const run = (els: Element[], x: [number, number], o: [number, number], duration: number, delay: number, easing: string) =>
      els.forEach((el) =>
        all.push(el.animate(
          [{ opacity: o[0], transform: `translateX(${x[0]}px)` }, { opacity: o[1], transform: `translateX(${x[1]}px)` }],
          { duration: duration * d, delay: delay * d, easing, fill: "both" },
        )),
      );
    run(a.rail, [0, 0], [1, 0], 360, 120, "ease");
    run(b.rail, [0, 0], [0, 1], 360, 120, "ease");
    run(a.content, [0, -SLIDE], [1, 0], 300, 0, OUT);
    run(b.content, [SLIDE, 0], [0, 1], 460, 240, IN);
    await Promise.all(all.map((an) => an.finished)).catch(() => {});
    // drop the fills so the incoming page keeps no leftover transform (it would break position: sticky/fixed inside)
    all.forEach((an) => an.cancel());
  },
});
