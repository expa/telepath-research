"use client";
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";

const blank = <div className="canvas3d" />;

/** Load a WebGL component in the browser only: three.js never runs during SSR. */
export function ClientOnly<P extends object>(load: () => Promise<{ default: ComponentType<P> }>) {
  const Lazy = lazy(load);
  return function Client(props: P) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return mounted ? <Suspense fallback={blank}><Lazy {...props} /></Suspense> : blank;
  };
}

export const Encoder3DLazy = ClientOnly(() => import("./encoder3d"));
