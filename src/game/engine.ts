import type { Action, Card, Combatant, Enemy, GameState } from './types'
import { CARDS, STARTER_DECK, REWARD_POOL } from './cards'
import { RUN, HEAL_FRACTION, type EncounterDef } from './run'
import { decideEnemyMove } from './opponent'

const HAND_SIZE = 5
const PLAYER_MAX_HP = 50

let uidCounter = 1
function instantiate(key: string): Card {
  return { ...CARDS[key], uid: uidCounter++ }
}

// Three distinct reward cards offered when a (non-final) trial is cleared.
function rollRewards(): Card[] {
  return shuffle([...REWARD_POOL]).slice(0, 3).map(instantiate)
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
  return {
    id: `seat-${seat}`,
    name: seat === 0 ? 'You' : `Player ${seat + 1}`,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    energy: 3,
    maxEnergy: 3,
    block: 0,
    retainBlock: 0,
    vulnerable: 0,
    weak: 0,
    power: 0,
    powerTurns: 0,
    collection: STARTER_DECK.map(instantiate),
    deck: [],
    hand: [],
    discard: [],
    ended: false,
  }
}

function makeEnemy(i: number, def: EncounterDef, seatCount: number): Enemy {
  const move = decideEnemyMove({
    lastMove: null,
    hpRatio: 1,
    abilities: def.abilities,
  })
  return {
    id: `bot-${i}`,
    name: def.name,
    hp: def.hp,
    maxHp: def.hp,
    block: 0,
    vulnerable: 0,
    weak: 0,
    corruption: 0,
    intent: move.intent,
    intentSource: move.source,
    targetSeat: i % Math.max(1, seatCount),
    lastMove: null,
    revealed: null,
    severedUntilRound: 0,
    model: def.model,
    intel: def.intel,
    remembers: !!def.remembers,
    abilities: def.abilities,
  }
}

// Configure the given trial: spin up its enemy and reset each living player's
// combat state, rebuilding their deck from their persistent collection (so
// exhausted cards like Sever return each fight).
function setupEncounter(s: GameState, index: number): void {
  s.encounter = index
  const def = RUN[index]
  s.enemies = def ? [makeEnemy(0, def, s.players.length)] : []
  s.round = 1
  s.calledThisRound = false
  s.awaitingIntents = true
  for (const p of s.players) {
    if (p.hp <= 0) continue
    p.block = 0
    p.retainBlock = 0
    p.vulnerable = 0
    p.weak = 0
    p.power = 0
    p.powerTurns = 0
    p.energy = p.maxEnergy
    p.ended = false
    p.deck = shuffle([...p.collection])
    p.hand = []
    p.discard = []
    drawInto(p, HAND_SIZE)
  }
}

export function createInitialState(): GameState {
  uidCounter = 1
  const state: GameState = {
    players: [makePlayer(0)],
    enemies: [],
    activeSeat: 0,
    encounter: 0,
    round: 1,
    phase: 'player',
    log: ['The longest day. The Machine is weakest now — strike.'],
    awaitingIntents: true,
    calledThisRound: false,
    reads: { caught: 0, falseAccusations: 0 },
    runStats: {
      cardsPlayed: {},
      attacks: 0,
      skills: 0,
      severs: 0,
      accuses: 0,
      damageDealt: 0,
      blockGained: 0,
    },
    rewardChoices: [],
  }
  setupEncounter(state, 0)
  return state
}

function clone(s: GameState): GameState {
  return {
    players: s.players.map((p) => ({
      ...p,
      collection: [...p.collection],
      deck: [...p.deck],
      hand: [...p.hand],
      discard: [...p.discard],
    })),
    enemies: s.enemies.map((e) => ({ ...e, intent: { ...e.intent } })),
    activeSeat: s.activeSeat,
    encounter: s.encounter,
    round: s.round,
    phase: s.phase,
    log: [...s.log],
    awaitingIntents: s.awaitingIntents,
    calledThisRound: s.calledThisRound,
    reads: { ...s.reads },
    runStats: { ...s.runStats, cardsPlayed: { ...s.runStats.cardsPlayed } },
    rewardChoices: [...s.rewardChoices],
  }
}

function logLine(s: GameState, line: string): void {
  s.log = [line, ...s.log].slice(0, 30)
}

