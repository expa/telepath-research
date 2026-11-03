import Link from "next/link";
import type { Paper } from "@/content/papers";
import { PAPERS } from "@/content/papers";

/** A short, plain-language post: no cards, no counters, just text and figures on the page. */
export function Post({ paper, children }: { paper: Paper; children: React.ReactNode }) {
  const i = PAPERS.findIndex((p) => p.slug === paper.slug);
  const next = PAPERS[(i + 1) % PAPERS.length];
  return (
    <main className="post">
      <header className="post-head">
        <div className="glow" aria-hidden="true"><span /></div>
        <p className="post-meta">{paper.venue} {paper.year} · {paper.authors.join(", ")}</p>
        <h1>{paper.headline}</h1>
        <p className="post-dek">{paper.dek}</p>
        <p className="post-links">
          <a href={paper.pdf} target="_blank" rel="noreferrer">Read the paper</a>
          <Link href={`/research/${paper.slug}/detailed`}>Detailed walkthrough</Link>
          {paper.code ? <a href={paper.code} target="_blank" rel="noreferrer">Code</a> : null}
        </p>
      </header>
      <article className="post-body">
        {children}
        <footer className="post-foot">
          <p>
            Want the equations and every experiment? Read the <Link href={`/research/${paper.slug}/detailed`}>detailed walkthrough</Link> or the <a href={paper.pdf} target="_blank" rel="noreferrer">paper</a>, “{paper.title}”.
          </p>
          <p className="post-next">
            Next: <Link href={`/research/${next.slug}`}>{next.headline} →</Link>
          </p>
        </footer>
      </article>
    </main>
  );
}

export const Fig = ({ children, caption, wide = true }: { children: React.ReactNode; caption?: React.ReactNode; wide?: boolean }) => (
  <figure className={wide ? "post-fig wide" : "post-fig"}>
    {children}
    {caption ? <figcaption>{caption}</figcaption> : null}
  </figure>
);

/** Big plain numbers inline in the text column. */
export const Facts = ({ items }: { items: [string, string][] }) => (
  <dl className="post-facts">
    {items.map(([v, l]) => (
      <div key={l}><dt>{v}</dt><dd>{l}</dd></div>
    ))}
  </dl>
);
