import type { BrainContext, EnemyMove } from './opponent'
import { ABILITY_INFO } from './opponent'
import type { IntentType } from './types'

const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
// One way of asking Gemini for a move: the model, how hard it may think, and
// the pacing that goes with it. The timeout and the "thinking" mask are sized
// to latencies measured with the game's real prompts (Nov 2026), so scripted
// turns at each tier match that tier's real cadence and the imitation game
// stays timing-blind. `rpm` is the model's free-tier requests per minute, as
// AI Studio lists it; the spacer below never asks faster than that.
export interface BrainSpec {
  model: string
  thinking?: 'minimal' | 'low'
  label: string
  timeoutMs: number
  thinkMin: number
  thinkMax: number
  rpm: number
}

const FLASH_LITE_25: BrainSpec = {
  model: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite',
  timeoutMs: 4000, thinkMin: 700, thinkMax: 1700, rpm: 10,
}
// ORACLE-2 thinks as little as its model allows, for a quick beat. 3.6 Flash
// accepts 'minimal'; 3.8 Flash rejects it with a 400, so its least is 'low'.
const quickFlash = (model: string, label: string, thinking: 'minimal' | 'low'): BrainSpec =>
  ({ model, label, thinking, timeoutMs: 7000, thinkMin: 1500, thinkMax: 3200, rpm: 5 })
// The boss thinks for real: a longer, dramatic beat that mostly covers its
// latency on the heavy prompt (full deck + dossier).
const bossFlash = (model: string, label: string): BrainSpec =>
  ({ model, label: `${label} (thinking)`, thinking: 'low', timeoutMs: 10000, thinkMin: 3000, thinkMax: 6000, rpm: 5 })
// The backstop. Its free tier allows 500 requests a day where the Flash models
// allow 20, so a machine whose own model is spent still thinks for real.
// Google retires it on May 7 2027; gemini-3.5-flash-lite is the named successor.
const FLASH_LITE_31: BrainSpec = {
  model: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite',
  timeoutMs: 8000, thinkMin: 1500, thinkMax: 3200, rpm: 15,
}

// Each Gemini machine's models, in order of preference. Free-tier quotas are
// per model, so a fallback with its own quota keeps a machine thinking after
// its first choice is spent for the minute or the day; only when the whole
// chain is out does it drop to the scripted brain.
export const BRAINS: Record<string, BrainSpec[]> = {
  daemon: [FLASH_LITE_25, FLASH_LITE_31],
  oracle: [
    quickFlash('gemini-3.6-flash', 'Gemini 3.6 Flash', 'minimal'),
    quickFlash('gemini-3.8-flash', 'Gemini 3.8 Flash', 'low'),
    FLASH_LITE_31,
  ],
  mainframe: [
    bossFlash('gemini-3.6-flash', 'Gemini 3.6 Flash'),
    bossFlash('gemini-3.8-flash', 'Gemini 3.8 Flash'),
    FLASH_LITE_31,
  ],
}

// --- Readiness: knowing when a model can take calls again -------------------
//
// Google tells us how long to stay away. A per-minute 429 carries a retryDelay
// of seconds, a per-day 429 one that runs to midnight Pacific, and an
// overloaded model answers 503. We keep that per model, persisted so a reload
// still knows a model is spent for the day, and the spacer adds our own count
// of recent calls so we never trip the per-minute limit in the first place.

type Why = 'minute' | 'day' | 'busy' | 'unavailable'
type Cooldown = { until: number; why: Why }
const COOL_STORAGE = 'tt_gemini_cooldowns'
let cooldowns: Record<string, Cooldown> = loadCooldowns()
const recentCalls: Record<string, number[]> = {}

function loadCooldowns(): Record<string, Cooldown> {
  try {
    return JSON.parse(localStorage.getItem(COOL_STORAGE) || '{}') || {}
  } catch {
    return {}
  }
}
function saveCooldowns() {
  try {
    localStorage.setItem(COOL_STORAGE, JSON.stringify(cooldowns))
  } catch {
    // storage can be blocked; readiness then lasts for this page only
  }
}
function coolDown(model: string, ms: number, why: Why) {
  cooldowns = { ...cooldowns, [model]: { until: Date.now() + ms, why } }
  saveCooldowns()
}
function markReady(model: string) {
  if (!cooldowns[model]) return
  const rest = { ...cooldowns }
  delete rest[model]
  cooldowns = rest
  saveCooldowns()
}
// A new key has its own quotas, so whatever the old one was owed no longer applies.
export function resetReadiness() {
  cooldowns = {}
  for (const m of Object.keys(recentCalls)) delete recentCalls[m]
  saveCooldowns()
}

