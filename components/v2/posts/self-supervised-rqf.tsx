import { Facts, Fig, Post } from "@/components/v2/post/post";
import { SizeCircles } from "@/components/v2/post/metaphors";
import { ReedBankFigure } from "@/components/v2/figures/reed-bank";
import { paperOf } from "@/content/papers";

const paper = paperOf("self-supervised-rqf");

export default function Page() {
  return (
    <Post paper={paper}>
      <p>
        Brain recordings are made of rhythms. Slow waves while you sleep, a steady hum when you close your eyes, faster ripples when you concentrate. Doctors read these rhythms to spot seizures and sleep stages. Machines can learn to read them too.
      </p>
      <p>
        The usual approach borrows the recipe from language models: chop the signal into pieces, hide some, and train a very large model to fill in the gaps. It works, but it takes hundreds of millions of parameters, and nothing in those models knows that the signal is made of rhythms in the first place.
      </p>

      <h2>An encoder made of tuned oscillators</h2>
      <p>
        We went the other way. Our encoder is built from tiny oscillators, each one tuned to a single rhythm, like the reeds below. Shake the comb at some frequency and only the reeds tuned near it swing. Stack a few layers of these, and the model hears every rhythm in the signal at once.
      </p>
      <Fig>
        <ReedBankFigure bare />
      </Fig>

      <h2>Learning by forecasting</h2>
      <p>
        To learn, the encoder plays a simple game with no labels at all: it looks at a stretch of brain signal and guesses what its own activity will look like a moment later, like a weather forecast for the brain. Getting good at that game means learning which rhythms carry over time and which are noise.
      </p>
      <p>
        Because every unit is already an oscillator, it knows how a rhythm continues, so forecasting is a natural thing for it to learn. And since one shared encoder reads each electrode separately, the same model works with any headset, whether it has 16 electrodes or hundreds.
      </p>

      <h2>Small and still competitive</h2>
      <p>
        The whole system has about 110,000 parameters. The foundation models it competes with are 30 to 3,000 times larger.
      </p>
      <Fig caption="Circle area is model size. Our encoder next to three of the larger EEG models it was compared against.">
        <SizeCircles
          models={[
            { name: "Our encoder", params: 110e3, ours: true },
            { name: "CBraMod", params: 4.0e6 },
            { name: "REVE", params: 69e6 },
            { name: "LaBraM-Huge", params: 369e6 },
          ]}
        />
      </Fig>
      <Facts
        items={[
          ["0.925", "score at spotting abnormal EEG, above a model nine times its size"],
          ["Best", "published result at detecting when a sentence starts, from electrodes inside the brain, with the encoder frozen"],
          ["+4.9", "points from pretraining when only 1% of the labels are available"],
        ]}
      />
      <p>
        The gain from forecasting is largest when labeled data is scarce, which is the usual situation with brain recordings: hours of signal, very few annotations.
      </p>

      <h2>Why it matters</h2>
      <p>
        Bigger isn’t the only path to a general brain-signal model. Building the right structure into the model, rhythms in this case, lets something small enough to run on a device compete with models thousands of times larger. Small models are cheaper, faster, and easier to understand: you can look at any unit and see which rhythm it listens to. When this one spots abnormal EEG, it leans mostly on a handful of units tuned to the alpha and beta rhythms.
      </p>
    </Post>
  );
}
