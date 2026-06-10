export default function Imhoff({ size = 36, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={style} aria-hidden="true">
      <path d="M6 8 L34 8 L30 22 L22 36 L18 36 L10 22 Z" />
      <line x1="6" y1="14" x2="34" y2="14" opacity="0.5" />
      <path d="M12 16 L20 30 L28 16" opacity="0.6" />
      <circle cx="20" cy="11" r="0.8" fill="currentColor" />
    </svg>
  );
}
