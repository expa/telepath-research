import { Facts, Fig, Post } from "@/components/v2/post/post";
import { GovernorFigure } from "@/components/v2/figures/governor";
import { paperOf } from "@/content/papers";

const paper = paperOf("long-timescales");

export default function Page() {
  return (
    <Post paper={paper}>
      <p>
        A neuron forgets in a few thousandths of a second. Yet you can hold a thought for seconds, learn a skill over weeks and remember a face for years. Somewhere, fast parts add up to slow memory.
      </p>
      <p>
        The simplest explanation is a network of neurons that keep passing activity around. Pass it on with exactly the right strength and the echo lasts and lasts. Brain recordings show the fingerprint of this: activity stays correlated with itself over a huge range of times, with no single timescale.
      </p>

      <h2>The catch: balancing on a knife-edge</h2>
      <p>
        In the textbook model this only works on a knife-edge. Connections a little too weak and every echo dies out quickly. A little too strong and activity runs away. The long memory lives exactly at the boundary, the <em>edge of stability</em>, and only for one precise wiring.
      </p>
      <p>
        That can’t be how brains do it. No two brains are wired the same, and wiring changes all the time, yet the long-lasting correlations show up in everyone, and in every species that has been measured.
      </p>

      <h2>One extra unit</h2>
      <p>
        We add a single unit to the network. It watches the total activity and, the busier the network gets, the more it turns every connection down by the same factor. It doesn’t know any individual connection. It only knows how loud the whole network is.
      </p>
      <p>
        It works like the governor on a steam engine. When the engine speeds up, the spinning balls fly out and close the throttle. Below, the knob sets how strongly the network is wired; drag across the figure to turn it. The dial, which shows how close the network is to the edge, swings and then settles back on the edge mark.
      </p>
      <Fig>
        <GovernorFigure bare />
      </Fig>
      <p>
        The surprise is how exactly it settles. The extra unit doesn’t just keep the network from running away. It parks it <strong>precisely</strong> on the edge, for any wiring strong enough to get there, and for whichever particular wiring a brain happens to have.
      </p>

      <h2>Long memory, everywhere</h2>
      <Facts
        items={[
          ["1", "unit added to the network, where earlier gating solutions needed one per neuron"],
          ["0", "connections that need adjusting: the edge is reached for any strength above a threshold"],
          ["t⁻¹ᐟ²", "the way correlations fade over time: slowly, as a power law, with no timescale of its own"],
        ]}
      />
      <p>
        Sitting on the edge, the network’s activity echoes with a whole spectrum of slow timescales. The math predicts exactly how correlations fade, with nothing left to fit, and simulations of networks from 250 to 40,000 neurons follow the prediction. Change how strongly the network is wired and the curves don’t move at all.
      </p>

      <h2>Why it matters</h2>
      <p>
        The extra unit isn’t exotic. It is <strong>normalization</strong>, a computation neuroscientists find throughout the brain, usually credited with keeping responses in range. This paper shows the same circuit also buys long memory, for free. It predicts that disrupting normalization should destroy these long-range correlations, a possible link to conditions like epilepsy where they are lost.
      </p>
      <p>
        For recurrent networks in machine learning, it points to a cheap way to hold information over long stretches without hand tuning. It is the same normalizing feedback at the heart of our <a href="/research/organics">ORGaNICs</a> circuits, which our <a href="/research/unconditional-stability">stability</a> paper shows also keeps them from blowing up.
      </p>
    </Post>
  );
}
