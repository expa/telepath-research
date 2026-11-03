import { Article, Callout, Eq, M, Section, Tldr } from "@/components/article/blocks";
import { paperOf } from "@/content/papers";
import { Fig } from "@/components/post/post";
import { OrganicsCarouselFigure } from "@/components/figures/organics-carousel";
import { OrganicsLab } from "@/components/widgets/organics-lab";

const paper = paperOf("organics");

const SECTIONS = [
  { id: "beyond", label: "Memory is not a still picture" },
  { id: "circuit", label: "The circuit" },
  { id: "hold", label: "Holding" },
  { id: "move", label: "Manipulating" },
  { id: "motor", label: "Moving" },
  { id: "normalization", label: "Staying stable" },
  { id: "lineage", label: "From here to RQFs" },
];

export default function Page() {
  return (
    <Article paper={paper} sections={SECTIONS}>
      <Tldr
        items={[
          <>Working memory doesn’t just <strong>hold</strong> information, it <strong>manipulates</strong> it. Real neurons show sequences, oscillations and travelling waves during memory delays, not only steady firing.</>,
          <>ORGaNICs are recurrent circuits whose recurrent and input drives are <strong>gated by two populations of modulator neurons</strong>, a biophysically plausible generalisation of the LSTM.</>,
          <>The same circuit, <strong>with the same synaptic weights</strong>, holds a location, updates it when the eyes move, and plays out a motor command faster, slower or in reverse.</>,
          <>Recurrent <strong>normalisation</strong> keeps it stable, and while the modulators are constant it is a linear system you can analyse exactly.</>,
        ]}
      />

      <Section id="beyond" n={1} title="Memory is not a still picture">
        <p className="lead">The textbook model of working memory is a neural integrator: a population that keeps firing after a stimulus is gone, holding it in place until it is needed.</p>
        <p>But in the lab many neurons don’t do that. Their activity is handed from one neuron to the next during a delay, or swings through complex dynamics. Whole populations oscillate. And cognitively, working memory is about using information, not parking it: you revise the meaning of the start of a sentence when you reach its end.</p>
        <p>Machine learning met the same problem in recurrent networks and solved it with gates. The LSTM decides at every step what to let in and what to forget. ORGaNICs ask what a gated recurrent circuit looks like when it is built from neurons, and what it explains.</p>
      </Section>

      <Fig caption="Each piston is a neuron tuned to one direction; its height is the response y. A target flashes, the bump it leaves is held, slides round the ring while the eyes move, then is cleared. Click the platter to set your own target.">
        <OrganicsCarouselFigure bare />
      </Fig>

      <Section id="circuit" n={2} title="The circuit">
        <p>Each neuron’s response <M>{"y_j"}</M> is a leaky integrator with two inputs, each multiplied by its own modulator:</p>
        <Eq tex={String.raw`\tau_y\,\frac{dy_j}{dt} = -y_j + \Big(\frac{b_j^+}{1+b_j^+}\Big)\, z_j + \Big(\frac{1}{1+a_j^+}\Big)\, \hat y_j,\qquad \mathbf z = W_{zx}\mathbf x,\quad \hat{\mathbf y} = W_{\hat yy}\,\mathbf y`} />
        <ul>
          <li><strong>Input drive</strong> <M>{"z"}</M>: a weighted sum of the inputs. Each row of <M>{"W_{zx}"}</M> is one neuron’s response field.</li>
          <li><strong>Recurrent drive</strong> <M>{"\\hat y"}</M>: a weighted sum of the circuit’s own responses.</li>
          <li><strong>Input modulator</strong> <M>{"b"}</M> opens the gate to the input, like an LSTM’s update gate.</li>
          <li><strong>Recurrent modulator</strong> <M>{"a"}</M> turns the recurrent drive down, like an LSTM’s reset gate.</li>
        </ul>
        <p>The modulators are neurons too, with their own dynamics driven by the inputs and, for <M>{"a"}</M>, by the outputs:</p>
        <Eq tex={String.raw`\tau_a\frac{d\mathbf a}{dt} = -\mathbf a + W_{ax}\mathbf x + f(\mathbf y),\qquad \tau_b\frac{d\mathbf b}{dt} = -\mathbf b + W_{bx}\mathbf x`} />
        <Callout label="Why this is tractable">When the modulators are constant, which is how a behavioural task with distinct phases looks to the circuit, the equations are linear. Everything about the dynamics then follows from the eigenvalues and eigenvectors of the recurrent weights.</Callout>
      </Section>

      <Section id="hold" n={3} title="Holding">
        <p>Take 36 neurons, each preferring one direction around the clock face. Build the recurrent weights so that 19 of their eigenvalues are exactly 1 and the rest are smaller. Then follow a trial:</p>
        <ol>
          <li><strong>Target on.</strong> A cue sets <M>{"b = 1"}</M>. The responses follow the input drive: a bump of activity centred on the target.</li>
          <li><strong>Delay.</strong> <M>{"b"}</M> drops to 0 and <M>{"a"}</M> is 0. Now the circuit only sees itself. The part of the bump that lies in the eigenvalue-1 subspace stays exactly where it is; everything else decays away. That is sustained activity, and it is enough to read the target back out.</li>
          <li><strong>Respond.</strong> A cue raises <M>{"a"}</M>. The recurrent drive is cut, and the memory is cleared.</li>
        </ol>
        <p>Swap the symmetric recurrent weights for asymmetric ones, whose eigenvalues are complex, and the same circuit produces <strong>sequential activity</strong> instead: each neuron fires briefly and hands off to the next, while the readout stays perfectly stable. Sustained and sequential activity, two observations that looked like they needed different models, are one circuit with different weights.</p>
      </Section>

      <Section id="move" n={4} title="Manipulating">
        <p>Now add a second recurrent weight matrix shaped like a <strong>derivative</strong>: each neuron is driven by the difference between its neighbours. Gate it with its own modulator. While that modulator is on, the stored bump slides across the population as a <strong>travelling wave</strong>; when it switches off, the bump stops in its new place.</p>
        <p>That is exactly what the brain needs in the double-step saccade task. Two targets flash; you look at the first. Because the brain codes locations relative to the eyes, the plan for the second saccade is now wrong by exactly the first movement. ORGaNICs fix it by running the derivative weights for as long, and as hard, as the corollary discharge of the eye movement says.</p>
      </Section>

      <OrganicsLab />

      <Section id="motor" n={5} title="Moving">
        <p>Motor preparation is the mirror image of working memory: hold a plan, then turn it into a movement with the right timing. The same circuit, with the same weights, does it. A spatial pattern of premotor activity is loaded and held; when the derivative weights are switched on it travels across the population, and the readout turns that travel into a <strong>time course</strong> of motor commands.</p>
        <p>The modulators then give you control of time for free. Turn the shift gain up and the same movement plays faster (<strong>time warping</strong>); swap to the opposite derivative matrix and it plays <strong>in reverse</strong>. Playing a piece of music at a new tempo, or birdsong at a different speed, needs no new weights.</p>
      </Section>

      <Section id="normalization" n={6} title="Staying stable">
        <p>A circuit with eigenvalues of exactly 1 is balanced on a knife-edge: perturb the weights a little and activity either fades or explodes. ORGaNICs fix this with <strong>recurrent normalisation</strong>. The recurrent modulator <M>{"a"}</M> also listens to the outputs through <M>{"f(\\mathbf y)"}</M>; when activity grows, <M>{"a"}</M> rises and turns the recurrent gain down, and vice versa. The circuit’s responses then follow the normalisation equation exactly, the same model that has been fitted to hundreds of datasets across sensory cortex.</p>
      </Section>

      <Section id="lineage" n={7} title="From here to RQFs">
        <p>ORGaNICs set the agenda for our machine-learning work. Their recipe is the energy-based theory of cortex: a state that balances feedforward drive against an internally generated prediction, with oscillatory, complex-valued dynamics doing the bookkeeping of time.</p>
        <p>The <a href="/research/prospective-coding/detailed">Recursive Quadrature Filter</a> is the smallest member of that family: one complex unit whose prior is a rotation, which turns out to be a diagonal state-space model you can train at scale. Our NeurIPS paper also applies its prospective-input correction to ORGaNICs themselves, as a nonlinear test bed, and the correction carries over. The <a href="/research/self-supervised-rqf/detailed">self-supervised encoder</a> then puts those filters to work on real brain recordings.</p>
        <Callout label="The thread">Brains keep a running model of how the world is about to change. Build that model into the units, and small networks go a long way.</Callout>
      </Section>
    </Article>
  );
}
