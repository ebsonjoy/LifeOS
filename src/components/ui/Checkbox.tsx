import React from 'react'
import { Check } from 'lucide-react'

export interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: React.ReactNode
  disabled?: boolean
  className?: string
  id?: string
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  id,
}: CheckboxProps) {
  const checkboxId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <label
      htmlFor={checkboxId}
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-5 h-5 rounded-lg border transition-all duration-200 flex items-center justify-center ${
            checked
              ? 'bg-indigo-600 border-indigo-500 shadow-sm shadow-indigo-600/40 text-white animate-pop'
              : 'border-zinc-700 bg-zinc-900/80 group-hover:border-zinc-500'
          }`}
        >
          {checked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
        </div>
      </div>
      {label && <span className="text-sm font-medium text-zinc-200">{label}</span>}
    </label>
  )
}
