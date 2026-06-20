import { useEffect, useState, type Dispatch } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Action, GameState } from '../game/types'
import { RUN, modelLabel } from '../game/run'
import { EnemyPanel } from './EnemyPanel'
import { PlayerPanel } from './PlayerPanel'
import { CardView } from './CardView'
import { DossierPanel } from './DossierPanel'
import { SolsticeSun } from './SolsticeSun'
import { CARDS } from '../game/cards'

// Card-counting confidence for the Gemini passive: rises as the player's deck
// thins. Observed = fraction of distinct cards seen; full = fraction played.
function readConfidence(
  cardCount: 'none' | 'observed' | 'full',
  human:
    | { collection: { name: string }[]; deck: unknown[]; hand: unknown[] }
    | undefined,
  seen: string[],
): string | null {
  if (cardCount === 'none' || !human) return null
  let progress: number
  if (cardCount === 'observed') {
    const distinct = new Set(human.collection.map((c) => c.name)).size
    progress = distinct ? Math.min(1, seen.length / distinct) : 0
  } else {
    const total = human.collection.length
    const unplayed = human.deck.length + human.hand.length
    progress = total ? Math.max(0.5, 1 - unplayed / total) : 0.5
  }
  return progress < 0.45
    ? 'a rough idea'
    : progress < 0.78
      ? 'a good idea'
      : 'near-certain'
}