function firstAliveEnemy(s: GameState): number {
  return s.enemies.findIndex((e) => e.hp > 0)
}

// If every enemy is down, transition to cleared (reward) or won and return true
// so the caller stops. Shared by direct card damage and corruption ticks.
function resolveIfCleared(s: GameState, haltName?: string): boolean {
  if (s.enemies.length === 0 || !s.enemies.every((e) => e.hp <= 0)) return false
  s.enemies.forEach((e) => (e.hp = Math.max(0, e.hp)))
  if (s.encounter >= RUN.length - 1) {
    s.phase = 'won'
    logLine(s, 'THE MAINFRAME goes dark. Dawn holds.')
  } else {
    s.phase = 'cleared'
    s.rewardChoices = rollRewards()
    logLine(s, `${haltName ?? 'The Machine'} halts.`)
  }
  return true
}

// All living seats have ended -> the machines act, then a new round begins.
function runEnemyPhase(s: GameState): void {
  // Corruption bites first: it ignores block and can finish a machine before it
  // acts, then wanes by 1. (DoT resolves at the start of the enemy phase.)
  for (const e of s.enemies) {
    const corr = e.corruption ?? 0
    if (e.hp <= 0 || corr <= 0) continue
    e.hp -= corr
    s.runStats.damageDealt += corr
    logLine(s, `Corruption eats ${e.name} for ${corr}.`)
    e.corruption = corr - 1
  }
  if (resolveIfCleared(s)) return

  for (const e of s.enemies) {
    if (e.hp <= 0) continue
    e.block = 0
    const target = s.players[e.targetSeat] ?? s.players.find((p) => p.hp > 0)
    if (!target) continue
    const it = e.intent
    if (it.type === 'attack' || it.type === 'drain') {
      const amount = modified(it.value, e.weak, target.vulnerable)
      dealDamage(target, amount)
      if (it.type === 'drain') {
        const healed = Math.floor(amount / 2)
        e.hp = Math.min(e.maxHp, e.hp + healed)
        logLine(s, `${e.name} drains ${target.name} for ${amount}, healing ${healed}.`)
      } else {
        logLine(s, `${e.name} attacks ${target.name} for ${amount}.`)
      }
    } else if (it.type === 'block') {
      e.block += it.value
      logLine(s, `${e.name} shields (+${it.value}).`)
    } else if (it.type === 'weaken') {
      target.weak += it.value
      logLine(s, `${e.name} weakens ${target.name} (+${it.value} Weak).`)
    } else if (it.type === 'expose') {
      target.vulnerable += it.value
      logLine(s, `${e.name} exposes ${target.name} (+${it.value} Vulnerable).`)
    }
    e.lastMove = it.type
  }

  if (s.players.every((p) => p.hp <= 0)) {
    s.players.forEach((p) => (p.hp = Math.max(0, p.hp)))
    s.phase = 'lost'
    logLine(s, 'The long dark takes you.')
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
  // Retarget synchronously; the next intent is decided asynchronously
  // (Gemini, with scripted fallback) via the SET_INTENTS action.
  for (const e of s.enemies) {
    if (e.hp <= 0) continue
    e.targetSeat =
      aliveSeats[Math.floor(Math.random() * aliveSeats.length)] ?? 0
  }
  // Open the players' new turn: carry over any retained block, refill energy,
  // draw a fresh hand.
  for (const p of s.players) {
    if (p.hp <= 0) continue
    p.ended = false
    const retained = p.retainBlock ?? 0
    p.block = retained
    s.runStats.blockGained += retained
    p.retainBlock = 0
    if ((p.powerTurns ?? 0) > 0) {
      p.powerTurns -= 1
      if (p.powerTurns === 0) p.power = 0
    }
    p.energy = p.maxEnergy
    drawInto(p, HAND_SIZE)
  }
  s.awaitingIntents = true
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
        const amount = modified(
          card.damage + (p.power ?? 0),
          p.weak,
          enemy.vulnerable,
        )
        dealDamage(enemy, amount)
        s.runStats.damageDealt += amount
        logLine(s, `${p.name} plays ${card.name} → ${amount} dmg.`)
      }
      if (card.block) {
        p.block += card.block
        s.runStats.blockGained += card.block
        logLine(s, `${p.name} plays ${card.name} (+${card.block} block).`)
      }
      if (card.retain) {
        p.retainBlock += card.retain
        logLine(s, `${p.name} plays ${card.name} (+${card.retain} block next turn).`)
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
      if (card.sever && enemy) {
        enemy.severedUntilRound = s.round + card.sever
        logLine(s, `${p.name} plays ${card.name} — the Machine's link is severed.`)
      }
      if (card.corruption && enemy) {
        // The Mainframe has studied you: corruption takes hold at half strength.
        const applied = enemy.remembers
          ? Math.ceil(card.corruption / 2)
          : card.corruption
        enemy.corruption += applied
        logLine(
          s,
          enemy.remembers
            ? `${p.name} plays ${card.name}, but the Mainframe resists (+${applied} Corruption).`
            : `${p.name} plays ${card.name} (+${applied} Corruption).`,
        )
      }
      if (card.power) {
        p.power += card.power
        p.powerTurns = Math.max(p.powerTurns ?? 0, card.powerTurns ?? 0)
        logLine(
          s,
          `${p.name} plays ${card.name} (+${card.power} attack damage for ${card.powerTurns} turns).`,
        )
      }
      // Track the player's behavior across the run for the Mainframe's memory.
      s.runStats.cardsPlayed[card.name] =
        (s.runStats.cardsPlayed[card.name] ?? 0) + 1
      if (card.type === 'attack') s.runStats.attacks += 1
      else s.runStats.skills += 1
      if (card.sever) s.runStats.severs += 1

      // Exhaust cards leave combat instead of going to the discard pile.
      if (!card.exhaust) p.discard.push(card)

      resolveIfCleared(s, s.enemies[ti]?.name)
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
    case 'SET_INTENTS': {
      const s = clone(state)
      const alive = s.enemies.filter((e) => e.hp > 0)
      action.intents.forEach((m, i) => {
        const e = alive[i]
        if (e) {
          e.intent = m.intent
          e.intentSource = m.source
        }
      })
      s.enemies.forEach((e) => (e.revealed = null))
      s.calledThisRound = false
      s.awaitingIntents = false
      return s
    }
    case 'ACCUSE': {
      if (state.phase !== 'player' || state.awaitingIntents) return state
      const s = clone(state)
      if (s.calledThisRound) return state
      const e = s.enemies[action.enemy]
      const me = s.players[s.activeSeat]
      if (!e || e.hp <= 0 || !me) return state
      // No guess-check on a scripted-only gen-0 enemy, or a severed Machine.
      if (!e.model || e.severedUntilRound >= s.round) return state
      s.calledThisRound = true
      s.runStats.accuses += 1
      e.revealed = e.intentSource
      if (e.intentSource === 'scripted') {
        s.reads.caught += 1
        me.energy += 1
        logLine(s, 'Imitation exposed — the Machine was faking. +1 energy.')
        const returned = me.discard.filter((c) => c.recur)
        if (returned.length > 0) {
          me.discard = me.discard.filter((c) => !c.recur)
          me.hand.push(...returned)
          logLine(
            s,
            `${returned.map((c) => c.name).join(', ')} loops back to your hand.`,
          )
        }
      } else {
        s.reads.falseAccusations += 1
        dealDamage(me, 4)
        logLine(s, 'Wrong — that was the Machine thinking. -4 HP.')
        if (s.players.every((pl) => pl.hp <= 0)) {
          s.players.forEach((pl) => (pl.hp = Math.max(0, pl.hp)))
          s.phase = 'lost'
          logLine(s, 'The long dark takes you.')
        }
      }
      return s
    }
    case 'CHOOSE_REWARD': {
      if (state.phase !== 'cleared') return state
      const s = clone(state)
      if (action.uid != null) {
        const chosen = s.rewardChoices.find((c) => c.uid === action.uid)
        const me = s.players[s.activeSeat]
        if (chosen && me) {
          me.collection.push(chosen)
          logLine(s, `Acquired ${chosen.name}.`)
        }
      }
      s.rewardChoices = []
      for (const p of s.players) {
        if (p.hp <= 0) continue
        p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * HEAL_FRACTION))
      }
      setupEncounter(s, s.encounter + 1)
      s.phase = 'player'
      logLine(s, `Trial ${s.encounter + 1}. A stronger mind awakens.`)
      return s
    }
    case 'RESTART':
      return createInitialState()
    default:
      return state
  }
}
