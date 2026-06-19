// The model ladder: four trials of escalating machine intelligence. Each is a
// "generation" — gen-0 is a rule-based automaton (scripted only, an ELIZA-era
// imitation), and each step up runs a more capable Gemini model. The guess-check
// only matters from gen-1 on (gen-0 is pure imitation).
export interface EncounterDef {
  name: string
  hp: number
  // null = scripted brain only (generation 0). Otherwise the Gemini model id.
  model: string | null
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
    intel: [
      'Strikes for 8–12 (heavier when wounded)',
      'Shields for ~8',
      'Rule-based automaton — it never truly thinks. Nothing to catch.',
    ],
  },
  {
    name: 'DAEMON-1',
    hp: 72,
    model: 'gemini-2.5-flash-lite',
    intel: [
      'Strikes for 8–14',
      'Shields for ~8',
      'Runs Gemini Flash-Lite ~70% of turns; the rest are scripted decoys. Catch the decoys.',
    ],
  },
  {
    name: 'ORACLE-2',
    hp: 92,
    model: 'gemini-2.5-flash',
    intel: [
      'Strikes for 8–14',
      'Shields for ~8',
      'Runs Gemini Flash — sharper. Its decoys are subtler.',
    ],
  },
  {
    name: 'THE MAINFRAME',
    hp: 120,
    model: 'gemini-2.5-pro',
    remembers: true,
    intel: [
      'Strikes for 8–14',
      'Shields for ~8',
      'Runs Gemini Pro and has studied your prior trials — it adapts to how you play.',
    ],
  },
]

// Fraction of max HP recovered between trials.
export const HEAL_FRACTION = 0.3
