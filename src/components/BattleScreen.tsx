import type { Dispatch } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Action, GameState } from '../game/types'
import { EnemyPanel } from './EnemyPanel'
import { PlayerPanel } from './PlayerPanel'
import { CardView } from './CardView'

export function BattleScreen({
  state,
  dispatch,
}: {
  state: GameState
  dispatch: Dispatch<Action>
}) {
  const { enemies, players, activeSeat, phase, round, log } = state
  const me = players[activeSeat]
  const over = phase === 'win' || phase === 'lose'

  return (
    <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-amber-500/70">
          Turing Tables
        </span>
        <span className="font-mono text-xs text-neutral-500">Round {round}</span>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {enemies.map((e) => (
          <EnemyPanel key={e.id} enemy={e} />
        ))}
      </div>

      <div className="min-h-[2.25rem] rounded-lg border border-neutral-800/60 bg-neutral-900/40 px-4 py-2 text-xs text-neutral-400">
        {log[0] ?? ''}
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
                        phase === 'player' && !me.ended && card.cost <= me.energy
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
              <button
                type="button"
                disabled={over || me.ended}
                onClick={() => dispatch({ type: 'END_TURN', seat: activeSeat })}
                className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-5 py-2 font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-40"
              >
                End Turn
              </button>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {over && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-neutral-950/85 px-6 text-center backdrop-blur"
          >
            <h2
              className={`text-4xl font-bold ${
                phase === 'win' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {phase === 'win' ? 'The Machine halts.' : 'You have been deleted.'}
            </h2>
            <button
              type="button"
              onClick={() => dispatch({ type: 'RESTART' })}
              className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-6 py-2 font-semibold text-amber-300 hover:bg-amber-500/20"
            >
              New Trial
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
