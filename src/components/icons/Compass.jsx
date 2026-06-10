export default function Compass({ size = 22, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      style={style}
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="14" />
      <path d="M20 8 L22 20 L20 32 L18 20 Z" fill="currentColor" opacity="0.8" />
      <circle cx="20" cy="20" r="1.4" fill="currentColor" />
      <line x1="20" y1="4" x2="20" y2="7" />
      <line x1="20" y1="33" x2="20" y2="36" />
      <line x1="4" y1="20" x2="7" y2="20" />
      <line x1="33" y1="20" x2="36" y2="20" />
    </svg>
  );
}
