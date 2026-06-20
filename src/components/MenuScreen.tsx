import { useEffect } from 'react'
import { motion } from 'motion/react'
import { SolsticeSun } from './SolsticeSun'

export function MenuScreen({
  apiKey,
  onApiKey,
  onBegin,
  record,
}: {
  apiKey: string
  onApiKey: (key: string) => void
  onBegin: () => void
  record: { wins: number; losses: number }
}) {
  // Enter begins the run (keyboard-first play).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onBegin()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBegin])

  return (
    <div className="relative mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      {/* Solstice sun rising behind the title. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[20%] -z-10 -translate-x-1/2"
        initial={{ y: 70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.8, ease: 'easeOut' }}
      >
        <SolsticeSun size={360} intensity={0.85} />
      </motion.div>

      <p className="font-mono text-xs uppercase tracking-[0.4em] text-amber-200/60">
        June Solstice · The Imitation Game
      </p>
      <h1
        className="font-mono text-5xl font-bold uppercase leading-[0.95] tracking-[0.16em] text-amber-100 sm:text-6xl"
        style={{ textShadow: '0 0 36px rgba(251,191,36,0.4)' }}
      >
        Turing
        <br />
        Tables
      </h1>
      <div
        aria-hidden
        className="-mt-1 h-px w-64 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"
      />
      <p className="max-w-md leading-relaxed text-neutral-300">
        A deckbuilder against machines that may — or may not — be thinking.
        Descend their generations on the longest day and reach the Mainframe
        before dusk.
      </p>
      <button
        type="button"
        onClick={onBegin}
        className="rounded-lg border border-amber-500/60 bg-amber-500/15 px-8 py-3 text-lg font-semibold text-amber-200 transition-colors hover:bg-amber-500/25"
      >
        Begin
      </button>
      {record.wins + record.losses > 0 && (
        <p className="-mt-3 font-mono text-[11px] text-neutral-500">
          Record: <span className="text-emerald-300">{record.wins}W</span> ·{' '}
          <span className="text-red-300">{record.losses}L</span>
        </p>
      )}
      <div className="mt-2 w-full max-w-md">
        <label className="mb-1 block text-left font-mono text-[11px] uppercase tracking-wider text-neutral-500">
          Gemini API key — optional
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKey(e.target.value)}
          placeholder="paste a free Google AI Studio key to face the real machine"
          className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-300 placeholder:text-neutral-600 focus:border-amber-500/50 focus:outline-none"
        />
        {apiKey ? (
          <p className="mt-1.5 text-left text-[11px] leading-snug text-emerald-400/80">
            ✓ Key active. ELIZA-0 is scripted by design; the real Gemini machine
            wakes at DAEMON-1, then sharpens each trial up to the Mainframe.
          </p>
        ) : (
          <p className="mt-1.5 text-left text-[11px] leading-snug text-neutral-600">
            Without a key the machines run a scripted brain. With one, ~70% of
            their moves are real Gemini, and you can hunt the fakes.
          </p>
        )}
      </div>
    </div>
  )
}
