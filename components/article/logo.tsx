/** Telepath's mark, as in the deck: a pill over two circles (68×70 in the source, here in a 24-unit box). */
export function Logo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="tp-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb36b" />
          <stop offset="1" stopColor="#ed6300" />
        </linearGradient>
      </defs>
      <rect x="0.34" y="0" width="23.32" height="6.86" rx="3.43" fill="url(#tp-g)" />
      <circle cx="12" cy="12" r="3.43" fill="url(#tp-g)" />
      <circle cx="12" cy="20.57" r="3.43" fill="url(#tp-g)" />
    </svg>
  );
}
