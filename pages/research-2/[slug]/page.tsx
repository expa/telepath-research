import { V2Scope } from "@/components/v2/scope";
import ProspectiveCoding from "@/components/v2/posts/prospective-coding";
import SelfSupervisedRqf from "@/components/v2/posts/self-supervised-rqf";
import Organics from "@/components/v2/posts/organics";

const POSTS: Record<string, () => React.JSX.Element> = { "prospective-coding": ProspectiveCoding, "self-supervised-rqf": SelfSupervisedRqf, organics: Organics };

function PostPage({ slug }: { slug: string }) {
  const Post = POSTS[slug];
  return Post ? <Post /> : <main className="post"><p className="post-body">Not found.</p></main>;
}

export default function VersionTwo(props: { slug: string }) { return <V2Scope><PostPage {...props} /></V2Scope>; }
