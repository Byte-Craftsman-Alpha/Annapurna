import type { Member, RationCard } from './types'
import { validateCard } from './types'

function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const day = () => new Date().toISOString().slice(0, 10)
const cell = (value: unknown) => {
  let text = String(value ?? '')
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

function escapeXML(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function exportCardsCSV(cards: RationCard[]) {
  const headers = ['Card_holder_Name', 'Card_Number', 'Guardian_Name', 'Mother_Name', 'Total_Unit', 'Card_Type', 'Category', 'Registered_Members']
  const rows = cards.map(c => [c.Card_holder_Name, c.Card_Number, c.Guardian_Name, c.Mother_Name, c.Total_Unit, c.Card_Type, c.Category, c.Members.length])
  download('\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n'), `annapurna-cards-${day()}.csv`, 'text/csv;charset=utf-8')
}

export function exportMembersCSV(members: { member: Member; card: RationCard }[]) {
  const headers = ['Name', 'Guardian_Name', 'Gender', 'DOB', 'Cardholder_Name', 'Card_Number', 'Aadhaar_Masked', 'Contact_No_Masked']
  const rows = members.map(({ member: m, card: c }) => [m.Name, m.Guardian_Name, m.Gender, m.DOB, c.Card_holder_Name, c.Card_Number, m.Aadhaar?.trim() ? `XXXXXXXX${m.Aadhaar.slice(-4)}` : '', m.Contact_No?.trim() ? `XXXXXX${m.Contact_No.slice(-4)}` : ''])
  download('\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n'), `annapurna-members-${day()}.csv`, 'text/csv;charset=utf-8')
}

export function exportBackup(cards: RationCard[]) {
  download(JSON.stringify({ app: 'Annapurna', version: 2, exportedAt: new Date().toISOString(), cards }, null, 2), `annapurna-backup-${day()}.json`, 'application/json')
}

export function cardToXML(card: RationCard, indent = '    '): string {
  const mIndent = indent + '    '
  const fIndent = mIndent + '  '
  const membersXML = card.Members.length === 0 ? `${indent}  <Members/>` : [
    `${indent}  <Members>`,
    ...card.Members.map(m => [
      `${mIndent}<Member id="${escapeXML(m.id)}">`,
      `${fIndent}<Name>${escapeXML(m.Name)}</Name>`,
      `${fIndent}<Guardian_Name>${escapeXML(m.Guardian_Name)}</Guardian_Name>`,
      `${fIndent}<Gender>${escapeXML(m.Gender)}</Gender>`,
      `${fIndent}<DOB>${escapeXML(m.DOB)}</DOB>`,
      `${fIndent}<Relation_with_Holder>${escapeXML(m.Relation_with_Holder)}</Relation_with_Holder>`,
      m.Aadhaar?.trim() ? `${fIndent}<Aadhaar>${escapeXML(m.Aadhaar.trim())}</Aadhaar>` : `${fIndent}<Aadhaar/>`,
      m.Contact_No?.trim() ? `${fIndent}<Contact_No>${escapeXML(m.Contact_No.trim())}</Contact_No>` : `${fIndent}<Contact_No/>`,
      `${mIndent}</Member>`,
    ].join('\n')),
    `${indent}  </Members>`,
  ].join('\n')

  return [
    `${indent}<RationCard id="${escapeXML(card.id)}"${card.isSample ? ' isSample="true"' : ''}>`,
    `${indent}  <Card_holder_Name>${escapeXML(card.Card_holder_Name)}</Card_holder_Name>`,
    `${indent}  <Card_Number>${escapeXML(card.Card_Number)}</Card_Number>`,
    `${indent}  <Guardian_Name>${escapeXML(card.Guardian_Name)}</Guardian_Name>`,
    `${indent}  <Mother_Name>${escapeXML(card.Mother_Name)}</Mother_Name>`,
    `${indent}  <Total_Unit>${card.Total_Unit}</Total_Unit>`,
    `${indent}  <Card_Type>${escapeXML(card.Card_Type)}</Card_Type>`,
    `${indent}  <Category>${escapeXML(card.Category)}</Category>`,
    `${indent}  <createdAt>${escapeXML(card.createdAt)}</createdAt>`,
    `${indent}  <updatedAt>${escapeXML(card.updatedAt)}</updatedAt>`,
    membersXML,
    `${indent}</RationCard>`,
  ].join('\n')
}

