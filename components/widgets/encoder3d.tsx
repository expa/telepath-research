"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { FS, eeg, rng } from "@/lib/eeg";
import { Stage3D } from "./stage3d";

const LAYERS = 4, WIDTH = 64, TAU = 0.01;
const CEIL = [26, 13, 6.5, 3.25];

interface Bank { Ar: Float64Array; Ai: Float64Array; Br: Float64Array; Bi: Float64Array; yr: Float64Array; yi: Float64Array; rms: Float64Array }

function bank(l: number): Bank {
  const Ar = new Float64Array(WIDTH), Ai = new Float64Array(WIDTH), Br = new Float64Array(WIDTH), Bi = new Float64Array(WIDTH);
  const h = 1 / FS;
  for (let i = 0; i < WIDTH; i++) {
    const hz = 0.5 * (CEIL[l] / 0.5) ** (i / (WIDTH - 1));
    const gamma = Math.min(0.95, 2 * Math.PI * hz * TAU * 0.3);
    const a = gamma / TAU, w0 = 2 * Math.PI * hz;
    const er = Math.exp(-a * h);
    Ar[i] = er * Math.cos(w0 * h);
    Ai[i] = er * Math.sin(w0 * h);
    const l2 = a * a + w0 * w0, qr = (-a * a) / l2, qi = (-a * w0) / l2;
    Br[i] = qr * (Ar[i] - 1) - qi * Ai[i];
    Bi[i] = qr * Ai[i] + qi * (Ar[i] - 1);
  }
  return { Ar, Ai, Br, Bi, yr: new Float64Array(WIDTH), yi: new Float64Array(WIDTH), rms: new Float64Array(WIDTH).fill(1e-3) };
}

/** An untrained d4/64 RQF stack running live on a synthetic EEG probe. Bar height is |y| per filter. */
export default function Encoder3D() {
  return (
    <Stage3D
      camera={[0, 5, 12.5]}
      tilt={0.42}
      idle={0.08}
      hint="Drag to turn · 4 layers × 64 filters, running live at 128 Hz"
      legend={
        <>
          <span>front deck: layer 1 · up to 26 Hz</span>
          <span>back deck: layer 4 · up to 3 Hz</span>
        </>
      }
    >
      <Decks />
    </Stage3D>
  );
}

function Decks() {
  const signal = useMemo(() => eeg(64, 3), []);
  const banks = useMemo(() => Array.from({ length: LAYERS }, (_, l) => bank(l)), []);
  const mix = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: LAYERS }, () => Array.from({ length: WIDTH }, () => Array.from({ length: 8 }, () => [Math.floor(r() * WIDTH), (r() - 0.3) * 0.6] as [number, number])));
  }, []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const clock = useRef(0);
  const shown = useRef(new Float64Array(LAYERS * WIDTH));
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);
  const lo = useMemo(() => new THREE.Color("#f3e3d4"), []);
  const hi = useMemo(() => new THREE.Color("#ed6300"), []);

  useFrame((_, dt) => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = still ? 0 : Math.round(Math.min(dt, 0.05) * FS);
    for (let s = 0; s < steps; s++) {
      const n = Math.floor(clock.current) % signal.length;
      clock.current += 1;
      let prevR: Float64Array | null = null, prevI: Float64Array | null = null;
      banks.forEach((b, l) => {
        for (let i = 0; i < WIDTH; i++) {
          let z = 0;
          if (l === 0) z = signal[n];
          else for (const [j, w] of mix[l][i]) z += w * (Math.max(0, prevR![j]) + Math.max(0, prevI![j])) / Math.sqrt(banks[l - 1].rms[j]);
          const nr = b.Ar[i] * b.yr[i] - b.Ai[i] * b.yi[i] + b.Br[i] * z;
          const ni = b.Ar[i] * b.yi[i] + b.Ai[i] * b.yr[i] + b.Bi[i] * z;
          b.yr[i] = nr;
          b.yi[i] = ni;
          b.rms[i] = 0.998 * b.rms[i] + 0.002 * (nr * nr + ni * ni);
        }
        prevR = b.yr;
        prevI = b.yi;
      });
    }
    const m = mesh.current;
    if (!m) return;
    banks.forEach((b, l) => {
      for (let i = 0; i < WIDTH; i++) {
        const k = l * WIDTH + i;
        const mag = Math.hypot(b.yr[i], b.yi[i]) / Math.sqrt(b.rms[i] * 2 + 1e-9);
        shown.current[k] += (Math.min(2.2, mag) - shown.current[k]) * 0.25;
        const v = shown.current[k];
        tmp.position.set(-4 + (i / (WIDTH - 1)) * 8, (v * 0.6) / 2, 1.8 - l * 1.2);
        tmp.scale.set(1, Math.max(0.02, v * 0.6), 1);
        tmp.updateMatrix();
        m.setMatrixAt(k, tmp.matrix);
        m.setColorAt(k, col.copy(lo).lerp(hi, Math.min(1, v / 1.6)));
      }
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <group position={[0, -0.6, 0]}>
      {Array.from({ length: LAYERS }, (_, l) => (
        <mesh key={l} position={[0, -0.06, 1.8 - l * 1.2]}>
          <boxGeometry args={[8.6, 0.08, 0.7]} />
          <meshBasicMaterial color={l === 0 ? "#f6e2cf" : "#f3e8de"} toneMapped={false} />
        </mesh>
      ))}
      <instancedMesh ref={mesh} args={[undefined, undefined, LAYERS * WIDTH]}>
        <boxGeometry args={[0.085, 1, 0.34]} />
        <meshStandardMaterial roughness={0.45} />
      </instancedMesh>
    </group>
  );
}
