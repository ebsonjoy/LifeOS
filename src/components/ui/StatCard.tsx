import React from 'react'
import { Card } from './Card'

export interface StatCardProps {
  label: string
  value: string | number
  subValue?: string
  icon: React.ReactNode
  trend?: {
    positive?: boolean
    text: string
  }
  className?: string
  accentColor?: string
}

export function StatCard({
  label,
  value,
  subValue,
  icon,
  trend,
  className = '',
}: StatCardProps) {
  return (
    <Card className={`p-5 relative overflow-hidden transition-all duration-200 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            {label}
          </span>
          <span className="text-2xl font-bold text-zinc-100 tracking-tight font-heading mt-0.5">
            {value}
          </span>
          {subValue && (
            <span className="text-xs text-zinc-400 font-medium">{subValue}</span>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`text-xs font-medium ${
                  trend.positive ? 'text-emerald-400' : 'text-zinc-400'
                }`}
              >
                {trend.text}
              </span>
            </div>
          )}
        </div>

        <div className="p-2.5 rounded-xl bg-zinc-800/80 text-zinc-300 border border-zinc-700/50 shrink-0">
          {icon}
        </div>
      </div>
    </Card>
  )
}
