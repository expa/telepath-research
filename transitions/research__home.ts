import { transition } from "modulato";

/**
 * Research → home: the research page and nav fade away, revealing the landing's orange; the landing
 * then replays its own load intro (it mounts fresh, so its effects run the whole sequence again).
 */
export default transition({
  async run({ from }) {
    const d = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;
    const header = document.querySelector<HTMLElement>(".site-header");
    // the header is now fixed (out of flow), so the outlet moved up by its height: keep the old page in place
    if (header) from.element.style.top = `${(parseFloat(from.element.style.top) || 0) + header.offsetHeight}px`;
    const fade = { duration: 450 * d, easing: "ease-out", fill: "forwards" } as const;
    const all = [from.element.animate([{ opacity: 1 }, { opacity: 0 }], fade)];
    if (header) all.push(header.animate([{ opacity: 1 }, { opacity: 0 }], fade));
    try { await Promise.all(all.map((a) => a.finished)); } catch { /* superseded */ }
  },
});
