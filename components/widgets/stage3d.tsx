"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Group } from "three";

/**
 * A small 3D stage: soft paper background, drag to turn, slow idle turn,
 * renders only while on screen, still under reduced motion.
 */
export function Stage3D({ children, hint = "Drag to turn", legend, camera = [0, 2.6, 12], idle = 0.12, tilt = 0.32 }: { children: ReactNode; hint?: string; legend?: ReactNode; camera?: [number, number, number]; idle?: number; tilt?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const drag = useRef({ on: false, x: 0, y: 0, yaw: -0.6, pitch: tilt, vyaw: 0, touched: 0 });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const down = (e: React.PointerEvent) => {
    drag.current.on = true;
    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.on) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    d.x = e.clientX;
    d.y = e.clientY;
    d.yaw += dx * 0.008;
    d.vyaw = dx * 0.008;
    d.pitch = Math.max(-0.2, Math.min(1.2, d.pitch + dy * 0.006));
    d.touched = performance.now();
  };
  const up = () => (drag.current.on = false);

  return (
    <div className="canvas3d" ref={host} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <Canvas frameloop={visible ? "always" : "never"} dpr={[1, 1.5]} camera={{ position: camera, fov: 36 }} gl={{ antialias: true, alpha: true }} onCreated={({ camera: c }) => c.lookAt(0, 0, 0)}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 8, 6]} intensity={1.6} />
        <directionalLight position={[-6, 2, -4]} intensity={0.4} color="#ffd2a8" />
        <Turn drag={drag} idle={idle}>{children}</Turn>
      </Canvas>
      {hint ? <span className="hint3d">{hint}</span> : null}
      {legend ? <div className="legend3d">{legend}</div> : null}
    </div>
  );
}

function Turn({ children, drag, idle }: { children: ReactNode; drag: React.RefObject<{ on: boolean; yaw: number; pitch: number; vyaw: number; touched: number }>; idle: number }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    const d = drag.current;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!d.on) {
      d.vyaw *= Math.exp(-dt * 4);
      d.yaw += d.vyaw;
      if (!still && performance.now() - d.touched > 2500) d.yaw += idle * dt;
    }
    if (g.current) {
      g.current.rotation.y += (d.yaw - g.current.rotation.y) * Math.min(1, dt * 10);
      g.current.rotation.x += (d.pitch - g.current.rotation.x) * Math.min(1, dt * 10);
    }
  });
  return <group ref={g}>{children}</group>;
}
