import { Facts, Fig, Post } from "@/components/v2/post/post";
import { DamperRigFigure } from "@/components/v2/figures/damper-rig";
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

      <h2>A spring and its damper</h2>
      <p>
        We proved that this circuit always settles, and the proof says something concrete about why. Close to its resting point, the circuit behaves exactly like a weight on a spring with a damper, the shock absorber that stops a car bouncing after a bump.
      </p>
      <p>
        Feedback is what makes a circuit useful, and also what makes it dangerous: it pushes the weight along with its own motion, feeding energy in. Below, a motor does that pushing, and a pen traces the weight’s motion on a strip of paper.
      </p>
      <Fig>
        <DamperRigFigure bare />
      </Fig>
      <p>
        With the damper off, a gentle push still dies away. Turn the push up past a certain point and every swing comes back bigger than the last, until the weight slams into the stops. That’s a circuit blowing up. Switch the damper on and the same shaking dies away, however hard the motor pushes.
      </p>
      <p>
        In ORGaNICs, normalization is the damper. It divides the feedback down as activity grows, so the damping never runs out.
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
