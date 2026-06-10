export default function Geo({ size = 36, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={style} aria-hidden="true">
      <path d="M4 30 Q12 26 20 30 T36 30" opacity="0.4" />
      <path d="M4 34 Q12 30 20 34 T36 34" opacity="0.3" />
      <path d="M20 6 C14 6 10 10 10 16 C10 22 20 32 20 32 C20 32 30 22 30 16 C30 10 26 6 20 6 Z" />
      <circle cx="20" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}
