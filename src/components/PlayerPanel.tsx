import type { Combatant } from '../game/types'
import { StatBar } from './StatBar'

export function PlayerPanel({ player }: { player: Combatant }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span
          title="Your board — your HP, block, and buffs. The machines' passive reads this."
          className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400"
        >
          Your board
        </span>
        <div className="flex items-center gap-2 text-sm">
          {player.vulnerable > 0 && (
            <span
              title="Vulnerable: you take +50% damage. Number = rounds left."
              className="rounded bg-fuchsia-500/20 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-300"
            >
              VULN {player.vulnerable} · +50%
            </span>
          )}
          {player.weak > 0 && (
            <span
              title="Weak: your attacks deal -25%. Number = rounds left."
              className="rounded bg-amber-700/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
            >
              WEAK {player.weak} · -25%
            </span>
          )}
          {player.power > 0 && (
            <span
              title="Overdrive: your attacks deal extra damage. Bonus · turns left."
              className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-medium text-orange-300"
            >
              PWR +{player.power} · {player.powerTurns}t
            </span>
          )}
          {player.lifestealTurns > 0 && (
            <span
              title="Lifesteal: your attacks heal you for half the damage they land."
              className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-medium text-rose-300"
            >
              ◈ Lifesteal {player.lifestealTurns}t
            </span>
          )}
          {player.block > 0 && (
            <span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs text-sky-300">
              🛡 {player.block}
            </span>
          )}
          <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-xs text-amber-300">
            ⚡ {player.energy}/{player.maxEnergy}
          </span>
          <span className="font-mono text-neutral-300">
            {Math.max(0, player.hp)}/{player.maxHp}
          </span>
        </div>
      </div>
      <StatBar value={player.hp} max={player.maxHp} className="bg-emerald-500" />
    </div>
  )
}
