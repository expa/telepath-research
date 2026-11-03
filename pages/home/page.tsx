import { Shared } from "modulato";
import { PAPERS } from "@/content/papers";

// Loops recorded from each paper's live figure.
const ART: Record<string, string> = { "prospective-coding": "cascade", "self-supervised-rqf": "reed", organics: "carousel" };

export default function Home() {
  return (
    <main className="home">
      <section className="index-hero">
        <div className="glow" aria-hidden="true"><span /></div>
        <h1>Intelligence that evolves</h1>
        <p>We are building the first biologically plausible intelligence: one that learns continuously through experience and adapts locally as it operates, the way brains do. Our research is how we get there. Here are the papers, explained.</p>
      </section>
      <section className="posts" aria-label="Papers">
        {PAPERS.map((p) => (
          <article key={p.slug} className="post-row">
            <a href={`/research/${p.slug}`} className="post-row-art" tabIndex={-1} aria-hidden="true">
              <video src={`/video/${ART[p.slug]}.mp4`} poster={`/cards/${ART[p.slug]}.jpg`} autoPlay muted loop playsInline />
            </a>
            <div>
              <p className="post-meta">{p.venue} {p.year}</p>
              <Shared id={`title:${p.slug}`}><h2><a href={`/research/${p.slug}`}>{p.headline}</a></h2></Shared>
              <p>{p.dek}</p>
              <p className="post-row-links">
                <a href={`/research/${p.slug}`}>Read</a>
                <a href={`/research/${p.slug}/detailed`}>Detailed walkthrough</a>
              </p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
