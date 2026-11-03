export interface Paper {
  slug: string;
  short: string;
  title: string;
  venue: string;
  year: number;
  authors: string[];
  summary: string;
  hook: string;
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
    year: 2026,
    authors: ["Shivang Rawat", "Mirko Morello", "Flaviano Morone", "David J. Heeger"],
    summary:
      "Every layer of a brain-like network is slow: it integrates over time, so deep stacks fall behind their inputs and their teaching signals fade. We introduce Recursive Quadrature Filters and a parameter-free look-ahead that lets each layer answer for where its input is going, not where it was.",
    hook: "Deep recurrent networks lag. A one-line, parameter-free look-ahead removes the lag.",
    pdf: "/papers/prospective-coding.pdf",
    code: "https://github.com/Sequel-Institute/prospective-rqf",
    tags: ["Recurrent networks", "State-space models", "Neuroscience"],
  },
  {
    slug: "self-supervised-rqf",
    short: "Self-supervised RQFs",
    title: "Self-Supervised Learning with Recursive Quadrature Filters for Neural Time Series",
    venue: "NeurIPS · Foundation Models for the Brain and Body",
    year: 2026,
    authors: ["Mirko Morello", "Shivang Rawat", "David J. Heeger"],
    summary:
      "A 110k-parameter encoder made of tuned oscillators learns from unlabeled brain recordings by predicting its own future, and lands in the range of EEG foundation models 30 to 3,000 times its size.",
    hook: "A 110k-parameter brain-signal encoder that learns by predicting its own future.",
    pdf: "/papers/rqf-self-supervised.pdf",
    tags: ["EEG", "Self-supervised learning", "Neural time series"],
  },
  {
    slug: "organics",
    short: "ORGaNICs",
    title: "Oscillatory Recurrent Gated Neural Integrator Circuits (ORGaNICs), a Unifying Theoretical Framework for Neural Dynamics",
    venue: "PNAS · Foundations",
    year: 2019,
    authors: ["David J. Heeger", "Wayne E. Mackey"],
    summary:
      "The circuit theory our recurrent models grow from: one family of gated, oscillatory neural circuits that holds a memory, sends it travelling across the cortex, and plays it back as movement, fast, slow or in reverse.",
    hook: "One gated circuit that remembers, manipulates and moves.",
    pdf: "/papers/organics.pdf",
    code: "https://archive.nyu.edu/handle/2451/60439",
    tags: ["Working memory", "Motor control", "Circuit theory"],
  },
];

export const paperOf = (slug: string) => PAPERS.find((p) => p.slug === slug)!;
