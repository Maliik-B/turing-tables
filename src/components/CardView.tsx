import { motion } from 'motion/react'
import type { Card } from '../game/types'

export function CardView({
  card,
  playable,
  onClick,
}: {
  card: Card
  playable: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      disabled={!playable}
      onClick={onClick}
      whileHover={playable ? { y: -12 } : undefined}
      whileTap={playable ? { scale: 0.96 } : undefined}
      className={`flex h-44 w-32 shrink-0 flex-col justify-between rounded-lg border p-3 text-left ${
        playable
          ? 'border-amber-500/50 bg-neutral-800 hover:border-amber-400'
          : 'cursor-not-allowed border-neutral-700 bg-neutral-900/70 opacity-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold leading-tight">{card.name}</span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-neutral-950">
          {card.cost}
        </span>
      </div>
      <p className="text-xs leading-snug text-neutral-400">{card.text}</p>
      <span
        className={`text-[10px] uppercase tracking-widest ${
          card.type === 'attack' ? 'text-red-400' : 'text-sky-400'
        }`}
      >
        {card.type}
      </span>
    </motion.button>
  )
}
