import type { BrainContext, EnemyMove } from './opponent'
import type { RunStats } from './types'
import { decideEnemyMove } from './opponent'
import { geminiDecideMove } from './gemini'

export interface BrainOptions {
  apiKey?: string | null
  // The Gemini model id for this enemy; null/undefined = scripted only (gen-0).
  model?: string | null
  // The "Sever" card forces the scripted brain for a few turns.
  severed?: boolean
  // A dossier of the player's cross-trial behavior (Mainframe memory mechanic).
  memory?: string
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
        opts.memory,
      )
      if (move) return move
    } catch {
      // fall through to scripted
    }
  }
  return decideEnemyMove(ctx)
}

// Turn the run-long behavior tally into a short natural-language dossier for
// the Mainframe's prompt — this is what makes the final boss "remember" you.
export function buildDossier(s: RunStats): string {
  const lean =
    s.attacks > s.skills * 1.5
      ? 'aggressively, leaning on attacks'
      : s.skills > s.attacks * 1.5
        ? 'defensively, leaning on skills and block'
        : 'in a balanced way'
  const top = Object.entries(s.cardsPlayed).sort((a, b) => b[1] - a[1])[0]
  const parts = [
    `Across earlier trials this human has fought ${lean} (${s.attacks} attacks, ${s.skills} skills played).`,
  ]
  if (top) parts.push(`Their go-to card is ${top[0]} (${top[1]}x).`)
  if (s.severs > 0)
    parts.push(`They have used "Sever" ${s.severs}x to cut a machine's link.`)
  if (s.accuses > 0)
    parts.push(`They have tried to expose imitations ${s.accuses}x.`)
  parts.push('Anticipate these tendencies and punish them.')
  return parts.join(' ')
}
