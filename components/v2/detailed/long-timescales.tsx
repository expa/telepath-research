import { Article, Callout, Eq, M, Section, Tldr } from "@/components/v2/article/blocks";
import { Facts, Fig } from "@/components/v2/post/post";
import { paperOf } from "@/content/papers";
import { GovernorFigure } from "@/components/v2/figures/governor";
import { CorrelationPlot } from "@/components/widgets/charts";

const paper = paperOf("long-timescales");

const SECTIONS = [
  { id: "problem", label: "Slow memory from fast parts" },
  { id: "edge", label: "The fine-tuning problem" },
  { id: "model", label: "One gain unit" },
  { id: "pinning", label: "Pinned to the edge" },
  { id: "stability", label: "Stable and critical at once" },
  { id: "correlations", label: "Scale-free correlations" },
  { id: "meaning", label: "What it means" },
];

export default function Page() {
  return (
    <Article paper={paper} sections={SECTIONS}>
      <Tldr
        items={[
          <>In a linear recurrent network, long timescales and power-law correlations appear only when the top eigenvalue of the connectivity sits <strong>exactly at the edge of stability</strong>. That takes fine tuning.</>,
          <>We add <strong>one gain unit</strong> that pools the network’s total activity and scales every recurrent synapse by <M>{"(1-a)"}</M>, the pooled feedback known as normalization.</>,
          <>Above a threshold coupling, the gain settles at the value that puts the top eigenvalue of <M>{"(1-a^*)M"}</M> <strong>exactly at 1</strong>, for any coupling strength and for the particular matrix drawn.</>,
          <>The critical point of the linear model becomes a <strong>critical phase</strong>: correlations decay as <M>{"\\sqrt{2/\\pi t}"}</M>, a prediction with no free parameters, cut off at <M>{"t_{\\max}\\propto N^{2/3}"}</M>.</>,
        ]}
      />

      <Section id="problem" n={1} title="Slow memory from fast parts">
        <p className="lead">Neurons integrate over milliseconds, yet the brain holds and uses information over seconds, hours and years, from working memory to motor learning.</p>
        <p>The minimal model of how fast parts produce slow behavior is a linear stochastic network of <M>{"N"}</M> recurrently connected neurons,</p>
        <Eq tex={String.raw`\tau_x\,\dot x_i = -x_i + \sum_{j=1}^{N} M_{ij}\,x_j + \xi_i`} note="ξ is weak white noise." />
        <p>Each eigenmode of <M>{"M"}</M> relaxes with its own time constant <M>{"\\tau_\\lambda = \\tau_x/(1-\\lambda)"}</M>, so a large network already has a whole spectrum of timescales. But it is a spectrum of <em>short</em> ones: any mode with <M>{"\\lambda"}</M> well below 1 relaxes within a few <M>{"\\tau_x"}</M>. Long timescales only appear as eigenvalues approach the stability edge, <M>{"\\lambda\\to1^-"}</M>, where <M>{"\\tau_\\lambda"}</M> diverges.</p>
      </Section>

      <Section id="edge" n={2} title="The fine-tuning problem">
        <p>Everything hinges on the top of the spectrum. If the eigenvalue density has a gap below 1, all correlations decay exponentially on the timescale of the slowest mode. If instead it is gapless, with <M>{"\\rho(\\lambda)\\propto(1-\\lambda)^\\alpha"}</M> near the edge, correlations decay algebraically, <M>{"C(t)\\sim t^{-\\alpha}"}</M>, with no characteristic scale.</p>
        <p>Power-law correlations are measured consistently across individuals and species. But in the linear model they exist only for one special value of the coupling strength. Development, plasticity and evolution guarantee that no two brains are wired alike, so something beyond the couplings themselves must put the network at the edge and keep it there.</p>
        <p>Earlier proposals shape the statistics of the connectivity so that the spectrum is gapless by construction, which trades one fine tuning for another; let plasticity slowly correct the weights, which acts on hours to days; or gate every neuron multiplicatively, which needs <M>{"O(N)"}</M> extra variables.</p>
      </Section>

      <Section id="model" n={3} title="One gain unit">
        <p>We add a single unit <M>{"a"}</M> that pools the total activity <M>{"\\lVert x\\rVert^2"}</M> and feeds back by scaling every recurrent synapse by the same factor:</p>
        <Eq tex={String.raw`\tau_x\,\dot x_i = -x_i + (1-a)\sum_j M_{ij}\,x_j + \xi_i,\qquad \tau_a\,\dot a = -a + \sigma^2 + a\sum_i x_i^2`} note="0 < σ² < 1 is a small floor for the gain; we use σ² = 0.1 and τx = τa = 1." />
        <p>The gain unit is blind to the individual weights. It senses only how active the network is and suppresses all couplings uniformly, exactly the pooled divisive feedback of normalization, a canonical computation found throughout the cortex and mediated by interneurons.</p>
        <p>Take <M>{"M"}</M> from the Gaussian Orthogonal Ensemble with strength <M>{"c"}</M>, so its eigenvalues fill the semicircle on <M>{"[-\\sqrt2 c,\\sqrt2 c]"}</M>. Rotating into the eigenbasis, <M>{"y = O^\\top x"}</M>, each mode relaxes at a rate that depends on the gain,</p>
        <Eq tex={String.raw`\tau_x\,\dot y_i = -\gamma_i(a)\,y_i + \tilde\xi_i,\qquad \gamma_i(a) = 1-(1-a)\lambda_i`} />
        <p>At a fixed gain this is just a linear network with matrix <M>{"(1-a)M"}</M>. But the gain is driven by the activity, and any change in it moves every decay rate at once.</p>
      </Section>

      <Fig caption="The paper’s top mode and gain unit, as a flyball governor. Activity spins the head; the balls’ opening is the gain a, which scales every connection by (1 − a). The dial reads the top eigenvalue of the effective connections, (1 − a)λ_N. Use the slider to change the coupling c: below c ≈ 0.79 the needle rests short of the edge; above it, it swings and settles on 1.">
        <GovernorFigure bare />
      </Fig>

      <Section id="pinning" n={4} title="Pinned to the edge">
        <p>Without noise there are two kinds of fixed point. The silent one, <M>{"y^*=0,\\ a^*=\\sigma^2"}</M>, is stable while every rate <M>{"1-(1-\\sigma^2)\\lambda_i"}</M> is positive, which for the GOE means</p>
        <Eq tex={String.raw`c < c_{\text{crit}} = \frac{1}{\sqrt2\,(1-\sigma^2)} \approx 0.79`} />
        <p>Below threshold the model behaves like the linear one. Above it, the top mode grows, the growing activity drives the gain up, and the gain shrinks the effective coupling until growth stops. At any active fixed point every mode must satisfy <M>{"\\gamma_i(a^*)\\,y_i=0"}</M>, and since the rates are distinct, only one mode can be on. Picking mode <M>{"k"}</M> leaves every eigenvalue above <M>{"\\lambda_k"}</M> as an unstable direction, so stability selects the top mode automatically:</p>
        <Eq tex={String.raw`a^* = 1-\frac{1}{\lambda_N},\qquad (y_N^*)^2 = 1-\frac{\sigma^2}{a^*},\qquad y_i^*=0\ \ (i<N)`} />
        <Callout label="The core of the mechanism">γ_N(a*) = 0 means (1 − a*)λ_N = 1. The gain settles at precisely the value that puts the top eigenvalue of the effective matrix on the stability edge, for any c above threshold. And it locks onto the realized λ_N of the particular matrix, not the ensemble average, so it is robust to how each network happens to be wired.</Callout>
      </Section>

      <Section id="stability" n={5} title="Stable and critical at once">
        <p>Linearize around the active fixed point. The gain talks to the modes only through <M>{"\\lVert y\\rVert^2"}</M>, and since every transverse mode is silent there, the Jacobian splits into <M>{"N-1"}</M> independent transverse rates and a 2×2 block for the active mode and the gain:</p>
        <Eq tex={String.raw`\mu_i = -\Big(1-\frac{\lambda_i}{\lambda_N}\Big) < 0,\qquad J_2 = \begin{pmatrix} 0 & -y_N^*\lambda_N \\ 2a^*y_N^* & -\sigma^2/a^* \end{pmatrix}`} />
        <p>The coupling <M>{"c"}</M> only sets the overall scale of the spectrum, so it cancels from the ratios <M>{"\\lambda_i/\\lambda_N"}</M>. The gain has erased exactly the one parameter that needed tuning.</p>
        <p>Both eigenvalues of <M>{"J_2"}</M> have negative real part for every <M>{"c>c_{\\text{crit}}"}</M>. The active mode’s own decay rate is zero by construction, the 0 in the corner of <M>{"J_2"}</M>, but its coupling to the gain makes the pair strictly stable, and it spirals into the fixed point: that is the damped swing of the needle in the figure.</p>
        <p>So two spectra need to be kept apart. The effective connection matrix <M>{"(1-a^*)M"}</M> sits exactly at the edge. The Jacobian has no marginal eigenvalue at all at finite <M>{"N"}</M>; what survives of the marginality is the pile-up of transverse rates near zero, with a gap that closes as <M>{"N\\to\\infty"}</M>. Criticality comes from that closing gap.</p>
      </Section>

      <Section id="correlations" n={6} title="Scale-free correlations">
        <p>With noise, the transverse fluctuations are independent Ornstein–Uhlenbeck processes with rates <M>{"|\\mu_i|"}</M>. The active pair contributes one term out of <M>{"N"}</M> and decays at a finite rate, so the long-time correlation is</p>
        <Eq tex={String.raw`C(t) = \frac1N\sum_{i=1}^{N-1}\frac{D}{|\mu_i|}\,e^{-|\mu_i|\,|t|}`} />
        <p>For large <M>{"N"}</M> the semicircle maps to a density of rates <M>{"\\rho(\\mu) = \\tfrac{2}{\\pi}\\sqrt{\\mu(2-\\mu)}"}</M> on <M>{"[0,2]"}</M>, with every trace of <M>{"c"}</M> gone. Its <M>{"\\sqrt\\mu"}</M> edge sets the long-time law:</p>
        <Eq tex={String.raw`\frac{C(t)}{C(0)} = \frac12\int_0^2 d\mu\,\frac{\rho(\mu)}{\mu}\,e^{-\mu|t|} \;\approx\; \sqrt{\frac{2}{\pi|t|}},\qquad |t|\gg1`} note="Neither the coupling c nor the noise amplitude D appears." />
        <p>At finite <M>{"N"}</M> the power law is cut off: the eigenvalue spacing at the GOE edge scales as <M>{"N^{-2/3}"}</M>, so the scale-free decay extends to <M>{"t_{\\max}\\propto N^{2/3}"}</M> and turns exponential beyond it.</p>
      </Section>

      <CorrelationPlot
        sizes={[250, 2500, 25000]}
        caption={<><b>Computed from Eq. 10</b> with the transverse rates placed at the semicircle’s quantiles, against Eq. 11. Larger networks follow the √(2/πt) line for longer before the cutoff. The paper’s simulations, for N from 250 to 40,000 at c = 2 and c = 5, follow the same line, and the two couplings are indistinguishable.</>}
      />

      <Facts
        items={[
          ["t⁻¹ᐟ²", "the decay of correlations everywhere in the critical phase, not only at one coupling"],
          ["N²ᐟ³", "how the cutoff of the power law grows with network size"],
          ["1", "extra unit, versus O(N) gating variables in earlier mechanisms"],
        ]}
      />

      <Section id="meaning" n={7} title="What it means">
        <p>In the linear model, the <M>{"t^{-1/2}"}</M> decay with an <M>{"N^{2/3}"}</M> cutoff exists only at the isolated point <M>{"c=c_{\\text{crit}}"}</M>. The gain unit turns that point into a phase, with the same exponent and cutoff scaling for every coupling above threshold.</p>
        <ul>
          <li><strong>Low-dimensional attractor, high-dimensional dynamics.</strong> The fixed point lies along a single eigenmode, a pattern spread across many neurons, while the continuum of slow transverse modes gives high-dimensional critical fluctuations around it. That may reconcile the low-dimensional attractors seen throughout the brain with the complex dynamics observed at criticality.</li>
          <li><strong>Not tied to the GOE.</strong> For any symmetric ensemble whose density vanishes at the edge as <M>{"(\\lambda_{\\text{edge}}-\\lambda)^\\alpha"}</M>, the same construction gives <M>{"C(t)\\sim t^{-\\alpha}"}</M> with cutoff <M>{"N^{1/(1+\\alpha)}"}</M>. Normalization puts the network at the edge; the ensemble sets the exponent.</li>
          <li><strong>Asymmetric connections</strong> are the open question. The pinning never needed orthogonality, but non-orthogonal eigenvectors weight the correlations by their overlaps, which may change the exponent.</li>
        </ul>
        <p>It is economical that one canonical circuit buys both normalized responses and critical collective dynamics. And it makes a testable prediction: disrupting the normalization feedback should destroy the scale-free correlations, one possible route to the loss of criticality seen in epilepsy.</p>
        <Callout label="The idea in one line">A single unit that divides by the network’s total activity holds it at the edge of stability for any wiring, and long, scale-free memory follows.</Callout>
      </Section>
    </Article>
  );
}
