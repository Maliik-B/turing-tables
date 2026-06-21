// An Omnidroid-style war machine looming on the horizon: a spherical chassis on
// radial articulated claw-legs with a glowing optic cluster, escalating with the
// enemy tier (ELIZA's crude husk -> the Mainframe's many-limbed colossus). Pure
// SVG silhouette behind the UI — a nod to The Incredibles' learning battle-bots,
// whose versions grew more legs and smarter AI exactly as our ladder does.
export function MachineColossus({ tier }: { tier: number }) {
  const t = Math.max(0, Math.min(3, Math.floor(tier)))
  const R = [58, 76, 92, 114][t]
  const legCount = [4, 5, 6, 8][t]
  const opticCount = [1, 1, 3, 5][t]
  const live = t > 0 // ELIZA's optic is a dim, unthinking husk
  const CX = 400
  const CY = 300
  const rad = (d: number) => (d * Math.PI) / 180

  // Radial articulated legs: splayed across the lower 300deg (gap at the top),
  // lower legs longer + planted, upper legs raised. Each ends in 4 claws.
  const legs: string[] = []
  const claws: string[] = []
  const span = legCount > 1 ? 300 / (legCount - 1) : 0
  for (let i = 0; i < legCount; i++) {
    const a = rad(-150 + i * span)
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const len = R * (1.5 + 0.7 * Math.max(0, sa)) // +y (down) legs reach further
    const hx = CX + R * ca
    const hy = CY + R * sa
    const px = -sa
    const py = ca
    const kink = R * 0.34 * (i % 2 === 0 ? 1 : -1)
    const kx = hx + len * 0.5 * ca + px * kink
    const ky = hy + len * 0.5 * sa + py * kink
    const fx = kx + len * 0.5 * ca
    const fy = ky + len * 0.5 * sa
    legs.push(
      `M ${hx.toFixed(1)} ${hy.toFixed(1)} L ${kx.toFixed(1)} ${ky.toFixed(1)} L ${fx.toFixed(1)} ${fy.toFixed(1)}`,
    )
    for (const c of [-1.5, -0.5, 0.5, 1.5]) {
      const pa = a + c * 0.28
      claws.push(
        `M ${fx.toFixed(1)} ${fy.toFixed(1)} L ${(fx + 15 * Math.cos(pa)).toFixed(1)} ${(fy + 15 * Math.sin(pa)).toFixed(1)}`,
      )
    }
  }

  // Optic cluster on the lower-front of the chassis.
  const optics: Array<{ x: number; y: number; r: number }> = [
    { x: CX, y: CY + R * 0.12, r: R * 0.22 },
  ]
  for (let i = 1; i < opticCount; i++) {
    const a = rad(35 + (i / (opticCount - 1)) * 110)
    optics.push({
      x: CX + R * 0.52 * Math.cos(a),
      y: CY + R * 0.46 * Math.sin(a),
      r: R * 0.085,
    })
  }

  return (
    <svg
      aria-hidden
      className="absolute inset-x-0 bottom-0"
      style={{ height: '82vh', zIndex: -10, opacity: 0.9 }}
      width="100%"
      viewBox="0 0 800 640"
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <radialGradient id="tt-optic">
          <stop offset="0%" stopColor="#fee2e2" stopOpacity="1" />
          <stop offset="35%" stopColor="#ef4444" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* legs + claws (drawn under the chassis) */}
      <g
        stroke="#070710"
        fill="none"
        strokeWidth={R * 0.16}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {legs.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g stroke="#070710" fill="none" strokeWidth={R * 0.08} strokeLinecap="round">
        {claws.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* spherical chassis */}
      <circle cx={CX} cy={CY} r={R} fill="#06060c" />
      {/* rim light catching the dawn on the lower edge */}
      <path
        d={`M ${CX - R * 0.82} ${CY + R * 0.5} A ${R} ${R} 0 0 0 ${CX + R * 0.82} ${CY + R * 0.5}`}
        stroke="rgba(251,191,36,0.22)"
        strokeWidth="2.5"
        fill="none"
      />
      <circle
        cx={CX}
        cy={CY}
        r={R * 0.78}
        stroke="rgba(136,160,192,0.12)"
        strokeWidth="1.5"
        fill="none"
      />

      {/* optic cluster */}
      {optics.map((o, i) => (
        <g key={i}>
          <circle cx={o.x} cy={o.y} r={o.r * 2.4} fill="url(#tt-optic)" opacity={live ? 0.85 : 0.4}>
            <animate
              attributeName="opacity"
              values={live ? '0.85;0.5;0.85' : '0.4;0.28;0.4'}
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
