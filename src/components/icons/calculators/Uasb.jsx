export default function Uasb({ size = 36, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={style} aria-hidden="true">
      <rect x="8" y="6" width="24" height="28" rx="1.5" />
      <path d="M14 26 L14 22 M20 28 L20 22 M26 26 L26 22" opacity="0.6" />
      <path d="M14 18 L14 14 M20 20 L20 14 M26 18 L26 14" opacity="0.5" />
      <path d="M14 10 L14 8 M20 10 L20 8 M26 10 L26 8" opacity="0.4" />
      <path d="M12 34 L14 32 M20 34 L20 32 M28 34 L26 32" />
    </svg>
  );
}
