import { motion } from 'motion/react'

// A geometric solstice sun: a haloed core disc ringed by slowly-turning rays
// (alternating long/short, like an astrolabe). Pure SVG vector art, no assets.
// `intensity` (0-1) scales the warmth/brightness; the rays drift continuously.
export function SolsticeSun({
  size = 220,
  intensity = 1,
  className = '',
}: {
  size?: number
  intensity?: number
  className?: string
}) {
  const rays = Array.from({ length: 32 })
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      aria-hidden
      style={{ opacity: 0.55 + 0.45 * intensity }}
    >
      <defs>
        <radialGradient id="tt-sun-core" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" stopOpacity="0.85" />
        </radialGradient>
        <radialGradient id="tt-sun-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5 * intensity} />
          <stop offset="70%" stopColor="#f59e0b" stopOpacity={0.08 * intensity} />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="100" cy="100" r="98" fill="url(#tt-sun-halo)" />

      {/* Drifting rays */}
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 120, ease: 'linear', repeat: Infinity }}
      >
        {rays.map((_, i) => {
          const a = (i / rays.length) * Math.PI * 2
          const long = i % 2 === 0
          const r1 = 42
          const r2 = long ? 94 : 64
          return (
            <line
              key={i}
              x1={100 + Math.cos(a) * r1}
              y1={100 + Math.sin(a) * r1}
              x2={100 + Math.cos(a) * r2}
              y2={100 + Math.sin(a) * r2}
              stroke="#fbbf24"
              strokeWidth={long ? 2 : 1}
              strokeOpacity={(long ? 0.65 : 0.32) * intensity}
              strokeLinecap="round"
            />
          )
        })}
      </motion.g>

      {/* Concentric astrolabe rings */}
      <circle cx="100" cy="100" r="38" fill="none" stroke="#fbbf24" strokeOpacity={0.25 * intensity} strokeWidth="0.75" />
      {/* Core disc */}
      <circle cx="100" cy="100" r="32" fill="url(#tt-sun-core)" />
      <circle cx="100" cy="100" r="32" fill="none" stroke="#fef3c7" strokeOpacity="0.55" strokeWidth="1" />
    </svg>
  )
}
