import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { RunStats } from '../game/types'

// One-line read of how the player fights — mirrors the `lean` clause that
// buildDossier() feeds the Mainframe, so what's on screen IS the file.
function profile(s: RunStats): string {
  if (s.attacks === 0 && s.skills === 0) return 'Unread · no data yet'
  if (s.attacks > s.skills * 1.5) return 'Aggressive · leans on attacks'
  if (s.skills > s.attacks * 1.5) return 'Defensive · leans on block and skills'
  return 'Balanced · mixes attack and defense'
}

// A live counter that re-keys on its value so each increment pops — the
// "ticking up in real time" tell that the Machine is recording you.
function Tick({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-neutral-500">{label}</span>
      <motion.span
        key={value}
        initial={{ opacity: 0.35, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="font-mono tabular-nums text-neutral-200"
      >
        {value}
      </motion.span>
    </div>
  )
}

// The cross-trial surveillance log: quiet data-collection through the early
// trials, then the payoff at the Mainframe ("it has your file"). The same
// runStats shown here is what's serialized into the boss's Gemini prompt.
export function DossierPanel({
  stats,
  active,
}: {
  stats: RunStats
  // The current enemy remembers — i.e. this is the Mainframe.
  active: boolean
}) {
  // null = follow `active` (auto-open at the Mainframe); a boolean = user choice.
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  const open = manualOpen === null ? active : manualOpen

  const top = Object.entries(stats.cardsPlayed).sort((a, b) => b[1] - a[1])[0]

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
        active
          ? 'border-red-500/50 bg-red-500/5'
          : 'border-neutral-800/70 bg-neutral-900/40'
      }`}
    >
      <button
        type="button"
        onClick={() => setManualOpen(!open)}
        className="flex w-full items-center justify-between gap-2"
      >
        <span
          className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] ${
            active ? 'text-red-300' : 'text-neutral-500'
          }`}
        >
          <span className={active ? 'animate-pulse' : ''} aria-hidden>
            ◉
          </span>
          {active ? 'The Mainframe has your file' : 'Dossier · data collection'}
        </span>
        <span className="font-mono text-[10px] text-neutral-600">
          {open ? '▾' : '▸'}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1">
              <p className={active ? 'text-red-200/90' : 'text-neutral-300'}>
                {profile(stats)}
              </p>
              {top && (
                <p className="text-neutral-500">
                  Go-to card: <span className="text-neutral-300">{top[0]}</span>{' '}
                  ({top[1]}x)
                </p>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1">
                <Tick label="Attacks" value={stats.attacks} />
                <Tick label="Skills" value={stats.skills} />
                <Tick label="Damage dealt" value={stats.damageDealt} />
                <Tick label="Block gained" value={stats.blockGained} />
                <Tick label="Severs" value={stats.severs} />
                <Tick label="Imitations called" value={stats.accuses} />
              </div>
              <p
                className={`pt-1 text-[10px] italic ${
                  active ? 'text-red-300/70' : 'text-neutral-600'
                }`}
              >
                {active
                  ? 'It has read every trial you fought. It will anticipate this.'
                  : 'Everything you do is logged for what waits at the end.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
