import type { Dispatch } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Action, GameState } from '../game/types'
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
    phase,
    round,
    log,
    awaitingIntents,
    calledThisRound,
    reads,
  } = state
  const me = players[activeSeat]
  const over = phase === 'win' || phase === 'lose'
  const aliveEnemy = enemies.findIndex((e) => e.hp > 0)
  const targetSevered =
    aliveEnemy >= 0 && (enemies[aliveEnemy]?.severedUntilRound ?? 0) >= round

  return (
    <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-5">
      {/* Solstice dawn glow — warms and rises as the rounds wear on. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[60vh]"
        style={{
          background:
            'radial-gradient(75% 100% at 50% 115%, rgba(251,191,36,0.20), rgba(180,83,9,0.10) 38%, transparent 68%)',
          opacity: 0.3 + (0.6 * Math.min(round, 12)) / 12,
        }}
      />
      <header className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-amber-500/70">
          Turing Tables
        </span>
        <span className="font-mono text-xs text-neutral-500">Round {round}</span>
      </header>
      <p className="-mt-1 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-amber-200/40">
        the longest day · hold the light until dawn
      </p>

      <div className="flex items-center gap-2 text-xs">
        <span
          className={`rounded px-2 py-0.5 font-mono ${
            apiKey
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-neutral-800 text-neutral-400'
          }`}
        >
          Machine: {apiKey ? 'Gemini' : 'Scripted'}
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

      <div className="min-h-[2.25rem] rounded-lg border border-neutral-800/60 bg-neutral-900/40 px-4 py-2 text-xs text-neutral-400">
        {awaitingIntents ? 'The Machine is thinking…' : (log[0] ?? '')}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {players.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {players.map((p, i) =>
              i === activeSeat ? null : (
                <span
                  key={p.id}
                  className="rounded bg-neutral-800 px-2 py-1 font-mono text-[11px] text-neutral-400"
                >
                  {p.name} {Math.max(0, p.hp)}hp {p.ended ? '✓' : '…'}
                </span>
              ),
            )}
          </div>
        )}

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
                        !over &&
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
                {apiKey && (
                  <button
                    type="button"
                    title="Accuse the Machine's telegraphed move of being a scripted imitation. Right: +1 energy. Wrong: -4 HP."
                    disabled={
                      over ||
                      awaitingIntents ||
                      calledThisRound ||
                      aliveEnemy < 0 ||
                      targetSevered
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
                  disabled={over || me.ended || awaitingIntents}
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
        {over && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-neutral-950/85 px-6 text-center backdrop-blur"
          >
            <h2
              className={`text-4xl font-bold ${
                phase === 'win' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {phase === 'win'
                ? 'Dawn breaks. The Machine halts.'
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
