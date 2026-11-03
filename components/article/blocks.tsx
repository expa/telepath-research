import katex from "katex";
import type { Paper } from "@/content/papers";
import { PAPERS } from "@/content/papers";
import { Toc } from "./toc";

/** Display or inline TeX, rendered on the server. */
export function Eq({ tex, note, inline = false }: { tex: string; note?: React.ReactNode; inline?: boolean }) {
  const html = katex.renderToString(tex, { displayMode: !inline, throwOnError: false, strict: false });
  if (inline) return <span dangerouslySetInnerHTML={{ __html: html }} />;
  return (
    <div className="eq">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {note ? <span className="eq-note">{note}</span> : null}
    </div>
  );
}
export const M = ({ children }: { children: string }) => <Eq tex={children} inline />;

export function ArticleHero({ paper }: { paper: Paper }) {
  return (
    <section className="article-hero">
      <div className="glow" aria-hidden="true"><span /></div>
      <div className="article-hero-inner">
        <span className="eyebrow">{paper.venue} · {paper.year}</span>
        <h1>{paper.title}</h1>
        <p className="dek">{paper.summary}</p>
        <div className="byline">
          {paper.authors.map((a) => (
            <strong key={a}>{a}</strong>
          ))}
        </div>
        <div className="actions">
          <a className="btn ghost" href={`/research/${paper.slug}`}>Short version</a>
          <a className="btn" href={paper.pdf} target="_blank" rel="noreferrer" data-native>Read the paper (PDF)</a>
          {paper.code ? (
            <a className="btn ghost" href={paper.code} target="_blank" rel="noreferrer">
              {paper.code.includes("github") ? "Code" : "Simulation code"}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function Article({ paper, sections, children }: { paper: Paper; sections: { id: string; label: string }[]; children: React.ReactNode }) {
  const i = PAPERS.findIndex((p) => p.slug === paper.slug);
  const next = PAPERS[(i + 1) % PAPERS.length];
  return (
    <main>
      <ArticleHero paper={paper} />
      <article className="article">
        <Toc sections={sections} />
        {children}
        <div className="cite">
          <span className="eyebrow">Cite</span>
          <pre>{`@article{${paper.authors[0].split(" ").pop()!.toLowerCase()}${paper.year},
  title   = {${paper.title}},
  author  = {${paper.authors.join(" and ")}},
  journal = {${paper.venue}},
  year    = {${paper.year}}
}`}</pre>
        </div>
        <div className="next-paper">
          <span className="eyebrow">Next paper</span>
          <a href={`/research/${next.slug}/detailed`}>
            <b>{next.title}</b>
          </a>
        </div>
      </article>
    </main>
  );
}

export function Section({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="prose" aria-labelledby={id}>
      <h2 id={id}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Tldr({ items }: { items: React.ReactNode[] }) {
  return (
    <aside className="tldr" aria-label="In short">
      <h2>In short</h2>
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </aside>
  );
}

export function Callout({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="callout">
      <span className="eyebrow">{label}</span>
      <p>{children}</p>
    </div>
  );
}

export function Stats({ items }: { items: { value: React.ReactNode; label: string }[] }) {
  return (
    <div className="stats">
      {items.map((s) => (
        <div className="stat" key={s.label}>
          <b>{s.value}</b>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

