import { useEffect, useRef, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Search, SearchX, X } from 'lucide-react'

export function Popover({ children, onClose, className = '' }: { children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    function outside(e: MouseEvent) { if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) closeRef.current() }
    function escape(e: KeyboardEvent) { if (e.key === 'Escape') { e.stopPropagation(); closeRef.current() } }
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape) }
  }, [])
  return <div className={`popover ${className}`} ref={ref}>{children}</div>
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