export function exportCardsXML(cards: RationCard[], filename?: string) {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<annapurna xmlns="https://teamparadox.in/annapurna/schema/v2" version="2.0" exportedAt="${new Date().toISOString()}">`,
    `  <rationCards count="${cards.length}">`,
    ...cards.map(c => cardToXML(c, '    ')),
    '  </rationCards>',
    '</annapurna>',
  ].join('\n')
  download(xml, filename || `annapurna-cards-${day()}.xml`, 'application/xml;charset=utf-8')
}

export function exportSingleCardXML(card: RationCard) {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<annapurna xmlns="https://teamparadox.in/annapurna/schema/v2" version="2.0" exportedAt="${new Date().toISOString()}">`,
    cardToXML(card, '  '),
    '</annapurna>',
  ].join('\n')
  const safeNumber = card.Card_Number.replace(/[^a-zA-Z0-9-]/g, '_')
  download(xml, `annapurna-card-${safeNumber}-${day()}.xml`, 'application/xml;charset=utf-8')
}

function getChildField(parent: Element, possibleNames: string[]): string {
  const normalized = possibleNames.map(n => n.toLowerCase().replace(/[-_]/g, ''))
  for (const child of Array.from(parent.children)) {
    const cleanTag = child.localName.toLowerCase().replace(/[-_]/g, '')
    if (normalized.includes(cleanTag)) {
      return (child.textContent || '').trim()
    }
  }
  return ''
}

export function parseXMLImport(xmlText: string): RationCard[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')
  const errorNode = doc.querySelector('parsererror')
  if (errorNode) throw new Error('This file contains malformed XML. Please check the file syntax.')

  const cardNodes: Element[] = []
  const allElements = doc.getElementsByTagName('*')
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i]
    const tag = el.localName.toLowerCase().replace(/[-_]/g, '')
    if (['rationcard', 'card', 'household', 'record'].includes(tag)) {
      cardNodes.push(el)
    }
  }

  if (!cardNodes.length) throw new Error('The XML file does not contain any ration cards.')
  if (cardNodes.length > 400) throw new Error('Import up to 400 cards at a time.')

  const numbers = new Set<string>()
  return cardNodes.map(cardEl => {
    const memberNodes: Element[] = []
    for (const child of Array.from(cardEl.children)) {
      const tag = child.localName.toLowerCase().replace(/[-_]/g, '')
      if (['members', 'familymembers', 'family'].includes(tag)) {
        for (const m of Array.from(child.children)) {
          const mTag = m.localName.toLowerCase().replace(/[-_]/g, '')
          if (['member', 'person', 'familymember'].includes(mTag)) memberNodes.push(m)
        }
        break
      } else if (['member', 'person'].includes(tag)) {
        memberNodes.push(child)
      }
    }

    const members: Member[] = memberNodes.map(mEl => {
      const dobStr = getChildField(mEl, ['DOB', 'dob', 'dateOfBirth', 'date_of_birth', 'birthDate'])
      const dob = /^\d{4}-/.test(dobStr) ? dobStr.split('-').reverse().join('-') : dobStr
      const genderRaw = getChildField(mEl, ['Gender', 'gender', 'sex']).toUpperCase()
      const relationRaw = getChildField(mEl, ['Relation_with_Holder', 'relationWithHolder', 'relation_with_holder', 'relation', 'relationship']).toLowerCase()
      return {
        id: mEl.getAttribute('id') || crypto.randomUUID(),
        Name: getChildField(mEl, ['Name', 'name', 'memberName', 'full_name']),
        Guardian_Name: getChildField(mEl, ['Guardian_Name', 'guardianName', 'guardian_name', 'guardian']),
        Gender: (genderRaw === 'F' ? 'F' : 'M') as Member['Gender'],
        DOB: dob,
        Relation_with_Holder: (relationRaw || 'self') as Member['Relation_with_Holder'],
        Aadhaar: getChildField(mEl, ['Aadhaar', 'aadhaar', 'aadhaarNo', 'aadhaar_number', 'aadhar']),
        Contact_No: getChildField(mEl, ['Contact_No', 'contactNo', 'contact_no', 'contact', 'phone', 'mobile']),
      }
    })

    const totalUnitVal = Number(getChildField(cardEl, ['Total_Unit', 'totalUnit', 'total_unit', 'units', 'totalUnits']))
    const cardTypeRaw = getChildField(cardEl, ['Card_Type', 'cardType', 'card_type', 'type']).toUpperCase()
    const categoryRaw = getChildField(cardEl, ['Category', 'category'])

    const card: RationCard = {
      id: cardEl.getAttribute('id') || crypto.randomUUID(),
      Card_holder_Name: getChildField(cardEl, ['Card_holder_Name', 'cardHolderName', 'cardholder_name', 'cardholder', 'name', 'holder']),
      Card_Number: getChildField(cardEl, ['Card_Number', 'cardNumber', 'card_number', 'number', 'cardNo']).trim().toUpperCase(),
      Guardian_Name: getChildField(cardEl, ['Guardian_Name', 'guardianName', 'guardian_name', 'guardian']),
      Mother_Name: getChildField(cardEl, ['Mother_Name', 'motherName', 'mother_name', 'mother']),
      Total_Unit: Number.isInteger(totalUnitVal) && totalUnitVal > 0 ? totalUnitVal : Math.max(1, members.length),
      Card_Type: (cardTypeRaw === 'APL' ? 'APL' : 'BPL') as RationCard['Card_Type'],
      Category: (categoryRaw || 'Gen') as RationCard['Category'],
      createdAt: getChildField(cardEl, ['createdAt', 'created_at', 'created']) || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSample: cardEl.getAttribute('isSample') === 'true' || getChildField(cardEl, ['isSample', 'sample']) === 'true',
      Members: members,
    }

    validateCard(card)
    if (numbers.has(card.Card_Number)) throw new Error(`The import contains duplicate card number ${card.Card_Number}.`)
    numbers.add(card.Card_Number)
    return card
  })
}

