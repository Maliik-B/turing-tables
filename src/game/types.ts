export type CardType = 'attack' | 'skill'

export interface CardDef {
  key: string
  name: string
  cost: number
  type: CardType
  text: string
  damage?: number
  block?: number
  draw?: number
  vulnerable?: number
  weak?: number
  // "Sever": force the Machine onto the scripted brain for this many turns.
  sever?: number
  // "Corrupt": stack damage-over-time on the enemy (bites each round, wanes 1).
  corruption?: number
  // "Retain": block delivered at the start of the player's NEXT turn (lingering
  // defense, so you aren't re-blocking from scratch every round).
  retain?: number
  // "Recur": returns to the player's hand when they correctly Call an Imitation.
  recur?: boolean
  // Temporary attack buff: +power damage per attack for powerTurns turns.
  power?: number
  powerTurns?: number
  // Restore this much of the player's HP (capped at max).
  heal?: number
  // The player loses this much HP as the cost of playing the card.
  selfDamage?: number
  // This card's block lingers one round (kept, not reset, so it can ramp).
  linger?: boolean
  // Removed from the deck for the rest of the combat after being played.
  exhaust?: boolean
}

// A concrete card instance in a deck (def + unique instance id for React keys).
export interface Card extends CardDef {
  uid: number
}

export type IntentType = 'attack' | 'block' | 'weaken' | 'expose' | 'drain'

export interface Intent {
  type: IntentType
  value: number
}

// How a machine's current move was chosen. Drives the Turing-test guess-check:
// once Gemini is wired (Day 3), some moves are 'gemini' (real) and some stay
// 'scripted' (the imitation) — the player guesses which.
export type MoveSource = 'scripted' | 'gemini'

// A player seat. Array-based so the same combat scales 1v1 -> 4v4 (co-op).
export interface Combatant {
  id: string
  name: string
  hp: number
  maxHp: number
  energy: number
  maxEnergy: number
  block: number
  // Block carried into the start of the next turn (from "retain" cards).
  retainBlock: number
  // If true, this turn's leftover block is kept (not reset) next turn — a
  // lingering defense that stacks toward a ramp (Firewall).
  keepBlock: boolean
  vulnerable: number
  weak: number
  // Temporary flat attack bonus (Overdrive) and how many turns it lasts.
  power: number
  powerTurns: number
  // The persistent deck across the run (grows via rewards). Working piles
  // below are rebuilt from this at the start of each trial.
  collection: Card[]
  deck: Card[]
  hand: Card[]
  discard: Card[]
  ended: boolean
}

export interface Enemy {
  id: string
  name: string
  hp: number
  maxHp: number
  block: number
  vulnerable: number
  weak: number
  // Player-stacked damage-over-time; bites at the start of each enemy phase.
  corruption: number
  intent: Intent
  intentSource: MoveSource
  targetSeat: number
  lastMove: IntentType | null
  // Set to the move's true source once the player accuses it (else null).
  revealed: MoveSource | null
  // Rounds <= this are forced onto the scripted brain (Sever card). 0 = never.
  severedUntilRound: number
  // Gemini model id for this enemy's brain; null = scripted only (generation 0).
  model: string | null
  // Intel lines shown on hover (kit + tier).
  intel: string[]
  // The Mainframe: feed the player's cross-trial behavior into its prompt.
  remembers: boolean
  // Signature moves beyond attack/block this generation can deploy.
  abilities: IntentType[]
}

// Running tally of how the player has fought across the whole run — fed to the
// Mainframe's Gemini prompt so the final boss adapts to them.
export interface RunStats {
  cardsPlayed: Record<string, number>
  attacks: number
  skills: number
  severs: number
  accuses: number
  damageDealt: number
  blockGained: number
}

export type Phase = 'player' | 'cleared' | 'won' | 'lost'

export interface GameState {
  players: Combatant[]
  enemies: Enemy[]
  activeSeat: number
  // Index into RUN (0-based): which trial of the model ladder we're on.
  encounter: number
  round: number
  phase: Phase
  log: string[]
  // True while the Machine's next intent is being decided (async Gemini call).
  awaitingIntents: boolean
  // Turing-test guess-check: one accusation per round + a running read tally.
  calledThisRound: boolean
  reads: { caught: number; falseAccusations: number }
  // Cross-trial behavior dossier for the Mainframe's memory mechanic.
  runStats: RunStats
  // Between-trial card reward: 3 cards offered when a (non-final) trial clears.
  rewardChoices: Card[]
}

export type Action =
  | { type: 'PLAY_CARD'; seat: number; uid: number; targetEnemy?: number }
  | { type: 'END_TURN'; seat: number }
  | { type: 'SET_INTENTS'; intents: { intent: Intent; source: MoveSource }[] }
  | { type: 'ACCUSE'; enemy: number }
  | { type: 'CHOOSE_REWARD'; uid: number | null }
  | { type: 'RESTART' }
