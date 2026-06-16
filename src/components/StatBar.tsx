export function StatBar({
  value,
  max,
  className,
}: {
  value: number
  max: number
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-800">
      <div
        className={`h-full rounded-full transition-all duration-300 ${className ?? 'bg-emerald-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
