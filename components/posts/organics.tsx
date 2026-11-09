import { Fig, Post } from "@/components/post/post";
import { OrganicsCarouselFigure } from "@/components/figures/organics-carousel";
import { paperOf } from "@/content/papers";

const paper = paperOf("organics");

export default function Page() {
  return (
    <Post paper={paper}>
      <p>
        Hold a phone number in your head for a few seconds. That’s working memory. The textbook picture is a still photograph: a group of neurons keeps firing until you need the number.
      </p>
      <p>
        But memory is rarely still. You update where you parked as you walk away. You revise the start of a sentence when you hear its end. And in the lab, neurons holding a memory don’t just keep firing; their activity passes from one to the next, oscillates, and travels in waves.
      </p>

      <h2>A circuit with gates</h2>
      <p>
        ORGaNICs are circuits of neurons with two kinds of gates, themselves made of neurons. One decides when to let new information in. The other decides how much the circuit keeps listening to itself, and when to let go. AI researchers will recognize the idea: it’s the trick that made LSTMs work, rebuilt from parts the brain actually has.
      </p>

      <h2>Hold it, move it, clear it</h2>
      <p>
        Below, each piston is a neuron that prefers one direction. A target flashes and leaves a bump of activity. The input switches off, and the bump stays: the memory is held. Then, while the eyes move, the bump slides around the ring to stay correct, and stops in its new place. Finally a gate wipes it clean. Click the platter to set your own target.
      </p>
      <Fig>
        <OrganicsCarouselFigure bare />
      </Fig>
      <p>
        All of this happens with <strong>the same connections</strong>. Nothing is rewired. Only the gates change. The same circuit can also play out a movement it has prepared, faster, slower or in reverse, the way you can hum a song at a new tempo without learning it again.
      </p>

      <h2>Stable on its own</h2>
      <p>
        A circuit that holds activity forever is balanced on a knife-edge: nudge it and the activity fades away or blows up. ORGaNICs stay balanced by themselves. When activity grows, a gate turns the circuit’s gain down, and when it shrinks the gain comes back up, the same kind of normalization seen throughout the cortex.
      </p>

      <h2>Why it matters</h2>
      <p>
        ORGaNICs explain several puzzling observations about working memory with one circuit, and they set the agenda for our machine-learning work: units that balance what they are told against what they expect, using rhythms to keep track of time. That idea led to the oscillator units in our <a href="/research-1/prospective-coding">look-ahead paper</a>, and from there to our <a href="/research-1/self-supervised-rqf">brain-signal encoder</a>.
      </p>
    </Post>
  );
}
