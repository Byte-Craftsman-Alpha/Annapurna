export type CardType = 'APL' | 'BPL'
export type Category = 'Gen' | 'OBC' | 'SC' | 'ST' | 'EWS'
export type Relation = 'self' | 'son' | 'father' | 'husband' | 'mother' | 'daughter'
export type Page = 'cards' | 'members' | 'overview' | 'settings' | 'help'

export interface Member {
  id: string
  Name: string
  Guardian_Name: string
  Gender: 'M' | 'F'
  DOB: string
  Relation_with_Holder: Relation
  Aadhaar?: string
  Contact_No?: string
}

export interface RationCard {
  id: string
  Card_holder_Name: string
  Card_Number: string
  Guardian_Name: string
  Mother_Name: string
  Total_Unit: number
  Card_Type: CardType
  Category: Category
  Members: Member[]
  createdAt: string
  updatedAt: string
  isSample?: boolean
}

export interface Activity {
  id: string
  action: 'created' | 'updated' | 'deleted' | 'imported' | 'exported'
  title: string
  time: string
}

export interface Workspace {
  cards: RationCard[]
  activities: Activity[]
}

export interface CloudConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
  storageBucket?: string
  messagingSenderId?: string
}

export type SyncState = 'local' | 'connecting' | 'synced' | 'syncing' | 'offline' | 'error'

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export function displayDate(value: string, withYear = true) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', ...(withYear ? { year: 'numeric' } : {}) }).format(date)
}

export function dobToISO(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parts = value.split('-')
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : ''
}

export function isoToDOB(value: string) {
  const parts = value.split('-')
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : ''
}

export function ageFromDOB(value: string) {
  const date = new Date(dobToISO(value))
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  if (today.getMonth() < date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())) age--
  return Number.isNaN(age) ? '—' : age
}

export const categories: Category[] = ['Gen', 'OBC', 'SC', 'ST', 'EWS']
export const relations: Relation[] = ['self', 'son', 'father', 'husband', 'mother', 'daughter']

export function validateCard(card: RationCard) {
  if (!card.Card_holder_Name?.trim() || !card.Guardian_Name?.trim() || !card.Mother_Name?.trim()) throw new Error('Please complete the cardholder, guardian, and mother names.')
  if (!/^[a-zA-Z0-9-]{4,30}$/.test(card.Card_Number || '')) throw new Error('Card numbers must contain 4–30 letters, numbers, or hyphens.')
  if (!Number.isInteger(card.Total_Unit) || card.Total_Unit < 1 || card.Total_Unit > 100) throw new Error('Total units must be a whole number from 1 to 100.')
  if (!['APL', 'BPL'].includes(card.Card_Type) || !categories.includes(card.Category)) throw new Error('Please select a valid card type and category.')
  if (!Array.isArray(card.Members)) throw new Error('Members must be a list.')
  if (card.Members.length > card.Total_Unit) throw new Error('Total units cannot be less than the number of registered members.')
  const aadhaars = new Set<string>()
  card.Members.forEach((member, index) => {
    const label = `Member ${index + 1}`
    if (!member.Name?.trim() || !member.Guardian_Name?.trim()) throw new Error(`${label}: please enter a name and guardian name.`)
    if (!['M', 'F'].includes(member.Gender) || !relations.includes(member.Relation_with_Holder)) throw new Error(`${label}: please select a valid gender and relationship.`)
    if (!/^\d{2}-\d{2}-\d{4}$/.test(member.DOB)) throw new Error(`${label}: use DD-MM-YYYY for date of birth.`)
    const iso = dobToISO(member.DOB)
    const birth = new Date(iso)
    if (Number.isNaN(birth.getTime()) || birth.toISOString().slice(0, 10) !== iso || birth > new Date() || birth.getFullYear() < 1900) throw new Error(`${label}: please enter a valid date of birth between 1900 and today.`)
    const aadhaar = member.Aadhaar?.trim()
    if (aadhaar) {
      if (!/^\d{12}$/.test(aadhaar)) throw new Error(`${label}: Aadhaar must contain exactly 12 digits.`)
      if (aadhaars.has(aadhaar)) throw new Error(`${label}: this Aadhaar number is already used in this household.`)
      aadhaars.add(aadhaar)
    }
    const contact = member.Contact_No?.trim()
    if (contact) {
      if (!/^\d{10}$/.test(contact)) throw new Error(`${label}: contact number must contain exactly 10 digits.`)
    }
  })
}
