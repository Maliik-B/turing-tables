import type { Intent, MoveSource } from './types'

export interface EnemyMove {
  intent: Intent
  source: MoveSource
}

// The scripted ("imitation") opponent brain. On Day 3 a Gemini-backed decider
// is layered on top, returning source:'gemini'. This stays as the free,
// offline fallback and the "imitation" half of the Turing-test guess-check.
export function decideEnemyMove(): EnemyMove {
  const roll = Math.random()
  const intent: Intent =
    roll < 0.7
      ? { type: 'attack', value: 8 + Math.floor(Math.random() * 5) } // 8-12
      : { type: 'block', value: 8 }
  return { intent, source: 'scripted' }
}
