import { Facts, Fig, Post } from "@/components/v2/post/post";
import { TwinGaugeFigure } from "@/components/v2/figures/twin-gauges";
import { paperOf } from "@/content/papers";

const paper = paperOf("unconditional-stability");

export default function Page() {
  return (
    <Post paper={paper}>
      <p>
        Neuroscientists have long built models of brain circuits from the parts real neurons have: excitation, inhibition, feedback. These models explain a lot about the brain. But try to train one on a task, the way you’d train a neural network, and it tends to fall apart. Nudge the wrong parameter and activity blows up or locks into an endless wobble, and the training goes with it.
      </p>
      <p>
        Machine learning sidesteps this with a toolbox of fixes: layer normalization, gradient clipping and careful initialisation. They work, but they’re bolted on after the fact, and brains don’t have them.
      </p>

      <h2>A circuit that normalizes itself</h2>
      <p>
        One computation shows up all over the brain: <strong>normalization</strong>. Each neuron’s response is divided by the combined activity of its neighbours, so responses stay in a useful range however strong the input. Our circuit model, ORGaNICs, computes this as part of its own dynamics: a pool of inhibitory neurons tracks the total activity and turns down the feedback that keeps each neuron going.
      </p>

      <h2>Two circuits, one knob</h2>
      <p>
        Below are two one-neuron circuits wired to the same input. Each feeds its own output back into itself, and the knob sets how strongly. Turn the feedback up and an echo builds on itself: past a strength of 1, every round trip comes back louder than it left.
      </p>
      <Fig>
        <TwinGaugeFigure bare />
      </Fig>
      <p>
        The left circuit is plain. Below 1 its needle settles; above 1 it runs off the scale and the lamp lights. That’s the blow-up that wrecks training. The right circuit is the same one with normalization: a second neuron watches how busy it is and turns the feedback down to match. Turn the knob as far as it goes and its needle surges, swings back and settles every time, on the answer normalization predicts.
      </p>
      <p>
        We proved that it always settles. Close to its resting point the circuit behaves exactly like a weight on a spring with a shock absorber: however you knock it, it rings and comes to rest. The proof also hands us the circuit’s energy, the quantity it always runs downhill on.
      </p>
      <p>
        The proof holds for <strong>any</strong> setting of the circuit’s parameters and <strong>any</strong> input, for circuits of any size, when each neuron feeds back only onto itself. With arbitrary connections between neurons we prove it for the smallest circuit, and in simulations of larger ones, with the connection strength kept within bounds, every circuit we tried was stable.
      </p>

      <h2>Training it like a neural network</h2>
      <p>
        Because it can’t blow up, the circuit can be trained the ordinary way, with backpropagation through time, and none of the usual safety rails.
      </p>
      <Facts
        items={[
          ["98.2%", "on MNIST digits as a static classifier, level with a standard network of the same size and above an earlier brain-like circuit model"],
          ["97.7%", "on sequential MNIST, read one pixel at a time, slightly above an LSTM with less than half its parameters, and no gradient clipping"],
          ["Any", "setting of parameters and inputs is provably stable, when each neuron feeds back onto itself"],
        ]}
      />

      <h2>Why it matters</h2>
      <p>
        Normalization isn’t only a description of what brains compute. Built into the dynamics, it is what makes a brain-like circuit stable, and stability is what makes it trainable. The proof also gives each neuron an energy it is minimizing, so a trained circuit can be read, not just run. It is a step on the path from <a href="/research/organics">ORGaNICs</a> to the trainable oscillator networks in our <a href="/research/prospective-coding">look-ahead</a> work, and normalization returns as the stabilizer in our <a href="/research/long-timescales">long-timescales</a> paper.
      </p>
    </Post>
  );
}
