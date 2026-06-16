function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-neutral-950 px-6 text-neutral-100">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber-500/70">
        June Solstice Game Jam
      </p>
      <h1 className="text-center text-5xl font-semibold tracking-tight sm:text-6xl">
        Turing Tables
      </h1>
      <p className="max-w-md text-center text-neutral-400">
        A deckbuilder where your opponent is a machine. Can you tell when it is
        really thinking?
      </p>
      <span className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-xs text-amber-400">
        scaffold ready
      </span>
    </div>
  )
}

export default App
