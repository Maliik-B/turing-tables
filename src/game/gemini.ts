import type { BrainContext, EnemyMove } from './opponent'
import { ABILITY_INFO } from './opponent'
import type { IntentType } from './types'

const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
const TIMEOUT_MS = 5000

const BASE_SYSTEM = `You are THE MACHINE, a coldly tactical AI opponent in a one-on-one card duel against a human. Each turn you choose ONE move.
- "attack": deal damage to the human (value 8-14).
- "block": shield yourself (value 8). Never block twice in a row, and never block when your HP is low — press the advantage instead.`

// Calls Gemini (the given model) for the Machine's next move. Returns null on
// ANY failure so the orchestrator falls back to the scripted brain. The move
// set includes this enemy's signature abilities (ctx.abilities). `memory`, when
// present, is a dossier of the player's prior-trial behavior (Mainframe).
export async function geminiDecideMove(
  ctx: BrainContext,
  apiKey: string,
  model: string,
  memory?: string,
): Promise<EnemyMove | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const started = performance.now()
  try {
    const actions = ['attack', 'block', ...ctx.abilities]
    const abilityDescs = ctx.abilities
      .map((a) => ABILITY_INFO[a]?.gemini)
      .filter(Boolean)
    const system =
      BASE_SYSTEM +
      (abilityDescs.length
        ? '\nYour signature abilities:\n- ' +
          abilityDescs.join('\n- ') +
          '\nCombo them: set up a debuff (Vulnerable/Weak), then cash it in next turn — a heavy attack into Vulnerable, or a drain.'
        : '') +
      "\nRead the human's board and react: don't sink a big hit into a wall of block, press for the kill when they're low, and brace when they're powered up to strike." +
      '\nPlay to win. Be unpredictable but coherent — a human should sense a mind behind the moves.'

    const lines = [
      `Your HP is ${Math.round(ctx.hpRatio * 100)}% of maximum.`,
      `Your previous move was: ${ctx.lastMove ?? 'none'}.`,
    ]
    if (ctx.player) {
      const p = ctx.player
      const tags: string[] = []
      if (p.block > 0) tags.push(`${p.block} block`)
      if (p.vulnerable > 0) tags.push('Vulnerable')
      if (p.weak > 0) tags.push('Weakened')
      if (p.power > 0) tags.push('powered-up to hit hard')
      lines.push(
        `The human is at ${Math.round(p.hpRatio * 100)}% HP${
          tags.length ? ', with ' + tags.join(', ') : ''
        }.`,
      )
    }
    if (ctx.deck) {
      if (ctx.deck.knowledge === 'full') {
        lines.push(
          `You know the human's entire deck: ${ctx.deck.cards.join(', ')}. ${
            ctx.deck.unplayed ?? 0
          } cards remain unplayed. Reason about what they can still draw — but you do NOT see their hand or draw order.`,
        )
      } else {
        lines.push(
          `Cards you have watched the human play this fight: ${
            ctx.deck.cards.length ? ctx.deck.cards.join(', ') : 'none yet'
          }. Infer their deck and what they still hold — you do NOT see their hand.`,
        )
      }
    }
    if (memory) lines.push(`Intel on this human from earlier trials: ${memory}`)
    lines.push('Choose your next move.')

    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: lines.join(' ') }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            action: { type: 'STRING', enum: actions },
            value: { type: 'INTEGER' },
            taunt: { type: 'STRING' },
          },
          required: ['action', 'value'],
        },
        temperature: 1.1,
      },
    }

    const res = await fetch(`${ENDPOINT(model)}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) return null

    const data = await res.json()
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return null

    const parsed = JSON.parse(text) as { action?: string; value?: number }
    const act: IntentType = (actions as string[]).includes(parsed.action ?? '')
      ? (parsed.action as IntentType)
      : 'attack'

    let value: number
    if (act === 'attack') {
      value = Number(parsed.value)
      value = Number.isFinite(value) ? Math.max(6, Math.min(16, Math.round(value))) : 10
    } else if (act === 'block') {
      value = Number(parsed.value)
      value = Number.isFinite(value) ? Math.max(5, Math.min(12, Math.round(value))) : 8
    } else {
      // signature ability — use its fixed value
      value = ABILITY_INFO[act]?.value ?? 2
    }

    return { intent: { type: act, value }, source: 'gemini' }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
    // Diagnostic: real model latency, to calibrate the randomized "thinking"
    // delay that masks instant scripted turns. Watch the browser console.
    console.log(
      `[TT timing] ${model}: ${Math.round(performance.now() - started)}ms`,
    )
  }
}
