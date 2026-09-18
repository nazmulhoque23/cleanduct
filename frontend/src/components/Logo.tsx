export function Logo({ size = 40, light = false }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill={light ? '#ffffff' : '#0f1829'} />
      <path
        d="M14 24h22a6 6 0 1 0-6-6"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M14 34h32a7 7 0 1 1-7 7"
        fill="none"
        stroke={light ? '#0f1829' : '#ffffff'}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M14 44h18" fill="none" stroke="#6366f1" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}
