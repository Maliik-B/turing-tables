import type { Dispatch } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Action, GameState } from '../game/types'
import { RUN } from '../game/run'
import { EnemyPanel } from './EnemyPanel'
import { PlayerPanel } from './PlayerPanel'
import { CardView } from './CardView'

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
  } = state
  const me = players[activeSeat]
  const total = RUN.length
  const over = phase === 'won' || phase === 'lost'
  const cleared = phase === 'cleared'
  const aliveEnemy = enemies.findIndex((e) => e.hp > 0)
  const cur = aliveEnemy >= 0 ? enemies[aliveEnemy] : undefined
  const curIsGemini = !!apiKey && !!cur?.model
  const targetSevered = !!cur && cur.severedUntilRound >= round

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
          Machine: {curIsGemini ? 'Gemini' : 'Scripted'}
        </span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKey(e.target.value)}
          placeholder="Gemini API key (optional — plays scripted without one)"
          className="flex-1 rounded border border-neutral-800 bg-neutral-900 px-2 py-1 font-mono text-neutral-300 placeholder:text-neutral-600 focus:border-amber-500/50 focus:outline-none"
        />
      </div>

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
              <span className="font-mono text-xs text-neutral-500">
                Deck {me.deck.length} · Discard {me.discard.length}
              </span>
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
            <p className="max-w-sm text-sm text-neutral-400">
              The light holds. You recover and press deeper — a stronger mind
              waits in Trial {encounter + 2} of {total}.
            </p>
            <button
              type="button"
              onClick={() => dispatch({ type: 'CONTINUE' })}
              className="mt-1 rounded-lg border border-amber-500/50 bg-amber-500/10 px-6 py-2 font-semibold text-amber-300 hover:bg-amber-500/20"
            >
              Press On
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
