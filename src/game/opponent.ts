import type { Intent, IntentType, MoveSource } from './types'

export interface EnemyMove {
  intent: Intent
  source: MoveSource
}

export interface BrainContext {
  lastMove: IntentType | null
  hpRatio: number
  // Signature moves (beyond attack/block) this enemy may deploy.
  abilities: IntentType[]
}

// Shared ability info for both brains: the fixed value the ability uses and a
// one-line description for the Gemini prompt. Keeping it here means the scripted
// brain and Gemini draw from the same kit, so abilities never leak which brain
// is acting (which would break the guess-check).
export const ABILITY_INFO: Record<string, { value: number; gemini: string }> = {
  weaken: {
    value: 2,
    gemini: '"weaken": apply 2 Weak to the human so their attacks hit 25% softer.',
  },
  expose: {
    value: 2,
    gemini: '"expose": apply 2 Vulnerable to the human so they take 50% more damage.',
  },
  drain: {
    value: 9,
    gemini: '"drain": deal 9 damage to the human and heal yourself for half of it.',
  },
}

// The scripted ("imitation") opponent brain — the free, offline fallback and
// the "imitation" half of the Turing-test guess-check. A believable imitation:
//   - sometimes deploys its signature ability (if any)
//   - never shields twice in a row; never shields while enraged (low HP)
//   - hits harder when enraged
export function decideEnemyMove(ctx: BrainContext): EnemyMove {
  const enraged = ctx.hpRatio <= 0.35

  if (
    ctx.abilities.length > 0 &&
    !enraged &&
    ctx.lastMove !== 'block' &&
    Math.random() < 0.3
  ) {
    const ab = ctx.abilities[Math.floor(Math.random() * ctx.abilities.length)]
    if (ab) {
      return {
        intent: { type: ab, value: ABILITY_INFO[ab]?.value ?? 2 },
        source: 'scripted',
      }
    }
  }

  const canBlock = ctx.lastMove !== 'block' && !enraged
  if (canBlock && Math.random() < 0.28) {
    return { intent: { type: 'block', value: 8 }, source: 'scripted' }
  }

  const base = 8 + Math.floor(Math.random() * 5) // 8-12
  const value = enraged ? base + 4 : base
  return { intent: { type: 'attack', value }, source: 'scripted' }
}
