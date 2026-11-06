import { CascadeBenchFigure } from "@/components/v2/figures/cascade-bench";
import { ReedBankFigure } from "@/components/v2/figures/reed-bank";
import { OrganicsCarouselFigure } from "@/components/v2/figures/organics-carousel";
import { GovernorFigure } from "@/components/v2/figures/governor";
import { EnergyDishFigure } from "@/components/v2/figures/energy-dish";
import { PAPERS } from "@/content/papers";

const ART = {
  "prospective-coding": CascadeBenchFigure,
  "self-supervised-rqf": ReedBankFigure,
  "long-timescales": GovernorFigure,
  "unconditional-stability": EnergyDishFigure,
  organics: OrganicsCarouselFigure,
};

export function ResearchCards() {
  return (
    <section className="landing-papers" id="research" aria-label="Our research">
      <div className="landing-paper-list">
        {PAPERS.map((paper) => {
          const Art = ART[paper.slug as keyof typeof ART];
          return (
            <article className="landing-paper" key={paper.slug}>
              <div className="landing-paper-copy">
                <p className="landing-paper-meta">{paper.venue} · {paper.year}</p>
                <h3>
                  <a href={`/research/${paper.slug}`} className="landing-paper-link">
                    {paper.headline}
                  </a>
                </h3>
                <p className="landing-paper-dek">{paper.dek}</p>
                <span className="landing-paper-action" aria-hidden="true">Read the research <span>→</span></span>
              </div>
              <div className="landing-paper-visual" aria-hidden="true" inert>
                <div className="landing-paper-art"><Art bare speed={0.35} amplitude={0.55} /></div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
