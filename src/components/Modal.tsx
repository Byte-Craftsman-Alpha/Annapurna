import { useEffect, useId, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

const modalStack: HTMLDivElement[] = []
let originalOverflow = ''

interface Props {
  children: ReactNode
  title: string
  subtitle?: string
  onClose: () => void
  wide?: boolean
  className?: string
}

export function Modal({ children, title, subtitle, onClose, wide, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const element = ref.current
    if (!element) return
    if (modalStack.length === 0) originalOverflow = document.body.style.overflow
    modalStack.push(element)
    document.body.style.overflow = 'hidden'
    element.focus()
    const keyboard = (e: KeyboardEvent) => {
      if (modalStack.at(-1) !== element) return
      if (e.key === 'Escape') onCloseRef.current()
      if (e.key !== 'Tab' || !ref.current) return
      const elements = [...ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]')].filter(el => el.offsetParent !== null)
      const first = elements[0]
      const last = elements.at(-1)
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keyboard)
    return () => {
      const position = modalStack.indexOf(element)
      if (position !== -1) modalStack.splice(position, 1)
      document.removeEventListener('keydown', keyboard)
      if (modalStack.length === 0) {
        document.body.style.overflow = originalOverflow
        if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true })
      }
    }
  }, [])
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <motion.div className={`modal ${wide ? 'modal-wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={ref} initial={{ opacity: 0, y: 22, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ type: 'spring', damping: 28, stiffness: 330 }}>
      <header className="modal-header"><div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button close-modal" onClick={onClose} aria-label="Close dialog"><X size={20}/></button></header>
      {children}
    </motion.div>
  </motion.div>
}
