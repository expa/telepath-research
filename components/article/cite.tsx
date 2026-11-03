"use client";
import { useState } from "react";
import type { Paper } from "@/content/papers";

const list = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);

export const bibtexOf = (p: Paper) => {
  const key = `${p.authors[0].split(" ").pop()!.toLowerCase()}${p.year}${p.short.split(/\W/)[0].toLowerCase()}`;
  const [kind, field] = p.venueKind === "Journal" ? ["article", "journal"] : ["inproceedings", "booktitle"];
  return `@${kind}{${key},\n  title     = {${p.title}},\n  author    = {${p.authors.join(" and ")}},\n  ${field.padEnd(9)} = {${p.citeVenue}},\n  year      = {${p.year}}\n}`;
};

/** One readable reference, with the BibTeX a click away. */
export function Cite({ paper }: { paper: Paper }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(bibtexOf(paper));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <section className="cite" aria-label="Cite this paper">
      <div className="cite-head">
        <span>Cite</span>
        <button type="button" className="cite-copy" onClick={copy} aria-live="polite">{copied ? "Copied" : "Copy BibTeX"}</button>
      </div>
      <p className="cite-ref">
        {list(paper.authors)}. {paper.year}. {paper.title}. <i>{paper.citeVenue}</i>.
      </p>
    </section>
  );
}
