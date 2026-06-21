// An Omnidroid-style war machine ravaging the city on the horizon, escalating
// with the enemy tier AND with how aware of YOU it is:
//   ELIZA    - an inert husk, eye nearly dark, doing nothing.
//   DAEMON   - mid-rampage, both claws crushing skyscrapers, optic swung to you.
//   ORACLE   - still tearing the city down, more fire, half-fixed on you.
//   MAINFRAME- done with the city, facing you, reaching + hurling debris.
// Fire (the one thing that reads against the dark palette) + tall smoke sell the
// ravaging; fighter jets harry it with tracer fire (human resistance, and a
// directive for the machine). Pure SVG behind the UI. `distant` = a faint tease.
export function MachineColossus({
  tier,
  distant = false,
}: {
  tier: number
  distant?: boolean
}) {
  const t = Math.max(0, Math.min(3, Math.floor(tier)))
  const cfg = [
    { R: 36, legs: 4, optics: 1, dim: true, mode: 'idle' },
    { R: 48, legs: 5, optics: 1, mode: 'destroy' },
    { R: 60, legs: 6, optics: 3, mode: 'destroy' },
    { R: 76, legs: 8, optics: 5, mode: 'throw', throws: true },
  ][t] as { R: number; legs: number; optics: number; dim?: boolean; mode: string; throws?: boolean }
  const R = cfg.R
  const live = !cfg.dim
  const CX = 400
  const CY = 208
  const GROUND = 548
  const stance = R * 1.7 + t * 20
  const rad = (d: number) => (d * Math.PI) / 180

  const legSpines: string[] = []
  const armSpines: string[] = []
  const clawPaths: string[] = []
  const skyscrapers: Array<{ x: number; w: number; topY: number }> = []
  const fires: Array<{ x: number; y: number; r: number }> = []
  const smokes: Array<{ x: number; y: number; r: number; d: number }> = []

  // grounded legs: feet planted on the city line, knees raised
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

  // a jointed clawed arm from a shoulder on the orb to a hand point
  function arm(hxp: number, hyp: number, gripDown: boolean) {
    const side = hxp < CX ? -1 : 1
    const sA = Math.atan2(hyp - CY, hxp - CX) * 0.55 + rad(side * -90) * 0.45
    const sx = CX + R * Math.cos(sA)
    const sy = CY + R * Math.sin(sA) - R * 0.15
    const ex = sx + (hxp - sx) * 0.5 + side * R * 0.45
    const ey = Math.min(sy, hyp) - R * 0.45
    armSpines.push(`M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)} L ${hxp.toFixed(1)} ${hyp.toFixed(1)}`)
    const base = gripDown ? 90 : Math.atan2(hyp - ey, hxp - ex) * (180 / Math.PI) + 90
    for (const c of [-30, -10, 10, 30]) {
      const a = rad(base + c)
      clawPaths.push(`M ${hxp.toFixed(1)} ${hyp.toFixed(1)} Q ${(hxp + 6 * Math.cos(a - 0.5)).toFixed(1)} ${(hyp + 6 * Math.sin(a - 0.5)).toFixed(1)} ${(hxp + 14 * Math.cos(a)).toFixed(1)} ${(hyp + 14 * Math.sin(a)).toFixed(1)}`)
    }
  }

  if (cfg.mode === 'destroy') {
    // both claws crushing two skyscrapers whose tops reach the visible band
    for (const sx of [CX - R * 2.4, CX + R * 2.4]) {
      const topY = CY + R * 0.55
      const w = R * 0.5
      skyscrapers.push({ x: sx - w / 2, w, topY })
      arm(sx, topY, true)
      fires.push({ x: sx, y: topY, r: R * 0.7 })
      smokes.push({ x: sx, y: topY - R * 0.4, r: R * 1.1, d: 7 })
      smokes.push({ x: sx + R * 0.2, y: topY - R * 1.6, r: R * 1.6, d: 10 })
    }
  } else if (cfg.mode === 'throw') {
    // both hands reaching at you; fire + smoke from the wrecked city behind it
    arm(CX - R * 1.9, CY + R * 1.7, false)
    arm(CX + R * 2.0, CY + R * 0.4, false)
    for (const sx of [CX - R * 2.7, CX + R * 2.9]) {
      fires.push({ x: sx, y: GROUND - R * 0.5, r: R * 0.8 })
      smokes.push({ x: sx, y: GROUND - R * 1.1, r: R * 1.5, d: 8 })
      smokes.push({ x: sx, y: GROUND - R * 2.6, r: R * 1.9, d: 12 })
    }
  }

  // jets harrying the machine with tracer fire (human resistance, live tiers)
  const jets = live ? Array.from({ length: 2 + t }, (_, i) => ({ y: 64 + i * 24, dir: i % 2 === 0 ? 1 : -1, dur: 7 + (i % 3) * 2 })) : []

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
      style={{ height: distant ? '30vh' : '64vh', zIndex: -10, opacity: distant ? 0.42 : 0.94 }}
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
          <stop offset="0%" stopColor="#403a46" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#3a3540" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tt-fire" cx="50%" cy="62%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95" />
          <stop offset="38%" stopColor="#f97316" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* fighter jets + tracer fire (behind the machine) */}
      {jets.map((j, i) => (
        <g key={i}>
          <g transform={j.dir > 0 ? '' : 'translate(800 0) scale(-1 1)'}>
            <g>
              <path d="M -11 0 L 7 -2.5 L 2 0 L 7 2.5 Z" fill="#0a0a12" stroke="rgba(150,172,205,0.4)" strokeWidth="0.6" />
              <line x1="-11" y1="0" x2="-30" y2="0" stroke="rgba(150,172,205,0.16)" strokeWidth="1.2" />
              <animateMotion path={`M -70 ${j.y} L 870 ${j.y}`} dur={`${j.dur}s`} repeatCount="indefinite" />
            </g>
          </g>
        </g>
      ))}
      {live &&
        [0, 1, 2].map((i) => {
          const tx = CX + (i - 1) * 150
          const ty = 78 + i * 12
          return (
            <line key={`tr${i}`} x1={tx} y1={ty} x2={CX + (i - 1) * 26} y2={CY - R} stroke="#fca5a5" strokeWidth="1" strokeOpacity="0">
              <animate attributeName="stroke-opacity" values="0;0.55;0;0" dur={`${0.5 + i * 0.25}s`} repeatCount="indefinite" />
            </line>
          )
        })}

      {/* fire glows (the ravaging, legible against the dark) */}
      {fires.map((f, i) => (
        <ellipse key={i} cx={f.x} cy={f.y} rx={f.r} ry={f.r * 1.4} fill="url(#tt-fire)">
          <animate attributeName="opacity" values="0.7;1;0.6;0.9;0.7" dur={`${1.1 + i * 0.3}s`} repeatCount="indefinite" />
          <animate attributeName="ry" values={`${f.r * 1.3};${f.r * 1.7};${f.r * 1.3}`} dur={`${1.1 + i * 0.3}s`} repeatCount="indefinite" />
        </ellipse>
      ))}

      {/* smoke plumes rising into the visible gap */}
      {smokes.map((s, i) => (
        <ellipse key={i} cx={s.x} cy={s.y} rx={s.r} ry={s.r * 0.85} fill="url(#tt-smoke)">
          <animate attributeName="cy" values={`${s.y};${s.y - 24};${s.y}`} dur={`${s.d}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0.55;0.9" dur={`${s.d}s`} repeatCount="indefinite" />
        </ellipse>
      ))}

      {/* skyscrapers being crushed */}
      <g fill="#08080f">
        {skyscrapers.map((s, i) => (
          <path key={i} d={`M ${s.x} ${GROUND} L ${s.x + 2} ${s.topY} L ${s.x + s.w} ${s.topY + 7} L ${s.x + s.w} ${GROUND} Z`} />
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
        <path d="M -7 -5 L 6 -7 L 9 5 L -2 8 Z" fill="#0d0d16" stroke="rgba(150,172,205,0.4)" strokeWidth="1">
          <animateMotion path={`M ${CX + R * 2} ${CY} Q ${CX + 120} ${CY + 140} ${CX + 210} 640`} dur="3.2s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="scale" additive="sum" values="0.4;0.7;2.6" dur="3.2s" repeatCount="indefinite" />
        </path>
      )}
    </svg>
  )
}
