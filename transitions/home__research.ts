import { transition } from "modulato";
import { FLY, landingFlight } from "@/lib/landing-flight";

const T = { bg: 500, handoff: 260, rise: 600, stagger: 80, gone: 300 }; // ms

/**
 * Home → research. The landing logo flies into the header brand and "Intelligence that evolves" flies
 * into the research title while the rest of the landing copy fades. Once they land, the orange gives
 * way to paper and the nav fades in; then the remaining research content rises in, staggered.
 */
export default transition({
  async run({ from, to }) {
    const d = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;
    const header = document.querySelector<HTMLElement>(".site-header");

    // The header mounts with the new route and pushes the outlet down; keep the landing where it was.
    if (header) from.element.style.top = `${(parseFloat(from.element.style.top) || 0) - header.offsetHeight}px`;

    const flight = header ? landingFlight(from.element, header, to.element.querySelector("h1"), { delay: 0, duration: FLY * d }) : null;
    const all: Animation[] = [...(flight?.anims ?? [])];
    const BG = FLY * d; // background + nav start once the logo has landed
    const after = (duration: number, delay: number, fill: FillMode = "both") => ({ duration: duration * d, delay, easing: "ease-out", fill });

    // 1. the landing's other copy and signup leave during the flight
    for (const el of from.element.querySelectorAll(".landing-copy, .landing-signup"))
      all.push(el.animate([{ opacity: 1 }, { opacity: 0 }], after(T.gone, 0, "forwards")));
    // 2. after landing: the orange scene fades to paper and the nav fades in
    if (header) all.push(header.animate([{ opacity: 0 }, { opacity: 1 }], after(T.bg, BG)));
    all.push(from.element.animate([{ opacity: 1 }, { opacity: 0 }], after(T.bg, BG, "forwards")));
    // the landing paints html/body orange (html:has(.landing)); ease them to the paper color too
    const paper = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() || "#fbf7f2";
    for (const el of [document.documentElement, document.body])
      all.push(el.animate([{ backgroundColor: getComputedStyle(el).backgroundColor }, { backgroundColor: paper }], after(T.bg, BG, "forwards")));
    const glow = to.element.querySelector(".glow");
    if (glow) all.push(glow.animate([{ opacity: 0 }, { opacity: 1 }], after(T.bg, BG)));
    // 3. then the rest of the research content rises in, one block after another (the title is already there)
    const rise = BG + T.bg * 0.6 * d;
    [...to.element.querySelectorAll(".hero-grid > p, .post-row")].forEach((el, i) => all.push(el.animate(
      [{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }],
      { duration: T.rise * d, delay: rise + Math.min(i, 6) * T.stagger * d, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "both" },
    )));

    try {
      await Promise.all(all.map((an) => an.finished));
      await flight?.land(T.handoff * d);
    } catch { flight?.abort(); /* cancelled by a newer navigation */ }
    from.element.querySelector(".landing")?.classList.remove("landing"); // stop html:has(.landing) before the fills go
    // drop fills on persistent / incoming elements so nothing keeps a leftover style
    all.forEach((an) => !from.element.contains((an.effect as KeyframeEffect).target as Node) && an.cancel());
  },
});
