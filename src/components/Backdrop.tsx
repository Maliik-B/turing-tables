import { useMemo } from 'react'
import { MachineColossus } from './MachineColossus'

// Atmospheric backdrop: a lone vigil looking out over a vast living machine-city
// on the horizon, in fog, under a sky whose stars fade as dawn approaches. All
// CSS/SVG, fixed behind the UI. `warmth` runs 0 (deep night) -> 1 (full dawn).

// Deterministic star field — seeded so positions never jump between renders.
const STARS = (() => {
  let s = 1337
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  return Array.from({ length: 56 }, () => ({
    x: +(rnd() * 1000).toFixed(1),
    y: +(rnd() * 540).toFixed(1),
    r: +(0.5 + rnd() * 1.4).toFixed(2),
    o: +(0.2 + rnd() * 0.55).toFixed(2),
    tw: rnd() > 0.84,
  }))
})()

// A living machine-city skyline: distinct archetypes (data towers, satellite
// dishes, reactor cooling-towers, lattice pylons, antenna masts, spires, a few
// broken hulks) over a faint receding grid, with lit windows + blinking
// beacons. Generated once, seeded so it never jumps between renders.
type Fill = { d: string; t?: string }
type Stroke = { d: string; o: number }
type Light = { x: number; y: number; c: string; r: number }
type Pt = { x: number; y: number }
const HORIZON = (() => {
  let s = 4242
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296)
  const BASE = 320
  const fills: Fill[] = []
  const strokes: Stroke[] = []
  const lights: Light[] = []
  const beacons: Pt[] = []

  const windows = (x: number, w: number, topY: number) => {
    const cols = Math.max(1, Math.floor(w / 10))
    const gap = w / (cols + 1)
    for (let ry = topY + 10; ry < BASE - 8; ry += 11) {
      for (let c = 1; c <= cols; c++) {
        if (rnd() > 0.5) continue
        lights.push({
          x: +(x + c * gap).toFixed(1),
          y: +ry.toFixed(1),
          c: rnd() > 0.84 ? 'rgba(251,191,36,0.55)' : 'rgba(120,190,210,0.5)',
          r: 0.9,
        })
      }
    }
  }

  const build: Record<string, (x: number, w: number) => void> = {
    tower(x, w) {
      const topY = 106 + rnd() * 84
      fills.push({ d: `M ${x} ${BASE} L ${x} ${topY} L ${x + w} ${topY} L ${x + w} ${BASE} Z` })
      for (let ry = topY + 8; ry < BASE; ry += 14)
        strokes.push({ d: `M ${x} ${ry} L ${x + w} ${ry}`, o: 0.08 })
      windows(x, w, topY)
      if (rnd() > 0.5) {
        const cx = +(x + w * (0.3 + rnd() * 0.4)).toFixed(1)
        const my = +(topY - 16 - rnd() * 14).toFixed(1)
        strokes.push({ d: `M ${cx} ${topY} L ${cx} ${my}`, o: 0.25 })
        beacons.push({ x: cx, y: my })
      }
    },
    dish(x, w) {
      const cx = x + w / 2
      const stem = 205 + rnd() * 30
      fills.push({ d: `M ${cx - 2} ${BASE} L ${cx - 2} ${stem} L ${cx + 2} ${stem} L ${cx + 2} ${BASE} Z` })
      const r = 13 + rnd() * 9
      fills.push({
        d: `M ${cx - r} ${stem} A ${r} ${r} 0 0 1 ${cx + r} ${stem} Z`,
        t: `rotate(${(-20 - rnd() * 24).toFixed(0)} ${cx.toFixed(1)} ${stem})`,
      })
      lights.push({ x: +cx.toFixed(1), y: +(stem - 2).toFixed(1), c: 'rgba(120,190,210,0.5)', r: 1 })
    },
    cooling(x, w) {
      const topY = 178 + rnd() * 32
      const k = w * 0.16
      const mid = (BASE + topY) / 2
      fills.push({
        d: `M ${x} ${BASE} C ${x + k} ${mid}, ${x + w * 0.32} ${topY + 28}, ${x + w * 0.3} ${topY} L ${x + w * 0.7} ${topY} C ${x + w * 0.68} ${topY + 28}, ${x + w - k} ${mid}, ${x + w} ${BASE} Z`,
      })
      lights.push({ x: +(x + w / 2).toFixed(1), y: +(topY + 3).toFixed(1), c: 'rgba(251,146,60,0.5)', r: 2 })
    },
    lattice(x, w) {
      const topY = 120 + rnd() * 64
      const lx = x + w * 0.18, rx = x + w * 0.82, ltx = x + w * 0.36, rtx = x + w * 0.64
      strokes.push({ d: `M ${lx} ${BASE} L ${ltx} ${topY}`, o: 0.22 })
      strokes.push({ d: `M ${rx} ${BASE} L ${rtx} ${topY}`, o: 0.22 })
      const segs = 5
      for (let i = 1; i <= segs; i++) {
        const a = (i - 1) / segs, b = i / segs
        const yA = BASE + (topY - BASE) * a, yB = BASE + (topY - BASE) * b
        const xLa = lx + (ltx - lx) * a, xRa = rx + (rtx - rx) * a
        const xLb = lx + (ltx - lx) * b, xRb = rx + (rtx - rx) * b
        strokes.push({ d: `M ${xLa.toFixed(1)} ${yA.toFixed(1)} L ${xRa.toFixed(1)} ${yA.toFixed(1)}`, o: 0.12 })
        strokes.push({ d: `M ${xLa.toFixed(1)} ${yA.toFixed(1)} L ${xRb.toFixed(1)} ${yB.toFixed(1)}`, o: 0.09 })
        strokes.push({ d: `M ${xRa.toFixed(1)} ${yA.toFixed(1)} L ${xLb.toFixed(1)} ${yB.toFixed(1)}`, o: 0.09 })
      }
      beacons.push({ x: +((ltx + rtx) / 2).toFixed(1), y: +topY.toFixed(1) })
    },
    antenna(x, w) {
      const cx = +(x + w / 2).toFixed(1)
      const top = +(108 + rnd() * 58).toFixed(1)
      strokes.push({ d: `M ${cx} ${BASE} L ${cx} ${top}`, o: 0.3 })
      strokes.push({ d: `M ${cx} ${top + 12} L ${x + 2} ${BASE}`, o: 0.07 })
      strokes.push({ d: `M ${cx} ${top + 12} L ${x + w - 2} ${BASE}`, o: 0.07 })
      beacons.push({ x: cx, y: top })
    },
    spire(x, w) {
      const topY = 132 + rnd() * 56
      fills.push({ d: `M ${x + w * 0.32} ${BASE} L ${x + w * 0.46} ${topY} L ${x + w * 0.54} ${topY} L ${x + w * 0.68} ${BASE} Z` })
      beacons.push({ x: +(x + w / 2).toFixed(1), y: +topY.toFixed(1) })
    },
    broken(x, w) {
      const t = 224 + rnd() * 30
      fills.push({ d: `M ${x} ${BASE} L ${x} ${t + 6} L ${x + w * 0.25} ${t + 12} L ${x + w * 0.45} ${t - 4} L ${x + w * 0.6} ${t + 16} L ${x + w * 0.8} ${t + 2} L ${x + w} ${t + 10} L ${x + w} ${BASE} Z` })
    },
  }

  const order = ['tower', 'dish', 'tower', 'lattice', 'cooling', 'tower', 'antenna', 'broken', 'tower', 'spire', 'dish', 'tower', 'lattice', 'tower', 'cooling', 'antenna', 'tower', 'broken', 'tower']
  let x = -8
  let k = 0
  while (x < 1210) {
    const kind = order[k % order.length] || 'tower'
    k++
    const w =
      kind === 'antenna'
        ? 24 + rnd() * 16
        : kind === 'dish' || kind === 'spire'
          ? 38 + rnd() * 24
          : 50 + rnd() * 46
    build[kind]?.(x, w)
    x += w + 4 + rnd() * 16
  }

  // Far depth layer: small dim slabs receding into haze.
  const far: string[] = []
  let fx = 0
  while (fx < 1200) {
    const fw = 18 + rnd() * 40
    const ft = 236 + rnd() * 40
    far.push(`M ${fx.toFixed(0)} ${BASE} L ${fx.toFixed(0)} ${ft.toFixed(0)} L ${(fx + fw).toFixed(0)} ${ft.toFixed(0)} L ${(fx + fw).toFixed(0)} ${BASE} Z`)
    fx += fw + 6 + rnd() * 22
  }

  // Faint receding floor grid (verticals to a vanishing point + a few rows).
  const grid: string[] = []
  for (let i = 0; i <= 18; i++) {
    if (rnd() > 0.9) continue
    grid.push(`M ${((i / 18) * 1200).toFixed(0)} ${BASE} L 600 250`)
  }
  ;[320, 306, 295, 287, 281, 277].forEach((y) => {
    if (rnd() > 0.92) return
    grid.push(`M 0 ${y} L 1200 ${y}`)
  })

  // scattered fires — the city is burning as the machines tear through it
  const fires: Array<{ x: number; y: number; r: number }> = []
  for (let i = 0; i < 9; i++) {
    fires.push({ x: 50 + (i / 9) * 1110 + (rnd() - 0.5) * 70, y: 196 + rnd() * 70, r: 11 + rnd() * 15 })
  }

  return { fills, strokes, lights, beacons, far, grid, fires }
})()

