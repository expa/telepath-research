import ProspectiveCoding from "@/components/detailed/prospective-coding";
import SelfSupervisedRqf from "@/components/detailed/self-supervised-rqf";
import Organics from "@/components/detailed/organics";

const PAGES: Record<string, () => React.JSX.Element> = { "prospective-coding": ProspectiveCoding, "self-supervised-rqf": SelfSupervisedRqf, organics: Organics };

export default function DetailedPage({ slug }: { slug: string }) {
  const Page = PAGES[slug];
  return Page ? <Page /> : <main className="post"><p className="post-body">Not found.</p></main>;
}
