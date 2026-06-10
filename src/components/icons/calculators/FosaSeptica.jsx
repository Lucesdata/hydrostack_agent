export default function FosaSeptica({ size = 36, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" style={style} aria-hidden="true">
      <rect x="4" y="10" width="32" height="22" rx="1.5" />
      <line x1="16" y1="10" x2="16" y2="32" />
      <line x1="26" y1="10" x2="26" y2="32" />
      <line x1="4" y1="20" x2="36" y2="20" strokeDasharray="2 2" opacity="0.5" />
      <path d="M8 6 L12 6 L12 10" />
      <path d="M32 6 L28 6 L28 10" />
      <line x1="6" y1="14" x2="14" y2="14" opacity="0.4" />
      <line x1="18" y1="14" x2="24" y2="14" opacity="0.4" />
      <line x1="28" y1="14" x2="34" y2="14" opacity="0.4" />
    </svg>
  );
}
