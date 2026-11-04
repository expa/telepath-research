import { Shared } from "modulato";
import { CascadeBenchFigure } from "@/components/figures/cascade-bench";
import { ReedBankFigure } from "@/components/figures/reed-bank";
import { OrganicsCarouselFigure } from "@/components/figures/organics-carousel";
import { PAPERS } from "@/content/papers";

// Each paper's live figure, running on its own idle loop.
const ART: Record<string, (p: { bare?: boolean }) => React.JSX.Element> = { "prospective-coding": CascadeBenchFigure, "self-supervised-rqf": ReedBankFigure, organics: OrganicsCarouselFigure };

export default function Research() {
  return (
    <main className="home grid">
      <section className="index-hero">
        <div className="glow" aria-hidden="true"><span /></div>
        <div className="hero-grid">
          <h1>Intelligence that evolves</h1>
          <p>We are building the first biologically plausible intelligence: one that learns continuously through experience and adapts locally as it operates, the way brains do. Our research is how we get there. Here are the papers, explained.</p>
        </div>
      </section>
      <section className="posts" aria-label="Papers">
        {PAPERS.map((p) => (
          <article key={p.slug} className="post-row">
            <a href={`/research/${p.slug}`} className="post-row-art" tabIndex={-1} aria-hidden="true">
              <div inert>{(() => { const Art = ART[p.slug]; return <Art bare />; })()}</div>
            </a>
            <div>
              <p className="post-meta">{p.venue} {p.year}</p>
              <Shared id={`title:${p.slug}`}><h2><a href={`/research/${p.slug}`}>{p.headline}</a></h2></Shared>
              <Shared id={`dek:${p.slug}`}><p className="post-row-dek">{p.dek}</p></Shared>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
