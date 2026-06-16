import type { Enemy } from '../game/types'
import { StatBar } from './StatBar'

export function EnemyPanel({
  enemy,
  thinking,
}: {
  enemy: Enemy
  thinking: boolean
}) {
  const dead = enemy.hp <= 0
  const shownAttack =
    enemy.weak > 0 ? Math.floor(enemy.intent.value * 0.75) : enemy.intent.value
  const intentText =
    enemy.intent.type === 'attack'
      ? `Intends to attack for ${shownAttack}`
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
      <div className="mt-2 flex items-center gap-2">
        {dead ? (
          <p className="text-xs text-neutral-500">Offline.</p>
        ) : thinking ? (
          <p className="animate-pulse text-xs text-amber-300">Thinking…</p>
        ) : (
          <>
            <p
              className={`text-xs ${
                enemy.intent.type === 'attack' ? 'text-red-300' : 'text-sky-300'
              }`}
            >
              {intentText}
            </p>
            {enemy.vulnerable > 0 && (
              <span className="rounded bg-fuchsia-500/20 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-300">
                VULN {enemy.vulnerable}
              </span>
            )}
            {enemy.weak > 0 && (
              <span className="rounded bg-amber-700/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                WEAK {enemy.weak}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
