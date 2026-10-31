import type { ReactNode } from 'react'
import { Drawer } from './Drawer'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}: ModalProps) {
  return (
    <Drawer open={isOpen} onClose={onClose} title={title} description={description} size={maxWidth}>
      {children}
    </Drawer>
  )
}
