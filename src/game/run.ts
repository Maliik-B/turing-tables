import type { IntentType } from './types'

// The model ladder: four trials of escalating machine intelligence. Each is a
// "generation" — gen-0 is a rule-based automaton (scripted only, an ELIZA-era
// imitation), and each step up runs a more capable Gemini model and gains a
// signature ability. The guess-check only matters from gen-1 on.
export interface EncounterDef {
  name: string
  hp: number
  // null = scripted brain only (generation 0). Otherwise the Gemini model id.
  model: string | null
  // Signature moves beyond attack/block.
  abilities: IntentType[]
  // Lines shown when the player hovers the enemy (its kit + what tier it runs).
  intel: string[]
  // The Mainframe: adapts to the player's behavior across prior trials.
  remembers?: boolean
}

export const RUN: EncounterDef[] = [
  {
    name: 'ELIZA-0',
    hp: 55,
    model: null,
    abilities: [],
    intel: [
      'Strikes for 8–12 (heavier when wounded)',
      'Shields for ~8',
      'Rule-based automaton — no special routines, and it never truly thinks.',
    ],
  },
  {
    name: 'DAEMON-1',
    hp: 72,
    model: 'gemini-2.5-flash-lite',
    abilities: ['weaken'],
    intel: [
      'Strikes for 8–14 · Shields for ~8',
      'Weakens you — saps your attacks (−25%)',
      'Runs Gemini Flash-Lite ~70% of turns; the rest are scripted decoys.',
    ],
  },
  {
    name: 'ORACLE-2',
    hp: 92,
    model: 'gemini-2.5-flash',
    abilities: ['expose'],
    intel: [
      'Strikes for 8–14 · Shields for ~8',
      'Exposes you — marks you Vulnerable (+50% damage taken)',
      'Runs Gemini Flash — sharper. Its decoys are subtler.',
    ],
  },
  {
    name: 'THE MAINFRAME',
    hp: 120,
    model: 'gemini-2.5-pro',
    abilities: ['drain'],
    remembers: true,
    intel: [
      'Strikes for 8–14 · Shields for ~8',
      'Drains your life to heal itself',
      'Resists corruption — your DoT takes hold at half strength',
      'Runs Gemini Pro and has studied your prior trials — it adapts to you.',
    ],
  },
]

// Fraction of max HP recovered between trials.
export const HEAL_FRACTION = 0.3

// Friendly display name for a model id, shown on the "Machine:" chip so a judge
// who never reaches Trial 4 still sees the escalating Flash-Lite -> Flash -> Pro
// ladder. Falls back to a generic label for any unmapped id.
export function modelLabel(model: string | null | undefined): string {
  switch (model) {
    case 'gemini-2.5-flash-lite':
      return 'Gemini 2.5 Flash-Lite'
    case 'gemini-2.5-flash':
      return 'Gemini 2.5 Flash'
    case 'gemini-2.5-pro':
      return 'Gemini 2.5 Pro'
    default:
      return 'Gemini'
  }
}
