import { Shared } from "modulato";
import type { Paper } from "@/content/papers";
import { PAPERS } from "@/content/papers";
import { Toc } from "@/components/article/toc";

export const dateOf = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

type Section = { id: string; label: string };

/** Shared page frame for posts and detailed walkthroughs: side rail, left-aligned header, one text column. */
export function PaperLayout({ paper, title, dek, links, sections, children }: { paper: Paper; title: React.ReactNode; dek: React.ReactNode; links: React.ReactNode; sections?: Section[]; children: React.ReactNode }) {
  return (
    <main className="post">
      <aside className="post-rail">
        <div className="post-rail-inner">
          <dl className="post-details">
            <div><dt>Published</dt><dd><time dateTime={paper.published}>{dateOf(paper.published)}</time></dd></div>
            <div><dt>Authors</dt>{paper.authors.map((a) => <dd key={a}>{a}</dd>)}</div>
            <div><dt>{paper.venueKind}</dt><dd>{paper.venueFull}</dd></div>
          </dl>
          <Toc sections={sections} />
        </div>
      </aside>
      <header className="post-head">
        <div className="glow" aria-hidden="true"><span /></div>
        {title}
        {dek}
        <p className="post-links">
          <a className="primary" href={paper.pdf} target="_blank" rel="noreferrer" data-native>Read the full paper</a>
          {links}
          {paper.code ? <a href={paper.code} target="_blank" rel="noreferrer">Code</a> : null}
        </p>
      </header>
      {children}
    </main>
  );
}

/** A short, plain-language post: no cards, no counters, just text and figures on the page. */
export function Post({ paper, children }: { paper: Paper; children: React.ReactNode }) {
  const i = PAPERS.findIndex((p) => p.slug === paper.slug);
  const next = PAPERS[(i + 1) % PAPERS.length];
  return (
    <PaperLayout
      paper={paper}
      title={<Shared id={`title:${paper.slug}`}><h1>{paper.headline}</h1></Shared>}
      dek={<Shared id={`dek:${paper.slug}`}><p className="post-dek">{paper.dek}</p></Shared>}
      links={<a href={`/research/${paper.slug}/detailed`}>Detailed walkthrough</a>}
    >
      <article className="post-body">
        {children}
        <footer className="post-foot">
          <p>
            Want the equations and every experiment? Read the <a href={`/research/${paper.slug}/detailed`}>detailed walkthrough</a> or <a href={paper.pdf} target="_blank" rel="noreferrer" data-native>read the full paper</a>, “{paper.title}”.
          </p>
          <p className="post-next">
            Next: <a href={`/research/${next.slug}`}>{next.headline} →</a>
          </p>
        </footer>
      </article>
    </PaperLayout>
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
