"use client";
import { useEffect, useState } from "react";

export function Toc({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState("");
  useEffect(() => {
    const seen = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) seen.observe(el);
    });
    return () => seen.disconnect();
  }, [sections]);
  return (
    <nav className="toc" aria-label="Contents">
      <span className="eyebrow">Contents</span>
      <ol>
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} data-active={active === s.id ? "" : undefined}>
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
