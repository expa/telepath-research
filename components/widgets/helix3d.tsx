"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { alphaOf, impulse, type Rqf } from "@/lib/rqf";
import { Stage3D } from "./stage3d";

const LEN = 8;
const R = 1.5;
const WALL = 2.1;

/** The RQF impulse response as the corkscrew it really is: time runs left to right, Re up, Im toward you. */
export default function Helix3D({ f, span }: { f: Rqf; span: number }) {
  return (
    <Stage3D
      hint="Drag to turn · the state is one complex number, spinning and decaying"
      legend={
        <>
          <span><i style={{ background: "#ed6300" }} />y(t) in 3D</span>
          <span><i style={{ background: "#2a211b" }} />Re y · in-phase</span>
          <span><i style={{ background: "#f0a46a" }} />Im y · quadrature</span>
        </>
      }
    >
      <Helix f={f} span={span} />
    </Stage3D>
  );
}

function Helix({ f, span }: { f: Rqf; span: number }) {
  const { tube, re, im, env, pts } = useMemo(() => {
    const a = alphaOf(f);
    const n = 600;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * span;
      const [x, y] = impulse(f, t);
      pts.push(new THREE.Vector3(-LEN / 2 + (t / span) * LEN, (x / a) * R, (y / a) * R));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 900, 0.035, 10, false);
    const line = (ps: THREE.Vector3[], color: string) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(ps), new THREE.LineBasicMaterial({ color, toneMapped: false }));
    const re = line(pts.map((p) => new THREE.Vector3(p.x, p.y, -WALL)), "#2a211b");
    const im = line(pts.map((p) => new THREE.Vector3(p.x, -WALL, p.z)), "#e07b2f");
    const env = line(pts.map((p) => new THREE.Vector3(p.x, Math.hypot(p.y, p.z), -WALL)), "#c4b2a2");
    return { tube, re, im, env, pts };
  }, [f, span]);

  const bead = useRef<THREE.Mesh>(null);
  const stem = useRef<THREE.Mesh>(null);
  const clock = useRef(0);
  useFrame((_, dt) => {
    clock.current = (clock.current + dt / 6) % 1;
    const p = pts[Math.floor(clock.current * (pts.length - 1))];
    bead.current?.position.copy(p);
    if (stem.current) {
      const r = Math.hypot(p.y, p.z) || 1e-3;
      stem.current.position.set(p.x, p.y / 2, p.z / 2);
      stem.current.scale.set(1, r, 1);
      stem.current.rotation.set(Math.atan2(p.z, p.y), 0, 0);
    }
  });

  return (
    <group>
      <mesh geometry={tube}>
        <meshStandardMaterial color="#ed6300" roughness={0.35} metalness={0.1} emissive="#ed6300" emissiveIntensity={0.15} />
      </mesh>
      <mesh ref={bead}>
        <sphereGeometry args={[0.1, 24, 24]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffb36b" emissiveIntensity={0.6} />
      </mesh>
      <mesh ref={stem}>
        <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
        <meshBasicMaterial color="#a8320c" transparent opacity={0.6} />
      </mesh>
      {/* time axis */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, LEN + 0.6, 8]} />
        <meshBasicMaterial color="#93857a" />
      </mesh>
      {/* back wall (Re) and floor (Im) */}
      <mesh position={[0, 0, -WALL - 0.01]}>
        <planeGeometry args={[LEN + 0.8, 2 * R + 0.8]} />
        <meshBasicMaterial color="#fff6ee" transparent opacity={0.85} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, -WALL - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[LEN + 0.8, 2 * R + 0.8]} />
        <meshBasicMaterial color="#ffeedf" transparent opacity={0.85} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <primitive object={re} />
      <primitive object={env} />
      <primitive object={im} />
    </group>
  );
}
