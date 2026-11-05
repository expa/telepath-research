import { intro } from "modulato";

/**
 * First load of a post or walkthrough: fade in only the blocks on screen, not the whole page.
 * Fading the page element made the full-length post one animated layer, and iOS Safari only draws such a layer
 * near the viewport, so scrolling during the fade showed blank, cropped content until it ended.
 */
export default intro({
  async run({ element }) {
    const vh = innerHeight, picked: Element[] = [];
    const visit = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (!r.height || r.bottom <= 0 || r.top >= vh) return;
      // never animate anything much taller than the screen: split it into its children instead
      if (r.height > vh && el.children.length) [...el.children].forEach(visit);
      else picked.push(el);
    };
    const main = element.querySelector("main.post");
    if (!main) return;
    [...main.children].forEach(visit);
    await Promise.all(picked.map((el) =>
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: "ease", fill: "backwards" }).finished.catch(() => {}),
    ));
  },
});
