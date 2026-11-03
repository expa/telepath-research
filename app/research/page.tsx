import type { Metadata } from "next";
import Link from "next/link";
import { PAPERS } from "@/content/papers";

export const metadata: Metadata = { title: "Research", description: "Telepath’s research, explained." };

// Loops recorded from each paper's live figure.
const ART: Record<string, string> = { "prospective-coding": "cascade", "self-supervised-rqf": "reed", organics: "carousel" };

export default function ResearchIndex() {
  return (
    <main>
      <section className="index-hero">
        <div className="glow" aria-hidden="true"><span /></div>
        <h1>Intelligence that keeps time</h1>
        <p>Brains predict how the world is about to change, using circuits made of rhythms. Our research builds that idea into machine learning. Here are the papers, explained.</p>
      </section>
      <section className="posts" aria-label="Papers">
        {PAPERS.map((p) => (
          <article key={p.slug} className="post-row">
            <Link href={`/research/${p.slug}`} className="post-row-art" tabIndex={-1} aria-hidden="true">
              <video src={`/video/${ART[p.slug]}.mp4`} poster={`/cards/${ART[p.slug]}.jpg`} autoPlay muted loop playsInline />
            </Link>
            <div>
              <p className="post-meta">{p.venue} {p.year}</p>
              <h2><Link href={`/research/${p.slug}`}>{p.headline}</Link></h2>
              <p>{p.dek}</p>
              <p className="post-row-links">
                <Link href={`/research/${p.slug}`}>Read</Link>
                <Link href={`/research/${p.slug}/detailed`}>Detailed walkthrough</Link>
              </p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
