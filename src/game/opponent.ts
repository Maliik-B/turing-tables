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
  // The human's current board. The Gemini brain reads and reacts to this; the
  // scripted brain ignores it (being blind to it is the real tell to hunt).
  player?: {
    hpRatio: number
    block: number
    vulnerable: number
    weak: number
    power: number
  }
  // The player's deck, scaled by this enemy's card-counting tier. 'observed' =
  // cards seen played this fight; 'full' = the entire deck list. Absent for
  // board-reading-only enemies. (Never includes the hand or the draw order.)
  deck?: {
    knowledge: 'observed' | 'full'
    cards: string[]
    unplayed?: number
  }
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
    value: 3,
    gemini: '"expose": apply Vulnerable for 3 turns so the human takes 50% more damage — then strike into it.',
  },
  drain: {
    value: 9,
    gemini: '"drain": deal 9 damage to the human and heal yourself for half of what lands (block denies the heal).',
  },
}

// The scripted ("imitation") opponent brain — the free, offline fallback and
// the "imitation" half of the Turing-test guess-check. It plays COHERENTLY: it
// sets up a debuff and cashes it in the next turn (the same two-move combos the
// Gemini brain runs), so a combo never reveals which brain is acting. What it
// canNOT do is read the human's board — it never reacts to your block, your
// power-up, or your HP. That obliviousness is the real tell to hunt.
//   - never shields twice in a row; never shields while enraged (low HP)
//   - hits harder when enraged
export function decideEnemyMove(ctx: BrainContext): EnemyMove {
  const enraged = ctx.hpRatio <= 0.35
  const has = (a: IntentType) => ctx.abilities.includes(a)
  const attack = (): EnemyMove => {
    const base = 9 + Math.floor(Math.random() * 5) // 9-13
    return {
      intent: { type: 'attack', value: enraged ? base + 5 : base },
      source: 'scripted',
    }
  }

  // PAYOFF — cash in a setup from last turn.
  if (ctx.lastMove === 'expose') {
    // The human is Vulnerable; hit the opening. Drain it if we can (Mainframe).
    if (has('drain')) {
      return {
        intent: { type: 'drain', value: ABILITY_INFO.drain?.value ?? 9 },
        source: 'scripted',
      }
    }
    return attack()
  }
  if (ctx.lastMove === 'weaken' && !enraged) {
    // We softened their attacks — turtle so the weakened hits glance off.
    return { intent: { type: 'block', value: 8 }, source: 'scripted' }
  }

  // SETUP — open a combo with a signature debuff (prefer expose/weaken).
  if (
    ctx.abilities.length > 0 &&
    !enraged &&
    ctx.lastMove !== 'block' &&
    Math.random() < 0.4
  ) {
    const setups = ctx.abilities.filter((a) => a === 'expose' || a === 'weaken')
    const pool = setups.length ? setups : ctx.abilities
    const ab = pool[Math.floor(Math.random() * pool.length)]
    if (ab) {
      return {
        intent: { type: ab, value: ABILITY_INFO[ab]?.value ?? 2 },
        source: 'scripted',
      }
    }
  }

  // Generic block / attack.
  if (ctx.lastMove !== 'block' && !enraged && Math.random() < 0.28) {
    return { intent: { type: 'block', value: 8 }, source: 'scripted' }
  }
  return attack()
}
