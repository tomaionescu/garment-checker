import { useEffect, useRef, type ReactNode } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  label: string
  className?: string
  children: ReactNode
}

/** Native modal dialog: focus trap, Escape and backdrop come from the browser. */
export default function Dialog({ open, onClose, label, className = '', children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      // A click that lands on the dialog element itself is a click on the backdrop.
      onClick={(e) => { if (e.target === ref.current) onClose() }}
      className={`bg-ink-soft text-paper ${className}`}
    >
      {open && children}
    </dialog>
  )
}
