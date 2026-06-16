import type { BrainContext, EnemyMove } from './opponent'
import { decideEnemyMove } from './opponent'
import { geminiDecideMove } from './gemini'

export interface BrainOptions {
  apiKey?: string | null
  // The "Sever" card forces the scripted brain for a few turns (deactivates
  // Gemini) — wired with the card on a later step.
  severed?: boolean
}

// Orchestrates the Machine's brain: real Gemini when a key is present and the
// Machine is not Severed; otherwise the scripted imitation. Any Gemini failure
// falls back to scripted, so the game is always playable offline and for judges
// without a key. The scripted|gemini source it returns drives the guess-check.
export async function decideMove(
  ctx: BrainContext,
  opts: BrainOptions = {},
): Promise<EnemyMove> {
  if (opts.apiKey && !opts.severed) {
    try {
      const move = await geminiDecideMove(ctx, opts.apiKey)
      if (move) return move
    } catch {
      // fall through to scripted
    }
  }
  return decideEnemyMove(ctx)
}
