import type { BrainContext, EnemyMove } from './opponent'
import { decideEnemyMove } from './opponent'
import { geminiDecideMove } from './gemini'

export interface BrainOptions {
  apiKey?: string | null
  // The "Sever" card forces the scripted brain for a few turns (wired later).
  severed?: boolean
}

// Share of turns the real Gemini brain plays when a key is present and the
// Machine isn't Severed. The rest are the scripted "imitation", mixed in
// unpredictably so the guess-check is a genuine test, not a constant answer.
const GEMINI_SHARE = 0.7

export async function decideMove(
  ctx: BrainContext,
  opts: BrainOptions = {},
): Promise<EnemyMove> {
  const tryGemini =
    !!opts.apiKey && !opts.severed && Math.random() < GEMINI_SHARE
  if (tryGemini) {
    try {
      const move = await geminiDecideMove(ctx, opts.apiKey as string)
      if (move) return move
    } catch {
      // fall through to scripted
    }
  }
  return decideEnemyMove(ctx)
}
