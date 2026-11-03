/** Telepath's mark: three stacked glass discs, narrowing downward. */
export function Logo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="tp-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb36b" />
          <stop offset="1" stopColor="#ed6300" />
        </linearGradient>
      </defs>
      <ellipse cx="12" cy="5" rx="10" ry="3" fill="url(#tp-g)" />
      <ellipse cx="12" cy="12" rx="5.6" ry="2.4" fill="url(#tp-g)" />
      <circle cx="12" cy="18.6" r="2.4" fill="url(#tp-g)" />
    </svg>
  );
}
