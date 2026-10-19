import { CreditCard, ShieldCheck, UsersRound, Wheat, ArrowUpRight } from 'lucide-react'
import type { RationCard } from '../lib/types'

export function Stats({ cards, onCards, onMembers, onOverview, onBPL }: { cards: RationCard[]; onCards: () => void; onMembers: () => void; onOverview: () => void; onBPL: () => void }) {
  const members = cards.reduce((sum, c) => sum + c.Members.length, 0)
  const units = cards.reduce((sum, c) => sum + c.Total_Unit, 0)
  const bpl = cards.filter(c => c.Card_Type === 'BPL').length
  const stats = [
    { label: 'Total ration cards', value: cards.length, note: 'Households, all in one place', icon: CreditCard, color: 'sage', action: onCards },
    { label: 'Household members', value: members, note: 'People behind the numbers', icon: UsersRound, color: 'lilac', action: onMembers },
    { label: 'Total units', value: units, note: 'Across all ration cards', icon: Wheat, color: 'sand', action: onOverview },
    { label: 'BPL households', value: bpl, note: `${cards.length ? Math.round(bpl / cards.length * 100) : 0}% of all households`, icon: ShieldCheck, color: 'blue', action: onBPL },
  ]
  return <section className="stats-grid" aria-label="Workspace statistics">{stats.map(({ label, value, note, icon: Icon, color, action }) => <button className="stat-card" key={label} onClick={action}><div className="stat-label"><span>{label}</span><span className={`stat-icon ${color}`}><Icon size={19} strokeWidth={1.7}/></span></div><div className="stat-value"><strong>{String(value).padStart(2, '0')}</strong><ArrowUpRight size={15}/></div><p>{note}</p></button>)}</section>
}
