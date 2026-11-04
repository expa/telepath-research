import { useLayoutEffect, useRef } from "react";
import { riseDiscs } from "@/lib/logo-bubbles";

/** The same three-dimensional bubbles used by the homepage and its transition. */
export function Logo() {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => riseDiscs(root.current, 80), []);
  return <div ref={root} className="landing-discs article-discs" aria-hidden="true"><span /><span /><span /></div>;
}
