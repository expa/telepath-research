import { Article, Callout, Eq, M, Section, Stats, Tldr } from "@/components/article/blocks";
import { paperOf } from "@/content/papers";
import { ReedBankFigure } from "@/components/figures/reed-bank";
import { FilterLab } from "@/components/widgets/filter-lab";
import { PredictLab } from "@/components/widgets/predict-lab";
import { ParamScatter, PairedBars, type Bench } from "@/components/widgets/charts";
import { Encoder3DLazy } from "@/components/widgets/lazy";
import { BENCHES } from "@/content/benchmarks";

const paper = paperOf("self-supervised-rqf");

const SECTIONS = [
  { id: "why", label: "Brains run on rhythms" },
  { id: "filter", label: "A filter that oscillates" },
  { id: "encoder", label: "The encoder" },
  { id: "objective", label: "Learning by predicting" },
  { id: "channels", label: "From one channel to a scalp" },
  { id: "results", label: "Results" },
  { id: "meaning", label: "What it means" },
];

export default function Page() {
  return (
    <Article paper={paper} sections={SECTIONS}>
      <Tldr
        items={[
          <>An encoder built from <strong>Recursive Quadrature Filters</strong>, tiny oscillators that each learn one frequency and one bandwidth, is a natural fit for brain signals, whose information lives in rhythms.</>,
          <>It learns from <strong>unlabeled recordings</strong> by predicting its own future activity, tens of milliseconds to seconds ahead.</>,
          <>With <strong>110k parameters</strong> it reaches 0.925 AUROC on abnormal-EEG detection, above a model with 9× the parameters, and sits within the range of EEG foundation models with <strong>3.2M to 369M</strong>.</>,
          <>On intracranial recordings, the <strong>frozen</strong> encoder beats the best published result by 2.9 points.</>,
        ]}
      />

      <Section id="why" n={1} title="Brains run on rhythms">
        <p className="lead">The usual route to a general-purpose EEG model borrows the recipe from language and vision: chop the signal into patches, mask some, train a Transformer to fill them in, and scale to hundreds of millions of parameters.</p>
        <p>It works. But scale, learned tokenizers and masking all arrive together, so it is hard to tell which of them is doing the work. And nothing in a Transformer knows that the signal it is reading is made of oscillations: delta while you sleep, alpha when you close your eyes, beta when you concentrate.</p>
        <p>We asked the opposite question. If an encoder’s dynamics already match the statistics of the signal, if every unit is a tuned oscillator, how small can it be and still compete, without scale and without masking?</p>
      </Section>

      <ReedBankFigure />

      <Section id="filter" n={2} title="A filter that oscillates">
        <p>The building block is the <strong>Recursive Quadrature Filter</strong>, introduced in our companion paper on prospective coding. It is a single complex number <M>{"y(t)"}</M> that follows its input <M>{"z(t)"}</M> while rotating at a preferred rate:</p>
        <Eq tex={String.raw`\tau\,\dot y = -y + \gamma\, z + (1-\gamma)(1 + i\omega\tau)\, y`} note="τ is a fixed base time constant; ω (phase-prior frequency) and γ (bandwidth) are learned." />
        <p>Read it as a tug of war. The <M>{"\\gamma z"}</M> term pulls the state toward the input. The <M>{"(1-\\gamma)(1+i\\omega\\tau)y"}</M> term is the filter’s own guess of where its state is heading: the current state, rotated forward by one time constant. Collect terms and it collapses to a one-line linear system,</p>
        <Eq tex={String.raw`\dot y = \lambda y + \alpha z,\qquad \alpha = \tfrac{\gamma}{\tau},\quad \omega_0 = (1-\gamma)\,\omega,\quad \lambda = -\alpha + i\omega_0`} />
        <p>which is a <strong>band-pass filter</strong> with unit gain at <M>{"\\omega_0"}</M> and a half-power bandwidth of <M>{"2\\alpha"}</M>. Its real and imaginary parts are an in-phase and quadrature pair, so <M>{"|y|"}</M> tracks the amplitude of its band whatever the phase. Try it:</p>
      </Section>

      <FilterLab initialHz={10} initialGamma={0.12} show3d={false} />
      <p className="widget-caption">
        <b>Everything here is computed from the equation above.</b> Smaller γ means a longer memory (τ/γ), a sharper peak and a slower spiral into the origin. Larger γ trades selectivity for speed. The same object is, in signal-processing terms, one pole of a diagonal state-space model, which is why it trains with the same parallel scans as S4, S5 and Mamba.
      </p>

      <Section id="encoder" n={3} title="The encoder">
        <p>An encoder stacks <strong>four layers of 64 filters</strong>. Between layers, a complex mixing matrix <M>{"W^{(l)}"}</M> and a split-ReLU (applied to the real and imaginary parts separately) combine the filters of one layer into the drive of the next. The initial ceiling of the filter frequencies halves from layer to layer, so early layers listen to fast rhythms and later ones to slow envelopes.</p>
        <p>Each layer is also driven <em>prospectively</em>: by a first-order look-ahead of its input, <M>{"z + \\tau\\dot z"}</M>, which compensates for the lag every integrating layer adds. It costs no parameters and is the subject of the companion paper.</p>
      </Section>

      <div className="widget" style={{ marginTop: 40 }}>
        <div className="widget-head"><span><b>Inside the encoder</b> · d4/64 RQF stack</span><span className="mono">illustrative, untrained weights</span></div>
        <Encoder3DLazy />
      </div>
      <p className="widget-caption">
        <b>A real RQF stack running in your browser</b> on a synthetic EEG-like probe at 128 Hz. Each bar is one filter’s magnitude |y|. Watch the front deck flicker with alpha and beta while the back deck, tuned an octave lower per layer, moves with the slow envelope. The trained encoder has 33.7k parameters; with its pooler and readout the whole system is 110k.
      </p>

      <Section id="objective" n={4} title="Learning by predicting">
        <p>Because each filter already carries a model of how its oscillation continues, predicting the future is a natural thing to ask of the encoder. So that is the only thing we ask of it during pretraining. No labels, no masking.</p>
        <p>A source representation <M>{"s_a"}</M> from an earlier time goes through a small prediction head <M>{"f_\\phi"}</M>. The prediction has to pick out the encoder’s own later representation <M>{"t_a^+"}</M> from <M>{"K"}</M> negatives drawn from other times and other recordings, scored by cosine similarity in the InfoNCE loss:</p>
        <Eq tex={String.raw`\mathcal{L}_{\text{NCE}} = -\frac{1}{|\mathcal A|}\sum_{a\in\mathcal A}\log\frac{\exp(\beta\,\mathrm{sim}^+_a)}{\exp(\beta\,\mathrm{sim}^+_a)+\sum_{k=1}^{K}\exp(\beta\,\mathrm{sim}^-_{a,k})}`} note="Targets are detached (stop-gradient). The head is thrown away after pretraining." />
        <h3>Two ways to set the horizon</h3>
        <ul>
          <li><strong>Windowed.</strong> Cut the state sequence into fixed windows, summarise each one (a mean for speech; a learned pooler of the mean and final state for EEG), and predict the summary of the window <M>{"h_w"}</M> steps later.</li>
          <li><strong>Dense.</strong> At a single timestep, predict the future log-power of the encoder’s states over an interval starting <M>{"\\Delta"}</M> samples ahead: <M>{"g_n = \\log\\big(\\epsilon + \\tfrac{1}{N_w}\\sum_u |y_u|^2\\big)"}</M>.</li>
        </ul>
        <p>The gradient of this loss reaches every filter’s <M>{"\\omega"}</M> and <M>{"\\gamma"}</M>, so pretraining moves the filters themselves toward the rhythms that make the future predictable.</p>
      </Section>

      <PredictLab />

      <Section id="channels" n={5} title="From one channel to a scalp">
        <p>A scalp EEG has 16 to 64 electrodes; an intracranial recording can have hundreds. Rather than learn a model for every montage, we run <strong>one shared encoder on each channel separately</strong>. During pretraining it never learns which electrode it is listening to, or where it sits.</p>
        <p>Space enters only downstream. The per-channel window summaries take two routes that are concatenated: one fuses channels with bases built from the <strong>electrode coordinates</strong>, the other takes their mean, standard deviation and maximum. The result is pooled over windows and passed to a small task head.</p>
        <Callout label="Why it matters">The pretrained encoder doesn’t care what headset produced the data. That is what lets weights pretrained on the Temple University EEG corpus transfer to a different lab’s motor-imagery recordings.</Callout>
      </Section>

      <Section id="results" n={6} title="Results">
        <p>We tested four benchmarks across scalp and intracranial recordings, with patient-disjoint or chronological splits, model selection on validation only, and the test set touched once.</p>
      </Section>

      <Stats
        items={[
          { value: <>0.925</>, label: "TUAB abnormal-EEG AUROC on 100 s segments, with 110k parameters (SAMBA: 0.905 with 1.0M)" },
          { value: <>0.882</>, label: "BrainTreebank sentence-onset AUROC with the encoder frozen, 2.9 points above the best published" },
          { value: <>0.822</>, label: "ISRUC sleep-staging balanced accuracy, above every comparison model incl. one 308× larger" },
          { value: <><em>+4.9</em> pts</>, label: "Gain from pretraining when only 1% of TUAB labels are available" },
        ]}
      />

      <ParamScatter benches={BENCHES as Bench[]} />

      <div className="prose">
        <h3>Pretraining helps most when labels are scarce</h3>
        <p>To isolate pretraining, we start two copies of the same encoder from identical random weights, pretrain one, then train both on the same labelled subset. With every label available they finish level. With 1% of the labels, the pretrained copy is 4.9 points ahead. With the encoder frozen, pretraining is worth 2.3 to 3.4 points at every budget.</p>
      </div>

      <PairedBars
        title="TUAB label budget · full fine-tuning"
        unit="test AUROC, 10 s segments"
        a="Same weights, no pretraining"
        b="Windowed self-supervised pretraining"
        lo={0.6}
        hi={0.92}
        groups={[
          { label: "1%", a: 0.6509, b: 0.7001 },
          { label: "5%", a: 0.7822, b: 0.8041 },
          { label: "10%", a: 0.8271, b: 0.8395 },
          { label: "25%", a: 0.8736, b: 0.8782 },
          { label: "100%", a: 0.9046, b: 0.904 },
        ]}
        caption={<><b>Paper, Table 4.</b> Mean of three downstream seeds from one checkpoint. At 1% one of three seeds is worse with pretraining, so the interval is wide (1.4 to 8.3 points).</>}
      />

      <div className="prose">
        <h3>The prediction target shapes what is learned</h3>
        <p>On intracranial BrainTreebank we froze the pretrained encoder and trained only a readout. Predicting <strong>window summaries</strong> gives 0.882 AUROC, 5.7 points above the same frozen encoder without pretraining and 1.5 points above <strong>dense</strong> prediction. And freezing beat fine-tuning: letting the task loss reshape the encoder cost 1.2 points. The pretrained representation was already the better one.</p>
      </div>

      <PairedBars
        title="BrainTreebank · encoder frozen vs fine-tuned"
        unit="test AUROC, 7 held-out sessions"
        a="Fully fine-tuned"
        b="Frozen"
        lo={0.8}
        hi={0.9}
        groups={[
          { label: "No pretraining", a: 0.8459, b: 0.8247 },
          { label: "Dense SSL", a: 0.8529, b: 0.867 },
          { label: "Windowed SSL", a: 0.8706, b: 0.8822 },
        ]}
        caption={<><b>Paper, Table 7.</b> Without pretraining, fine-tuning helps (the encoder has nothing to lose). After windowed pretraining, freezing is better.</>}
      />

      <Section id="meaning" n={7} title="What it means">
        <p>Three findings come out of the experiments.</p>
        <ol>
          <li><strong>A compact oscillator encoder is a real alternative</strong> to Transformer-based models when the signal is made of rhythms.</li>
          <li><strong>The time scale of the prediction target matters.</strong> Window summaries give stronger frozen representations than per-timestep targets.</li>
          <li><strong>Pretraining acts as a prior.</strong> Its value is largest when labels are scarce or the encoder is frozen, and shrinks when the downstream loss is free to reshape everything.</li>
        </ol>
        <p>The limits are stated plainly in the paper: apart from the cross-corpus BCI result, each dataset has its own pretrained weights; and the comparisons with foundation models don’t separate the oscillatory prior from tokenisation, masking or scale. Those are the next experiments.</p>
        <Callout label="The idea in one line">A small recurrent encoder learns competitive representations when its dynamics and its objective share a model of time.</Callout>
      </Section>
    </Article>
  );
}
