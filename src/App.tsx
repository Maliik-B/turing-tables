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
// A cached rate_limit/error older than this is ignored (see freshStatusByModel),
// so a transient quota blip doesn't linger across turns or sessions.
const STATUS_TTL_MS = 90_000
type StampedStatus = { status: GeminiStatus; ts: number }

type Screen = 'menu' | 'intro' | 'game'

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(!!localStorage.getItem(KEY_STORAGE)),
  )
  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem(KEY_STORAGE) ?? '',
  )
  const [apiStatusByModel, setApiStatusByModel] = useState<
    Record<string, StampedStatus>
  >(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STATUS_STORAGE) || '{}') || {}
      const out: Record<string, StampedStatus> = {}
      for (const [m, v] of Object.entries(raw)) {
        // Normalize the pre-timestamp shape (a bare status string) as already
        // stale, so an old persisted rate-limit clears on the next load.
        if (v && typeof v === 'object' && 'status' in v)
          out[m] = v as StampedStatus
        else if (typeof v === 'string')
          out[m] = { status: v as GeminiStatus, ts: 0 }
      }
      return out
    } catch {
      return {}
    }
  })
  // Track Gemini health PER MODEL (not globally) so the banner reflects the
  // current machine's own pool, not a rate-limit bled over from a different tier.
  // Each entry is timestamped so a transient rate_limit/error self-clears
  // (freshStatusByModel) instead of lingering after the quota recovered.
  const recordApiStatus = (model: string, s: GeminiStatus) => {
    setApiStatusByModel((prev) => {
      const cur = prev[model]
      // Sticky statuses (ok/bad_key) don't expire, so skip a redundant write; a
      // repeated rate_limit/error refreshes its timestamp to keep the clock live.
      if (cur && cur.status === s && s !== 'rate_limit' && s !== 'error')
        return prev
      const next = { ...prev, [model]: { status: s, ts: Date.now() } }
      try {
        localStorage.setItem(STATUS_STORAGE, JSON.stringify(next))
      } catch {
        // ignore storage failures
      }
      return next
    })
  }
  // A transient rate_limit/error older than the TTL reads as unknown (no banner):
  // RPM/TPM limits clear within a minute, and a real daily cap re-flags on the
  // next combat call (which already falls back to scripted). bad_key stays sticky
  // until the key changes. Children keep the plain-status shape.
  const freshStatusByModel: Record<string, GeminiStatus> = {}
  for (const [m, { status, ts }] of Object.entries(apiStatusByModel)) {
    if (
      (status === 'rate_limit' || status === 'error') &&
      Date.now() - ts > STATUS_TTL_MS
    )
      continue
    freshStatusByModel[m] = status
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

  // Keep the engine's key-awareness in sync so the key-only Sever card is gated
  // out of the deck when keyless (reconciled at the next trial's deck rebuild).
  useEffect(() => {
    dispatch({ type: 'SET_KEY', hasKey: !!apiKey })
  }, [apiKey])

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
                bluffChance: e.bluffChance,
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
      {/* Stars, machine-city horizon, the looming enemy, fog, grain. */}
      <Backdrop
        warmth={warmth}
        lost={lost}
        tier={
          screen === 'game' && !won && !lost
            ? state.encounter
            : screen === 'menu'
              ? 3
              : null
        }
        distant={screen === 'menu'}
        cityDamage={screen === 'game' ? Math.min(1, state.encounter / 3) : 0}
      />
      {screen === 'menu' && (
        <MenuScreen
          apiKey={apiKey}
          onApiKey={updateKey}
          onBegin={() => setScreen('intro')}
          record={record}
          apiStatusByModel={freshStatusByModel}
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
          apiStatusByModel={freshStatusByModel}
        />
      )}
    </div>
  )
}

export default App
