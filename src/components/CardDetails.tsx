import { useState } from 'react'
import { CreditCard, Eye, EyeOff, FileCode, Pencil, Printer, ShieldCheck, Trash2, UsersRound, Wheat } from 'lucide-react'
import { Modal } from './Modal'
import { ageFromDOB, displayDate, initials, type RationCard } from '../lib/types'

interface Props { card: RationCard; onClose: () => void; onEdit: () => void; onDelete: () => void; onExportXML?: (card: RationCard) => void }
export function CardDetails({ card, onClose, onEdit, onDelete, onExportXML }: Props) {
  const [revealed, setRevealed] = useState(false)
  return <Modal title="A household at a glance" subtitle={`Last updated ${displayDate(card.updatedAt)}`} onClose={onClose} className="detail-modal">
    <div className="modal-body detail-body" id="print-record">
      <div className="digital-card"><div className="digital-card-top"><span><Wheat size={18}/> Annapurna</span><span className="digital-card-type">{card.Card_Type} · {card.Category}</span></div><div className="digital-card-name"><small>CARDHOLDER</small><h3>{card.Card_holder_Name}</h3><p>{card.Card_Number}</p></div><div className="digital-card-bottom"><span><UsersRound size={15}/>{card.Total_Unit} household units</span><ShieldCheck size={21}/></div><span className="card-orbit orbit-one"/><span className="card-orbit orbit-two"/></div>
      {card.isSample && <p className="sample-detail">Fictional sample record · Not an official ration card</p>}
      <div className="detail-grid"><div><span>Guardian name</span><strong>{card.Guardian_Name}</strong></div><div><span>Mother’s name</span><strong>{card.Mother_Name}</strong></div><div><span>Card type</span><strong>{card.Card_Type === 'BPL' ? 'Below Poverty Line (BPL)' : 'Above Poverty Line (APL)'}</strong></div><div><span>Category</span><strong>{card.Category === 'Gen' ? 'General' : card.Category}</strong></div><div><span>Total units</span><strong>{card.Total_Unit}</strong></div><div><span>Registered members</span><strong>{card.Members.length}</strong></div></div>
      <div className="detail-members-heading"><h3>Household members <span>{card.Members.length}</span></h3><button className="text-button" onClick={() => setRevealed(!revealed)}>{revealed ? <EyeOff size={15}/> : <Eye size={15}/>} {revealed ? 'Hide details' : 'Show details'}</button></div>
      <p className="privacy-note">Aadhaar and contact numbers are masked by default.</p>
      {!card.Members.length ? <div className="detail-empty"><UsersRound size={24}/><p>No members added yet.</p><button className="text-button" onClick={onEdit}>Add household members</button></div> : <div className="detail-members">{card.Members.map((member, i) => <div className="detail-member" key={member.id}><span className={`avatar avatar-${i % 5}`}>{initials(member.Name)}</span><div className="detail-member-name"><strong>{member.Name}</strong><small>{member.Relation_with_Holder} · {member.Gender === 'M' ? 'Male' : 'Female'} · {ageFromDOB(member.DOB)} years</small><small>Born {member.DOB}</small></div><div className="sensitive-details"><span><CreditCard size={12}/>{member.Aadhaar?.trim() ? (revealed ? member.Aadhaar.replace(/(.{4})/g, '$1 ').trim() : `•••• •••• ${member.Aadhaar.slice(-4)}`) : 'No Aadhaar'}</span><small>{member.Contact_No?.trim() ? (revealed ? member.Contact_No : `••••••${member.Contact_No.slice(-4)}`) : 'No contact'}</small></div></div>)}</div>}
    </div>
    <footer className="modal-footer"><button className="icon-button danger-text" onClick={onDelete} aria-label="Delete this ration card"><Trash2 size={18}/></button><div>{onExportXML && <button className="button button-outline" onClick={() => onExportXML(card)}><FileCode size={16}/>Export XML</button>}<button className="button button-outline" onClick={() => window.print()}><Printer size={16}/>Print</button><button className="button button-primary" onClick={onEdit}><Pencil size={16}/>Edit household</button></div></footer>
  </Modal>
}
