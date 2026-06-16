import { useEffect, useReducer, useState } from 'react'
import { createInitialState, reducer } from './game/engine'
import { decideMove } from './game/brain'
import { BattleScreen } from './components/BattleScreen'

const KEY_STORAGE = 'tt_gemini_key'

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(),
  )
  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem(KEY_STORAGE) ?? '',
  )

  const updateKey = (k: string) => {
    setApiKey(k)
    if (k) localStorage.setItem(KEY_STORAGE, k)
    else localStorage.removeItem(KEY_STORAGE)
  }

  // Resolve the Machine's next intent asynchronously (Gemini -> scripted
  // fallback). When a key is present, a RANDOMIZED "thinking" delay covers
  // every turn so the instant-resolving scripted (dummy) turns can't be told
  // apart from Gemini turns by timing.
  useEffect(() => {
    if (!state.awaitingIntents || state.phase !== 'player') return
    let cancelled = false
    const alive = state.enemies.filter((e) => e.hp > 0)
    const minThink = apiKey ? 900 + Math.floor(Math.random() * 900) : 150
    void (async () => {
      const [intents] = await Promise.all([
        Promise.all(
          alive.map((e) =>
            decideMove(
              { lastMove: e.lastMove, hpRatio: e.hp / e.maxHp },
              { apiKey: apiKey || null },
            ),
          ),
        ),
        new Promise((r) => setTimeout(r, minThink)),
      ])
      if (!cancelled) dispatch({ type: 'SET_INTENTS', intents })
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.awaitingIntents, state.phase, state.round, apiKey])

  // Auto-end the active player's turn when no playable cards remain (covers
  // 0 energy, and energy-left-but-nothing-affordable; 0-cost-card aware).
  useEffect(() => {
    if (state.phase !== 'player' || state.awaitingIntents) return
    const me = state.players[state.activeSeat]
    if (!me || me.ended || me.hp <= 0) return
    if (me.hand.some((c) => c.cost <= me.energy)) return
    const t = setTimeout(
      () => dispatch({ type: 'END_TURN', seat: state.activeSeat }),
      700,
    )
    return () => clearTimeout(t)
  }, [state])

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <BattleScreen
        state={state}
        dispatch={dispatch}
        apiKey={apiKey}
        onApiKey={updateKey}
      />
    </div>
  )
}

export default App
