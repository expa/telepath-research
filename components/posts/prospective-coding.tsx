import { Facts, Fig, Post } from "@/components/post/post";
import { LagWaves } from "@/components/post/metaphors";
import { CascadeBenchFigure } from "@/components/figures/cascade-bench";
import { paperOf } from "@/content/papers";

const paper = paperOf("prospective-coding");

export default function Page() {
  return (
    <Post paper={paper}>
      <p>
        A neuron doesn’t react instantly. It gathers its input over a short stretch of time, a few tens of milliseconds, and responds to the sum. That gives it a little memory. It also makes it late.
      </p>
      <p>
        One late neuron is not a problem. A deep network is a stack of them, and the delays add up. By the time a signal reaches the top of the stack it describes a world that has already moved on. The same thing happens in reverse while the network learns: the correction that comes back down arrives after the moment it was meant to fix.
      </p>

      <h2>Lag adds up with depth</h2>
      <p>
        Picture six people passing a ball down a line, each one waiting to see where it is before reacting. Every hand-off adds a beat. Below, each rail is one layer following the layer in front of it. Watch the back rail trail behind, then switch on look-ahead.
      </p>
      <Fig>
        <CascadeBenchFigure bare />
      </Fig>

      <h2>Aim for where it’s going</h2>
      <p>
        A quarterback doesn’t throw to where the receiver is. They throw to where the receiver will be. Our fix asks every layer to do the same: instead of reading its input as it is right now, it reads where that input is heading, a short step into the future.
      </p>
      <p>
        That guess costs nothing to make. It uses how fast the input is changing, which the layer already sees, and it adds <strong>no new parameters</strong>. Real neurons in the cortex, the retina and the cerebellum seem to do something very similar: they fire slightly ahead of their input.
      </p>
      <Fig caption="The same six layers following a slow rhythm. Each dot marks a layer’s peak. Without look-ahead the peaks drift later down the stack; with it they line up with the present (the dashed line).">
        <LagWaves />
      </Fig>

      <h2>A brain-like unit that trains like a modern AI model</h2>
      <p>
        We also introduce a new building block, the Recursive Quadrature Filter. Each one is a tiny oscillator with just two settings: the rhythm it listens for and how sharply it is tuned. That makes it easy to read: you can look at any unit and say what it is doing.
      </p>
      <p>
        It comes from a theory of how cortex works, yet it turns out to be a special case of the state-space models behind today’s fastest sequence models, like Mamba. So it trains on very long sequences with the same tricks, and the look-ahead works for those models too.
      </p>

      <h2>What it can do</h2>
      <p>With standard training, look-ahead matched or beat the original in every model and setting we tested. When errors can only travel down through the layers, it helps most in the deepest networks, exactly where lag is worst. Small networks of these units go a long way:</p>
      <Facts
        items={[
          ["96%", "accuracy recognizing spoken words straight from the raw sound wave, with a model of just 32,000 parameters"],
          ["16,384", "steps long: the length of a visual puzzle a minimal six-layer stack learns, one of the hardest long-memory tests"],
          ["99.8%", "on a selective-copying memory test, with a selective version of the unit that chooses what to let in, and look-ahead switched on"],
          ["0", "extra parameters for the look-ahead"],
        ]}
      />

      <h2>Why it matters</h2>
      <p>
        Deep networks built from realistic, slow neurons have always struggled to learn. This shows that a single principle the brain seems to use, responding to where things are going rather than where they are, removes much of that difficulty. It gives us small, interpretable models that learn long, hard tasks, and it’s the foundation for our <a href="/research-1/self-supervised-rqf">brain-signal encoder</a>.
      </p>
    </Post>
  );
}
