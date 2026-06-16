import type { Intent, IntentType, MoveSource } from './types'

export interface EnemyMove {
  intent: Intent
  source: MoveSource
}

export interface BrainContext {
  lastMove: IntentType | null
  hpRatio: number
}

// The scripted ("imitation") opponent brain — the free, offline fallback and
// the "imitation" half of the Turing-test guess-check. It is deliberately a
// *believable* imitation (a coherent threat pattern, not random noise):
//   - never shields twice in a row (no shield-spam)
//   - never shields while enraged (low HP -> goes all-in)
//   - hits harder when enraged
// The better this imitation plays, the harder the guess-check.
// On Day 3 a Gemini-backed decider is layered on top, returning source:'gemini';
// this remains the fallback (and what the "Sever" card forces the Machine onto).
export function decideEnemyMove(ctx: BrainContext): EnemyMove {
  const enraged = ctx.hpRatio <= 0.35
  const canBlock = ctx.lastMove !== 'block' && !enraged
  if (canBlock && Math.random() < 0.28) {
    return { intent: { type: 'block', value: 8 }, source: 'scripted' }
  }
  const base = 8 + Math.floor(Math.random() * 5) // 8-12
  const value = enraged ? base + 4 : base
  return { intent: { type: 'attack', value }, source: 'scripted' }
}
