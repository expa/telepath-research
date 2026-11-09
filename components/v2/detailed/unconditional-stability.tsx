import { Article, Callout, Eq, M, Section, Tldr } from "@/components/v2/article/blocks";
import { Facts, Fig } from "@/components/v2/post/post";
import { paperOf } from "@/content/papers";
import { DamperRigFigure } from "@/components/v2/figures/damper-rig";
import { HBars } from "@/components/widgets/charts";

const paper = paperOf("unconditional-stability");

const SECTIONS = [
  { id: "why", label: "Brain-like and trainable" },
  { id: "model", label: "ORGaNICs" },
  { id: "proof", label: "The proof, identity recurrence" },
  { id: "energy", label: "An energy for the circuit" },
  { id: "general", label: "Arbitrary recurrence" },
  { id: "experiments", label: "Training by BPTT" },
  { id: "meaning", label: "What it means" },
];

export default function Page() {
  return (
    <Article paper={paper} sections={SECTIONS}>
      <Tldr
        items={[
          <>Cortical circuit models such as Wilson–Cowan or the stabilized supralinear network are hard to train because nothing guarantees they stay stable. <strong>ORGaNICs</strong> compute divisive normalization in their own dynamics.</>,
          <>With identity recurrent weights, we prove that the normalization fixed point is <strong>locally asymptotically stable for every choice of parameters and inputs</strong>, in any dimension, by mapping the linearized circuit onto coupled damped harmonic oscillators.</>,
          <>The proof yields an <strong>energy function</strong> that says what the circuit, and each neuron, is minimizing.</>,
          <>For arbitrary recurrent weights we prove stability in 2D and find it empirically in higher dimensions. Trained with <strong>plain BPTT and no gradient clipping</strong>, ORGaNICs match an MLP on MNIST and edge out an LSTM on sequential MNIST.</>,
        ]}
      />

      <Section id="why" n={1} title="Brain-like and trainable">
        <p className="lead">Deep networks are easy to train and flexible to design, which is why they are used to model the brain. Neurodynamical models are more faithful to biology, but in high dimensions they come with no stability guarantee, and training them means imposing stability constraints that are hard to write down.</p>
        <p>Recurrent networks in machine learning get around this with ad hoc tools: layer and batch normalization, gradient clipping and scaling. They stabilize training without constraining the dynamics, and they say little about how cortex works.</p>
        <p>Divisive normalization, where each neuron’s response is divided by the pooled activity of a population, was first proposed to explain responses in primary visual cortex and has since been called a canonical neural computation. Batch and layer normalization are special cases of it. We ask whether building it into a circuit’s dynamics is enough to make the circuit stable.</p>
      </Section>

      <Section id="model" n={2} title="ORGaNICs">
        <p>The two-neuron-type ORGaNICs circuit has <M>{"n"}</M> excitatory neurons <M>{"y"}</M> and <M>{"n"}</M> inhibitory modulators <M>{"a"}</M>:</p>
        <Eq tex={String.raw`\tau_y\odot\dot{\mathbf y} = -\mathbf y + \mathbf b\odot\mathbf z + (\mathbf 1-\mathbf a^+)\odot W_r\big(\sqrt{\mathbf y^+}-\sqrt{\mathbf y^-}\big)`} />
        <Eq tex={String.raw`\tau_a\odot\dot{\mathbf a} = -\mathbf a + \mathbf b_0^2\odot\boldsymbol\sigma^2 + W\big((\mathbf y^+ + \mathbf y^-)\odot\mathbf a^{+2}\big)`} note="y± = ⌊±y⌋² and a⁺ = √⌊a⌋ are firing rates; z = W_zx x is the input drive; W ≥ 0 holds the normalization weights." />
        <p>The modulators gate the recurrent drive through <M>{"(1-a^+)"}</M>, and their own drive is the pooled activity, weighted by <M>{"W"}</M>. The equations are built so that, with <M>{"W_r = I"}</M> and equal gains, the steady state is exactly the normalization equation:</p>
        <Eq tex={String.raw`y_s^+ = \frac{\lfloor z\rfloor^2}{\sigma^2 + W\big(\lfloor z\rfloor^2 + \lfloor -z\rfloor^2\big)}`} />
        <p>ORGaNICs can be read as a biophysically plausible LSTM or GRU: continuous in time, with built-in normalization through recurrent gain and built-in attention through the input gain <M>{"b"}</M>.</p>
      </Section>

      <Section id="proof" n={3} title="The proof, identity recurrence">
        <p>With <M>{"W_r=I"}</M> the circuit simplifies to</p>
        <Eq tex={String.raw`\tau_y\odot\dot{\mathbf y} = -\sqrt{\lfloor\mathbf a\rfloor}\odot\mathbf y + \mathbf b\odot\mathbf z,\qquad \tau_a\odot\dot{\mathbf a} = -\mathbf a + \mathbf b_0^2\odot\boldsymbol\sigma^2 + W\big(\mathbf y^2\odot\lfloor\mathbf a\rfloor\big)`} />
        <p>with a unique fixed point known in closed form, <M>{"a_s = b_0^2\\sigma^2 + W(b^2z^2)"}</M> and <M>{"y_s = bz/\\sqrt{a_s}"}</M>. We linearize there (Lyapunov’s indirect method). Two blocks of the Jacobian are diagonal and commute, so the characteristic polynomial collapses to a quadratic eigenvalue problem,</p>
        <Eq tex={String.raw`\det\big(\lambda^2 I + \lambda B + K\big) = 0`} />
        <p>which is the characteristic equation of a mechanical system <M>{"\\ddot x + B\\dot x + Kx = 0"}</M>: <strong>coupled damped harmonic oscillators</strong>. The stiffness <M>{"K = D\\big(\\sqrt{a_s}/(\\tau_y\\odot\\tau_a)\\big)"}</M> is positive and diagonal. The damping <M>{"B"}</M> is not symmetric and not definite, the hard case of a gyroscopically stabilized system with indefinite damping.</p>
        <ol>
          <li><strong>Theorem 4.1.</strong> If <M>{"K"}</M> is positive diagonal and <M>{"B"}</M> is Lyapunov diagonally stable, the oscillator system is globally asymptotically stable. We prove it by constructing a Lyapunov function.</li>
          <li><strong>B is a Z-matrix</strong>: positive diagonal terms minus a nonnegative matrix. A Z-matrix is Lyapunov diagonally stable exactly when it has a convergent regular splitting <M>{"B = M - N"}</M> with <M>{"\\rho(M^{-1}N)<1"}</M>.</li>
          <li><strong>Theorem 4.3</strong> shows any matrix of the form <M>{"D(t)\\,W\\,D(u/(v+Wu))"}</M> with <M>{"0<t_i<1"}</M>, <M>{"u\\ge0"}</M>, <M>{"v>0"}</M>, <M>{"W\\ge0"}</M> has spectral radius below 1, and <M>{"M^{-1}N"}</M> has exactly that form.</li>
        </ol>
        <Callout label="Result">For W_r = I, the normalization fixed point is asymptotically stable for all parameter values and all inputs, in any dimension, even when every neuron has its own time constant.</Callout>
      </Section>

      <Fig caption="The oscillator form of Eq. 9 as a test rig, one mode. The motor's push stands for recurrent feedback, which feeds energy into the motion: with friction c alone the damping is B = c − push, and past push = c the motion grows until it hits the stops. Switching on the damper stands for normalization: the negative term in B (Eq. 11) can never outgrow the positive ones, so B stays positive and the motion dies away for any push. The pen records x(t).">
        <DamperRigFigure bare />
      </Fig>

      <Section id="energy" n={4} title="An energy for the circuit">
        <p>Because the proof constructs a Lyapunov function directly, it gives an energy that ORGaNICs minimize near the fixed point. For one excitatory and one inhibitory neuron it reads</p>
        <Eq tex={String.raw`V(y,a) = \frac{\tau_y}{\tau_a}\sqrt{b_0^2\sigma^2 + w b^2z^2}\;\Big(y - \frac{bz}{\sqrt{b_0^2\sigma^2+wb^2z^2}}\Big)^2 + \big(\sqrt a\,y - bz\big)^2`} />
        <p>The second term asks the gated response to reconstruct the input drive; the first asks the response to reach its normalized value. Their balance is set by the ratio <M>{"\\tau_y/\\tau_a"}</M> and by the input: weak inputs favor matching the input, strong ones increasingly engage normalization. In a trained circuit, this assigns each neuron a readable role.</p>
        <p>In the special case of uniform normalization weights and scalar parameters, the eigenvalues have closed forms, linking the circuit’s parameters to the strength and frequency of its oscillations.</p>
      </Section>

      <Section id="general" n={5} title="Arbitrary recurrence">
        <p>With a general <M>{"W_r"}</M> the fixed point is no longer known in closed form, and the Jacobian loses its structure. In two dimensions we can still prove:</p>
        <ul>
          <li><strong>Contracting recurrence</strong>, <M>{"0<w_r\\le1"}</M>: a unique fixed point with <M>{"y_s"}</M> of the same sign as <M>{"z"}</M>, and it is asymptotically stable.</li>
          <li><strong>Expansive recurrence</strong>, <M>{"w_r>1"}</M>: one or three fixed points. The one with <M>{"y_s"}</M> of the same sign as <M>{"z"}</M> always exists and is always stable; if <M>{"b_0\\sigma > 1-1/w_r"}</M> it is the only one.</li>
        </ul>
        <p>In higher dimensions we conjecture that if <M>{"\\lVert z\\rVert\\le1"}</M> and the largest singular value of <M>{"W_r"}</M> is 1, there is at least one asymptotically stable fixed point. Circuits with random parameters and inputs under these constraints were stable in 100% of trials. Raising the singular-value bound to 2 still gave 100%; at 3, circuits became unstable. A fixed-point iteration finds the steady state in fewer than five steps.</p>
      </Section>

      <Section id="experiments" n={6} title="Training by BPTT">
        <p>For the ML tasks we let the intrinsic time constants be learned, and for sequences we use a rectified variant whose 2D form provably has no unstable fixed point for positive inputs, with input gains <M>{"b"}</M> and <M>{"b_0"}</M> made dynamical. No hyperparameter search, no gradient clipping.</p>
        <p><strong>Static MNIST.</strong> The circuit runs to its fixed point and the steady-state rates are classified, like a deep equilibrium model. <M>{"W_r"}</M> is learned with its largest singular value held at 1. ORGaNICs reach 98.1–98.2%, level with an MLP and above an SSN of the same size at 94.9–95.2%. The largest real part of the Jacobian’s eigenvalues stayed negative throughout training.</p>
      </Section>

      <HBars
        title="Sequential MNIST, pixel by pixel"
        unit="test accuracy, axis from 85%"
        lo={85}
        hi={100}
        rows={[
          { label: "Lipschitz RNN (128 units)", value: 99.4, note: "34k" },
          { label: "coRNN (128)", value: 99.3, note: "34k" },
          { label: "AntisymmetricRNN (128)", value: 98.0, note: "10k" },
          { label: "ORGaNICs (128)", value: 97.8, note: "100k", ours: true },
          { label: "ORGaNICs (64)", value: 97.7, note: "26k", ours: true },
          { label: "LSTM (128)", value: 97.3, note: "68k" },
          { label: "ORGaNICs, fixed τ (64)", value: 90.3, note: "26k" },
        ]}
        caption={<><b>Paper, Table 2.</b> Parameter counts after each bar. ORGaNICs beat the LSTM with fewer parameters, without gradient clipping. On permuted sMNIST they reach 90.7% (LSTM 92.6%). Models built specifically for long dependencies, like coRNN, still lead. With fixed time constants training remains stable, but learning the time constants is what handles long dependencies.</>}
      />

      <Facts
        items={[
          ["Any", "parameters and inputs: stable, for identity recurrence, in any dimension"],
          ["100%", "of random high-dimensional circuits stable under the conjectured constraints"],
          ["0", "gradient clipping needed to train by backpropagation through time"],
        ]}
      />

      <Section id="meaning" n={7} title="What it means">
        <ol>
          <li><strong>Normalization inside the dynamics brings stability.</strong> Layer normalization is applied to outputs after the fact and leaves an RNN’s dynamics unchanged. Here normalization is part of the circuit, and that is what makes it stable and trainable with vanilla BPTT.</li>
          <li><strong>Interpretability.</strong> The oscillator analogy gives an explicit energy, and the ratio of time constants of each excitatory–inhibitory pair says how much that neuron weighs normalization against tracking its input.</li>
          <li><strong>Attention comes built in.</strong> Modulating the input gain <M>{"b"}</M>, together with normalization, does what an attention head does, with normalization in place of the softmax.</li>
        </ol>
        <p>The limits are stated plainly. Euler discretization of a stable continuous system can still be stiff, so time constants and step size need care. The general-<M>{"W_r"}</M> result is a conjecture backed by the 2D proof and experiments. And the input-gain weights are <M>{"n\\times n"}</M>, so parameters grow faster with width than in other RNNs.</p>
        <Callout label="The idea in one line">Build normalization into a recurrent circuit’s dynamics and it becomes a set of damped oscillators that always settle, stable enough to train like any RNN.</Callout>
      </Section>
    </Article>
  );
}
