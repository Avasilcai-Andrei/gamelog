import { motion } from 'motion/react'
import { VARIANTS, EASE, DUR } from './tokens'

// Scroll-reveal wrapper. Uses motion's built-in viewport detection (no manual
// IntersectionObserver) and fires once, so reveals never re-trigger on scroll.
// Under prefers-reduced-motion, MotionConfig (in App.jsx) collapses these to
// instant opacity changes automatically.
export default function Reveal({
  children,
  variant = 'fadeUp',
  delay = 0,
  as = 'div',
  className,
  style,
  amount = 0.2,
  ...rest
}) {
  const MotionTag = motion[as] || motion.div
  const v = VARIANTS[variant] || VARIANTS.fadeUp
  return (
    <MotionTag
      className={className}
      style={style}
      variants={v}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      transition={{ delay, duration: DUR.base, ease: EASE }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}
