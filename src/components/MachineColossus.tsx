// An Omnidroid-style war machine standing in its city on the horizon: a
// spherical chassis carried on grounded, articulated four-clawed legs (planted
// in the skyline, knees raised like a walker rather than splayed at the sky),
// with a glowing optic cluster that faces you. Escalates with the enemy tier -
// ELIZA a small dim husk, THE MAINFRAME a larger many-legged colossus with
// raised claw-arms and a sensor brow. A nod to The Incredibles' learning
// battle-bots. Pure SVG, behind the UI. `distant` = a faint far tease (menu).
export function MachineColossus({
  tier,
  distant = false,
}: {
  tier: number
  distant?: boolean
}) {
  const t = Math.max(0, Math.min(3, Math.floor(tier)))
  const R = [36, 48, 60, 76][t]
  const legCount = [4, 5, 6, 8][t]
  const opticCount = [1, 1, 3, 5][t]
  const armCount = t >= 2 ? t - 1 : 0 // raised claw-arms on the smarter tiers
  const live = t > 0 // ELIZA's optic is a dim, unthinking husk
  const CX = 400
  const CY = 208
  const GROUND = 548
  const stance = R * 1.7 + t * 20

  // Grounded legs: feet planted on the city line, knees raised like a walker.
  const legSpines: string[] = []
  const clawPaths: string[] = []
  const half = Math.ceil(legCount / 2)
  for (let i = 0; i < legCount; i++) {
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
    legSpines.push(
      `M ${hx.toFixed(1)} ${hy.toFixed(1)} L ${kx.toFixed(1)} ${ky.toFixed(1)} L ${fx.toFixed(1)} ${fy.toFixed(1)}`,
    )
    for (const c of [-7, 0, 7]) {
      clawPaths.push(`M ${fx.toFixed(1)} ${fy.toFixed(1)} L ${(fx + c).toFixed(1)} ${(fy + 11).toFixed(1)}`)
    }
  }

  // Raised claw-arms (menace) reaching up-out from the upper chassis.
  const armSpines: string[] = []
  for (let i = 0; i < armCount; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const aA = ((-90 + side * (34 + i * 8)) * Math.PI) / 180
    const hx = CX + R * Math.cos(aA)
    const hy = CY + R * Math.sin(aA)
    const ex = hx + side * R * 1.5
    const ey = hy - R * 1.25
    const tx = ex + side * R * 0.9
    const ty = ey + R * 0.25
    armSpines.push(
      `M ${hx.toFixed(1)} ${hy.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)} L ${tx.toFixed(1)} ${ty.toFixed(1)}`,
    )
    for (const c of [-6, 6]) {
      clawPaths.push(`M ${tx.toFixed(1)} ${ty.toFixed(1)} L ${(tx + side * 8).toFixed(1)} ${(ty + c).toFixed(1)}`)
    }
  }

  // Optic cluster (faces you), on the lower-front of the chassis.
  const optics: Array<{ x: number; y: number; r: number }> = [
    { x: CX, y: CY + R * 0.14, r: R * 0.24 },
  ]
  for (let i = 1; i < opticCount; i++) {
    const a = ((35 + (i / (opticCount - 1)) * 110) * Math.PI) / 180
    optics.push({ x: CX + R * 0.54 * Math.cos(a), y: CY + R * 0.46 * Math.sin(a), r: R * 0.09 })
  }

  const legW = R * 0.18
  return (
    <svg
      aria-hidden
      className="absolute inset-x-0 bottom-0"
      style={{
        height: distant ? '30vh' : '62vh',
        zIndex: -10,
        opacity: distant ? 0.42 : 0.92,
      }}
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
      </defs>

      {/* limbs: dark body stroke + an offset steel highlight = 3D metal */}
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
      <g stroke="#070710" fill="none" strokeWidth={legW * 0.5} strokeLinecap="round">
        {clawPaths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* spherical chassis */}
      <circle cx={CX} cy={CY} r={R} fill="#06060c" />
      {/* lower rim catches the dawn; upper-left edge gives it form */}
      <path
        d={`M ${CX - R * 0.82} ${CY + R * 0.5} A ${R} ${R} 0 0 0 ${CX + R * 0.82} ${CY + R * 0.5}`}
        stroke="rgba(251,191,36,0.22)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d={`M ${CX - R * 0.72} ${CY - R * 0.5} A ${R} ${R} 0 0 1 ${CX + R * 0.15} ${CY - R * 0.96}`}
        stroke="rgba(150,172,205,0.28)"
        strokeWidth="1.6"
        fill="none"
      />
      <circle cx={CX} cy={CY} r={R * 0.76} stroke="rgba(136,160,192,0.12)" strokeWidth="1.4" fill="none" />
      {/* sensor brow / armored visor ridge on the smarter tiers */}
      {t >= 2 && (
        <path
          d={`M ${CX - R * 0.62} ${CY - R * 0.08} Q ${CX} ${CY - R * 0.52} ${CX + R * 0.62} ${CY - R * 0.08}`}
          stroke="#0c0c16"
          strokeWidth={R * 0.16}
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* optic cluster */}
      {optics.map((o, i) => (
        <g key={i}>
          <circle cx={o.x} cy={o.y} r={o.r * 2.4} fill="url(#tt-optic)" opacity={live ? 0.85 : 0.42}>
            <animate
              attributeName="opacity"
              values={live ? '0.85;0.5;0.85' : '0.42;0.3;0.42'}
              dur={`${3 + i}s`}
              repeatCount="indefinite"
            />
          </circle>
          <circle cx={o.x} cy={o.y} r={o.r} fill={live ? '#ef4444' : '#7f1d1d'} />
          {live && <circle cx={o.x} cy={o.y} r={o.r * 0.38} fill="#fee2e2" />}
        </g>
      ))}
    </svg>
  )
}
