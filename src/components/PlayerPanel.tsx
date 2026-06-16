import type { Combatant } from '../game/types'
import { StatBar } from './StatBar'

export function PlayerPanel({ player }: { player: Combatant }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">
          {player.name}
        </span>
        <div className="flex items-center gap-2 text-sm">
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