export function Backdrop({
  warmth,
  lost,
  tier,
  distant = false,
}: {
  warmth: number
  lost: boolean
  // The current enemy's tier (0-3) when in a fight: looms as an Omnidroid.
  tier?: number | null
  // A faint, far tease (the menu) vs the full looming presence (in battle).
  distant?: boolean
}) {
  const starOpacity = lost ? 0.55 : Math.max(0, 0.95 - warmth * 0.82)
  const fogTint = lost ? 'rgba(148,163,184,0.05)' : `rgba(${Math.round(160 + warmth * 70)},${Math.round(150 + warmth * 40)},${Math.round(190 - warmth * 60)},0.055)`

  const stars = useMemo(
    () =>
      STARS.map((st, i) => (
        <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#e8edff" opacity={st.o}>
          {st.tw && (
            <animate
              attributeName="opacity"
              values={`${st.o};${st.o * 0.25};${st.o}`}
              dur={`${3 + (i % 5)}s`}
              repeatCount="indefinite"
            />
          )}
        </circle>
      )),
    [],
  )

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <style>{`
        @keyframes tt-fog-a { 0%{transform:translateX(-6%)} 100%{transform:translateX(6%)} }
        @keyframes tt-fog-b { 0%{transform:translateX(5%)} 100%{transform:translateX(-5%)} }
      `}</style>

      {/* The machine you're facing, looming on the horizon (escalating tier). */}
      {tier != null && <MachineColossus tier={tier} distant={distant} />}

      {/* Fading stars — high in the night sky, gone by dawn. */}
      <svg
        className="absolute inset-x-0 top-0 transition-opacity duration-1000"
        style={{ height: '64vh', opacity: starOpacity, zIndex: -19 }}
        width="100%"
        viewBox="0 0 1000 560"
        preserveAspectRatio="none"
      >
        {stars}
      </svg>

      {/* Living machine-city horizon — distinct machine archetypes over a faint
          receding grid, lit windows + blinking beacons, hazing into fog and set
          against the warm dawn glow behind. */}
      <svg
        className="absolute inset-x-0 bottom-0"
        style={{ height: '40vh', zIndex: -9 }}
        width="100%"
        viewBox="0 0 1200 320"
        preserveAspectRatio="xMidYMax slice"
      >
        {/* far depth layer */}
        <g fill="#0c0d18">
          {HORIZON.far.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        {/* receding floor grid */}
        <g stroke="rgba(120,150,180,0.10)" strokeWidth="0.8" fill="none">
          {HORIZON.grid.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        {/* near silhouette */}
        <g fill="#06060b">
          {HORIZON.fills.map((f, i) => (
            <path key={i} d={f.d} transform={f.t} />
          ))}
        </g>
        {/* steel detail: racks, lattice bracing, masts, guy-wires */}
        <g stroke="#88a0c0" fill="none" strokeWidth="0.9" strokeLinecap="round">
          {HORIZON.strokes.map((st, i) => (
            <path key={i} d={st.d} strokeOpacity={st.o} />
          ))}
        </g>
        {/* lit windows + reactor glow */}
        {HORIZON.lights.map((l, i) => (
          <circle key={i} cx={l.x} cy={l.y} r={l.r} fill={l.c} />
        ))}
        {/* blinking beacons */}
        {HORIZON.beacons.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r="1.5" fill="rgba(248,113,113,0.9)">
            <animate
              attributeName="opacity"
              values="1;0.15;1"
              dur={`${1.6 + (i % 4) * 0.5}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
        {/* fog fade — dissolve the bases into haze */}
        <rect x="0" y="120" width="1200" height="200" fill="url(#tt-fog-grad)" />
        {/* the city burns — fire glows through the haze */}
        {HORIZON.fires.map((f, i) => (
          <ellipse key={`fire${i}`} cx={f.x} cy={f.y} rx={f.r} ry={f.r * 1.5} fill="url(#tt-cityfire)">
            <animate
              attributeName="opacity"
              values="0.5;0.95;0.45;0.75"
              dur={`${1 + (i % 4) * 0.3}s`}
              repeatCount="indefinite"
            />
          </ellipse>
        ))}
        <defs>
          <linearGradient id="tt-fog-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#07070c" stopOpacity="0" />
            <stop offset="100%" stopColor="#07070c" stopOpacity="0.82" />
          </linearGradient>
          <radialGradient id="tt-cityfire" cx="50%" cy="62%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#f97316" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {/* Drifting fog banks low over the grid. */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: '40vh', zIndex: -8, overflow: 'hidden' }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '-10%',
            background: `radial-gradient(60% 70% at 30% 95%, ${fogTint}, transparent 70%)`,
            animation: 'tt-fog-a 38s ease-in-out infinite alternate',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '-10%',
            background: `radial-gradient(55% 60% at 72% 100%, ${fogTint}, transparent 68%)`,
            animation: 'tt-fog-b 52s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* Fine film grain for texture. */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={{ zIndex: -7, opacity: 0.045, mixBlendMode: 'overlay' }}
      >
        <filter id="tt-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#tt-grain)" />
      </svg>

      {/* Foreground grounding haze: a near, dawn-lit surface the cards sit on,
          so the distant city (and the machine's lower legs) recede behind your
          hand instead of being hard-cut by the opaque card row. */}
      <div
        className="absolute inset-x-0 bottom-0 transition-all duration-1000"
        style={{
          height: '34vh',
          zIndex: -3,
          background: lost
            ? 'linear-gradient(to top, rgba(8,9,16,0.55), transparent 58%)'
            : `linear-gradient(to top, rgba(${Math.round(24 + warmth * 26)},${Math.round(15 + warmth * 14)},9,${0.42 + warmth * 0.18}), rgba(18,11,9,0.12) 52%, transparent)`,
        }}
      />
    </div>
  )
}
