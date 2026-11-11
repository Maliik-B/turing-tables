# Turing Tables

A small web deckbuilder where your opponent is a machine, and the question is whether you can tell when it is *really* thinking.

Built for the [dev.to June Solstice Game Jam](https://dev.to/challenges/june-game-jam-2026-06-03) as an ode to Alan Turing (his June birthday and the imitation game inspired it). The Machine's moves are decided by a real LLM (Google Gemini) most of the time and by a scripted "imitation" the rest, and you score by *catching the imitation*.

## Play

Play in the browser: **[maliik-b.github.io/turing-tables](https://maliik-b.github.io/turing-tables/)**

Or run locally:

```bash
npm install
npm run dev
```

Open the printed localhost URL. The game is fully playable with **no API key**: the Machine runs its scripted brain. To face the real Gemini opponent, paste a free [Google AI Studio](https://aistudio.google.com/) API key into the in-game field; it is stored only in your browser's `localStorage` and used solely to decide the opponent's moves.

## Mechanics

- **Deckbuilder combat:** energy, attacks, block, and status effects (Vulnerable / Weak).
- **The model ladder:** four trials of rising machine intelligence. ELIZA-0 is a scripted automaton, then DAEMON-1 runs `gemini-2.5-flash-lite`, ORACLE-2 runs `gemini-3.6-flash` with minimal thinking and THE MAINFRAME runs `gemini-3.6-flash` with thinking on. With a key present, each machine's intent is mixed ~70/30 with a scripted brain so the source is unpredictable. The stronger the model, the more often it bluffs, and the Mainframe remembers how you played the earlier trials. Any failure falls back to scripted, so it is always free and offline-playable.
- **Keeping the machines thinking on a free key:** Google's free tier allows about 20 calls a day on most Flash models and 5 a minute, and a full run makes about 18. So each machine has a chain of models with their own quotas (`gemini-3.8-flash`, then `gemini-3.1-flash-lite` at 500 a day), the game tracks when each model can take calls again from Google's own retry times, and it paces calls to stay inside the per-minute limits, holding a round in "thinking" for a few seconds when needed. The hold comes before the live-or-scripted coin flip, so it gives nothing away. A machine drops to its scripted brain only when every model in its chain is spent.
- **The guess-check:** accuse a telegraphed move of being a scripted imitation. Right: +1 energy. Wrong: −4 HP. A randomized "thinking" delay keeps the scripted turns from leaking by timing.
- **Sever:** an Exhaust card that cuts the Machine's link, forcing the scripted brain for a couple of turns.

## Tech

React + TypeScript + Vite + Tailwind v4 + Motion. Fully static (no backend); the Gemini call is a client-side `fetch` with a player-supplied key.

## License

MIT. See [LICENSE](./LICENSE).
