"use client";
import { useRef } from "react";
export function Slider({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="control">
      <label>
        <span>{label}</span>
        <output>{format(value)}</output>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        style={{ ["--fill" as string]: `${fill}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A range input an animation loop can drive: `show` moves the thumb and readout without a React render. */
export function useRange() {
  const input = useRef<HTMLInputElement>(null);
  const out = useRef<HTMLOutputElement>(null);
  const last = useRef("");
  const show = (value: number, text: string) => {
    const i = input.current;
    if (!i) return;
    const key = `${value.toFixed(4)}|${text}`;
    if (key === last.current) return;
    last.current = key;
    if (document.activeElement !== i) i.value = String(value);
    i.style.setProperty("--fill", `${((Number(i.value) - Number(i.min)) / (Number(i.max) - Number(i.min))) * 100}%`);
    if (out.current) out.current.textContent = text;
  };
  return { input, out, show };
}

export function Range({ range, label, min, max, step, initial, text, onInput }: { range: ReturnType<typeof useRange>; label: string; min: number; max: number; step: number; initial: number; text: string; onInput: (v: number) => void }) {
  return (
    <div className="control">
      <label>
        <span>{label}</span>
        <output ref={range.out}>{text}</output>
      </label>
      <input
        ref={range.input}
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={initial}
        aria-label={label}
        style={{ ["--fill" as string]: `${((initial - min) / (max - min)) * 100}%` }}
        onInput={(e) => onInput(Number(e.currentTarget.value))}
      />
    </div>
  );
}
