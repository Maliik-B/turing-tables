import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { SolsticeSun } from './SolsticeSun'
import type { GeminiStatus } from '../game/brain'

export function MenuScreen({
  apiKey,
  onApiKey,
  onBegin,
  record,
  apiStatusByModel,
}: {
  apiKey: string
  onApiKey: (key: string) => void
  onBegin: () => void
  record: { wins: number; losses: number }
  apiStatusByModel: Record<string, GeminiStatus>
}) {
  const [showKeyHelp, setShowKeyHelp] = useState(false)
  // Worst-case summary across the key's models for the menu warning.
  const vals = Object.values(apiStatusByModel)
  const apiStatus: GeminiStatus | null = vals.includes('bad_key')
    ? 'bad_key'
    : vals.includes('rate_limit')
      ? 'rate_limit'
      : null
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
        Descend their generations on the longest day, reach the Mainframe, and
        hold the light until dawn.
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
          Gemini API key (optional)
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKey(e.target.value)}
          placeholder="paste a free Google AI Studio key to face the real machine"
          className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-300 placeholder:text-neutral-600 focus:border-amber-500/50 focus:outline-none"
        />
        {apiStatus === 'rate_limit' ? (
          <p className="mt-1.5 text-left text-[11px] leading-snug text-amber-400/90">
            ⚠ This key recently hit its Gemini quota. It may still be maxed until
            your free limit resets (midnight Pacific, ~3 AM ET), or upgrade your
            Google AI plan for more. You can still play; the machines fall back
            to their scripted imitation.
          </p>
        ) : apiStatus === 'bad_key' ? (
          <p className="mt-1.5 text-left text-[11px] leading-snug text-red-400/90">
            ⚠ This key was rejected last time. Double-check it at
            aistudio.google.com/apikey and paste it again.
          </p>
        ) : apiKey ? (
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

        <button
          type="button"
          onClick={() => setShowKeyHelp((v) => !v)}
          className="mt-2 flex items-center gap-1 font-mono text-[11px] text-amber-300/70 transition-colors hover:text-amber-300"
        >
          <span aria-hidden>{showKeyHelp ? '▾' : '▸'}</span> How do I get a free
          key?
        </button>
        {showKeyHelp && (
          <div className="mt-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-left">
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-300 underline decoration-amber-500/40 underline-offset-2 hover:decoration-amber-400"
            >
              Open Google AI Studio ↗
            </a>
            <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-neutral-400">
              <p>1. Sign in with your Google account.</p>
              <p>
                2. Click{' '}
                <span className="text-neutral-200">Create API key</span>.
              </p>
              <p>
                3. Confirm <span className="text-neutral-200">Create key</span>.
              </p>
              <p>
                4. When it loads, copy the value under{' '}
                <span className="text-neutral-200">API key</span> (use the copy
                button{' '}
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="inline-block align-[-1px]"
                  aria-hidden
                >
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                </svg>
                ).
              </p>
              <p>5. Paste it in the field above. That is it.</p>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-neutral-600">
              Free, no credit card. Your key stays in your browser
              (localStorage) and is sent only to Google, never to us. There is
              no backend.
            </p>
            <p className="mt-1.5 text-[11px] leading-snug text-neutral-600">
              A free key easily covers a full session. The daily free-tier
              limit resets midnight Pacific and is high enough that you are
              unlikely to reach it in normal play. If a machine ever runs dry,
              it drops to its scripted imitation and the run plays on.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
