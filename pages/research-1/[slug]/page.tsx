import ProspectiveCoding from "@/components/posts/prospective-coding";
import SelfSupervisedRqf from "@/components/posts/self-supervised-rqf";
import Organics from "@/components/posts/organics";

const POSTS: Record<string, () => React.JSX.Element> = { "prospective-coding": ProspectiveCoding, "self-supervised-rqf": SelfSupervisedRqf, organics: Organics };

export default function PostPage({ slug }: { slug: string }) {
  const Post = POSTS[slug];
  return Post ? <Post /> : <main className="post"><p className="post-body">Not found.</p></main>;
}
