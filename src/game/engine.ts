import type { Action, Card, Combatant, Enemy, GameState } from './types'
import { CARDS, STARTER_DECK } from './cards'
import { decideEnemyMove } from './opponent'

const HAND_SIZE = 5
const PLAYER_MAX_HP = 50
const ENEMY_MAX_HP = 80

let uidCounter = 1
function instantiate(key: string): Card {
  return { ...CARDS[key], uid: uidCounter++ }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

function drawInto(c: Combatant, n: number): void {
  for (let i = 0; i < n; i++) {
    if (c.deck.length === 0) {
      if (c.discard.length === 0) return
      c.deck = shuffle(c.discard)
      c.discard = []
    }
    const card = c.deck.shift()
    if (card) c.hand.push(card)
  }
}

function dealDamage(target: { hp: number; block: number }, amount: number): void {
  const absorbed = Math.min(target.block, amount)
  target.block -= absorbed
  target.hp -= amount - absorbed
}

// Weak reduces dealt damage 25%; Vulnerable increases taken damage 50%.
function modified(base: number, attackerWeak: number, targetVuln: number): number {
  const weakMult = attackerWeak > 0 ? 0.75 : 1
  const vulnMult = targetVuln > 0 ? 1.5 : 1
  return Math.floor(base * weakMult * vulnMult)
}

function makePlayer(seat: number): Combatant {
  const c: Combatant = {
    id: `seat-${seat}`,
    name: seat === 0 ? 'You' : `Player ${seat + 1}`,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    energy: 3,
    maxEnergy: 3,
    block: 0,
    vulnerable: 0,
    weak: 0,
    deck: shuffle(STARTER_DECK.map(instantiate)),
    hand: [],
    discard: [],
    ended: false,
  }
  drawInto(c, HAND_SIZE)
  return c
}

function makeEnemy(i: number, seatCount: number): Enemy {
  const move = decideEnemyMove()
  return {
    id: `bot-${i}`,
    name: 'THE MACHINE',
    hp: ENEMY_MAX_HP,
    maxHp: ENEMY_MAX_HP,
    block: 0,
    vulnerable: 0,
    weak: 0,
    intent: move.intent,
    intentSource: move.source,
    targetSeat: i % Math.max(1, seatCount),
  }
}

export function createInitialState(playerCount = 1, enemyCount = 1): GameState {
  uidCounter = 1
  const players = Array.from({ length: playerCount }, (_, i) => makePlayer(i))
  const enemies = Array.from({ length: enemyCount }, (_, i) =>
    makeEnemy(i, playerCount),
  )
  return {
    players,
    enemies,
    activeSeat: 0,
    round: 1,
    phase: 'player',
    log: ['A new trial begins.'],
  }
}

function clone(s: GameState): GameState {
  return {
    players: s.players.map((p) => ({
      ...p,
      deck: [...p.deck],
      hand: [...p.hand],
      discard: [...p.discard],
    })),
    enemies: s.enemies.map((e) => ({ ...e, intent: { ...e.intent } })),
    activeSeat: s.activeSeat,
    round: s.round,
    phase: s.phase,
    log: [...s.log],
  }
}

function logLine(s: GameState, line: string): void {
  s.log = [line, ...s.log].slice(0, 30)
}

function firstAliveEnemy(s: GameState): number {
  return s.enemies.findIndex((e) => e.hp > 0)
}

// All living seats have ended -> the machines act, then a new round begins.
function runEnemyPhase(s: GameState): void {
  for (const e of s.enemies) {
    if (e.hp <= 0) continue
    e.block = 0
    const target = s.players[e.targetSeat] ?? s.players.find((p) => p.hp > 0)
    if (!target) continue
    if (e.intent.type === 'attack') {
      const amount = modified(e.intent.value, e.weak, target.vulnerable)
      dealDamage(target, amount)
      logLine(s, `${e.name} attacks ${target.name} for ${amount}.`)
    } else {
      e.block += e.intent.value
      logLine(s, `${e.name} shields (+${e.intent.value}).`)
    }
  }

  if (s.players.every((p) => p.hp <= 0)) {
    s.players.forEach((p) => (p.hp = Math.max(0, p.hp)))
    s.phase = 'lose'
    logLine(s, 'The party has been deleted.')
    return
  }

  // End-of-round: statuses tick down for everyone.
  for (const c of [...s.players, ...s.enemies]) {
    if (c.vulnerable > 0) c.vulnerable -= 1
    if (c.weak > 0) c.weak -= 1
  }

  s.round += 1
  const aliveSeats = s.players
    .map((p, i) => (p.hp > 0 ? i : -1))
    .filter((i) => i >= 0)
  for (const e of s.enemies) {
    if (e.hp <= 0) continue
    const move = decideEnemyMove()
    e.intent = move.intent
    e.intentSource = move.source
    e.targetSeat =
      aliveSeats[Math.floor(Math.random() * aliveSeats.length)] ?? 0
  }
  for (const p of s.players) {
    if (p.hp <= 0) continue
    p.ended = false
    p.block = 0
    p.energy = p.maxEnergy
    drawInto(p, HAND_SIZE)
  }
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'PLAY_CARD': {
      if (state.phase !== 'player') return state
      const s = clone(state)
      const p = s.players[action.seat]
      if (!p || p.hp <= 0 || p.ended) return state
      const card = p.hand.find((c) => c.uid === action.uid)
      if (!card || card.cost > p.energy) return state
      p.hand.splice(p.hand.indexOf(card), 1)
      p.energy -= card.cost

      const ti = action.targetEnemy ?? firstAliveEnemy(s)
      const enemy = s.enemies[ti]

      if (card.damage && enemy) {
        const amount = modified(card.damage, p.weak, enemy.vulnerable)
        dealDamage(enemy, amount)
        logLine(s, `${p.name} plays ${card.name} → ${amount} dmg.`)
      }
      if (card.block) {
        p.block += card.block
        logLine(s, `${p.name} plays ${card.name} (+${card.block} block).`)
      }
      if (card.draw) {
        drawInto(p, card.draw)
        logLine(s, `${p.name} plays ${card.name} (draw ${card.draw}).`)
      }
      if (card.vulnerable && enemy) {
        enemy.vulnerable += card.vulnerable
        logLine(s, `${p.name} plays ${card.name} (+${card.vulnerable} Vulnerable).`)
      }
      if (card.weak && enemy) {
        enemy.weak += card.weak
        logLine(s, `${p.name} plays ${card.name} (+${card.weak} Weak).`)
      }
      p.discard.push(card)

      if (s.enemies.every((e) => e.hp <= 0)) {
        s.enemies.forEach((e) => (e.hp = Math.max(0, e.hp)))
        s.phase = 'win'
        logLine(s, 'The Machine halts.')
      }
      return s
    }
    case 'END_TURN': {
      if (state.phase !== 'player') return state
      const s = clone(state)
      const p = s.players[action.seat]
      if (!p || p.ended || p.hp <= 0) return state
      p.ended = true
      p.discard.push(...p.hand)
      p.hand = []
      const allEnded = s.players.every((pl) => pl.hp <= 0 || pl.ended)
      if (allEnded) runEnemyPhase(s)
      return s
    }
    case 'RESTART':
      return createInitialState(state.players.length, state.enemies.length)
    default:
      return state
  }
}
