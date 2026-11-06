import { V2Scope } from "@/components/v2/scope";
import ProspectiveCoding from "@/components/v2/detailed/prospective-coding";
import SelfSupervisedRqf from "@/components/v2/detailed/self-supervised-rqf";
import Organics from "@/components/v2/detailed/organics";
import LongTimescales from "@/components/v2/detailed/long-timescales";
import UnconditionalStability from "@/components/v2/detailed/unconditional-stability";

const PAGES: Record<string, () => React.JSX.Element> = { "prospective-coding": ProspectiveCoding, "self-supervised-rqf": SelfSupervisedRqf, "long-timescales": LongTimescales, "unconditional-stability": UnconditionalStability, organics: Organics };

function DetailedPage({ slug }: { slug: string }) {
  const Page = PAGES[slug];
  return Page ? <Page /> : <main className="post"><p className="post-body">Not found.</p></main>;
}

export default function VersionTwo(props: { slug: string }) { return <V2Scope><DetailedPage {...props} /></V2Scope>; }
