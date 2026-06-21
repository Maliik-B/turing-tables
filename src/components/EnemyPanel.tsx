import type { Enemy } from '../game/types'
import { StatBar } from './StatBar'
import { MachineSigil } from './MachineSigil'

export function EnemyPanel({
  enemy,
  thinking,
  round,
  gemini,
  confidence,
}: {
  enemy: Enemy
  thinking: boolean
  round: number
  // True when this enemy is currently running the Gemini brain (a key is set).
  gemini: boolean
  // Dynamic card-counting confidence phrase (Gemini tiers), or null.
  confidence: string | null
}) {
  const dead = enemy.hp <= 0
  const enraged = !dead && enemy.hp / enemy.maxHp <= 0.25
  const severedLeft = Math.max(0, enemy.severedUntilRound - round + 1)
  const it = enemy.intent
  const shownAttack = enemy.weak > 0 ? Math.floor(it.value * 0.75) : it.value
  const intentText =
    it.type === 'attack'
      ? `Intends to attack for ${shownAttack}`
      : it.type === 'drain'
        ? `Intends to drain you for ${shownAttack} (heals itself)`
        : it.type === 'block'
          ? `Intends to shield (+${it.value})`
          : it.type === 'weaken'
            ? 'Intends to weaken you'
            : 'Intends to expose you'
  const intentColor =
    it.type === 'attack' || it.type === 'drain'
      ? 'text-red-300'
      : it.type === 'block'
        ? 'text-sky-300'
        : 'text-amber-300'
  // Spell out what each telegraphed move actually does — especially that
  // weaken/expose deal no damage, and that blocking a drain denies its heal.
  const intentTitle =
    it.type === 'attack'
      ? 'Deals this much damage. Block reduces it.'
      : it.type === 'drain'
        ? 'Damages you and heals itself for half the damage dealt. Block the hit to deny the heal.'
        : it.type === 'block'
          ? 'Shields itself. Its block clears the moment it next acts.'
          : it.type === 'weaken'
            ? 'Applies Weak (you deal -25%) — no damage this turn.'
            : 'Applies Vulnerable (you take +50%) — no damage this turn.'
  return (
    <div
      className={`group relative rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 ${
        dead ? 'opacity-40' : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-red-400">
          <MachineSigil name={enemy.name} className="shrink-0" />
          {enemy.name}
        </span>
        <div className="flex items-center gap-2 text-sm">
          {!dead && severedLeft > 0 && (
            <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
              SEVERED {severedLeft}
            </span>
          )}
          {enraged && (
            <span
              title="Enraged: this machine hits harder while wounded (below 25% HP)."
              className="rounded bg-orange-600/30 px-1.5 py-0.5 text-[10px] font-semibold text-orange-300"
            >
              ENRAGED
            </span>
          )}
          {enemy.block > 0 && (
            <span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs text-sky-300">
              🛡 {enemy.block}
            </span>
          )}
          {enemy.corruption > 0 && (
            <span
              title="Corruption: bites this much before the enemy acts each turn (can finish it pre-emptively), then fades by 1. Re-applying stacks."
              className="rounded bg-lime-500/20 px-2 py-0.5 text-xs text-lime-300"
            >
              ☣ {enemy.corruption}
            </span>
          )}
          <span className="font-mono text-neutral-300">
            {Math.max(0, enemy.hp)}/{enemy.maxHp}
          </span>
        </div>
      </div>
      <StatBar value={enemy.hp} max={enemy.maxHp} className="bg-red-500" />
      {gemini && !dead && enemy.passive && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1 font-mono text-[10px] text-emerald-300/80">
          <span aria-hidden>◈</span> Passive: {enemy.passive}
          {confidence && (
            <span className="text-amber-300/90">· read: {confidence}</span>
          )}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {dead ? (
          <p className="text-xs text-neutral-500">Offline.</p>
        ) : thinking ? (
          <p className="animate-pulse text-xs text-amber-300">Thinking…</p>
        ) : (
          <>
            <p className={`text-xs ${intentColor}`} title={intentTitle}>
              {intentText}
            </p>
            {enemy.vulnerable > 0 && (
              <span
                title="Vulnerable: this machine takes +50% damage. Number = rounds left."
                className="rounded bg-fuchsia-500/20 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-300"
              >
                VULN {enemy.vulnerable} · +50%
              </span>
            )}
            {enemy.weak > 0 && (
              <span
                title="Weak: this machine deals -25% damage. Number = rounds left."
                className="rounded bg-amber-700/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
              >
                WEAK {enemy.weak} · -25%
              </span>
            )}
            {enemy.revealed && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  enemy.revealed === 'scripted'
                    ? 'bg-fuchsia-500/20 text-fuchsia-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {enemy.revealed === 'scripted' ? 'WAS IMITATION' : 'WAS THINKING'}
              </span>
            )}
          </>
        )}
      </div>
      {!dead && !thinking && enemy.taunt && (
        <p className="mt-1.5 border-l-2 border-red-500/40 pl-2 font-mono text-[11px] italic leading-snug text-red-200/80">
          “{enemy.taunt}”
        </p>
      )}
      {!dead && enemy.intel.length > 0 && (
        <div className="pointer-events-none absolute left-full top-0 z-20 ml-2 w-56 rounded-lg border border-neutral-700 bg-neutral-950/95 p-3 text-left opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400/70">
            Intel
          </p>
          <ul className="space-y-1 text-[11px] leading-snug text-neutral-300">
            {enemy.intel.map((line, i) => (
              <li key={i}>· {line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
