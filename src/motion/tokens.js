// Single source of truth for the app's motion language. Everything imports
// easing/duration/stagger from here so the whole site feels like one system
// (the main defense against "random animation everywhere" slop).

// Signature ease-out (easeOutQuint-ish): confident start, gentle settle.
export const EASE = [0.22, 1, 0.36, 1]

// Springs for interactive / physical motion (hovers, magnetic, layout).
export const SPRING = { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }
export const SPRING_SOFT = { type: 'spring', stiffness: 180, damping: 26 }

export const DUR = { fast: 0.18, base: 0.4, slow: 0.7 }
export const STAGGER = 0.06

// --- Reusable variants -----------------------------------------------------

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.base, ease: EASE } },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: DUR.base, ease: EASE } },
}

// Parent that releases its children in sequence.
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER } },
}

// Page enter/exit used by the route-transition wrapper in App.jsx.
export const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: DUR.fast, ease: EASE } },
}

export const VARIANTS = { fadeUp, fadeIn, scaleIn }
