import { useEffect, type Dispatch } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Action, GameState } from '../game/types'
import { RUN, modelLabel } from '../game/run'
import { EnemyPanel } from './EnemyPanel'
import { PlayerPanel } from './PlayerPanel'
import { CardView } from './CardView'
import { DossierPanel } from './DossierPanel'

export function BattleScreen({
  state,
  dispatch,
  apiKey,
  onApiKey,
}: {
  state: GameState
  dispatch: Dispatch<Action>
  apiKey: string
  onApiKey: (key: string) => void
}) {
  const {
    enemies,
    players,
    activeSeat,
    encounter,
    phase,
    round,
    log,
    awaitingIntents,
    calledThisRound,
    reads,
    rewardChoices,
    runStats,
  } = state
  const me = players[activeSeat]
  const total = RUN.length
  const over = phase === 'won' || phase === 'lost'
  const cleared = phase === 'cleared'
  const aliveEnemy = enemies.findIndex((e) => e.hp > 0)
  const cur = aliveEnemy >= 0 ? enemies[aliveEnemy] : undefined
  const curIsGemini = !!apiKey && !!cur?.model
  const targetSevered = !!cur && cur.severedUntilRound >= round

  // Full keyboard control so the game is playable without precise taps:
  //   1-9 play the card in that slot · E end turn · C call imitation
  //   reward screen: 1-3 pick a card, S/0 skip · over screen: R restart
  // Ignored while a text input is focused (so typing an API key is safe).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      const k = e.key.toLowerCase()

      if (cleared) {
        if (e.key >= '1' && e.key <= String(rewardChoices.length)) {
          const card = rewardChoices[Number(e.key) - 1]
          if (card) dispatch({ type: 'CHOOSE_REWARD', uid: card.uid })
        } else if (k === 's' || e.key === '0') {
          dispatch({ type: 'CHOOSE_REWARD', uid: null })
        }
        return
      }
      if (over) {
        if (k === 'r' || e.key === 'Enter') dispatch({ type: 'RESTART' })
        return
      }
      if (phase !== 'player' || awaitingIntents || !me || me.ended) return

      if (e.key >= '1' && e.key <= '9') {
        const card = me.hand[Number(e.key) - 1]
        if (card && card.cost <= me.energy) {
          dispatch({ type: 'PLAY_CARD', seat: activeSeat, uid: card.uid })
        }
        return
      }
      if (k === 'e') {
        dispatch({ type: 'END_TURN', seat: activeSeat })
      } else if (
        k === 'c' &&
        curIsGemini &&
        !calledThisRound &&
        !targetSevered &&
        aliveEnemy >= 0
      ) {
        dispatch({ type: 'ACCUSE', enemy: aliveEnemy })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    phase,
    awaitingIntents,
    me,
    cleared,
    over,
    rewardChoices,
    curIsGemini,
    calledThisRound,
    targetSevered,
    aliveEnemy,
    activeSeat,
    dispatch,
  ])

  return (
    <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-amber-500/70">
          Turing Tables
        </span>
        <span className="font-mono text-xs text-neutral-500">
          Trial {Math.min(encounter + 1, total)}/{total} · Round {round}
        </span>
      </header>
      <p className="-mt-1 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-amber-200/40">
        the longest day · hold the light until dawn
      </p>

      <div className="flex items-center gap-2 text-xs">
        <span
          className={`rounded px-2 py-0.5 font-mono ${
            curIsGemini
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-neutral-800 text-neutral-400'
          }`}
        >
          Machine: {curIsGemini ? modelLabel(cur?.model) : 'Scripted'}
        </span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKey(e.target.value)}
          placeholder="Gemini API key (optional — plays scripted without one)"
          className="flex-1 rounded border border-neutral-800 bg-neutral-900 px-2 py-1 font-mono text-neutral-300 placeholder:text-neutral-600 focus:border-amber-500/50 focus:outline-none"
        />
      </div>
      {apiKey && cur && !cur.model && (
        <p className="-mt-2 font-mono text-[10px] leading-snug text-neutral-500">
          Key active. ELIZA-0 is a rule-based automaton; the real Gemini machine
          wakes at DAEMON-1.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {enemies.map((e) => (
          <EnemyPanel
            key={e.id}
            enemy={e}
            thinking={awaitingIntents}
            round={round}
          />
        ))}
      </div>

      <DossierPanel stats={runStats} active={!!cur?.remembers} />

      <div className="h-24 space-y-0.5 overflow-y-auto rounded-lg border border-neutral-800/60 bg-neutral-900/40 px-4 py-2 text-xs">
        {awaitingIntents && (
          <p className="animate-pulse text-amber-300/80">
            The Machine is thinking…
          </p>
        )}
        {log.map((line, i) => (
          <p
            key={i}
            className={
              i === 0 && !awaitingIntents
                ? 'text-neutral-200'
                : 'text-neutral-500'
            }
          >
            {line}
          </p>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {me && (
          <>
            <PlayerPanel player={me} />

            <div className="flex items-end justify-center gap-3 overflow-x-auto pb-2">
              <AnimatePresence mode="popLayout">
                {me.hand.map((card) => (
                  <motion.div
                    key={card.uid}
                    layout
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <CardView
                      card={card}
                      playable={
                        phase === 'player' &&
                        !me.ended &&
                        !awaitingIntents &&
                        card.cost <= me.energy
                      }
                      onClick={() =>
                        dispatch({
                          type: 'PLAY_CARD',
                          seat: activeSeat,
                          uid: card.uid,
                        })
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col font-mono text-xs text-neutral-500">
                <span>
                  Deck {me.deck.length} · Discard {me.discard.length}
                </span>
                <span className="text-[10px] text-neutral-600">
                  1-5 play · E end · C call
                </span>
              </div>
              <div className="flex items-center gap-2">
                {curIsGemini && (
                  <button
                    type="button"
                    title="Accuse the Machine's telegraphed move of being a scripted imitation. Right: +1 energy. Wrong: -4 HP."
                    disabled={
                      phase !== 'player' ||
                      awaitingIntents ||
                      calledThisRound ||
                      targetSevered ||
                      aliveEnemy < 0
                    }
                    onClick={() =>
                      dispatch({ type: 'ACCUSE', enemy: aliveEnemy })
                    }
                    className="rounded-lg border border-fuchsia-500/50 bg-fuchsia-500/10 px-4 py-2 font-semibold text-fuchsia-300 hover:bg-fuchsia-500/20 disabled:opacity-40"
                  >
                    Call Imitation
                  </button>
                )}
                <button
                  type="button"
                  disabled={phase !== 'player' || me.ended || awaitingIntents}
                  onClick={() =>
                    dispatch({ type: 'END_TURN', seat: activeSeat })
                  }
                  className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-5 py-2 font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-40"
                >
                  End Turn
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {cleared && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-neutral-950/85 px-6 text-center backdrop-blur"
          >
            <h2 className="text-3xl font-bold text-emerald-400">
              Trial {encounter + 1} cleared.
            </h2>
            <p className="max-w-md text-sm text-neutral-400">
              Recover ~30% HP and take one card before descending to Trial{' '}
              {encounter + 2} of {total}.
            </p>
            <div className="flex flex-wrap items-end justify-center gap-3">
              {rewardChoices.map((card) => (
                <CardView
                  key={card.uid}
                  card={card}
                  playable
                  onClick={() =>
                    dispatch({ type: 'CHOOSE_REWARD', uid: card.uid })
                  }
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => dispatch({ type: 'CHOOSE_REWARD', uid: null })}
              className="mt-1 text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-300"
            >
              Skip — take no card
            </button>
          </motion.div>
        )}
        {over && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-neutral-950/85 px-6 text-center backdrop-blur"
          >
            <h2
              className={`text-4xl font-bold ${
                phase === 'won' ? 'text-amber-300' : 'text-red-400'
              }`}
            >
              {phase === 'won'
                ? 'Dawn breaks. The Mainframe goes dark.'
                : 'The long dark takes you.'}
            </h2>
            {apiKey && reads.caught + reads.falseAccusations > 0 && (
              <p className="font-mono text-sm text-neutral-400">
                Imitations caught: {reads.caught} · Wrong reads:{' '}
                {reads.falseAccusations}
              </p>
            )}
            <button
              type="button"
              onClick={() => dispatch({ type: 'RESTART' })}
              className="mt-1 rounded-lg border border-amber-500/50 bg-amber-500/10 px-6 py-2 font-semibold text-amber-300 hover:bg-amber-500/20"
            >
              New Trial
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