export function BattleScreen({
  state,
  dispatch,
  apiKey,
  onApiKey,
  record,
}: {
  state: GameState
  dispatch: Dispatch<Action>
  apiKey: string
  onApiKey: (key: string) => void
  record: { wins: number; losses: number }
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

  const [severIntroSeen, setSeverIntroSeen] = useState(false)
  // Sever is introduced when the first Gemini machine (DAEMON, trial 2) arrives.
  // Reset the intro when a new run starts (back at trial 1).
  useEffect(() => {
    if (encounter === 0) setSeverIntroSeen(false)
  }, [encounter])
  const severIntro =
    !!me && !over && !cleared && encounter === 1 && !severIntroSeen
  const [showDeck, setShowDeck] = useState(false)

  // Full keyboard control so the game is playable without precise taps:
  //   1-9 play the card in that slot · E end turn · C call imitation
  //   reward screen: 1-3 pick a card, S/0 skip · over screen: R restart
  // Ignored while a text input is focused (so typing an API key is safe).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      const k = e.key.toLowerCase()

      // Shift+R quick-restarts from any phase (playtest convenience). Shift so a
      // stray keypress can't wipe a run.
      if (e.shiftKey && k === 'r') {
        dispatch({ type: 'RESTART' })
        return
      }

      if (severIntro) {
        if (e.key === 'Enter' || e.key === ' ') setSeverIntroSeen(true)
        return
      }

      if (showDeck) {
        if (e.key === 'Escape' || k === 'd') setShowDeck(false)
        return
      }

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
      if (k === 'd') {
        setShowDeck(true)
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
    severIntro,
    showDeck,
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
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-neutral-500">
            Trial {Math.min(encounter + 1, total)}/{total} · Round {round}
          </span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESTART' })}
            title="Restart the run (Shift+R)"
            className="rounded border border-neutral-700 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-400 hover:border-amber-500/50 hover:text-amber-300"
          >
            ↻ Restart
          </button>
        </div>
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
        {enemies.map((e) => {
          const isGemini = !!apiKey && !!e.model
          return (
            <EnemyPanel
              key={e.id}
              enemy={e}
              thinking={awaitingIntents}
              round={round}
              gemini={isGemini}
              confidence={
                isGemini ? readConfidence(e.cardCount, me, state.seen ?? []) : null
              }
            />
          )
        })}
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
                <button
                  type="button"
                  onClick={() => setShowDeck(true)}
                  title="View your full deck (D)"
                  className="text-left hover:text-amber-300"
                >
                  Deck {me.deck.length} · Discard {me.discard.length} ▸
                </button>
                <span className="text-[10px] text-neutral-600">
                  1-5 play · E end · C call · D deck
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
        {showDeck && me && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-neutral-950/92 px-6 backdrop-blur"
          >
            <div className="flex w-full max-w-md items-center justify-between">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-amber-300">
                Your deck · {me.collection.length} cards
              </h2>
              <button
                type="button"
                onClick={() => setShowDeck(false)}
                className="font-mono text-xs text-neutral-400 hover:text-amber-300"
              >
                Close (D / Esc)
              </button>
            </div>
            <div className="flex max-h-[62vh] w-full max-w-3xl flex-wrap items-start justify-center gap-2 overflow-y-auto py-1">
              {me.collection.map((card) => (
                <div key={card.uid} className="origin-top scale-90">
                  <CardView card={card} playable={false} onClick={() => {}} />
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] text-neutral-600">
              This is exactly what the Mainframe already knows.
            </p>
          </motion.div>
        )}
        {severIntro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-neutral-950/90 px-6 text-center backdrop-blur"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400/70">
              The grid wakes
            </p>
            <h2 className="text-2xl font-bold text-amber-200">
              From here, you must sever the link.
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-neutral-400">
              ELIZA was a dead-end husk — no link to the grid, nothing to cut.
              The machines below are wired into the central network. Sever drops
              one to blind, scripted routines for two turns. You'll want it.
            </p>
            <CardView
              card={{ ...CARDS.sever, uid: -1 }}
              playable={false}
              onClick={() => {}}
            />
            <button
              type="button"
              onClick={() => setSeverIntroSeen(true)}
              className="mt-1 rounded-lg border border-amber-500/50 bg-amber-500/10 px-6 py-2 font-semibold text-amber-300 hover:bg-amber-500/20"
            >
              Continue (Enter)
            </button>
          </motion.div>
        )}
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
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 overflow-hidden px-6 text-center backdrop-blur"
            style={{
              background:
                phase === 'won'
                  ? 'radial-gradient(130% 100% at 50% 128%, rgba(251,191,36,0.55), rgba(124,45,18,0.5) 42%, rgba(10,12,22,0.94) 82%)'
                  : 'radial-gradient(120% 100% at 50% 45%, rgba(30,58,138,0.32), rgba(4,4,10,0.96) 72%)',
            }}
          >
            {phase === 'won' && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute bottom-[-140px] left-1/2 -z-10 -translate-x-1/2"
                initial={{ y: 150, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 2, ease: 'easeOut' }}
              >
                <SolsticeSun size={480} intensity={1} />
              </motion.div>
            )}
            <h2
              className={`text-4xl font-bold ${
                phase === 'won' ? 'text-amber-100' : 'text-red-400'
              }`}
              style={
                phase === 'won'
                  ? { textShadow: '0 0 44px rgba(251,191,36,0.55)' }
                  : undefined
              }
            >
              {phase === 'won'
                ? 'Dawn breaks. The Mainframe goes dark.'
                : 'The long dark takes you.'}
            </h2>
            <div className="grid w-full max-w-xs grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs">
              <span className="text-left text-neutral-500">Rounds</span>
              <span className="text-right text-neutral-200">
                {runStats.rounds ?? 0}
              </span>
              <span className="text-left text-neutral-500">Damage dealt</span>
              <span className="text-right text-neutral-200">
                {runStats.damageDealt}
              </span>
              <span className="text-left text-neutral-500">Block gained</span>
              <span className="text-right text-neutral-200">
                {runStats.blockGained}
              </span>
              <span className="text-left text-neutral-500">Attacks / Skills</span>
              <span className="text-right text-neutral-200">
                {runStats.attacks} / {runStats.skills}
              </span>
              {runStats.severs > 0 && (
                <>
                  <span className="text-left text-neutral-500">Severs used</span>
                  <span className="text-right text-neutral-200">
                    {runStats.severs}
                  </span>
                </>
              )}
              {phase === 'won' && me && (
                <>
                  <span className="text-left text-neutral-500">HP remaining</span>
                  <span className="text-right text-emerald-300">
                    {Math.max(0, me.hp)}/{me.maxHp}
                  </span>
                </>
              )}
              {apiKey && reads.caught + reads.falseAccusations > 0 && (
                <>
                  <span className="text-left text-neutral-500">
                    Reads caught / wrong
                  </span>
                  <span className="text-right text-fuchsia-300">
                    {reads.caught} / {reads.falseAccusations}
                  </span>
                </>
              )}
            </div>
            <p className="font-mono text-[11px] text-neutral-500">
              Record this session:{' '}
              <span className="text-emerald-300">{record.wins}W</span> ·{' '}
              <span className="text-red-300">{record.losses}L</span>
            </p>
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
