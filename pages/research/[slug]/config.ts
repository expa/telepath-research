import type { LoadArgs } from "modulato";
import { paperOf } from "@/content/papers";

export function load({ params }: LoadArgs) {
  return { slug: params.slug };
}

export function meta({ props }: LoadArgs & { props: ReturnType<typeof load> }) {
  const p = paperOf(props.slug);
  if (!p) return { title: "Not found · Telepath Research" };
  return { title: `${p.headline} · Telepath Research`, description: p.dek };
}
