import type { ProgressStatus } from '../../types'
import { Check, X, RotateCcw } from 'lucide-react'
export function OutcomeButtons({
  value,
  onChange,
  disabled,
  label,
}: {
  value?: ProgressStatus | null
  onChange: (value: ProgressStatus) => void
  disabled?: boolean
  label: string
}) {
  return (
    <div
      className="outcome-buttons"
      role="group"
      aria-label={label + ' outcome'}
    >
      <button
        className={value === 'completed' ? 'chosen complete' : ''}
        aria-pressed={value === 'completed'}
        disabled={disabled}
        onClick={() => onChange('completed')}
        aria-label={'Mark ' + label + ' complete'}
      >
        <Check size={13} /> Complete
      </button>
      <button
        className={value === 'incomplete' ? 'chosen incomplete' : ''}
        aria-pressed={value === 'incomplete'}
        disabled={disabled}
        onClick={() => onChange('incomplete')}
        aria-label={'Mark ' + label + ' incomplete'}
      >
        <X size={13} /> Incomplete
      </button>
      {value && value !== 'planned' && (
        <button
          disabled={disabled}
          onClick={() => onChange('planned')}
          aria-label={'Clear outcome for ' + label}
          title="Return to not reviewed"
        >
          <RotateCcw size={13} />
        </button>
      )}
    </div>
  )
}
