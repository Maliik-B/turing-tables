// An Omnidroid-style war machine ravaging the city on the horizon, escalating
// with the enemy tier AND with how aware of YOU it is:
//   ELIZA    - an inert husk, eye nearly dark, doing nothing.
//   DAEMON   - mid-rampage, an arm crushing a tower, optic just swung to you.
//   ORACLE   - still tearing up the city, half-turned your way.
//   MAINFRAME- done with the city, facing you, hurling debris at the screen.
// Spherical chassis on grounded clawed legs + jointed clawed arms, with crushed
// towers, debris, drifting smoke. A nod to The Incredibles' learning battle-bots.
// Pure SVG behind the UI. `distant` = a faint far tease (menu).
export function MachineColossus({
  tier,
  distant = false,
}: {
  tier: number
  distant?: boolean
}) {
  const t = Math.max(0, Math.min(3, Math.floor(tier)))
  const cfg = [
    { R: 36, legs: 4, optics: 1, dim: true, smoke: 0 },
    { R: 48, legs: 5, optics: 1, smoke: 1 },
    { R: 60, legs: 6, optics: 3, smoke: 2 },
    { R: 76, legs: 8, optics: 5, smoke: 2, throws: true },
  ][t]
  const R = cfg.R
  const live = !cfg.dim
  const CX = 400
  const CY = 208
  const GROUND = 548
  const stance = R * 1.7 + t * 20
  const rad = (d: number) => (d * Math.PI) / 180

  // --- grounded legs: feet planted on the city line, knees raised ---
  const legSpines: string[] = []
  const clawPaths: string[] = []
  const half = Math.ceil(cfg.legs / 2)
  for (let i = 0; i < cfg.legs; i++) {
    const side = i < half ? -1 : 1
    const j = i < half ? i : i - half
    const frac = (j + 0.5) / half
    const fx = CX + side * (R * 0.5 + frac * stance)
    const fy = GROUND - (i % 2) * 16
    const hipA = Math.atan2(fy - CY, fx - CX)
    const hx = CX + R * Math.cos(hipA)
    const hy = CY + R * Math.sin(hipA)
    const kx = hx + (fx - hx) * 0.42 + side * R * 0.55
    const ky = Math.min(hy, fy) - (R * 0.85 + frac * R * 0.8)
    legSpines.push(`M ${hx.toFixed(1)} ${hy.toFixed(1)} L ${kx.toFixed(1)} ${ky.toFixed(1)} L ${fx.toFixed(1)} ${fy.toFixed(1)}`)
    for (const c of [-6, 0, 6]) clawPaths.push(`M ${fx.toFixed(1)} ${fy.toFixed(1)} L ${(fx + c).toFixed(1)} ${(fy + 10).toFixed(1)}`)
  }

  // --- jointed clawed arms, posed by tier (crush low / reach high) ---
  // each entry: a hand point, and whether it grips a tower (crush) at the ground
  const armPlans =
    t === 1
      ? [{ hand: [CX + R * 2.3, CY + R * 1.1], crush: true }]
      : t === 2
        ? [
            { hand: [CX - R * 2.2, CY + R * 1.0], crush: true },
            { hand: [CX + R * 2.3, CY - R * 1.4], crush: false },
          ]
        : t === 3
          ? [
              { hand: [CX - R * 1.9, CY - R * 1.9], crush: false },
              { hand: [CX + R * 2.0, CY - R * 1.6], crush: false },
            ]
          : []
  const armSpines: string[] = []
  const towers: Array<{ x: number; w: number; topY: number }> = []
  for (const p of armPlans) {
    const [hxp, hyp] = p.hand
    const side = hxp < CX ? -1 : 1
    // shoulder on the upper chassis toward the hand
    const sA = Math.atan2(hyp - CY, hxp - CX) * 0.5 + rad(side * -90) * 0.5
    const sx = CX + R * Math.cos(sA)
    const sy = CY + R * Math.sin(sA) - R * 0.2
    // elbow: bent outward, above the hand for a reaching limb
    const ex = sx + (hxp - sx) * 0.5 + side * R * 0.5
    const ey = Math.min(sy, hyp) - R * 0.5
    armSpines.push(`M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)} L ${hxp.toFixed(1)} ${hyp.toFixed(1)}`)
    // grabbing claw: curved prongs at the hand
    const grip = p.crush ? 90 : Math.atan2(hyp - ey, hxp - ex) * (180 / Math.PI) + 90
    for (const c of [-26, 0, 26]) {
      const a = rad(grip + c)
      clawPaths.push(`M ${hxp.toFixed(1)} ${hyp.toFixed(1)} Q ${(hxp + 7 * Math.cos(a - 0.5)).toFixed(1)} ${(hyp + 7 * Math.sin(a - 0.5)).toFixed(1)} ${(hxp + 13 * Math.cos(a)).toFixed(1)} ${(hyp + 13 * Math.sin(a)).toFixed(1)}`)
    }
    if (p.crush) towers.push({ x: hxp - 16, w: 30, topY: hyp - 6 })
  }

  // --- crushed / toppled towers + debris (the ravaged city right at its feet) ---
  const debris: string[] = []
  for (let i = 0; i < cfg.smoke * 4; i++) {
    const dx = CX + (((i * 73) % 200) - 100) * (R / 50)
    const dy = GROUND - ((i * 37) % 30)
    const s = 3 + ((i * 13) % 5)
    debris.push(`M ${dx} ${dy} l ${s} ${-s * 0.6} l ${s * 0.5} ${s} l ${-s} ${s * 0.4} z`)
  }

  // --- drifting smoke plumes ---
  const smokes: Array<{ x: number; y: number; r: number; d: number }> = []
  for (let i = 0; i < cfg.smoke * 2; i++) {
    // plumes rise from the crushed city up past the orb into the visible gap
    smokes.push({ x: CX + (i % 2 === 0 ? 1.5 : -1.4) * R, y: CY + R * 0.6 - i * 40, r: R * (1.2 + i * 0.45), d: 7 + (i % 3) * 2 })
  }

  // --- optic cluster (faces you) ---
  const optics: Array<{ x: number; y: number; r: number }> = [{ x: CX, y: CY + R * 0.14, r: R * 0.24 }]
  for (let i = 1; i < cfg.optics; i++) {
    const a = rad(35 + (i / (cfg.optics - 1)) * 110)
    optics.push({ x: CX + R * 0.54 * Math.cos(a), y: CY + R * 0.46 * Math.sin(a), r: R * 0.09 })
  }

  const legW = R * 0.18
  return (
    <svg
      aria-hidden
      className="absolute inset-x-0 bottom-0"
      style={{ height: distant ? '30vh' : '62vh', zIndex: -10, opacity: distant ? 0.42 : 0.92 }}
      width="100%"
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <radialGradient id="tt-optic">
          <stop offset="0%" stopColor="#fee2e2" stopOpacity="1" />
          <stop offset="35%" stopColor="#ef4444" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tt-smoke">
          <stop offset="0%" stopColor="#403a46" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#3a3540" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* smoke behind the machine */}
      {smokes.map((s, i) => (
        <ellipse key={i} cx={s.x} cy={s.y} rx={s.r} ry={s.r * 0.8} fill="url(#tt-smoke)">
          <animate attributeName="cy" values={`${s.y};${s.y - 18};${s.y}`} dur={`${s.d}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0.6;0.9" dur={`${s.d}s`} repeatCount="indefinite" />
        </ellipse>
      ))}

      {/* crushed towers gripped at the feet */}
      <g fill="#090910">
        {towers.map((tw, i) => (
          <path key={i} d={`M ${tw.x} ${GROUND} L ${tw.x + 3} ${tw.topY} L ${tw.x + tw.w} ${tw.topY + 8} L ${tw.x + tw.w} ${GROUND} Z`} />
        ))}
      </g>

      {/* limbs: dark body + offset steel highlight = 3D metal */}
      <g stroke="#05050a" fill="none" strokeWidth={legW} strokeLinecap="round" strokeLinejoin="round">
        {legSpines.map((d, i) => (
          <path key={i} d={d} />
        ))}
        {armSpines.map((d, i) => (
          <path key={`a${i}`} d={d} />
        ))}
      </g>
      <g
        stroke="rgba(150,172,205,0.42)"
        fill="none"
        strokeWidth={Math.max(1, legW * 0.24)}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(-1.3 -1.7)"
      >
        {legSpines.map((d, i) => (
          <path key={i} d={d} />
        ))}
        {armSpines.map((d, i) => (
          <path key={`a${i}`} d={d} />
        ))}
      </g>
      <g stroke="#070710" fill="none" strokeWidth={legW * 0.5} strokeLinecap="round" strokeLinejoin="round">
        {clawPaths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* scattered debris */}
      <g fill="#0b0b13">
        {debris.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* spherical chassis */}
      <circle cx={CX} cy={CY} r={R} fill="#06060c" />
      <path d={`M ${CX - R * 0.82} ${CY + R * 0.5} A ${R} ${R} 0 0 0 ${CX + R * 0.82} ${CY + R * 0.5}`} stroke="rgba(251,191,36,0.22)" strokeWidth="2" fill="none" />
      <path d={`M ${CX - R * 0.72} ${CY - R * 0.5} A ${R} ${R} 0 0 1 ${CX + R * 0.15} ${CY - R * 0.96}`} stroke="rgba(150,172,205,0.28)" strokeWidth="1.6" fill="none" />
      <circle cx={CX} cy={CY} r={R * 0.76} stroke="rgba(136,160,192,0.12)" strokeWidth="1.4" fill="none" />
      {t >= 2 && (
        <path d={`M ${CX - R * 0.62} ${CY - R * 0.08} Q ${CX} ${CY - R * 0.52} ${CX + R * 0.62} ${CY - R * 0.08}`} stroke="#0c0c16" strokeWidth={R * 0.16} fill="none" strokeLinecap="round" />
      )}

      {/* optic cluster */}
      {optics.map((o, i) => (
        <g key={i}>
          <circle cx={o.x} cy={o.y} r={o.r * 2.4} fill="url(#tt-optic)" opacity={live ? 0.85 : 0.42}>
            <animate attributeName="opacity" values={live ? '0.85;0.5;0.85' : '0.42;0.3;0.42'} dur={`${3 + i}s`} repeatCount="indefinite" />
          </circle>
          <circle cx={o.x} cy={o.y} r={o.r} fill={live ? '#ef4444' : '#7f1d1d'} />
          {live && <circle cx={o.x} cy={o.y} r={o.r * 0.38} fill="#fee2e2" />}
        </g>
      ))}

      {/* the Mainframe hurls a chunk of debris at you */}
      {cfg.throws && (
        <g>
          <path d="M -7 -5 L 6 -7 L 9 5 L -2 8 Z" fill="#0d0d16" stroke="rgba(150,172,205,0.4)" strokeWidth="1">
            <animateMotion path={`M ${CX + R * 2} ${CY - R * 1.4} Q ${CX + 120} ${CY + 120} ${CX + 220} 640`} dur="3.2s" repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="scale" additive="sum" values="0.4;0.6;2.4" dur="3.2s" repeatCount="indefinite" />
          </path>
        </g>
      )}
    </svg>
  )
}
