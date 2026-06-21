import { useEffect, useReducer, useRef, useState } from 'react'
import { createInitialState, reducer } from './game/engine'
import { decideMove, buildDossier } from './game/brain'
import type { GeminiStatus } from './game/brain'
import { modelTiming } from './game/gemini'
import { BattleScreen } from './components/BattleScreen'
import { MenuScreen } from './components/MenuScreen'
import { IntroScroll } from './components/IntroScroll'
import { Backdrop } from './components/Backdrop'

const KEY_STORAGE = 'tt_gemini_key'
const RECORD_STORAGE = 'tt_record'
const STATUS_STORAGE = 'tt_api_status'

type Screen = 'menu' | 'intro' | 'game'

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(),
  )
  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem(KEY_STORAGE) ?? '',
  )
  const [apiStatusByModel, setApiStatusByModel] = useState<
    Record<string, GeminiStatus>
  >(() => {
    try {
      return JSON.parse(localStorage.getItem(STATUS_STORAGE) || '{}') || {}
    } catch {
      return {}
    }
  })
  // Track Gemini health PER MODEL (not globally) so the battle banner reflects
  // the current machine's own pool, not a stale rate-limit bled over from a
  // different-tier machine. Persisted so the menu can warn on a fresh load.
  const recordApiStatus = (model: string, s: GeminiStatus) => {
    setApiStatusByModel((prev) => {
      if (prev[model] === s) return prev
      const next = { ...prev, [model]: s }
      try {
        localStorage.setItem(STATUS_STORAGE, JSON.stringify(next))
      } catch {
        // ignore storage failures
      }
      return next
    })
  }
  const [screen, setScreen] = useState<Screen>('menu')

  const updateKey = (k: string) => {
    setApiKey(k)
    // A changed key invalidates any prior rate-limit / bad-key warnings.
    setApiStatusByModel({})
    try {
      localStorage.removeItem(STATUS_STORAGE)
    } catch {
      // ignore
    }
    if (k) localStorage.setItem(KEY_STORAGE, k)
    else localStorage.removeItem(KEY_STORAGE)
  }

  const [record, setRecord] = useState<{ wins: number; losses: number }>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECORD_STORAGE) ?? 'null')
      return parsed && typeof parsed.wins === 'number'
        ? parsed
        : { wins: 0, losses: 0 }
    } catch {
      return { wins: 0, losses: 0 }
    }
  })
  const recordedRef = useRef(false)
  // Tally each finished run once; wins/losses persist across sessions.
  useEffect(() => {
    if (state.phase === 'won' || state.phase === 'lost') {
      if (recordedRef.current) return
      recordedRef.current = true
      setRecord((r) => {
        const next = {
          wins: r.wins + (state.phase === 'won' ? 1 : 0),
          losses: r.losses + (state.phase === 'lost' ? 1 : 0),
        }
        try {
          localStorage.setItem(RECORD_STORAGE, JSON.stringify(next))
        } catch {
          // ignore storage failures
        }
        return next
      })
    } else {
      recordedRef.current = false
    }
  }, [state.phase])

  // One-decision-per-round guard for the intent decider (see the effect below).
  const decidedIntentKey = useRef<string | null>(null)
  // Resolve the Machine's next intent asynchronously (Gemini -> scripted
  // fallback) once we're in a fight. A randomized "thinking" delay (with a key)
  // covers every turn so the instant scripted (dummy) turns can't be told from
  // Gemini turns by timing. The Mainframe also gets a memory dossier.
  useEffect(() => {
    if (screen !== 'game') return
    if (!state.awaitingIntents || state.phase !== 'player') return
    // Decide a round's intents exactly once. React StrictMode double-invokes
    // effects in dev, which would otherwise fire (and bill) two Gemini calls
    // per round; this key guard collapses them to one. runId keeps the key
    // unique across restarts, where encounter+round repeat.
    const key = `${state.runId}:${state.encounter}:${state.round}`
    if (decidedIntentKey.current === key) return
    decidedIntentKey.current = key
    const alive = state.enemies.filter((e) => e.hp > 0)
    // Mask the "thinking" pause to the current machine's tier so scripted turns
    // match that model's real cadence (and the boss gets a longer beat). ELIZA
    // (no model) and keyless play stay near-instant.
    const first = alive[0]
    const tm = apiKey && first?.model ? modelTiming(first.model) : null
    const minThink = tm
      ? tm.thinkMin + Math.floor(Math.random() * (tm.thinkMax - tm.thinkMin))
      : 150
    void (async () => {
      const [intents] = await Promise.all([
        Promise.all(
          alive.map((e) => {
            const human = state.players[e.targetSeat] ?? state.players[0]
            const deck =
              e.cardCount === 'observed'
                ? { knowledge: 'observed' as const, cards: state.seen ?? [] }
                : e.cardCount === 'full' && human
                  ? {
                      knowledge: 'full' as const,
                      cards: human.collection.map((c) => c.name),
                      unplayed: human.deck.length + human.hand.length,
                    }
                  : undefined
            return decideMove(
              {
                lastMove: e.lastMove,
                hpRatio: e.hp / e.maxHp,
                abilities: e.abilities,
                player: human
                  ? {
                      hpRatio: human.hp / human.maxHp,
                      block: human.block,
                      vulnerable: human.vulnerable,
                      weak: human.weak,
                      power: human.power,
                    }
                  : undefined,
                deck,
              },
              {
                apiKey: apiKey || null,
                model: e.model,
                severed: e.severedUntilRound >= state.round,
                memory: e.remembers
                  ? buildDossier(state.runStats)
                  : undefined,
              },
            )
          }),
        ),
        new Promise((r) => setTimeout(r, minThink)),
      ])
      // Apply only if this is still the current round; a later round resets the
      // key, so a stale in-flight decision is dropped instead of dispatched.
      if (decidedIntentKey.current === key) {
        // Record each machine's API health against ITS model, so the battle
        // banner reflects the current enemy's pool rather than a stale
        // rate-limit carried over from a different-tier machine.
        alive.forEach((e, i) => {
          const st = intents[i]?.status
          if (st && e.model) recordApiStatus(e.model, st)
        })
        dispatch({ type: 'SET_INTENTS', intents })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.awaitingIntents,
    state.phase,
    state.round,
    state.encounter,
    state.runId,
    apiKey,
    screen,
  ])

  // Dawn-as-an-arc: the light warms + rises across the run (indigo night → gold
  // dawn), floods on a win, drains cold on a loss. 0 = deep night, 1 = full dawn.
  const won = state.phase === 'won'
  const lost = state.phase === 'lost'
  const progress = screen === 'game' ? Math.min(1, state.encounter / 3) : 0
  const warmth = won ? 1 : lost ? 0 : 0.3 + 0.55 * progress
  const dawnHeight = 60 + warmth * 52 // vh of the warm horizon glow
  const dawnAlpha = lost ? 0.1 : 0.38 + warmth * 0.5
  const nightAlpha = lost ? 0.92 : 0.6 - warmth * 0.42 // night recedes toward dawn

  return (
    <div className="min-h-screen text-neutral-100">
      {/* Cool night sky — deepest at Trial 1 and on a loss; recedes toward dawn. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20 transition-opacity duration-1000"
        style={{
          background:
            'radial-gradient(125% 80% at 50% -12%, rgba(30,27,75,0.9), rgba(15,23,42,0.5) 45%, transparent 75%)',
          opacity: nightAlpha,
        }}
      />
      {/* Warm dawn horizon — rises in height + warmth with the run; gold on a win,
          a cold blue smear on a loss. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 transition-all duration-1000"
        style={{
          height: `${dawnHeight}vh`,
          background: lost
            ? 'radial-gradient(120% 100% at 50% 138%, rgba(30,58,138,0.22), transparent 68%)'
            : `radial-gradient(125% 100% at 50% 136%, rgba(251,191,36,${dawnAlpha}), rgba(217,119,6,${
                dawnAlpha * 0.45
              }) 45%, transparent 78%)`,
        }}
      />
      {/* Stars, ruined-grid horizon, drifting fog, grain — atmosphere. */}
      <Backdrop warmth={warmth} lost={lost} />
      {screen === 'menu' && (
        <MenuScreen
          apiKey={apiKey}
          onApiKey={updateKey}
          onBegin={() => setScreen('intro')}
          record={record}
          apiStatusByModel={apiStatusByModel}
        />
      )}
      {screen === 'intro' && <IntroScroll onContinue={() => setScreen('game')} />}
      {screen === 'game' && (
        <BattleScreen
          state={state}
          dispatch={dispatch}
          apiKey={apiKey}
          onApiKey={updateKey}
          record={record}
          apiStatusByModel={apiStatusByModel}
        />
      )}
    </div>
  )
}

export default App
