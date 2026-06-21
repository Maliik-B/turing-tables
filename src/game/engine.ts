import type {
  Action,
  Card,
  Combatant,
  Enemy,
  GameState,
  Intent,
  RunStats,
} from './types'
import { CARDS, STARTER_DECK, REWARD_POOL } from './cards'
import { RUN, HEAL_FRACTION, type EncounterDef } from './run'
import { decideEnemyMove, baitTaunt } from './opponent'

const HAND_SIZE = 5
const PLAYER_MAX_HP = 50

let uidCounter = 1
// Increments on every fresh run so the intent decider can key a per-round
// dedupe that survives RESTART (encounter+round otherwise repeat across runs).
let runCounter = 1
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

// Apply damage through block; returns the HP actually lost (so lifesteal and
// drain can heal off what truly landed, and block denies them).
function dealDamage(
  target: { hp: number; block: number },
  amount: number,
): number {
  const absorbed = Math.min(target.block, amount)
  target.block -= absorbed
  const hpLoss = amount - absorbed
  target.hp -= hpLoss
  return hpLoss
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
    keepBlock: false,
    vulnerable: 0,
    weak: 0,
    power: 0,
    powerTurns: 0,
    lifestealTurns: 0,
    attacksThisTurn: 0,
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
    decoyIntent: null,
    targetSeat: i % Math.max(1, seatCount),
    lastMove: null,
    revealed: null,
    severedUntilRound: 0,
    model: def.model,
    intel: def.intel,
    remembers: !!def.remembers,
    abilities: def.abilities,
    bluffChance: def.bluff ?? 0,
    cardCount: def.cardCount ?? 'none',
    passive: def.passive ?? '',
    taunt: move.taunt,
  }
}

// Sever is a key-only card: useless against a scripted (keyless or rate-limited)
// machine. Keep the collection in sync with the key state at deck-rebuild time so
// a keyless run never draws a dead card, and a key added later restores it on the
// next trial. Reconciling at this reshuffle boundary keeps tempo clean.
function reconcileSever(p: Combatant, hasKey: boolean, pastEliza: boolean): void {
  const hasSever = p.collection.some((c) => c.key === 'sever')
  if (hasKey && pastEliza && !hasSever) p.collection.push(instantiate('sever'))
  else if (!hasKey && hasSever)
    p.collection = p.collection.filter((c) => c.key !== 'sever')
}

// The Mainframe studied your prior trials: if you have leaned on block, it
// arrives carrying Sunder (strip your guard, then strike) so turtling stops
// working. Surfaced in its intel so the adaptation reads as a consequence you
// provoked, not a gotcha. (Block-counter first; purge/thorns are future tiers.)
function adaptToDossier(enemy: Enemy, stats: RunStats): void {
  if (!enemy.remembers) return
  // Only genuine turtling: a skill-dominant deck, or heavy block reliance across
  // the run. (40 was too low — a balanced player who blocks a little hit it.)
  const turtles = stats.skills > stats.attacks * 1.2 || stats.blockGained >= 70
  if (turtles && !enemy.abilities.includes('sunder')) {
    enemy.abilities = [...enemy.abilities, 'sunder']
    enemy.intel = [
      ...enemy.intel,
      'ADAPTED to your turtling: Sunder strips your block, then strikes — vary your play.',
    ]
  }
}

// Configure the given trial: spin up its enemy and reset each living player's
// combat state, rebuilding their deck from their persistent collection (so
// exhausted cards like Sever return each fight).
function setupEncounter(s: GameState, index: number): void {
  s.encounter = index
  const def = RUN[index]
  s.enemies = def ? [makeEnemy(0, def, s.players.length)] : []
  if (s.enemies[0]) adaptToDossier(s.enemies[0], s.runStats)
  s.round = 1
  s.seen = []
  s.calledThisRound = false
  s.awaitingIntents = true
  for (const p of s.players) {
    if (p.hp <= 0) continue
    p.block = 0
    p.retainBlock = 0
    p.keepBlock = false
    p.vulnerable = 0
    p.weak = 0
    p.power = 0
    p.powerTurns = 0
    p.lifestealTurns = 0
    p.attacksThisTurn = 0
    p.energy = p.maxEnergy
    p.ended = false
    reconcileSever(p, s.hasKey, index >= 1)
    p.deck = shuffle([...p.collection])
    p.hand = []
    p.discard = []
    drawInto(p, HAND_SIZE)
  }
}

