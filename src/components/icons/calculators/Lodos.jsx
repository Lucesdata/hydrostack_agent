export default function Lodos({ size = 36, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={style} aria-hidden="true">
      <path d="M14 4 L26 4 L26 10 L30 18 L30 32 Q30 36 26 36 L14 36 Q10 36 10 32 L10 18 L14 10 Z" />
      <line x1="14" y1="4" x2="26" y2="4" strokeWidth="1.6" />
      <path d="M10 26 Q14 24 18 26 T26 26 T30 26" opacity="0.5" />
      <path d="M10 30 Q14 28 18 30 T26 30 T30 30" opacity="0.4" />
    </svg>
  );
}
