export function MenuScreen({
  apiKey,
  onApiKey,
  onBegin,
}: {
  apiKey: string
  onApiKey: (key: string) => void
  onBegin: () => void
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.35em] text-amber-200/50">
        June Solstice · The Imitation Game
      </p>
      <h1 className="text-6xl font-bold tracking-tight text-neutral-50 sm:text-7xl">
        Turing Tables
      </h1>
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
        <p className="mt-1.5 text-left text-[11px] leading-snug text-neutral-600">
          Without a key the machines run a scripted brain. With one, ~70% of
          their moves are real Gemini — and you can hunt the fakes.
        </p>
      </div>
    </div>
  )
}
