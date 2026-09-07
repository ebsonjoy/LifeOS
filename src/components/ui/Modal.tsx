import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  position?: 'right' | 'center'
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  position = 'right', // Default to right-side slide-over drawer as requested
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md sm:max-w-lg',
    lg: 'max-w-lg sm:max-w-xl',
    xl: 'max-w-xl sm:max-w-2xl',
  }

  if (position === 'center') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Centered Modal */}
        <div
          className={`relative w-full ${widthClasses[maxWidth]} rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 text-zinc-100 z-10 animate-in fade-in zoom-in-95 duration-200`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100 font-heading">{title}</h2>
              {description && <p className="text-xs text-zinc-400 mt-1">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>{children}</div>
        </div>
      </div>
    )
  }

  // Right-Side Slide-Over Drawer (Default)
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
        <div
          className={`pointer-events-auto w-screen ${widthClasses[maxWidth]} bg-zinc-900/95 border-l border-zinc-800 shadow-2xl backdrop-blur-xl flex flex-col justify-between text-zinc-100 animate-in slide-in-from-right duration-300 ease-out`}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-zinc-800 flex items-start justify-between bg-zinc-950/40">
            <div>
              <h2 className="text-lg font-bold text-zinc-100 font-heading tracking-tight">
                {title}
              </h2>
              {description && (
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{description}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-[10px] font-mono font-medium text-zinc-500 bg-zinc-800/60 border border-zinc-700/50 px-1.5 py-0.5 rounded">
                ESC
              </span>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
