import type { Enemy } from '../game/types'
import { StatBar } from './StatBar'

export function EnemyPanel({ enemy }: { enemy: Enemy }) {
  const dead = enemy.hp <= 0
  const intentText =
    enemy.intent.type === 'attack'
      ? `Intends to attack for ${enemy.intent.value}`
      : `Intends to shield (+${enemy.intent.value})`
  return (
    <div
      className={`rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 ${
        dead ? 'opacity-40' : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-red-400">
          {enemy.name}
        </span>
        <div className="flex items-center gap-2 text-sm">
          {enemy.block > 0 && (
            <span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs text-sky-300">
              🛡 {enemy.block}
            </span>
          )}
          <span className="font-mono text-neutral-300">
            {Math.max(0, enemy.hp)}/{enemy.maxHp}
          </span>
        </div>
      </div>
      <StatBar value={enemy.hp} max={enemy.maxHp} className="bg-red-500" />
      <p
        className={`mt-2 text-xs ${
          dead
            ? 'text-neutral-500'
            : enemy.intent.type === 'attack'
              ? 'text-red-300'
              : 'text-sky-300'
        }`}
      >
        {dead ? 'Offline.' : intentText}
      </p>
    </div>
  )
}