export async function parseImport(file: File): Promise<RationCard[]> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose an import file smaller than 5 MB.')
  const text = await file.text()
  const trimmed = text.trim()

  if (trimmed.startsWith('<') || file.name.toLowerCase().endsWith('.xml') || file.type.includes('xml')) {
    return parseXMLImport(trimmed)
  }

  let parsed: unknown
  try { parsed = JSON.parse(trimmed) } catch { throw new Error('This file is not valid JSON or XML. Choose an Annapurna backup or XML file.') }
  const data = Array.isArray(parsed) ? parsed : (parsed as { cards?: unknown })?.cards
  if (!Array.isArray(data) || !data.length) throw new Error('The backup does not contain any ration cards.')
  if (data.length > 400) throw new Error('Import up to 400 cards at a time.')
  const numbers = new Set<string>()
  return data.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error(`Record ${index + 1} is not valid.`)
    const item = raw as Record<string, unknown>
    const members = item.Members ?? item.members ?? []
    if (!Array.isArray(members)) throw new Error(`Record ${index + 1}: members must be a list.`)
    const card: RationCard = {
      id: crypto.randomUUID(),
      Card_holder_Name: String(item.Card_holder_Name ?? item.name ?? ''),
      Card_Number: String(item.Card_Number ?? item.number ?? '').trim().toUpperCase(),
      Guardian_Name: String(item.Guardian_Name ?? item.guardian ?? ''),
      Mother_Name: String(item.Mother_Name ?? item.mother ?? ''),
      Total_Unit: Number(item.Total_Unit ?? item.units),
      Card_Type: (item.Card_Type ?? item.type) as RationCard['Card_Type'],
      Category: (item.Category ?? item.category) as RationCard['Category'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSample: item.isSample === true,
      Members: members.map(m => {
        const dob = String(m.DOB ?? m.dob ?? '')
        return {
          id: crypto.randomUUID(), Name: String(m.Name ?? m.name ?? ''), Guardian_Name: String(m.Guardian_Name ?? m.guardian ?? ''),
          Gender: m.Gender ?? m.gender, DOB: /^\d{4}-/.test(dob) ? dob.split('-').reverse().join('-') : dob,
          Relation_with_Holder: m.Relation_with_Holder ?? m.relation,
          Aadhaar: String(m.Aadhaar ?? m.aadhaar ?? ''), Contact_No: String(m.Contact_No ?? m.contact ?? ''),
        }
      }),
    }
    validateCard(card)
    if (numbers.has(card.Card_Number)) throw new Error(`The backup contains duplicate card number ${card.Card_Number}.`)
    numbers.add(card.Card_Number)
    return card
  })
}
