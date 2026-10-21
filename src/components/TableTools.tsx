import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Search, SearchX, X } from 'lucide-react'

export interface PopoverProps {
  children: ReactNode
  onClose: () => void
  className?: string
  anchorRef?: RefObject<HTMLElement | null>
}

export function Popover({ children, onClose, className = '', anchorRef }: PopoverProps) {
  const markerRef = useRef<HTMLSpanElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  const getAnchor = useCallback((): HTMLElement | null => {
    if (anchorRef?.current) return anchorRef.current
    const marker = markerRef.current
    if (!marker) return null
    if (marker.previousElementSibling instanceof HTMLElement) {
      return marker.previousElementSibling
    }
    if (marker.nextElementSibling instanceof HTMLElement) {
      return marker.nextElementSibling
    }
    return marker.parentElement
  }, [anchorRef])

  const updatePosition = useCallback(() => {
    const popover = popoverRef.current
    const anchor = getAnchor()
    if (!popover || !anchor) return

    if (!anchor.isConnected) {
      closeRef.current()
      return
    }

    const anchorRect = anchor.getBoundingClientRect()

    // If anchor is scrolled completely off the screen
    if (
      anchorRect.bottom < -20 ||
      anchorRect.top > window.innerHeight + 20 ||
      anchorRect.right < -20 ||
      anchorRect.left > window.innerWidth + 20
    ) {
      closeRef.current()
      return
    }

    // Check if anchor is scrolled out of view inside any scrollable container (e.g. table-scroll)
    let parent = anchor.parentElement
    while (parent && parent !== document.body) {
      const style = window.getComputedStyle(parent)
      const overflows = ['auto', 'scroll', 'hidden']
      if (overflows.includes(style.overflowX) || overflows.includes(style.overflowY)) {
        const parentRect = parent.getBoundingClientRect()
        // If the anchor button is completely scrolled out of the container bounds
        if (
          anchorRect.bottom < parentRect.top ||
          anchorRect.top > parentRect.bottom ||
          anchorRect.right < parentRect.left ||
          anchorRect.left > parentRect.right
        ) {
          closeRef.current()
          return
        }
      }
      parent = parent.parentElement
    }

    const popoverRect = popover.getBoundingClientRect()
    const popoverHeight = popoverRect.height || popover.offsetHeight || 160
    const popoverWidth = popoverRect.width || popover.offsetWidth || 180

    const gap = 6
    const margin = 8

    const spaceBelow = window.innerHeight - anchorRect.bottom - gap - margin
    const spaceAbove = anchorRect.top - gap - margin

    let isUp = false
    let top = 0

    if (spaceBelow >= popoverHeight) {
      isUp = false
      top = anchorRect.bottom + gap
      popover.style.removeProperty('max-height')
      popover.style.removeProperty('overflow-y')
    } else if (spaceAbove >= popoverHeight) {
      isUp = true
      top = anchorRect.top - gap - popoverHeight
      popover.style.removeProperty('max-height')
      popover.style.removeProperty('overflow-y')
    } else {
      // Neither side fits completely - pick the side with more space
      if (spaceBelow >= spaceAbove) {
        isUp = false
        top = anchorRect.bottom + gap
        popover.style.setProperty('max-height', `${Math.max(80, spaceBelow)}px`, 'important')
        popover.style.setProperty('overflow-y', 'auto', 'important')
      } else {
        isUp = true
        top = Math.max(margin, anchorRect.top - gap - spaceAbove)
        popover.style.setProperty('max-height', `${Math.max(80, spaceAbove)}px`, 'important')
        popover.style.setProperty('overflow-y', 'auto', 'important')
      }
    }

    // Horizontal positioning: align right edge of popover with right edge of anchor by default
    let left = anchorRect.right - popoverWidth

    // Clamp horizontally to stay within viewport
    if (left < margin) {
      left = margin
    }
    if (left + popoverWidth > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - margin - popoverWidth)
    }

    popover.style.setProperty('position', 'fixed', 'important')
    popover.style.setProperty('top', `${Math.round(top)}px`, 'important')
    popover.style.setProperty('left', `${Math.round(left)}px`, 'important')
    popover.style.setProperty('right', 'auto', 'important')
    popover.style.setProperty('bottom', 'auto', 'important')
    popover.style.setProperty('z-index', '150', 'important')
    popover.style.setProperty('margin', '0', 'important')
    popover.style.setProperty('visibility', 'visible', 'important')
    popover.style.transformOrigin = isUp ? 'bottom right' : 'top right'

    if (isUp) {
      popover.classList.add('popover-up')
    } else {
      popover.classList.remove('popover-up')
    }
  }, [getAnchor])

  useLayoutEffect(() => {
    updatePosition()
  }, [updatePosition])

  useEffect(() => {
    const handleScrollOrResize = () => {
      updatePosition()
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    const anchor = getAnchor()
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updatePosition()
      })
      if (popoverRef.current) ro.observe(popoverRef.current)
      if (anchor) ro.observe(anchor)
    }

    function outside(e: Event) {
      const target = e.target as Node
      if (!target) return
      if (popoverRef.current && popoverRef.current.contains(target)) return
      const currentAnchor = getAnchor()
      if (currentAnchor && (currentAnchor.contains(target) || currentAnchor === target)) return
      if (markerRef.current?.parentElement && markerRef.current.parentElement.contains(target)) return
      closeRef.current()
    }

    function escape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current()
      }
    }

    document.addEventListener('mousedown', outside)
    document.addEventListener('touchstart', outside)
    document.addEventListener('keydown', escape)

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
      ro?.disconnect()
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('touchstart', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [getAnchor, updatePosition])

  return (
    <>
      <span ref={markerRef} style={{ display: 'none' }} aria-hidden="true" />
      {createPortal(
        <div
          ref={popoverRef}
          className={`popover ${className}`}
          style={{
            position: 'fixed',
            visibility: 'hidden',
            zIndex: 150,
          }}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  )
}

export function TableSearch({ value, onChange, placeholder = 'Search name or card number…', inputId = 'workspace-search' }: { value: string; onChange: (value: string) => void; placeholder?: string; inputId?: string }) {
  return <div className="table-search"><Search size={16}/><input id={inputId} type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}/>{value && <button className="search-clear" onClick={() => onChange('')} aria-label="Clear search"><X size={14}/></button>}</div>
}

