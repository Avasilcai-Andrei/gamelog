import { useId } from 'react'

// Vauntd mark: a bold "V" that reads as a rising arrow / checkmark — skill
// ascending and achievements earned, in the app's blue→violet→orange gradient.
// `size` controls the square mark; `withText` adds the wordmark; `tile` wraps it
// in a dark rounded badge so the gradient stays legible on light backgrounds
// (e.g. the blue navbar).
export default function Logo({ size = 28, withText = false, tile = false, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const grad = `vg-${uid}`
  const tileGrad = `vt-${uid}`
  const glowB = `gb-${uid}`
  const glowO = `go-${uid}`
  const clip = `cl-${uid}`

  return (
    <span className={`logo ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <defs>
          <clipPath id={clip}><rect width="64" height="64" rx="16" /></clipPath>
          <linearGradient id={grad} x1="14" y1="48" x2="52" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5aa0e9" />
            <stop offset="0.5" stopColor="#9d7fd0" />
            <stop offset="1" stopColor="#ff9800" />
          </linearGradient>
          {tile && (
            <>
              <linearGradient id={tileGrad} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#1a2144" />
                <stop offset="1" stopColor="#0b0e1c" />
              </linearGradient>
              <radialGradient id={glowB} cx="0.22" cy="0.16" r="0.7">
                <stop offset="0" stopColor="#4a90d9" stopOpacity="0.55" />
                <stop offset="1" stopColor="#4a90d9" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={glowO} cx="0.84" cy="0.9" r="0.7">
                <stop offset="0" stopColor="#ff9800" stopOpacity="0.42" />
                <stop offset="1" stopColor="#ff9800" stopOpacity="0" />
              </radialGradient>
            </>
          )}
        </defs>

        {tile && (
          <>
            <g clipPath={`url(#${clip})`}>
              <rect width="64" height="64" fill={`url(#${tileGrad})`} />
              <rect width="64" height="64" fill={`url(#${glowB})`} />
              <rect width="64" height="64" fill={`url(#${glowO})`} />
            </g>
            <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" fill="none"
              stroke="#ffffff" strokeOpacity="0.10" />
          </>
        )}

        <path d="M15 18 L29 46 L51 9" stroke={`url(#${grad})`} strokeWidth="7.5"
          strokeLinecap="round" strokeLinejoin="round" />
        <path d="M41 10 L51 9 L50 20" stroke={`url(#${grad})`} strokeWidth="7.5"
          strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 18 L29 46 L51 9" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {withText && <span className="logo-word">Vauntd</span>}
    </span>
  )
}
