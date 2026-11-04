import { Article, Callout, Eq, M, Section, Tldr } from "@/components/article/blocks";
import { Facts, Fig } from "@/components/post/post";
import { paperOf } from "@/content/papers";
import { FilterLab } from "@/components/widgets/filter-lab";
import { GradientDepth, LookAhead } from "@/components/widgets/cascade-lab";
import { PairedBars } from "@/components/widgets/charts";
import { CascadeBenchFigure } from "@/components/figures/cascade-bench";

const paper = paperOf("prospective-coding");

const SECTIONS = [
  { id: "tradeoff", label: "Memory versus reactivity" },
  { id: "rqf", label: "The Recursive Quadrature Filter" },
  { id: "ssm", label: "A state-space model in disguise" },
  { id: "lookahead", label: "Looking ahead" },
  { id: "credit", label: "Why learning gets easier" },
  { id: "results", label: "Results" },
  { id: "meaning", label: "What it means" },
];

export default function Page() {
  return (
    <Article paper={paper} sections={SECTIONS}>
      <Tldr
        items={[
          <>Neurons integrate over time. Stack <M>{"L"}</M> of them and the top of the stack runs about <M>{"L\\tau"}</M> behind the world, while the teaching signal coming back down fades geometrically.</>,
          <>We derive the <strong>Recursive Quadrature Filter</strong> (RQF) from a theory of cortical function and prove it is a special case of a <strong>diagonal state-space model</strong>, so it trains with the same parallel scans as S4, S5 and Mamba.</>,
          <>Driving each layer with a <strong>look-ahead of its input</strong>, <M>{"z + \\tau\\dot z"}</M>, costs no parameters and one extra tap, and improved every model and configuration we tested under full backprop.</>,
          <>A 31.9k-parameter RQF reaches <strong>96.1%</strong> on raw-audio Speech Commands; a minimal six-layer stack solves the <strong>16,384-step</strong> Path-X at 83.6%.</>,
        ]}
      />

      <Section id="tradeoff" n={1} title="Memory versus reactivity">
        <p className="lead">A biological neuron is well modelled as a leaky integrator. Its membrane time constant τ gives it memory, a little window of the past. It also makes it late.</p>
        <p>One integrator lags its input a little. A deep stack of them lags a lot: the delays add, and the effective response time grows roughly as <M>{"L\\tau"}</M>. Worse, the problem runs in both directions. When a teaching signal arrives at the top, the activity it should correct in the early layers is already about <M>{"L\\tau"}</M> out of date. Signals that change on time scales comparable to τ are served badly on the way up and on the way down.</p>
        <p>Cortex has an answer. Pyramidal neurons driven by a sinusoidal current can fire at a phase that <em>leads</em> their input, and similar prospective responses show up in retina, cerebellum and muscle spindles. This paper turns that observation into an architectural fix for deep recurrent networks.</p>
      </Section>

      <Fig caption="Each rail is one layer following the one in front of it, the way a leaky integrator follows its input. The motion is the paper’s update rule: six layers, τ = 20 ms, a 4 Hz input, slowed down. Switch on look-ahead and the rails fall into line.">
        <CascadeBenchFigure bare />
      </Fig>

      <Section id="rqf" n={2} title="The Recursive Quadrature Filter">
        <p>Start from a leaky integrator whose state relaxes toward a blend of what it is told and what it expects:</p>
        <Eq tex={String.raw`\tau\,\dot y = -y + \big[\gamma\, z + (1-\gamma)\,\hat y\big]`} note="γ balances input tracking (γ → 1) against the internal prediction ŷ (γ → 0). This convex blend comes from an energy model of cortical function (Heeger, 2017)." />
        <p>What should the expectation <M>{"\\hat y"}</M> be? The <strong>internal-model principle</strong> says a system that tracks a structured signal should contain a model of that signal’s dynamics. The smallest model of an oscillation is a pure rotation, <M>{"\\dot y = i\\omega y"}</M>. Extrapolating the current state one time constant ahead under that model gives <M>{"\\hat y = (1 + i\\omega\\tau)\\,y"}</M>, and substituting yields the RQF:</p>
        <Eq tex={String.raw`\tau\,\dot y = -y + \gamma\, z + (1-\gamma)(1 + i\omega\tau)\, y \;\;\Longrightarrow\;\; \dot y = \lambda y + \alpha z`} note="α = γ/τ,  ω₀ = (1 − γ)ω,  λ = −α + iω₀. Stable for any γ in (0, 1)." />
        <p>Two learnable numbers per unit, a frequency and a bandwidth, define a band-pass filter. The state is a complex number that spins at <M>{"\\omega_0"}</M> and decays at rate <M>{"\\alpha"}</M>. Move the sliders below to see how those two numbers shape it.</p>
      </Section>

      <FilterLab initialHz={12} initialGamma={0.1} />
      <p className="widget-caption">
        Computed from the closed form. Left: the state spiralling into the origin. Middle: the impulse response <M>{"y(t) = \\alpha e^{\\lambda t}"}</M>. Right: the frequency response, peaking at ω₀. Raise γ and memory shortens while the band widens.
      </p>

      <Section id="ssm" n={3} title="A state-space model in disguise">
        <p>A layer of <M>{"n"}</M> RQFs is a diagonal complex linear system, and a deep network stacks layers with a complex mixing matrix and a split-ReLU between them:</p>
        <Eq tex={String.raw`\dot{\mathbf y}^{(\ell)} = \mathrm{diag}(\boldsymbol\lambda^{(\ell)})\,\mathbf y^{(\ell)} + \mathrm{diag}(\boldsymbol\alpha^{(\ell)})\,W^{(\ell)}\rho\big(\mathbf y^{(\ell-1)}\big)`} />
        <p>That is exactly the form of a diagonal state-space model, the family behind S4D, S5, the LRU and Mamba, with one extra constraint: each channel’s input gain is tied to its own decay rate, <M>{"\\alpha = \\gamma/\\tau"}</M>, and its pole has the RQF form. The inclusion is one-way: every RQF layer is a diagonal SSM, not every diagonal SSM is an RQF.</p>
        <p>The practical upshot is large. Discretised with a zero-order hold, an RQF layer is a first-order complex recurrence, <M>{"y_{n+1} = \\bar A\\, y_n + \\bar B\\, z_{n+1}"}</M>, which runs in <M>{"O(\\log T)"}</M> parallel depth with an associative scan. A biologically motivated unit can train on sequences of tens of thousands of steps.</p>
      </Section>

      <Section id="lookahead" n={4} title="Looking ahead">
        <p>The fix borrows a single operator from models of prospective firing:</p>
        <Eq tex={String.raw`\chi_\tau \equiv 1 + \tau\frac{d}{dt},\qquad u(t+\tau) = \chi_\tau\big(u(t)\big) + O(\tau^2)`} note="χτ advances a smooth signal by one time constant, to first order." />
        <p>For a leaky integrator, <M>{"\\chi_\\tau"}</M> is the exact inverse of the filter, so it cancels the lag completely. For the RQF it is a first-order correction. We apply it to the <strong>bottom-up input</strong> of every layer, after the nonlinearity and before the mixing weights, and leave the recurrence untouched.</p>
      </Section>

      <LookAhead />

      <div className="prose">
        <p>Discretised with the same zero-order hold, the prospective layer is still a single-pole recurrence. It just reads its input through two taps instead of one:</p>
        <Eq tex={String.raw`y_{n+1} = \bar A\, y_n + \big[\bar B + \gamma \bar A\big]\, z_{n+1} - \gamma\bar A\, z_n`} note="No new parameters, the same diagonal transition and parallel scan, plus an O(n) buffer for the previous drive." />
        <p>It looks like the exponential-trapezoidal rule of Mamba-3, but it isn’t one: matching even the previous-input coefficient would need an interpolation weight above 1, outside Mamba-3’s admissible range. This is the rule that drives the bench in the first figure when look-ahead is on.</p>
      </div>

      <Section id="credit" n={5} title="Why learning gets easier">
        <p>To see the mechanism clearly, the paper uses a diagnostic regime called <strong>spatial-only backpropagation</strong>: every earlier recurrent state is treated as a constant, so the error can only travel down through the layers within a single time step, never back through time. This is a probe, not a recommended way to train.</p>
        <p>In that regime the difference is stark. With instantaneous input, each hop down the stack multiplies the error by <M>{"(h/\\tau)\\gamma"}</M>, which vanishes as the step <M>{"h"}</M> shrinks: an explicit <M>{"(h/\\tau)^{L-\\ell}"}</M> attenuation by layer <M>{"\\ell"}</M>. With prospective input the factor becomes <M>{"(1 + h/\\tau)\\gamma"}</M>, which stays order one.</p>
      </Section>

      <GradientDepth />

      <Section id="results" n={6} title="Results">
        <p>Every comparison holds everything fixed (architecture, optimiser, schedule, seeds and parameter count) and changes only the input path. Five seeds each.</p>
      </Section>

      <Facts
        items={[
          ["96.09%", "Raw-audio Speech Commands, 16,000 samples per clip, with a 31.9k-parameter six-layer RQF"],
          ["83.56%", "Path-X (16,384 steps) with a minimal forward-only RQF: no gating, normalisation or bidirectionality"],
          ["+15.2", "points of prospective advantage for a six-layer MFCC model under spatial-only backprop"],
        ]}
      />

      <PairedBars
        title="Speech Commands (MFCC) · spatial-only backprop"
        unit="test accuracy %, width 64, non-residual"
        a="Instantaneous input"
        b="Prospective input"
        lo={70}
        hi={100}
        groups={[
          { label: "2 layers", a: 94.2, b: 94.89 },
          { label: "4 layers", a: 89.04, b: 92.63 },
          { label: "6 layers", a: 76.38, b: 91.55 },
        ]}
        caption={<><b>Paper, Table 1b.</b> The deeper the stack, the more the input path matters: the advantage grows from 0.7 to 3.6 to 15.2 points, as the depth analysis predicts.</>}
      />

      <PairedBars
        title="Under full backprop, the gain carries over"
        unit="test accuracy %, raw audio, width 64"
        a="Instantaneous input"
        b="Prospective input"
        lo={93}
        hi={97}
        groups={[
          { label: "RQF · 2 layers", a: 94.4, b: 94.94 },
          { label: "RQF · 4 layers", a: 95.77, b: 96.27 },
          { label: "RQF · 6 layers", a: 96.13, b: 96.35 },
          { label: "S5 · 2 layers", a: 94.94, b: 95.55 },
          { label: "S5 · 6 layers", a: 96.21, b: 96.37 },
        ]}
        caption={<><b>Paper, Tables 1a and 2.</b> Prospective variants match or beat their controls in every model and configuration, including the S5 state-space model (as αP-S5) and the nonlinear, normalising ORGaNICs.</>}
      />

      <Section id="meaning" n={7} title="What it means">
        <p>Two contributions come out of this work, and they stand separately.</p>
        <ul>
          <li><strong>A recurrent substrate.</strong> RQFs are small, interpretable (every unit has a frequency and a bandwidth you can read off) and as trainable as any modern SSM. Six layers of 32 of them hear spoken words from the raw waveform.</li>
          <li><strong>An input-side correction.</strong> Driving each layer with where its input is going, rather than where it is, removes a depth-dependent lag at the cost of one tap. It applies to any diagonal SSM.</li>
        </ul>
        <Callout label="A note on scope">The cortical theory motivates the design. The claims are machine-learning claims under standard BPTT; spatial-only backprop is a diagnostic, and it still uses transposed forward weights, so we don’t claim the full training procedure is biologically plausible.</Callout>
        <p>The RQF is also the substrate for our self-supervised EEG encoder, and its lineage runs back to <a href="/research-1/organics/detailed">ORGaNICs</a>, a circuit theory of how cortex holds and manipulates information over time.</p>
      </Section>
    </Article>
  );
}
