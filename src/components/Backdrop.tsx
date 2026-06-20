import { useMemo } from 'react'

// Atmospheric backdrop: a lone vigil looking out over a ruined machine-grid on
// the horizon, in fog, under a sky whose stars fade as dawn approaches. All
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

// Broken machine skyline + faint receding floor grid, generated once.
const HORIZON = (() => {
  let s = 909
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296)
  const GROUND = 232
  const pts: Array<[number, number]> = [[0, GROUND]]
  let x = 0
  const windows: Array<[number, number]> = []
  while (x < 1200) {
    const w = 16 + rnd() * 60
    const ruined = rnd() > 0.78
    const topY = ruined ? 246 + rnd() * 22 : 150 + rnd() * 78
    pts.push([x, topY], [x + w, topY])
    // a few faint "powered" windows on the taller standing structures
    if (!ruined && rnd() > 0.55) {
      windows.push([x + w * 0.5, topY + 14 + rnd() * (GROUND - topY - 24)])
    }
    x += w
  }
  pts.push([1200, GROUND])
  const skyline = 'M 0 320 L ' + pts.map((p) => `${p[0]} ${p[1]}`).join(' L ') + ' L 1200 320 Z'

  // Receding floor grid: verticals converging to a vanishing point, a few
  // horizontals; some segments dropped so the grid reads as ruined.
  const VP = [600, GROUND] as const
  const grid: string[] = []
  for (let i = 0; i <= 16; i++) {
    if (rnd() > 0.86) continue // missing rib
    const bx = (i / 16) * 1200
    const startY = 320 - rnd() * 40 // some don't reach the foreground
    grid.push(`M ${bx.toFixed(0)} 320 L ${VP[0]} ${VP[1]}`.replace('320', startY.toFixed(0)))
  }
  const rows = [320, 300, 284, 271, 261, 253, 247, 242, 238]
  rows.forEach((y) => {
    if (rnd() > 0.9) return
    grid.push(`M 0 ${y} L 1200 ${y}`)
  })
  return { skyline, windows, grid }
})()

export function Backdrop({ warmth, lost }: { warmth: number; lost: boolean }) {
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

      {/* Ruined machine-grid horizon — a dark silhouette over a cold, dying
          floor grid, set against the warm dawn glow behind it. */}
      <svg
        className="absolute inset-x-0 bottom-0"
        style={{ height: '34vh', zIndex: -9 }}
        width="100%"
        viewBox="0 0 1200 320"
        preserveAspectRatio="xMidYMax slice"
      >
        <g stroke="rgba(120,150,180,0.13)" strokeWidth="0.8" fill="none">
          {HORIZON.grid.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <path d={HORIZON.skyline} fill="#06060b" opacity="0.97" />
        {HORIZON.windows.map((w, i) => (
          <rect key={i} x={w[0]} y={w[1]} width="1.6" height="1.6" fill="rgba(120,180,200,0.5)" />
        ))}
        {/* fog fade — dissolve the grid + skyline base into haze */}
        <rect x="0" y="120" width="1200" height="200" fill="url(#tt-fog-grad)" />
        <defs>
          <linearGradient id="tt-fog-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#07070c" stopOpacity="0" />
            <stop offset="100%" stopColor="#07070c" stopOpacity="0.78" />
          </linearGradient>
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
    </div>
  )
}
