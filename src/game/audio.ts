// Procedural audio: a warming solstice drone + synthesized SFX. Zero asset
// files (the same ethos as the all-CSS/SVG visuals) — every sound is generated
// at play time from oscillators and filtered noise. A single AudioContext, a
// master gain for the mute toggle, and one continuous ambient pad whose pitch
// and brightness rise with the run (the audio twin of the dawn-as-an-arc
// backdrop). The context is created lazily inside a user gesture so browser
// autoplay policy never blocks it.

type SfxName =
  | 'card'
  | 'attack'
  | 'block'
  | 'scan'
  | 'correct'
  | 'wrong'
  | 'reward'
  | 'win'
  | 'lose'

const MUTE_KEY = 'tt_muted'
const MASTER = 0.5

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = readMuted()

// Live ambient-drone nodes, kept so warmth changes + mute reach them.
let amb: {
  gain: GainNode
  filter: BiquadFilterNode
  oscs: OscillatorNode[]
  lfo: OscillatorNode
} | null = null

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AC) return null
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = muted ? 0 : MASTER
      master.connect(ctx.destination)
    } catch {
      return null
    }
  }
  return ctx
}

// Call from the first user gesture (the Begin button) so the context starts in
// a running state.
export function unlock(): void {
  const c = ensureCtx()
  if (c && c.state === 'suspended') void c.resume()
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(m: boolean): void {
  muted = m
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0')
  } catch {
    // ignore storage failures
  }
  const c = ensureCtx()
  if (master && c) master.gain.setTargetAtTime(m ? 0 : MASTER, c.currentTime, 0.04)
}

// ---- one-shot synthesis helpers ----

function tone(opts: {
  freq: number
  glideTo?: number
  type?: OscillatorType
  peak?: number
  attack?: number
  dur?: number
  release?: number
  delay?: number
}): void {
  const c = ctx
  if (!c || !master) return
  const {
    freq,
    glideTo,
    type = 'sine',
    peak = 0.2,
    attack = 0.005,
    dur = 0.08,
    release = 0.08,
    delay = 0,
  } = opts
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + attack + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + dur + release)
  osc.connect(g).connect(master)
  osc.start(t0)
  osc.stop(t0 + attack + dur + release + 0.02)
}

function noise(opts: {
  dur?: number
  peak?: number
  type?: BiquadFilterType
  freq?: number
  freqTo?: number
  q?: number
  delay?: number
}): void {
  const c = ctx
  if (!c || !master) return
  const {
    dur = 0.15,
    peak = 0.15,
    type = 'lowpass',
    freq = 1000,
    freqTo,
    q = 1,
    delay = 0,
  } = opts
  const t0 = c.currentTime + delay
  const frames = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, frames, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const filt = c.createBiquadFilter()
  filt.type = type
  filt.frequency.setValueAtTime(freq, t0)
  if (freqTo) filt.frequency.exponentialRampToValueAtTime(freqTo, t0 + dur)
  filt.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filt).connect(g).connect(master)
  src.start(t0)
  src.stop(t0 + dur + 0.02)
}

export function play(name: SfxName): void {
  const c = ensureCtx()
  if (!c || muted) return
  if (c.state === 'suspended') void c.resume()
  switch (name) {
    case 'card':
      // a soft tick when a card resolves
      tone({ freq: 430, glideTo: 320, type: 'triangle', peak: 0.1, dur: 0.05, release: 0.05 })
      break
    case 'attack':
      // a low impact thud + a short transient burst
      tone({ freq: 200, glideTo: 68, type: 'sine', peak: 0.3, dur: 0.1, release: 0.12 })
      noise({ dur: 0.11, peak: 0.16, freq: 1300, freqTo: 280 })
      break
    case 'block':
      // a metallic guard shimmer
      noise({ dur: 0.22, peak: 0.09, type: 'bandpass', freq: 720, freqTo: 1500, q: 1.5 })
      tone({ freq: 540, type: 'triangle', peak: 0.06, dur: 0.13, release: 0.1 })
      break
    case 'scan':
      // the interrogator's probe: two quick rising blips
      tone({ freq: 660, type: 'square', peak: 0.07, dur: 0.05, release: 0.03 })
      tone({ freq: 990, type: 'square', peak: 0.07, dur: 0.06, release: 0.05, delay: 0.09 })
      break
    case 'correct': {
      // a rising major arpeggio — the read paid off
      ;[523, 659, 784, 1047].forEach((f, i) =>
        tone({ freq: f, type: 'triangle', peak: 0.15, dur: 0.07, release: 0.12, delay: i * 0.07 }),
      )
      break
    }
    case 'wrong':
      // a dissonant, beating descent — the machine was thinking
      tone({ freq: 150, glideTo: 90, type: 'sawtooth', peak: 0.11, dur: 0.3, release: 0.22 })
      tone({ freq: 159, glideTo: 96, type: 'sawtooth', peak: 0.09, dur: 0.3, release: 0.22 })
      break
    case 'reward':
      // a gentle two-note chime when a trial clears
      tone({ freq: 587, type: 'triangle', peak: 0.12, dur: 0.1, release: 0.14 })
      tone({ freq: 880, type: 'triangle', peak: 0.1, dur: 0.12, release: 0.18, delay: 0.08 })
      break
    case 'win': {
      // the sunrise swell: a major chord with a slow attack and long tail
      ;[262, 330, 392, 523, 659].forEach((f, i) =>
        tone({ freq: f, type: 'triangle', peak: 0.12, attack: 0.5, dur: 0.7, release: 1.7, delay: i * 0.12 }),
      )
      break
    }
    case 'lose':
      // a low minor descent fading into the dark
      tone({ freq: 220, glideTo: 110, type: 'sine', peak: 0.2, attack: 0.02, dur: 0.9, release: 0.9 })
      tone({ freq: 262, glideTo: 131, type: 'sine', peak: 0.12, attack: 0.02, dur: 0.9, release: 0.9, delay: 0.06 })
      break
  }
}

