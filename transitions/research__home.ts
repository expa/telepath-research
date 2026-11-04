import { transition } from "modulato";
import { FLY, REVEAL_EVENT, landingFlight } from "@/lib/landing-flight";

const T = { out: 450, handoff: 260 }; // ms

/**
 * Research → home: the forward transition played backwards. The research content and nav fade away onto
 * the landing's orange while the brand and title stay; then they fly back into the landing logo and title,
 * and the landing loads the rest of its content (it skips its own intro when arriving from research).
 */
export default transition({
  async run({ from, to }) {
    const d = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;
    const header = document.querySelector<HTMLElement>(".site-header");
    // the header is now fixed (out of flow), so the outlet moved up by its height: keep the old page in place
    if (header) from.element.style.top = `${(parseFloat(from.element.style.top) || 0) + header.offsetHeight}px`;

    const flight = header ? landingFlight(to.element, header, from.element.querySelector("h1"), { delay: T.out * d, duration: FLY * d, reverse: true }) : null;
    const fade = { duration: T.out * d, easing: "ease-out", fill: "forwards" } as const;
    const all = [...(flight?.anims ?? []), from.element.animate([{ opacity: 1 }, { opacity: 0 }], fade)];
    if (header) all.push(header.animate([{ opacity: 1 }, { opacity: 0 }], fade));
    try {
      await Promise.all(all.map((a) => a.finished));
      dispatchEvent(new Event(REVEAL_EVENT));
      await flight?.land(T.handoff * d);
    } catch { flight?.abort(); dispatchEvent(new Event(REVEAL_EVENT)); }
  },
});
