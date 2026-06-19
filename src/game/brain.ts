import type { BrainContext, EnemyMove } from './opponent'
import { decideEnemyMove } from './opponent'
import { geminiDecideMove } from './gemini'

export interface BrainOptions {
  apiKey?: string | null
  // The Gemini model id for this enemy; null/undefined = scripted only (gen-0).
  model?: string | null
  // The "Sever" card forces the scripted brain for a few turns.
  severed?: boolean
}

// Share of turns the real Gemini brain plays when it's available (a keyed,
// Gemini-tier enemy that isn't Severed). The rest are the scripted "imitation",
// mixed in unpredictably so the guess-check is a genuine test.
const GEMINI_SHARE = 0.7

export async function decideMove(
  ctx: BrainContext,
  opts: BrainOptions = {},
): Promise<EnemyMove> {
  const tryGemini =
    !!opts.apiKey &&
    !!opts.model &&
    !opts.severed &&
    Math.random() < GEMINI_SHARE
  if (tryGemini) {
    try {
      const move = await geminiDecideMove(
        ctx,
        opts.apiKey as string,
        opts.model as string,
      )
      if (move) return move
    } catch {
      // fall through to scripted
    }
  }
  return decideEnemyMove(ctx)
}
