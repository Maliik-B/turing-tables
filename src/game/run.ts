// The model ladder: four trials of escalating machine intelligence. Each is a
// "generation" — gen-0 is a rule-based automaton (scripted only, an ELIZA-era
// imitation), and each step up runs a more capable Gemini model. The guess-check
// only matters from gen-1 on (gen-0 is pure imitation).
export interface EncounterDef {
  name: string
  hp: number
  // null = scripted brain only (generation 0). Otherwise the Gemini model id.
  model: string | null
}

export const RUN: EncounterDef[] = [
  { name: 'ELIZA-0', hp: 55, model: null },
  { name: 'DAEMON-1', hp: 72, model: 'gemini-2.5-flash-lite' },
  { name: 'ORACLE-2', hp: 92, model: 'gemini-2.5-flash' },
  { name: 'THE MAINFRAME', hp: 120, model: 'gemini-2.5-pro' },
]

// Fraction of max HP recovered between trials.
export const HEAL_FRACTION = 0.3
