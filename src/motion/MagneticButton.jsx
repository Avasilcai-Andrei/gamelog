import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react'
import { SPRING_SOFT } from './tokens'

// A button/link that subtly leans toward the cursor (magnetic hover), then
// springs back on leave. Under reduced motion it renders as a plain motion
// element with no follow. `strength` caps the max offset in px.
export default function MagneticButton({
  children,
  as = 'button',
  strength = 14,
  className,
  style,
  ...rest
}) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, SPRING_SOFT)
  const sy = useSpring(y, SPRING_SOFT)
  const MotionTag = motion[as] || motion.button

  const onMove = (e) => {
    if (reduce || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const relX = e.clientX - (r.left + r.width / 2)
    const relY = e.clientY - (r.top + r.height / 2)
    x.set(Math.max(-strength, Math.min(strength, relX * 0.4)))
    y.set(Math.max(-strength, Math.min(strength, relY * 0.4)))
  }
  const reset = () => { x.set(0); y.set(0) }

  return (
    <MotionTag
      ref={ref}
      className={className}
      style={{ ...style, x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={reset}
      whileTap={reduce ? undefined : { scale: 0.96 }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}
