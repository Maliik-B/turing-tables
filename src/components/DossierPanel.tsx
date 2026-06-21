import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { RunStats } from '../game/types'

type Obs = { find: string; sub: string; pips: number; pct: string }

// Confidence in a finding grows with the sample size behind it: the longer the
// machine watches a behavior, the surer it gets.
function conf(n: number, sat: number): { pips: number; pct: string } {
  const c = Math.max(0.2, Math.min(0.95, 0.35 + 0.6 * Math.min(1, n / sat)))
  return { pips: Math.max(1, Math.round(c * 5)), pct: c.toFixed(2) }
}

// Derive the machine's read of the player from the run-long behavior tally (the
// same stats serialized into the Mainframe's Gemini prompt) as field-note rows,
// so what's on screen IS the file it has on you.
function observations(s: RunStats): Obs[] {
  const total = s.attacks + s.skills
  if (total === 0)
    return [
      { find: 'No behavior logged yet.', sub: 'awaiting your first moves', pips: 1, pct: '0.20' },
    ]
  const out: Obs[] = []
  const style =
    s.attacks > s.skills * 1.2
      ? 'Opens aggressive — leans on attacks.'
      : s.skills > s.attacks * 1.2
        ? 'Plays defensive — leans on block and skills.'
        : 'Balanced — mixes attack and defense.'
  out.push({ find: style, sub: `pattern · ${s.attacks} attacks / ${s.skills} skills`, ...conf(total, 18) })
  // Surface the most-played NON-basic card: "Favors Defend" (3 starter copies)
  // is noise; "Favors Leech / Corrupt" is an actual tell. Fall back to the
  // overall top only if nothing but basics has been played.
  const BASICS = new Set(['Strike', 'Defend', 'Quick Jab', 'Ping'])
  const sorted = Object.entries(s.cardsPlayed).sort((a, b) => b[1] - a[1])
  const top = sorted.find(([name]) => !BASICS.has(name)) ?? sorted[0]
  if (top)
    out.push({
      find: `Favors ${top[0]} — ${top[1]} plays.`,
      sub: `tell · ${Math.round((top[1] / total) * 100)}% of cards`,
      ...conf(top[1], 8),
    })
  if (s.severs > 0)
    out.push({ find: 'Reaches for Sever to cut the link.', sub: `tactic · ${s.severs} severed`, ...conf(s.severs, 3) })
  if (s.accuses > 0)
    out.push({
      find: `Hunts the imitation — ${s.accuses} call${s.accuses > 1 ? 's' : ''}.`,
      sub: 'interrogation · profiling your reads',
      ...conf(s.accuses, 4),
    })
  if (s.blockGained > 36)
    out.push({ find: 'Banks heavy block.', sub: `defense · ${s.blockGained} raised`, ...conf(Math.floor(s.blockGained / 10), 6) })
  return out.slice(0, 5)
}

function Pips({ n, active }: { n: number; active: boolean }) {
  return (
    <span className="flex items-center gap-[3px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`h-[6px] w-[6px] rounded-full ${
            i < n ? (active ? 'bg-red-400' : 'bg-emerald-400/80') : 'bg-neutral-700/70'
          }`}
        />
      ))}
    </span>
  )
}

// The cross-trial surveillance log: quiet data-collection through the early
// trials, then the payoff at the Mainframe ("it has your file"). The same
// runStats shown here is what's serialized into the boss's Gemini prompt.
export function DossierPanel({
  stats,
  active,
  trial,
  total,
}: {
  stats: RunStats
  // The current enemy remembers — i.e. this is the Mainframe.
  active: boolean
  trial?: number
  total?: number
}) {
  // null = follow `active` (auto-open at the Mainframe); a boolean = user choice.
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  // Reaching the Mainframe (active flips true) re-asserts auto-open, so an early
  // manual collapse during the trials doesn't keep the boss's file hidden.
  useEffect(() => {
    setManualOpen(null)
  }, [active])
  const open = manualOpen === null ? active : manualOpen
  const obs = observations(stats)
  const dataPoints = stats.attacks + stats.skills + stats.severs + stats.accuses
  const variance =
    dataPoints === 0
      ? '—'
      : stats.attacks > stats.skills * 1.5 || stats.skills > stats.attacks * 1.5
        ? 'LOW · predictable'
        : 'MODERATE'

  return (
    <div
      className={`relative overflow-hidden rounded-lg border text-xs transition-colors ${
        active ? 'border-red-500/50 bg-red-500/5' : 'border-neutral-800/70 bg-neutral-900/40'
      }`}
    >
      {/* faint astrolabe watermark — the analyst's instrument */}
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-8 opacity-[0.07]"
        width="170"
        height="170"
        viewBox="0 0 240 240"
        fill="none"
        stroke={active ? '#f87171' : '#34d399'}
        strokeWidth="0.8"
      >
        <circle cx="120" cy="120" r="100" />
        <circle cx="120" cy="120" r="72" />
        <circle cx="120" cy="120" r="44" />
        <line x1="20" y1="120" x2="220" y2="120" />
        <line x1="120" y1="20" x2="120" y2="220" />
      </svg>

      <button
        type="button"
        onClick={() => setManualOpen(!open)}
        title="Tap to read the machine's file on you"
        className="relative flex w-full items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-white/[0.03]"
      >
        <span
          className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] ${
            active ? 'text-red-300' : 'text-neutral-500'
          }`}
        >
          <span aria-hidden>◈</span>
          {active ? 'The Mainframe · observation log' : 'Observation log · data collection'}
        </span>
        <span className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] ${
              active ? 'text-red-300/90' : 'text-neutral-500'
            }`}
          >
            <span
              aria-hidden
              className={`h-[6px] w-[6px] rounded-full ${active ? 'animate-pulse bg-red-500' : 'bg-neutral-500'}`}
            />
            {active ? 'OBSERVING' : 'LOGGING'}
            {trial && total ? ` · ${trial}/${total}` : ''}
          </span>
          <span className={`font-mono text-base leading-none ${active ? 'text-red-300' : 'text-amber-400/80'}`}>{open ? '▾' : '▸'}</span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-hidden"
          >
            <div className="px-3 pb-2.5">
              <div className="mb-0.5 h-px bg-gradient-to-r from-neutral-700/40 to-transparent" />
              {obs.map((o, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[18px_1fr_auto] items-center gap-3 border-t border-white/5 py-1.5 first:border-t-0"
                >
                  <span className="font-mono text-[10px] text-neutral-600">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span className={active ? 'text-red-100/90' : 'text-neutral-200'}>{o.find}</span>
                    <span className="mt-0.5 block font-mono text-[10px] text-neutral-500">{o.sub}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Pips n={o.pips} active={active} />
                    <span className={`w-8 text-right font-mono text-[10px] ${active ? 'text-red-300/90' : 'text-emerald-300/80'}`}>
                      {o.pct}
                    </span>
                  </span>
                </div>
              ))}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[10px] text-neutral-500">
                <span>
                  Behavioral variance:{' '}
                  <span className={active ? 'text-red-300/90' : 'text-amber-300/80'}>{variance}</span>
                </span>
                <span>
                  {dataPoints} data points · {stats.rounds} rounds observed
                </span>
              </div>
              <p className={`mt-1.5 text-[10px] italic ${active ? 'text-red-300/70' : 'text-neutral-600'}`}>
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
