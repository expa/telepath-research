export interface Paper {
  slug: string;
  short: string;
  title: string;
  venue: string;
  /** Full venue name for the post header, and whether it is a conference or a journal. */
  venueFull: string;
  venueKind: "Conference" | "Journal" | "Preprint";
  /** Venue as it appears in a citation. */
  citeVenue: string;
  /** Publication date, ISO. */
  published: string;
  year: number;
  authors: string[];
  summary: string;
  hook: string;
  /** Plain-language headline and dek for the short post. */
  headline: string;
  dek: string;
  pdf: string;
  code?: string;
  tags: string[];
}

export const PAPERS: Paper[] = [
  {
    slug: "prospective-coding",
    short: "Prospective coding",
    title: "Prospective Coding Improves Learning in Deep Continuous-Time Recurrent Networks",
    venue: "NeurIPS",
    venueFull: "NeurIPS 2026",
    venueKind: "Conference",
    citeVenue: "Advances in Neural Information Processing Systems (NeurIPS)",
    published: "2026-11-03",
    year: 2026,
    authors: ["Shivang Rawat", "Mirko Morello", "Flaviano Morone", "David J. Heeger"],
    summary:
      "Every layer of a brain-like network is slow: it integrates over time, so deep stacks fall behind their inputs and their teaching signals fade. We introduce Recursive Quadrature Filters and a parameter-free look-ahead that lets each layer answer for where its input is going, not where it was.",
    hook: "Deep recurrent networks lag. A one-line, parameter-free look-ahead removes the lag.",
    headline: "Teaching slow networks to look ahead",
    dek: "Brains are built from slow parts, and stacking slow parts makes a network fall behind. A simple look-ahead lets every layer keep up, and lets tiny models learn hard, long tasks.",
    pdf: "/papers/prospective-coding.pdf",
    code: "https://github.com/Sequel-Institute/prospective-rqf",
    tags: ["Recurrent networks", "State-space models", "Neuroscience"],
  },
  {
    slug: "self-supervised-rqf",
    short: "Self-supervised RQFs",
    title: "Self-Supervised Learning with Recursive Quadrature Filters for Neural Time Series",
    venue: "NeurIPS · Foundation Models for the Brain and Body",
    venueFull: "NeurIPS 2026 Workshop: Foundation Models for the Brain and Body",
    venueKind: "Conference",
    citeVenue: "NeurIPS Workshop on Foundation Models for the Brain and Body",
    published: "2026-11-03",
    year: 2026,
    authors: ["Mirko Morello", "Shivang Rawat", "David J. Heeger"],
    summary:
      "A 110k-parameter encoder made of tuned oscillators learns from unlabeled brain recordings by predicting its own future, and lands in the range of EEG foundation models 30 to 3,000 times its size.",
    hook: "A 110k-parameter brain-signal encoder that learns by predicting its own future.",
    headline: "A tiny brain-signal model that learns by guessing what comes next",
    dek: "An encoder made of tuned oscillators learns from unlabeled brain recordings by forecasting them. At 110,000 parameters it rivals models thirty to three thousand times its size.",
    pdf: "/papers/rqf-self-supervised.pdf",
    tags: ["EEG", "Self-supervised learning", "Neural time series"],
  },
  {
    slug: "long-timescales",
    short: "Long timescales",
    title: "A Minimal Mechanism to Generate Long Timescales without Fine Tuning",
    venue: "arXiv · Preprint",
    venueFull: "arXiv preprint 2608.21586 (cond-mat.dis-nn)",
    venueKind: "Preprint",
    citeVenue: "arXiv preprint arXiv:2608.21586",
    published: "2026-08-21",
    year: 2026,
    authors: ["Kathryn McClain", "Shivang Rawat", "Mia Morrell", "Stefano Martiniani", "David J. Heeger", "Flaviano Morone"],
    summary:
      "Brains remember over seconds to years with neurons that forget in milliseconds. A linear network can do it only if its connections are tuned to the edge of stability. One extra unit that pools total activity and turns every connection down holds the network on that edge for any connection strength, and the scale-free correlations follow.",
    hook: "One normalising unit holds a network at the edge of stability, with no fine tuning.",
    headline: "Long memory without the fine tuning",
    dek: "Brains keep information for seconds to years with neurons that forget in milliseconds. A single unit that turns the whole network down when it gets busy keeps it poised to do that, however it is wired.",
    pdf: "/papers/long-timescales.pdf",
    tags: ["Criticality", "Normalisation", "Random matrices"],
  },
  {
    slug: "unconditional-stability",
    short: "Unconditional stability",
    title: "Unconditional Stability of a Recurrent Neural Circuit Implementing Divisive Normalization",
    venue: "NeurIPS",
    venueFull: "NeurIPS 2024",
    venueKind: "Conference",
    citeVenue: "Advances in Neural Information Processing Systems (NeurIPS)",
    published: "2024-12-10",
    year: 2024,
    authors: ["Shivang Rawat", "David J. Heeger", "Stefano Martiniani"],
    summary:
      "We prove that an ORGaNICs circuit, which computes divisive normalisation in its own dynamics, is stable for every choice of parameters and inputs when its recurrent weights are the identity, by showing that near its fixed point it is a set of coupled damped oscillators. The stability makes it trainable with plain backpropagation through time, no gradient clipping, and it performs on par with LSTMs.",
    hook: "A brain-like circuit that can't blow up, so it trains like an LSTM.",
    headline: "A brain-like circuit that can’t blow up",
    dek: "Circuits modelled on the cortex are notoriously hard to train because they tip into instability. We prove one that normalises its own activity always settles, and then train it like an ordinary neural network.",
    pdf: "/papers/unconditional-stability.pdf",
    code: "https://github.com/martiniani-lab/dynamic-divisive-norm",
    tags: ["Stability", "Divisive normalisation", "Recurrent networks"],
  },
  {
    slug: "organics",
    short: "ORGaNICs",
    title: "Oscillatory Recurrent Gated Neural Integrator Circuits (ORGaNICs), a Unifying Theoretical Framework for Neural Dynamics",
    venue: "PNAS · Foundations",
    venueFull: "PNAS (Proceedings of the National Academy of Sciences)",
    venueKind: "Journal",
    citeVenue: "Proceedings of the National Academy of Sciences",
    published: "2019-10-21",
    year: 2019,
    authors: ["David J. Heeger", "Wayne E. Mackey"],
    summary:
      "The circuit theory our recurrent models grow from: one family of gated, oscillatory neural circuits that holds a memory, sends it travelling across the cortex, and plays it back as movement, fast, slow or in reverse.",
    hook: "One gated circuit that remembers, manipulates and moves.",
    headline: "Memory that you can move",
    dek: "A brain-inspired circuit that holds a memory without any input, updates it as the world shifts, and stays stable while it does both.",
    pdf: "/papers/organics.pdf",
    code: "https://archive.nyu.edu/handle/2451/60439",
    tags: ["Working memory", "Motor control", "Circuit theory"],
  },
];

export const paperOf = (slug: string) => PAPERS.find((p) => p.slug === slug)!;
