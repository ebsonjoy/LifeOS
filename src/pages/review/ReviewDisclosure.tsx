import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export function ReviewDisclosure({ title, description, children, className = '' }: { title: string; description: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false)
  return <details className={'review-disclosure ' + className} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><span><strong>{title}</strong><small>{description}</small></span><ChevronDown size={18} /></summary>
    {open && <div className="review-detail-body stack">{children}</div>}
  </details>
}
