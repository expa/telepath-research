import { ogImage } from "@/lib/og";

export function meta() {
  return { title: "Telepath", description: "Intelligence that evolves.", meta: ogImage("telepath") };
}

// Native scrolling: no Lenis smooth-scroll loop running every frame.
export const scroll = false;