// ---- ambient drone (warms + rises across the run) ----

export function startAmbient(warmth = 0.3): void {
  const c = ensureCtx()
  if (!c || !master || amb) return
  if (c.state === 'suspended') void c.resume()
  const gain = c.createGain()
  gain.gain.value = 0.0001
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 300
  filter.Q.value = 0.6
  // root + fifth + octave, lightly detuned for a warm pad
  const oscs = [55, 82.5, 110].map((f, i) => {
    const o = c.createOscillator()
    o.type = i === 0 ? 'sine' : 'triangle'
    o.frequency.value = f
    o.detune.value = (i - 1) * 4
    o.connect(filter)
    o.start()
    return o
  })
  filter.connect(gain).connect(master)
  // a slow LFO breathes the cutoff so the pad isn't static
  const lfo = c.createOscillator()
  const lfoGain = c.createGain()
  lfo.frequency.value = 0.06
  lfoGain.gain.value = 80
  lfo.connect(lfoGain).connect(filter.frequency)
  lfo.start()
  gain.gain.setTargetAtTime(0.05, c.currentTime, 1.2)
  amb = { gain, filter, oscs, lfo }
  setAmbientWarmth(warmth)
}

export function setAmbientWarmth(warmth: number): void {
  const c = ctx
  if (!c || !amb) return
  const w = Math.max(0, Math.min(1, warmth))
  // open the filter and lift the pitch as dawn approaches
  amb.filter.frequency.setTargetAtTime(240 + w * 900, c.currentTime, 1.5)
  amb.oscs.forEach((o, i) =>
    o.detune.setTargetAtTime((i - 1) * 4 + w * 120, c.currentTime, 1.5),
  )
  amb.gain.gain.setTargetAtTime(0.04 + w * 0.04, c.currentTime, 1.5)
}

export function stopAmbient(): void {
  const c = ctx
  if (!c || !amb) return
  const a = amb
  amb = null
  a.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.4)
  const stopAt = c.currentTime + 1
  a.oscs.forEach((o) => o.stop(stopAt))
  a.lfo.stop(stopAt)
}

// ---- menu theme (generative: the drone + a slow, sparse melodic motif) ----
// Even the title music is generated in the moment, no loop file. A self-pacing
// scatter of soft notes from an A-minor-pentatonic set over the ambient pad.

let menuTimer: ReturnType<typeof setTimeout> | null = null
const MENU_NOTES = [220, 261.63, 293.66, 329.63, 392, 440]

export function startMenuTheme(warmth = 0.3): void {
  const c = ensureCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  startAmbient(warmth)
  if (menuTimer) return
  const tick = () => {
    if (!muted) {
      // a rest now and then keeps it from feeling like a sequence
      if (Math.random() > 0.22) {
        const f = MENU_NOTES[Math.floor(Math.random() * MENU_NOTES.length)]
        tone({ freq: f, type: 'triangle', peak: 0.05, attack: 0.05, dur: 0.5, release: 1.3 })
        if (Math.random() > 0.7)
          tone({ freq: f * 1.5, type: 'sine', peak: 0.03, attack: 0.06, dur: 0.6, release: 1.5, delay: 0.14 })
      }
    }
    menuTimer = setTimeout(tick, 1700 + Math.random() * 1900)
  }
  tick()
}

export function stopMenuTheme(): void {
  if (menuTimer) {
    clearTimeout(menuTimer)
    menuTimer = null
  }
}
