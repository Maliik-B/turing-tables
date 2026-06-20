// A geometric glyph per machine, escalating in complexity with intelligence:
// ELIZA a bare hollow ring (never truly thinks) → DAEMON a triangle-circuit →
// ORACLE a watching lens → THE MAINFRAME a dense radiating core. Line-art that
// matches the SolsticeSun; inherits the enemy's text color via currentColor.
export function MachineSigil({
  name,
  className = '',
}: {
  name: string
  className?: string
}) {
  const key = name.startsWith('ELIZA')
    ? 'eliza'
    : name.startsWith('DAEMON')
      ? 'daemon'
      : name.startsWith('ORACLE')
        ? 'oracle'
        : 'mainframe'

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {key === 'eliza' && (
        <>
          <circle cx="12" cy="12" r="8" strokeOpacity="0.7" />
          <circle cx="12" cy="12" r="1.5" strokeOpacity="0.5" />
        </>
      )}
      {key === 'daemon' && (
        <>
          <polygon points="12,4 20,19 4,19" strokeOpacity="0.8" />
          <circle cx="12" cy="13.5" r="2.5" strokeOpacity="0.7" />
        </>
      )}
      {key === 'oracle' && (
        <>
          <path d="M2.5 12 C7 6 17 6 21.5 12 C17 18 7 18 2.5 12 Z" strokeOpacity="0.8" />
          <circle cx="12" cy="12" r="3.5" strokeOpacity="0.9" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        </>
      )}
      {key === 'mainframe' && (
        <>
          <circle cx="12" cy="12" r="9" strokeOpacity="0.45" />
          <circle cx="12" cy="12" r="5.5" strokeOpacity="0.7" />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
          <line x1="12" y1="0.5" x2="12" y2="3.5" strokeOpacity="0.6" />
          <line x1="12" y1="20.5" x2="12" y2="23.5" strokeOpacity="0.6" />
          <line x1="0.5" y1="12" x2="3.5" y2="12" strokeOpacity="0.6" />
          <line x1="20.5" y1="12" x2="23.5" y2="12" strokeOpacity="0.6" />
          <line x1="4" y1="4" x2="6.2" y2="6.2" strokeOpacity="0.45" />
          <line x1="17.8" y1="17.8" x2="20" y2="20" strokeOpacity="0.45" />
          <line x1="20" y1="4" x2="17.8" y2="6.2" strokeOpacity="0.45" />
          <line x1="4" y1="20" x2="6.2" y2="17.8" strokeOpacity="0.45" />
        </>
      )}
    </svg>
  )
}
