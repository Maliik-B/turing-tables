import type { BrainContext, EnemyMove } from './opponent'

// Confirmed free-tier model (Google AI Studio). Swap to gemini-2.5-pro for a
// sharper opponent (also free, lower RPM) or a newer flash when available.
const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
const TIMEOUT_MS = 8000

const SYSTEM = `You are THE MACHINE, a coldly tactical AI opponent in a one-on-one card duel against a human. Each turn you choose ONE move.
- "attack": deal damage to the human (value 8-14).
- "block": shield yourself (value 8). Never block twice in a row, and never block when your HP is low — press the advantage instead.
Play to win. Be unpredictable but coherent — a human should sense a mind behind the moves.`

// Calls Gemini for the Machine's next move. Returns null on ANY failure
// (no key, network, timeout, bad JSON) so the orchestrator falls back to
// the scripted brain. The game must never freeze on this call.
export async function geminiDecideMove(
  ctx: BrainContext,
  apiKey: string,
): Promise<EnemyMove | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const userState = `Your HP is ${Math.round(
      ctx.hpRatio * 100,
    )}% of maximum. Your previous move was: ${ctx.lastMove ?? 'none'}. Choose your next move.`

    const body = {
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: userState }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            action: { type: 'STRING', enum: ['attack', 'block'] },
            value: { type: 'INTEGER' },
            taunt: { type: 'STRING' },
          },
          required: ['action', 'value'],
        },
        temperature: 1.1,
      },
    }

    const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
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
    const action: 'attack' | 'block' =
      parsed.action === 'block' ? 'block' : 'attack'
    let value = Number(parsed.value)
    if (!Number.isFinite(value)) value = action === 'block' ? 8 : 10
    value =
      action === 'block'
        ? Math.max(5, Math.min(12, Math.round(value)))
        : Math.max(6, Math.min(16, Math.round(value)))

    return { intent: { type: action, value }, source: 'gemini' }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
