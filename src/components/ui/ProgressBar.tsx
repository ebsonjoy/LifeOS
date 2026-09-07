

export interface ProgressBarProps {
  value: number // 0 to 100
  className?: string
  showLabel?: boolean
  label?: string
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet'
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressBar({
  value,
  className = '',
  showLabel = false,
  label,
  color = 'indigo',
  size = 'md',
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))

  const colorClasses = {
    indigo: 'bg-indigo-500 shadow-indigo-500/30',
    emerald: 'bg-emerald-500 shadow-emerald-500/30',
    amber: 'bg-amber-500 shadow-amber-500/30',
    rose: 'bg-rose-500 shadow-rose-500/30',
    sky: 'bg-sky-500 shadow-sky-500/30',
    violet: 'bg-violet-500 shadow-violet-500/30',
  }

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  }

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-xs text-zinc-400 font-medium">
          {label && <span>{label}</span>}
          {showLabel && <span className="font-mono text-zinc-300 ml-auto">{clamped}%</span>}
        </div>
      )}
      <div className={`w-full rounded-full bg-zinc-800/80 overflow-hidden ${heightClasses[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out shadow-sm ${colorClasses[color]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