export function createInitialState(hasKey = false): GameState {
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
      rounds: 0,
    },
    seen: [],
    rewardChoices: [],
    runId: runCounter++,
    hasKey,
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
    enemies: s.enemies.map((e) => ({
      ...e,
      intent: { ...e.intent },
      decoyIntent: e.decoyIntent ? { ...e.decoyIntent } : null,
    })),
    activeSeat: s.activeSeat,
    encounter: s.encounter,
    round: s.round,
    phase: s.phase,
    log: [...s.log],
    awaitingIntents: s.awaitingIntents,
    calledThisRound: s.calledThisRound,
    reads: { ...s.reads },
    runStats: { ...s.runStats, cardsPlayed: { ...s.runStats.cardsPlayed } },
    seen: s.seen ? [...s.seen] : [],
    rewardChoices: [...s.rewardChoices],
    runId: s.runId,
    hasKey: s.hasKey,
  }
}

function logLine(s: GameState, line: string): void {
  s.log = [line, ...s.log].slice(0, 30)
}

function intentLabel(i: Intent): string {
  return i.type === 'attack'
    ? 'Attack'
    : i.type === 'drain'
      ? 'Drain'
      : i.type === 'sunder'
        ? 'Sunder'
        : i.type === 'block'
          ? 'Block'
          : i.type === 'weaken'
            ? 'Weaken'
            : 'Expose'
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
    // A feint resolves: it telegraphed decoyIntent, but `it` (the truth) fires.
    // Reveal it so the player learns this machine lies (and scripted ones don't).
    if (e.decoyIntent) {
      logLine(
        s,
        `FEINT — ${e.name} feigned ${intentLabel(e.decoyIntent)}; real move: ${intentLabel(it)}.`,
      )
      e.decoyIntent = null
    }
    if (it.type === 'attack' || it.type === 'drain') {
      const amount = modified(it.value, e.weak, target.vulnerable)
      const dealt = dealDamage(target, amount)
      if (it.type === 'drain') {
        // Heal scales with damage that LANDS, so blocking denies the heal.
        const healed = Math.floor(dealt / 2)
        e.hp = Math.min(e.maxHp, e.hp + healed)
        logLine(s, `${e.name} drains ${target.name} for ${dealt}, healing ${healed}.`)
      } else {
        logLine(s, `${e.name} attacks ${target.name} for ${amount}.`)
      }
    } else if (it.type === 'sunder') {
      // Wipe the guard first, so the strike lands on raw HP — turtling fails.
      const stripped = target.block
      target.block = 0
      const amount = modified(it.value, e.weak, target.vulnerable)
      const dealt = dealDamage(target, amount)
      logLine(
        s,
        stripped > 0
          ? `${e.name} sunders ${target.name}: -${stripped} block, ${dealt} damage.`
          : `${e.name} sunders ${target.name} for ${dealt}.`,
      )
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
  s.runStats.rounds = (s.runStats.rounds ?? 0) + 1
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
    // Lingering block (Firewall) keeps this turn's leftover so it stacks.
    const kept = p.keepBlock ? p.block : 0
    p.block = kept + retained
    s.runStats.blockGained += retained
    p.retainBlock = 0
    p.keepBlock = false
    if ((p.powerTurns ?? 0) > 0) {
      p.powerTurns -= 1
      if (p.powerTurns === 0) p.power = 0
    }
    if ((p.lifestealTurns ?? 0) > 0) p.lifestealTurns -= 1
    p.attacksThisTurn = 0
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
      // Collect every effect so the whole card resolves on ONE readable log line.
      const fx: string[] = []

      if (card.damage && enemy) {
        const followBonus =
          card.followup && (p.attacksThisTurn ?? 0) > 0 ? card.followup : 0
        const amount = modified(
          card.damage + (p.power ?? 0) + followBonus,
          p.weak,
          enemy.vulnerable,
        )
        const dealt = dealDamage(enemy, amount)
        s.runStats.damageDealt += amount
        fx.push(`${amount} dmg`)
        if (((p.lifestealTurns ?? 0) > 0 || card.drains) && dealt > 0) {
          const healed = Math.floor(dealt / 2)
          if (healed > 0) {
            p.hp = Math.min(p.maxHp, p.hp + healed)
            fx.push(`heal ${healed}`)
          }
        }
      }
      if (card.block) {
        p.block += card.block
        s.runStats.blockGained += card.block
        fx.push(`+${card.block} block`)
      }
      if (card.retain) {
        p.retainBlock += card.retain
        fx.push(`+${card.retain} block next turn`)
      }
      if (card.linger) {
        p.keepBlock = true
        fx.push('block lingers')
      }
      if (card.heal) {
        p.hp = Math.min(p.maxHp, p.hp + card.heal)
        fx.push(`heal ${card.heal}`)
      }
      if (card.selfDamage) {
        p.hp -= card.selfDamage
        fx.push(`-${card.selfDamage} HP`)
      }
      if (card.draw) {
        drawInto(p, card.draw)
        fx.push(`draw ${card.draw}`)
      }
      if (card.vulnerable && enemy) {
        enemy.vulnerable += card.vulnerable
        fx.push(`+${card.vulnerable} Vulnerable`)
      }
      if (card.weak && enemy) {
        enemy.weak += card.weak
        fx.push(`+${card.weak} Weak`)
      }
      if (card.sever && enemy) {
        enemy.severedUntilRound = s.round + card.sever
        fx.push('link severed')
      }
      if (card.corruption && enemy) {
        // The Mainframe has studied you: corruption takes hold at half strength.
        const applied = enemy.remembers
          ? Math.ceil((card.corruption * 2) / 3)
          : card.corruption
        enemy.corruption += applied
        fx.push(
          enemy.remembers
            ? `+${applied} Corruption (resisted)`
            : `+${applied} Corruption`,
        )
      }
      if (card.power) {
        p.power += card.power
        p.powerTurns = Math.max(p.powerTurns ?? 0, card.powerTurns ?? 0)
        fx.push(`+${card.power} atk dmg / ${card.powerTurns}t`)
      }
      if (card.lifesteal) {
        p.lifestealTurns = Math.max(p.lifestealTurns ?? 0, card.lifesteal)
        fx.push(`lifesteal ${card.lifesteal}t`)
      }

      logLine(
        s,
        `${p.name} plays ${card.name}${fx.length ? ' — ' + fx.join(', ') : ''}.`,
      )
      // Track the player's behavior across the run for the Mainframe's memory.
      s.runStats.cardsPlayed[card.name] =
        (s.runStats.cardsPlayed[card.name] ?? 0) + 1
      if (card.type === 'attack') {
        s.runStats.attacks += 1
        p.attacksThisTurn = (p.attacksThisTurn ?? 0) + 1
      } else s.runStats.skills += 1
      if (card.sever) s.runStats.severs += 1
      // Observed card-counting (ORACLE): distinct cards revealed this fight.
      if (!s.seen.includes(card.name)) s.seen.push(card.name)

      // Resummon returns the card to hand (a repeatable, energy-gated attack);
      // exhaust removes it; otherwise it goes to the discard pile.
      if (card.resummon) p.hand.push(card)
      else if (!card.exhaust) p.discard.push(card)

      // Killing the enemy wins the fight even if self-damage also dropped you;
      // otherwise, self-damage (Overload Core) can be lethal.
      if (
        !resolveIfCleared(s, s.enemies[ti]?.name) &&
        s.players.every((pl) => pl.hp <= 0)
      ) {
        s.players.forEach((pl) => (pl.hp = Math.max(0, pl.hp)))
        s.phase = 'lost'
        logLine(s, 'The long dark takes you.')
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
    case 'SET_INTENTS': {
      const s = clone(state)
      const alive = s.enemies.filter((e) => e.hp > 0)
      action.intents.forEach((m, i) => {
        const e = alive[i]
        if (e) {
          e.intent = m.intent
          e.intentSource = m.source
          e.decoyIntent = m.decoy ?? null
          e.taunt = m.taunt
          if (m.taunt) logLine(s, `${e.name}: "${m.taunt}"`)
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
        logLine(s, `${e.name}: "${baitTaunt(e.remembers)}"`)
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
      // Clearing ELIZA (gen-0) is where Sever starts to matter — the real Gemini
      // machines begin next. It only joins the deck with a key live (useless
      // against a scripted machine); a key added later restores it via
      // reconcileSever at the next trial setup.
      if (s.encounter === 0 && s.hasKey) {
        const me = s.players[s.activeSeat]
        if (me && !me.collection.some((c) => c.key === 'sever')) {
          me.collection.push(instantiate('sever'))
          logLine(s, "You learn to Sever the machine's link.")
        }
      }
      setupEncounter(s, s.encounter + 1)
      s.phase = 'player'
      logLine(s, `Trial ${s.encounter + 1}. A stronger mind awakens.`)
      return s
    }
    case 'RESTART':
      return createInitialState(action.hasKey ?? false)
    case 'SET_KEY': {
      const s = clone(state)
      s.hasKey = action.hasKey
      return s
    }
    default:
      return state
  }
}
