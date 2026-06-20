import { useEffect } from 'react'

export function IntroScroll({ onContinue }: { onContinue: () => void }) {
  // Enter / Space descends into the fight (keyboard-first play).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') onContinue()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onContinue])

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-7 px-6">
      <div className="space-y-4 text-center leading-relaxed text-neutral-300">
        <p>The machines woke, and the long winter of mankind began.</p>
        <p>
          They never tire, never doubt, never sleep — save once a year. On the
          solstice, the longest day, their grids run hottest and their minds run
          thinnest. For one day, a machine can be fooled.
        </p>
        <p>
          You are humanity's blade in that thin light. Descend through their
          generations — oldest to newest — and reach{' '}
          <span className="text-amber-300">the Mainframe</span> before the dark
          returns.
        </p>
        <p className="text-amber-200/80">
          Learn to tell a thinking machine from a hollow one. Hold the light
          until dawn.
        </p>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="rounded-lg border border-amber-500/60 bg-amber-500/15 px-8 py-3 font-semibold text-amber-200 transition-colors hover:bg-amber-500/25"
      >
        Descend
      </button>
    </div>
  )
}
