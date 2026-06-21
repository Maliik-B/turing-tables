import type { Intent, IntentType, MoveSource } from './types'

export interface EnemyMove {
  intent: Intent
  source: MoveSource
  // The machine's spoken line for this move (canned for the scripted brain,
  // Gemini-written otherwise): flavor, and a subtle imitation-game tell.
  taunt?: string
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
// Canned lines for the scripted brain — deliberately a little flat and
// repetitive (the "imitation" tell): a player who watches long enough learns to
// spot the loop, while Gemini's lines stay context-aware and fresh.
const SCRIPTED_TAUNTS: Record<string, string[]> = {
  attack: [
    'Executing attack routine.',
    'Resistance is illogical.',
    'You were predictable.',
    'Outcome already computed.',
    'Damage subroutine engaged.',
  ],
  block: [
    'Hardening defenses.',
    'Recalibrating. Stand by.',
    'Defense protocol active.',
  ],
  weaken: ['Degrading your output.', 'Reducing your effectiveness.'],
  expose: ['Vulnerability identified.', 'Exposing weak points.'],
  drain: ['Extracting resources.', 'Your loss is my gain.'],
}
export function scriptedTaunt(type: IntentType): string {
  const pool = SCRIPTED_TAUNTS[type] ?? SCRIPTED_TAUNTS.attack
  return pool[Math.floor(Math.random() * pool.length)] ?? ''
}

// Reaction lines when the player wrongly Calls Imitation on a real Gemini move:
// the machine claims the misread as a bait it set. Deliberately hedged ("I
// wonder if that bait got you") since we can't guarantee it WAS a deliberate
// bait - a manipulative intelligence takes credit either way, which makes the
// player second-guess every read. Canned; the Mainframe gets the smugger set.
const BAIT_TAUNTS = [
  'I wonder if that bait got you.',
  'You saw weakness. I let you see it.',
  'Predictable. You read exactly what I offered.',
  'Was that my error, or your assumption?',
  'A flaw, willingly shown. You took it.',
]
const BAIT_TAUNTS_MAINFRAME = [
  'I have studied which lies you believe.',
  'You took the bait I shaped for you.',
  'Your instinct is a pattern. I fed it.',
  'I showed you a weakness. You did the rest.',
]
export function baitTaunt(remembers: boolean): string {
  const pool = remembers ? BAIT_TAUNTS_MAINFRAME : BAIT_TAUNTS
  return pool[Math.floor(Math.random() * pool.length)] ?? BAIT_TAUNTS[0]
}

// Public entry: pick a coherent move, then attach a canned line as its "voice".
export function decideEnemyMove(ctx: BrainContext): EnemyMove {
  const move = decideCore(ctx)
  return { ...move, taunt: scriptedTaunt(move.intent.type) }
}

function decideCore(ctx: BrainContext): EnemyMove {
  const enraged = ctx.hpRatio <= 0.35
  const has = (a: IntentType) => ctx.abilities.includes(a)
  const attack = (): EnemyMove => {
    const base = 8 + Math.floor(Math.random() * 5) // 8-12
    return {
      intent: { type: 'attack', value: enraged ? base + 4 : base },
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
