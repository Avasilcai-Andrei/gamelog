// Vauntd mark: a bold "V" that reads as a rising arrow / checkmark —
// skill ascending and achievements earned, in the app's blue→orange gradient.
// `size` controls the square mark; pass `withText` to render the wordmark too.
export default function Logo({ size = 28, withText = false, className = '' }) {
  const gid = 'vauntd-logo-grad'
  return (
    <span className={`logo ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="14" y1="48" x2="52" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5aa0e9" />
            <stop offset="0.5" stopColor="#9d7fd0" />
            <stop offset="1" stopColor="#ff9800" />
          </linearGradient>
        </defs>
        <path d="M15 18 L29 46 L51 9" stroke={`url(#${gid})`} strokeWidth="7.5"
          strokeLinecap="round" strokeLinejoin="round" />
        <path d="M41 10 L51 9 L50 20" stroke={`url(#${gid})`} strokeWidth="7.5"
          strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 18 L29 46 L51 9" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {withText && <span className="logo-word">Vauntd</span>}
    </span>
  )
}
