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
}

// A concrete card instance in a deck (def + unique instance id for React keys).
export interface Card extends CardDef {
  uid: number
}

export type IntentType = 'attack' | 'block'

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
  vulnerable: number
  weak: number
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
  intent: Intent
  intentSource: MoveSource
  targetSeat: number
  lastMove: IntentType | null
}

export type Phase = 'player' | 'win' | 'lose'

export interface GameState {
  players: Combatant[]
  enemies: Enemy[]
  activeSeat: number
  round: number
  phase: Phase
  log: string[]
  // True while the Machine's next intent is being decided (async Gemini call).
  awaitingIntents: boolean
}

export type Action =
  | { type: 'PLAY_CARD'; seat: number; uid: number; targetEnemy?: number }
  | { type: 'END_TURN'; seat: number }
  | { type: 'SET_INTENTS'; intents: { intent: Intent; source: MoveSource }[] }
  | { type: 'RESTART' }
