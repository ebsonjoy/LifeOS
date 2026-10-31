import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import './drawer.css'

interface DrawerProps {
  open?: boolean
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

/** Shared modal surface; native dialog supplies focus trapping and restoration. */
export function Drawer({ open = true, title, description, children, onClose, size = 'xl' }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const backdropPress = useRef(false)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const node = ref.current
    if (!open || !node) return
    node.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      node.close()
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`life-dialog drawer drawer-${size}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onPointerDown={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        backdropPress.current = event.target === event.currentTarget &&
          (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom)
      }}
      onClick={(event) => {
        if (backdropPress.current && event.target === event.currentTarget) onClose()
        backdropPress.current = false
      }}
    >
      <div className="drawer-shell">
        <header className="drawer-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button type="button" className="icon-btn drawer-close" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </div>
    </dialog>
  )
}
