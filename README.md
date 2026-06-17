# Turing Tables

A small web deckbuilder where your opponent is a machine — and the question is whether you can tell when it is *really* thinking.

Built for the [dev.to June Solstice Game Jam](https://dev.to/challenges/june-game-jam-2026-06-03) as an ode to Alan Turing (his June birthday and the imitation game inspired it). The Machine's moves are decided by a real LLM (Google Gemini) most of the time and by a scripted "imitation" the rest — and you score by *catching the imitation*.

## Play

Run locally:

```bash
npm install
npm run dev
```

Open the printed localhost URL. The game is fully playable with **no API key** — the Machine runs its scripted brain. To face the real Gemini opponent, paste a free [Google AI Studio](https://aistudio.google.com/) API key into the in-game field; it is stored only in your browser's `localStorage` and used solely to decide the opponent's moves.

## Mechanics

- **Deckbuilder combat** — energy, attacks, block, and status effects (Vulnerable / Weak).
- **Gemini opponent** — the Machine's intent is chosen by `gemini-2.5-flash` when a key is present, mixed ~70/30 with a scripted brain so the source is unpredictable; any failure falls back to scripted, so it is always free and offline-playable.
- **The guess-check** — accuse a telegraphed move of being a scripted imitation. Right: +1 energy. Wrong: −4 HP. A randomized "thinking" delay keeps the scripted turns from leaking by timing.
- **Sever** — an Exhaust card that cuts the Machine's link, forcing the scripted brain for a couple of turns.

## Tech

React + TypeScript + Vite + Tailwind v4 + Motion. Fully static (no backend); the Gemini call is a client-side `fetch` with a player-supplied key.

## License

MIT — see [LICENSE](./LICENSE).
