import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, ArrowRight, Check, ChevronDown, CreditCard, LoaderCircle, Plus, ShieldCheck, Trash2, UserRound, UsersRound } from 'lucide-react'
import { Modal } from './Modal'
import { categories, relations, validateCard, type Member, type RationCard } from '../lib/types'

interface Props {
  card?: RationCard
  initialTab?: 'details' | 'members'
  appendMember?: boolean
  trusted: boolean
  onTrust: () => void
  onClose: () => void
  onSave: (card: RationCard, previous?: string) => Promise<void>
}

function emptyMember(card: RationCard): Member {
  const self = card.Members.length === 0
  return { id: crypto.randomUUID(), Name: self ? card.Card_holder_Name : '', Guardian_Name: card.Guardian_Name, Gender: 'M', DOB: '', Relation_with_Holder: self ? 'self' : 'son', Aadhaar: '', Contact_No: '' }
}

export function CardForm({ card, initialTab = 'details', appendMember, trusted, onTrust, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<RationCard>(() => {
    const value = card ? structuredClone(card) : { id: crypto.randomUUID(), Card_holder_Name: '', Card_Number: '', Guardian_Name: '', Mother_Name: '', Total_Unit: 1, Card_Type: 'BPL' as const, Category: 'Gen' as const, Members: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    if (appendMember) { value.Members.push(emptyMember(value)); value.Total_Unit = Math.max(value.Total_Unit, value.Members.length) }
    return value
  })
  const [tab, setTab] = useState(initialTab)
  const [expanded, setExpanded] = useState(appendMember ? draft.Members.at(-1)?.id : draft.Members[0]?.id)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [consent, setConsent] = useState(trusted)
  const update = <K extends keyof RationCard>(key: K, value: RationCard[K]) => setDraft(current => ({ ...current, [key]: value }))
  const updateMember = <K extends keyof Member>(id: string, key: K, value: Member[K]) => setDraft(current => ({ ...current, Members: current.Members.map(m => m.id === id ? { ...m, [key]: value } : m) }))
  function addMember() {
    const member = emptyMember(draft)
    setDraft(current => ({ ...current, Total_Unit: Math.max(current.Total_Unit, current.Members.length + 1), Members: [...current.Members, member] }))
    setExpanded(member.id)
  }
  async function save(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const normalized = { ...draft, Card_holder_Name: draft.Card_holder_Name.trim(), Card_Number: draft.Card_Number.trim().toUpperCase(), Guardian_Name: draft.Guardian_Name.trim(), Mother_Name: draft.Mother_Name.trim(), updatedAt: new Date().toISOString() }
      validateCard(normalized)
      if (!consent) throw new Error('Please confirm that this is a trusted device before saving household information.')
      setSaving(true)
      await onSave(normalized, card?.updatedAt)
      if (!trusted) onTrust()
      onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'The record could not be saved. Please try again.') }
    finally { setSaving(false) }
  }
  return <Modal wide title={card ? 'Edit household' : 'A new household, accounted for.'} subtitle={card ? `Update the details for ${card.Card_holder_Name}.` : 'Start with the card details. You can add family members now or later.'} onClose={() => { if (!saving) onClose() }} className="editor-modal">
    <form onSubmit={save} noValidate>
      <div className="editor-tabs"><button type="button" className={tab === 'details' ? 'active' : ''} onClick={() => setTab('details')}><CreditCard size={17}/>Card details</button><button type="button" className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}><UsersRound size={17}/>Household members <span>{draft.Members.length}</span></button></div>
      <div className="modal-body editor-body">
        {tab === 'details' ? <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="form-fields" key="details">
          <div className="section-caption"><span className="small-icon sage"><UserRound size={17}/></span><div><h3>The person behind the card</h3><p>All card details are required.</p></div></div>
          <div className="form-grid">
            <label>Cardholder name <span className="required">*</span><input autoComplete="off" value={draft.Card_holder_Name} onChange={e => update('Card_holder_Name', e.target.value)} placeholder="e.g. Rajesh Kumar" maxLength={100}/></label>
            <label>Card number <span className="required">*</span><input autoComplete="off" value={draft.Card_Number} onChange={e => update('Card_Number', e.target.value.toUpperCase())} placeholder="e.g. MH1200456789" maxLength={30}/><span className="field-hint">A unique number for this household</span></label>
            <label>Guardian name <span className="required">*</span><input value={draft.Guardian_Name} onChange={e => update('Guardian_Name', e.target.value)} placeholder="Guardian’s full name" maxLength={100}/></label>
            <label>Mother’s name <span className="required">*</span><input value={draft.Mother_Name} onChange={e => update('Mother_Name', e.target.value)} placeholder="Mother’s full name" maxLength={100}/></label>
          </div>
          <div className="form-divider"/>
          <div className="form-grid three-columns">
            <label>Total units <span className="required">*</span><input type="number" min={1} max={100} value={draft.Total_Unit || ''} onChange={e => update('Total_Unit', Number(e.target.value))}/><span className="field-hint">People covered by this card</span></label>
            <div className="field-label">Card type <span className="required">*</span><div className="type-toggle">{(['APL', 'BPL'] as const).map(type => <button key={type} type="button" className={draft.Card_Type === type ? 'selected' : ''} aria-pressed={draft.Card_Type === type} onClick={() => update('Card_Type', type)}>{draft.Card_Type === type && <Check size={14}/>} {type}</button>)}</div></div>
            <label>Category <span className="required">*</span><select value={draft.Category} onChange={e => update('Category', e.target.value as RationCard['Category'])}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
          </div>
          <button className="member-invitation" type="button" onClick={() => setTab('members')}><span className="small-icon sage"><UsersRound size={20}/></span><span><strong>Make it a family.</strong><small>Add household members to keep everyone connected. Optional.</small></span><ArrowRight size={19}/></button>
        </motion.div> : <motion.div key="members" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
          <div className="members-form-heading"><div><h3>A place for everyone</h3><p>Members belong to {draft.Card_holder_Name || 'this cardholder'}’s card.</p></div><button className="button button-outline button-small" type="button" onClick={addMember}><Plus size={16}/>Add member</button></div>
          {!draft.Members.length && <div className="empty-members"><span className="empty-icon"><UsersRound size={30}/></span><h3>Every family starts with one.</h3><p>No members added yet. This step is completely optional.</p><button className="button button-primary button-small" type="button" onClick={addMember}><Plus size={16}/>Add first member</button></div>}
          <div className="member-accordions">{draft.Members.map((m, index) => <div className={`member-accordion ${expanded === m.id ? 'expanded' : ''}`} key={m.id}>
            <div className="member-accordion-heading"><button type="button" className="member-expand" onClick={() => setExpanded(expanded === m.id ? undefined : m.id)}><span className="member-index">{String(index + 1).padStart(2, '0')}</span><span>{m.Name || 'New member'}<small>{m.Relation_with_Holder} · {draft.Card_holder_Name || 'New household'}</small></span><ChevronDown size={18} className={expanded === m.id ? 'rotate' : ''}/></button><button type="button" className="icon-button danger-text" aria-label={`Remove ${m.Name || 'member'}`} onClick={() => update('Members', draft.Members.filter(item => item.id !== m.id))}><Trash2 size={16}/></button></div>
            <AnimatePresence initial={false}>{expanded === m.id && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="member-fields-wrap"><div className="form-grid member-fields">
              <label>Member name <span className="required">*</span><input value={m.Name} onChange={e => updateMember(m.id, 'Name', e.target.value)} placeholder="Full name" maxLength={100}/></label>
              <label>Guardian name <span className="required">*</span><input value={m.Guardian_Name} onChange={e => updateMember(m.id, 'Guardian_Name', e.target.value)} placeholder="Guardian’s full name" maxLength={100}/></label>
              <label>Gender <span className="required">*</span><select value={m.Gender} onChange={e => updateMember(m.id, 'Gender', e.target.value as 'M' | 'F')}><option value="M">Male</option><option value="F">Female</option></select></label>
              <label>Date of birth <span className="required">*</span><input inputMode="numeric" placeholder="DD-MM-YYYY" value={m.DOB} maxLength={10} onChange={e => updateMember(m.id, 'DOB', e.target.value.replace(/[^0-9-]/g, ''))}/><span className="field-hint">Day-month-year, e.g. 12-01-1990</span></label>
              <label>Relationship with holder <span className="required">*</span><select value={m.Relation_with_Holder} onChange={e => updateMember(m.id, 'Relation_with_Holder', e.target.value as Member['Relation_with_Holder'])}>{relations.map(r => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}</select></label>
              <label>Aadhaar number <span className="optional">(optional)</span><input autoComplete="off" inputMode="numeric" maxLength={12} value={m.Aadhaar} placeholder="12-digit Aadhaar number (optional)" onChange={e => updateMember(m.id, 'Aadhaar', e.target.value.replace(/\D/g, ''))}/></label>
              <label>Contact number <span className="optional">(optional)</span><div className="phone-input"><span>+91</span><input autoComplete="off" inputMode="numeric" maxLength={10} value={m.Contact_No} placeholder="10-digit mobile number (optional)" onChange={e => updateMember(m.id, 'Contact_No', e.target.value.replace(/\D/g, ''))}/></div></label>
            </div></motion.div>}</AnimatePresence>
          </div>)}</div>
        </motion.div>}
        {!trusted && <label className="consent-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/><span>This is a trusted device. I understand household information will be cached in this browser.</span></label>}
        {error && <div className="inline-error" role="alert"><AlertCircle size={18}/><span>{error}</span></div>}
      </div>
      <footer className="modal-footer"><span className="footer-security"><ShieldCheck size={15}/>Your changes stay in your workspace</span><div><button type="button" className="button button-plain" disabled={saving} onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle size={17} className="spin"/> : <Check size={17}/>} {saving ? 'Saving changes…' : card ? 'Save changes' : 'Create ration card'}</button></div></footer>
    </form>
  </Modal>
}
