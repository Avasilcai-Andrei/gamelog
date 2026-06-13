import { motion } from 'motion/react'
import { staggerContainer, fadeUp } from './tokens'

// Container that reveals its children in sequence as it scrolls into view.
// Wrap each child in <Stagger.Item> (or pass plain children and they animate as
// a group via the shared container — but Item gives the per-child stagger).
export function Stagger({ children, as = 'div', className, style, amount = 0.15, ...rest }) {
  const MotionTag = motion[as] || motion.div
  return (
    <MotionTag
      className={className}
      style={style}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

export function StaggerItem({ children, as = 'div', variant, className, style, ...rest }) {
  const MotionTag = motion[as] || motion.div
  return (
    <MotionTag className={className} style={style} variants={variant || fadeUp} {...rest}>
      {children}
    </MotionTag>
  )
}

Stagger.Item = StaggerItem
export default Stagger
