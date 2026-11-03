import type { Metadata } from "next";
import Link from "next/link";
import { PAPERS } from "@/content/papers";

export const metadata: Metadata = { title: "Research", description: "Interactive explainers for Telepath’s papers." };

// Loops recorded from each paper's live anatomy figure.
const ART: Record<string, string> = { "prospective-coding": "cascade", "self-supervised-rqf": "reed", organics: "carousel" };

export default function ResearchIndex() {
  return (
    <main>
      <section className="index-hero">
        <div className="glow" aria-hidden="true"><span /></div>
        <span className="eyebrow">Telepath Research · NeurIPS 2026</span>
        <h1>Intelligence that keeps time</h1>
        <p>Brains predict how the world is about to change, with circuits made of rhythms. Our papers build that idea into machine learning. Each one has an interactive walkthrough here.</p>
      </section>
      <section className="papers" aria-label="Papers">
        {PAPERS.map((p) => (
          <Link key={p.slug} href={`/research/${p.slug}`} className="paper-card">
            <div className="card-art">
              <video src={`/video/${ART[p.slug]}.mp4`} poster={`/cards/${ART[p.slug]}.jpg`} autoPlay muted loop playsInline aria-hidden="true" />
            </div>
            <div className="card-body">
              <span className="eyebrow">{p.venue} · {p.year}</span>
              <h2>{p.title}</h2>
              <p>{p.hook}</p>
              <div className="chips">{p.tags.map((t) => <span className="chip" key={t}>{t}</span>)}</div>
              <span className="more">Explore the paper →</span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