export function Pagination({ count, page, perPage, onPage, onPerPage, label = 'cards' }: { count: number; page: number; perPage: number; onPage: (page: number) => void; onPerPage: (amount: number) => void; label?: string }) {
  const total = Math.max(1, Math.ceil(count / perPage))
  const current = Math.min(total, page)
  const start = count ? (current - 1) * perPage + 1 : 0
  const pages = total <= 5 ? Array.from({ length: total }, (_, i) => i + 1) : [...new Set([1, current - 1, current, current + 1, total].filter(p => p > 0 && p <= total))]
  return <div className="pagination"><span>Showing <strong>{start}–{Math.min(current * perPage, count)}</strong> of <strong>{count}</strong> {label}</span><div className="pagination-controls"><label className="per-page"><select value={perPage} onChange={e => { onPerPage(Number(e.target.value)); onPage(1) }} aria-label="Rows per page">{[5, 10, 20].map(n => <option key={n} value={n}>{n} per page</option>)}</select></label><div className="page-buttons"><button className="icon-button" aria-label="Previous page" disabled={current <= 1} onClick={() => onPage(current - 1)}><ChevronLeft size={16}/></button>{pages.map((p, index) => <span className="page-slot" key={p}>{index > 0 && p - pages[index - 1] > 1 && <span>…</span>}<button className={`page-number ${current === p ? 'current' : ''}`} aria-label={`Page ${p}`} aria-current={current === p ? 'page' : undefined} onClick={() => onPage(p)}>{p}</button></span>)}<button className="icon-button" aria-label="Next page" disabled={current >= total} onClick={() => onPage(current + 1)}><ChevronRight size={16}/></button></div></div></div>
}

export function EmptyState({ title = 'No households found', message = 'Try a different name, card number, or filter.', onReset, action = 'Clear filters' }: { title?: string; message?: string; onReset?: () => void; action?: string }) {
  return <div className="table-empty"><span className="empty-icon"><SearchX size={28}/></span><h3>{title}</h3><p>{message}</p>{onReset && <button className="button button-outline button-small" onClick={onReset}>{action}</button>}</div>
}
