"use client";
import { useEffect, useState } from "react";
import { usePage } from "modulato";

type Section = { id: string; label: string };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Jump links. Without `sections`, it lists the h2s of the page's `.post-body`. */
export function Toc({ sections: given, label = "Contents" }: { sections?: Section[]; label?: string }) {
  const { element } = usePage();
  const [found, setFound] = useState<Section[]>([]);
  const sections = given ?? found;
  const [active, setActive] = useState("");

  useEffect(() => {
    if (given || !element) return;
    // this page only: during a transition the outgoing page is still mounted
    const hs = [...element.querySelectorAll<HTMLHeadingElement>(".post-body h2")];
    hs.forEach((h) => (h.id ||= slug(h.textContent ?? "")));
    setFound(hs.map((h) => ({ id: h.id, label: h.textContent ?? "" })));
  }, [given, element]);

  useEffect(() => {
    const seen = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    sections.forEach((s) => {
      const el = element?.querySelector(`#${CSS.escape(s.id)}`);
      if (el) seen.observe(el);
    });
    return () => seen.disconnect();
  }, [sections, element]);

  const jump = (e: React.MouseEvent, id: string) => {
    const el = element?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth" });
    history.replaceState(history.state, "", `#${id}`);
  };

  if (!sections.length) return null;
  return (
    <nav className="toc" aria-label={label}>
      <ol>
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} onClick={(e) => jump(e, s.id)} data-active={active === s.id ? "" : undefined}>
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