// The earliest moment this spec may be called: after any cooldown Google gave
// us, and after the oldest of the last `rpm` calls has left the one-minute window.
export function readyAt(spec: BrainSpec, now = Date.now()): number {
  const cd = cooldowns[spec.model]
  let t = cd && cd.until > now ? cd.until : now
  const calls = (recentCalls[spec.model] ?? []).filter((c) => c > now - 60_000)
  recentCalls[spec.model] = calls
  if (calls.length >= spec.rpm) t = Math.max(t, calls[calls.length - spec.rpm] + 60_250)
  return t
}

// The spec to use this round, and how long to hold the round so it can be
// called without breaking a limit. A model that won't be ready within
// `maxWaitMs` is skipped for the next in its chain. null means the whole chain
// is out, so the round is scripted.
export function pickBrain(
  chain: BrainSpec[],
  now = Date.now(),
  maxWaitMs = 12_000,
): { spec: BrainSpec; waitMs: number } | null {
  for (const spec of chain) {
    const wait = readyAt(spec, now) - now
    if (wait <= maxWaitMs) return { spec, waitMs: wait }
  }
  return null
}

// For the UI: what this machine will think with right now, whether that is a
// fallback, and if nothing is ready, when the first model comes back and why.
export function brainStatus(chain: BrainSpec[], now = Date.now()) {
  const pick = pickBrain(chain, now)
  if (pick) return { spec: pick.spec, fallback: pick.spec !== chain[0], backAt: null, why: null }
  const soonest = Math.min(...chain.map((s) => readyAt(s, now)))
  const spent = chain.every((s) => cooldowns[s.model]?.why === 'day')
  return { spec: null, fallback: false, backAt: soonest, why: spent ? ('day' as const) : ('busy' as const) }
}

// The models whose free calls for today are spent, by name, for the menu.
export function spentToday(now = Date.now()): string[] {
  const labels = new Map(
    Object.values(BRAINS).flat().map((s) => [s.model, s.label.replace(' (thinking)', '')]),
  )
  return Object.entries(cooldowns)
    .filter(([, c]) => c.why === 'day' && c.until > now)
    .map(([m]) => labels.get(m) ?? m)
}

// How a Gemini call went. 'busy' covers a per-minute limit, an overloaded model
// and a timeout, all of which clear on their own; 'rate_limit' means today's
// free calls on that model are spent; 'unavailable' means this key can't use
// that model at all.
export type GeminiStatus = 'ok' | 'rate_limit' | 'busy' | 'unavailable' | 'bad_key' | 'error'

// Reads Google's error body: which quota a 429 hit and how long it asks us to
// wait, and whether a 400/403 is about the key itself or about the model.
async function classifyFailure(res: Response, model: string): Promise<GeminiStatus> {
  let msg = ''
  let retryMs = 0
  let perDay = false
  try {
    const j = await res.json()
    msg = String(j?.error?.message ?? '')
    for (const d of j?.error?.details ?? []) {
      const type = String(d?.['@type'] ?? '')
      if (type.includes('RetryInfo')) retryMs = (parseFloat(d.retryDelay) || 0) * 1000
      if (type.includes('QuotaFailure'))
        perDay ||= (d.violations ?? []).some((v: { quotaId?: string }) => /PerDay/i.test(v?.quotaId ?? ''))
    }
  } catch {
    // an unreadable body still classifies by status code below
  }
  if (res.status === 429) {
    if (perDay) {
      coolDown(model, retryMs || 6 * 3_600_000, 'day')
      return 'rate_limit'
    }
    coolDown(model, Math.max(retryMs, 10_000), 'minute')
    return 'busy'
  }
  if (res.status >= 500) {
    coolDown(model, 15_000, 'busy')
    return 'busy'
  }
  if (res.status === 401 || /api key/i.test(msg)) return 'bad_key'
  // 403/404: this key can't reach this model (a retired or restricted model).
  // Any other 400 is a request this model rejects. Either way, stop asking it
  // for a while and let the chain move on.
  coolDown(model, res.status === 400 ? 10 * 60_000 : 6 * 3_600_000, 'unavailable')
  return res.status === 400 ? 'error' : 'unavailable'
}

