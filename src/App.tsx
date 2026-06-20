import { useEffect, useReducer, useRef, useState } from 'react'
import { createInitialState, reducer } from './game/engine'
import { decideMove, buildDossier } from './game/brain'
import { BattleScreen } from './components/BattleScreen'
import { MenuScreen } from './components/MenuScreen'
import { IntroScroll } from './components/IntroScroll'

const KEY_STORAGE = 'tt_gemini_key'
const RECORD_STORAGE = 'tt_record'

type Screen = 'menu' | 'intro' | 'game'

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(),
  )
  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem(KEY_STORAGE) ?? '',
  )
  const [screen, setScreen] = useState<Screen>('menu')

  const updateKey = (k: string) => {
    setApiKey(k)
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

  // Resolve the Machine's next intent asynchronously (Gemini -> scripted
  // fallback) once we're in a fight. A randomized "thinking" delay (with a key)
  // covers every turn so the instant scripted (dummy) turns can't be told from
  // Gemini turns by timing. The Mainframe also gets a memory dossier.
  useEffect(() => {
    if (screen !== 'game') return
    if (!state.awaitingIntents || state.phase !== 'player') return
    let cancelled = false
    const alive = state.enemies.filter((e) => e.hp > 0)
    const minThink = apiKey ? 1100 + Math.floor(Math.random() * 1100) : 150
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
      if (!cancelled) dispatch({ type: 'SET_INTENTS', intents })
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.awaitingIntents, state.phase, state.round, apiKey, screen])

  const glowOpacity =
    screen === 'game' ? 0.72 + (0.28 * Math.min(state.round, 10)) / 10 : 0.55

  return (
    <div className="min-h-screen text-neutral-100">
      {/* Solstice dawn glow — backs every screen; rises as the fight wears on. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[88vh]"
        style={{
          background:
            'radial-gradient(110% 95% at 50% 132%, rgba(251,191,36,0.42), rgba(217,119,6,0.16) 50%, transparent 78%)',
          opacity: glowOpacity,
        }}
      />
      {screen === 'menu' && (
        <MenuScreen
          apiKey={apiKey}
          onApiKey={updateKey}
          onBegin={() => setScreen('intro')}
          record={record}
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
        />
      )}
    </div>
  )
}

export default App
