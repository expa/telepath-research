import katex from "katex";
import type { Paper } from "@/content/papers";
import { PAPERS } from "@/content/papers";
import { PaperFoot, PaperLayout } from "@/components/v2/post/post";
import { Cite } from "@/components/v2/article/cite";

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

export function Article({ paper, sections, children }: { paper: Paper; sections: { id: string; label: string }[]; children: React.ReactNode }) {
  const i = PAPERS.findIndex((p) => p.slug === paper.slug);
  const next = PAPERS[(i + 1) % PAPERS.length];
  return (
    <PaperLayout
      paper={paper}
      title={<h1 className="long">{paper.title}</h1>}
      back={<a className="post-back" href={`/research-2/${paper.slug}`}><span aria-hidden="true">←</span> {paper.headline}</a>}
      sections={sections}
    >
      <article className="article">
        <p className="prose article-lede">{paper.summary}</p>
        {children}
        <PaperFoot paper={paper} other={{ href: `/research-2/${paper.slug}`, title: "Blog post", sub: "An overview of the breakthrough and the key ideas behind it" }} next={{ href: `/research-2/${next.slug}/detailed`, title: next.title }}>
          <Cite paper={paper} />
        </PaperFoot>
      </article>
    </PaperLayout>
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
