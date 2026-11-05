import { ogImage } from "@/lib/og";

export function meta() {
  return { title: "Research · Telepath", description: "Telepath’s research, explained.", meta: ogImage("research") };
}

// Native scrolling: no Lenis smooth-scroll loop running every frame.
export const scroll = false;
