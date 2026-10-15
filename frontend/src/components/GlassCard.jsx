import { motion } from 'framer-motion'

export default function GlassCard({
  children,
  className = '',
  strong = false,
  glow = false,
  as: Component = motion.div,
  ...props
}) {
  return (
    <Component
      className={`relative rounded-2xl ${strong ? 'glass-strong' : 'glass'} ${
        glow ? 'shadow-glow' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}
