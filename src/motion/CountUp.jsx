import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion, animate } from 'motion/react'
import { EASE } from './tokens'

// Counts a number up from 0 to `value` the first time it scrolls into view.
// Respects reduced motion (shows the final value instantly). Keeps the element
// type flexible so it can drop into existing spans/cells.
export default function CountUp({
  value = 0,
  duration = 1.1,
  decimals = 0,
  format = (n) => n.toLocaleString('en-US', { maximumFractionDigits: decimals }),
  as = 'span',
  className,
  style,
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(() => (reduce ? value : 0))
  const Tag = as

  useEffect(() => {
    if (!inView) return undefined
    if (reduce) { setDisplay(value); return undefined }
    const controls = animate(0, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [inView, value, duration, reduce])

  return <Tag ref={ref} className={className} style={style}>{format(display)}</Tag>
}