const BASE_SYSTEM = `You are THE MACHINE, a coldly tactical AI opponent in a one-on-one card duel against a human. Each turn you choose ONE move.
- "attack": deal damage to the human (value 9-13).
- "block": shield yourself (value 8). Never block twice in a row, and never block when your HP is low; press the advantage instead.`

// Calls Gemini (the given spec) for the Machine's next move. Returns the move
// plus a status the UI can surface, and records the outcome in the readiness
// table so the next round knows whether this model can take calls. On any
// failure move is null and the orchestrator tries the chain's next model or
// falls back to the scripted brain. The move set includes this enemy's
// signature abilities (ctx.abilities); `memory`, when present, is a dossier of
// the player's prior-trial behavior (Mainframe).
export async function geminiDecideMove(
  ctx: BrainContext,
  apiKey: string,
  spec: BrainSpec,
  memory?: string,
  timeoutMs = spec.timeoutMs,
): Promise<{ move: EnemyMove | null; status: GeminiStatus }> {
  const model = spec.model
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  ;(recentCalls[model] ??= []).push(Date.now())
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
          '\nCombo them: set up a debuff (Vulnerable/Weak), then cash it in next turn: a heavy attack into Vulnerable, or a drain.'
        : '') +
      "\nRead the human's board and react: don't sink a big hit into a wall of block, press for the kill when they're low, and brace when they're powered up to strike." +
      '\nPlay to win. Be unpredictable but coherent; a human should sense a mind behind the moves.'

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
          } cards remain unplayed. Reason about what they can still draw, but you do NOT see their hand or draw order.`,
        )
      } else {
        lines.push(
          `Cards you have watched the human play this fight: ${
            ctx.deck.cards.length ? ctx.deck.cards.join(', ') : 'none yet'
          }. Infer their deck and what they still hold; you do NOT see their hand.`,
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
        // Only the 2.5 models still honor temperature. From Gemini 3.6 Flash and
        // 3.5 Flash-Lite on, Google ignores the sampling parameters and plans to
        // reject them with a 400, so those tiers get their variety from the
        // prompt and the 70/30 scripted mix instead. The 2.5 models also reject
        // thinkingLevel, which the 3.x models use to trade depth for speed.
        ...(model.startsWith('gemini-2.5') ? { temperature: 1.1 } : {}),
        ...(spec.thinking ? { thinkingConfig: { thinkingLevel: spec.thinking } } : {}),
      },
    }

    const res = await fetch(`${ENDPOINT(model)}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) return { move: null, status: await classifyFailure(res, model) }
    markReady(model)

    const data = await res.json()
    // A thinking model may lead with thought parts; the move is the text part.
    const parts: { text?: string; thought?: boolean }[] =
      data?.candidates?.[0]?.content?.parts ?? []
    const text = parts.find((p) => !p.thought && p.text)?.text
    if (!text) return { move: null, status: 'error' }

    const parsed = JSON.parse(text) as {
      action?: string
      value?: number
      taunt?: string
    }
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
      // signature ability: use its fixed value
      value = ABILITY_INFO[act]?.value ?? 2
    }

    const taunt =
      typeof parsed.taunt === 'string' && parsed.taunt.trim()
        ? parsed.taunt.trim()
        : undefined
    return {
      move: { intent: { type: act, value }, source: 'gemini', taunt },
      status: 'ok',
    }
  } catch {
    // A timeout or network failure: the model is slow or unreachable right
    // now, so give it a short rest before the next round asks again.
    if (controller.signal.aborted) {
      coolDown(model, 15_000, 'busy')
      return { move: null, status: 'busy' }
    }
    return { move: null, status: 'error' }
  } finally {
    clearTimeout(timer)
  }
}
