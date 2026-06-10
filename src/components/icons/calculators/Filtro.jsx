export default function Filtro({ size = 36, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={style} aria-hidden="true">
      <rect x="6" y="8" width="28" height="26" rx="1.5" />
      <path d="M6 16 Q10 14 14 16 T22 16 T34 16" opacity="0.7" />
      <path d="M6 22 Q10 20 14 22 T22 22 T34 22" opacity="0.5" />
      <circle cx="12" cy="28" r="0.8" fill="currentColor" opacity="0.5" />
      <circle cx="18" cy="29" r="0.8" fill="currentColor" opacity="0.5" />
      <circle cx="24" cy="28" r="0.8" fill="currentColor" opacity="0.5" />
      <circle cx="29" cy="30" r="0.8" fill="currentColor" opacity="0.5" />
      <path d="M14 4 L14 8 M26 4 L26 8" opacity="0.6" />
    </svg>
  );
}
