import { useLayoutEffect, useRef } from "react";
import { useNavigation } from "modulato";
import { riseDiscs } from "@/lib/logo-bubbles";

/** The same three-dimensional bubbles used by the homepage and its transition. */
export function Logo() {
  const root = useRef<HTMLDivElement>(null);
  // Arriving from another research page, the logo was already on screen in this spot: show it at rest.
  const settled = useRef(useNavigation().from?.id.startsWith("research/") ?? false).current;
  useLayoutEffect(() => riseDiscs(root.current, 80, settled), []);
  return <div ref={root} className="landing-discs article-discs" aria-hidden="true"><span /><span /><span /></div>;
}
