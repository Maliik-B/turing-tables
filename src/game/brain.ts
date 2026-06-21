import type { BrainContext, EnemyMove } from './opponent'
import type { Intent, RunStats } from './types'
import { decideEnemyMove, makeDecoy, scriptedTaunt } from './opponent'
import { geminiDecideMove, type GeminiStatus } from './gemini'

export type { GeminiStatus }

export interface BrainOptions {
  apiKey?: string | null
  // The Gemini model id for this enemy; null/undefined = scripted only (gen-0).
  model?: string | null
  // The "Sever" card forces the scripted brain for a few turns.
  severed?: boolean
  // A dossier of the player's cross-trial behavior (Mainframe memory mechanic).
  memory?: string
  // Chance a real (Gemini) move telegraphs a feint this turn. Scripted moves
  // never feint, so an honest telegraph is itself a tell.
  bluffChance?: number
}

// Share of turns the real Gemini brain plays when it's available (a keyed,
// Gemini-tier enemy that isn't Severed). The rest are the scripted "imitation",
// mixed in unpredictably so the guess-check is a genuine test.
const GEMINI_SHARE = 0.7
// Share of Gemini's OWN turns where it borrows the scripted brain's flat canned
// voice instead of a context-aware line, so a generic taunt is no longer a
// reliable "this was the imitation" tell.
const CANNED_SHARE = 0.33

export async function decideMove(
  ctx: BrainContext,
  opts: BrainOptions = {},
): Promise<EnemyMove & { status?: GeminiStatus; decoy?: Intent }> {
  const tryGemini =
    !!opts.apiKey &&
    !!opts.model &&
    !opts.severed &&
    Math.random() < GEMINI_SHARE
  if (tryGemini) {
    try {
      const { move, status } = await geminiDecideMove(
        ctx,
        opts.apiKey as string,
        opts.model as string,
        opts.memory,
      )
      // Carry the API status onto the move (or onto the scripted fallback when
      // Gemini failed) so the UI can flag a rate-limited or rejected key.
      if (move) {
        // Sometimes let Gemini speak the scripted brain's flat canned line, so
        // a generic taunt no longer gives away that a turn was the imitation.
        const taunt =
          Math.random() < CANNED_SHARE
            ? scriptedTaunt(move.intent.type)
            : move.taunt
        // A thinking machine may telegraph a feint: show a false move now, do the
        // real one on its turn. Only Gemini moves bluff, so a trustworthy
        // telegraph means the move was scripted.
        const decoy =
          opts.bluffChance && Math.random() < opts.bluffChance
            ? makeDecoy(move.intent, ctx)
            : undefined
        return { ...move, taunt, decoy, status }
      }
      return { ...decideEnemyMove(ctx), status }
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
    s.attacks > s.skills * 1.2
      ? 'aggressively, leaning on attacks'
      : s.skills > s.attacks * 1.2
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
