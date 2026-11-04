import type { LoadArgs } from "modulato";
import { paperOf } from "@/content/papers";
import { ogImage } from "@/lib/og";

export function load({ params }: LoadArgs) {
  return { slug: params.slug };
}

export function meta({ props }: LoadArgs & { props: ReturnType<typeof load> }) {
  const p = paperOf(props.slug);
  if (!p) return { title: "Not found · Telepath Research" };
  return { title: `${p.short}, in detail · Telepath Research`, description: p.summary, meta: ogImage(p.slug) };
}
