import type { RationCard, Workspace } from './types'

// Fictional household records retained from the supplied Annapurna reference.
const households = [
  ['Rajesh Kumar', 'MH1200456789', 'BPL', 'OBC', 'Suresh Kumar', 'Kamla Devi', 5],
  ['Sunita Sharma', 'MH1200456790', 'APL', 'Gen', 'Ramesh Sharma', 'Savita Sharma', 4],
  ['Mohammed Irfan', 'MH1200456791', 'BPL', 'Gen', 'Abdul Rahman', 'Fatima Begum', 6],
  ['Priya Patil', 'MH1200456792', 'APL', 'OBC', 'Vijay Patil', 'Meena Patil', 3],
  ['Anil Deshmukh', 'MH1200456793', 'BPL', 'SC', 'Ganesh Deshmukh', 'Usha Deshmukh', 4],
  ['Lakshmi Devi', 'MH1200456794', 'BPL', 'EWS', 'Mohan Lal', 'Shanti Devi', 3],
  ['Vikram Singh', 'MH1200456795', 'APL', 'Gen', 'Pratap Singh', 'Sushila Singh', 5],
  ['Meera Joshi', 'MH1200456796', 'APL', 'ST', 'Sanjay Joshi', 'Asha Joshi', 2],
] as const

export const sampleCards: RationCard[] = households.map((h, index) => ({
  id: `sample-${index}`,
  Card_holder_Name: h[0],
  Card_Number: h[1],
  Card_Type: h[2],
  Category: h[3],
  Guardian_Name: h[4],
  Mother_Name: h[5],
  Total_Unit: h[6],
  createdAt: new Date(2026, 9, 10 - index, 10).toISOString(),
  updatedAt: new Date(2026, 9, 18 - index, 10).toISOString(),
  isSample: true,
  Members: Array.from({ length: h[6] }, (_, memberIndex) => ({
    id: `sample-${index}-${memberIndex}`,
    Name: memberIndex === 0 ? h[0] : [h[5], `Aarav ${h[0].split(' ').at(-1)}`, `Diya ${h[0].split(' ').at(-1)}`, `Rohan ${h[0].split(' ').at(-1)}`, `Anaya ${h[0].split(' ').at(-1)}`][memberIndex - 1],
    Guardian_Name: h[4],
    Gender: memberIndex === 0 ? ([1, 3, 5, 7].includes(index) ? 'F' : 'M') : memberIndex % 2 === 0 ? 'M' : 'F',
    DOB: `12-0${index % 8 + 1}-${1980 + memberIndex * 7}`,
    Relation_with_Holder: memberIndex === 0 ? 'self' : memberIndex === 1 ? 'mother' : memberIndex % 2 === 0 ? 'son' : 'daughter',
    Aadhaar: String(index * 10 + memberIndex + 1).padStart(12, '0'),
    Contact_No: '0000000000',
  })),
}))

export const sampleWorkspace: Workspace = {
  cards: sampleCards,
  activities: [
    { id: 'initial-1', action: 'updated', title: 'Rajesh Kumar’s household updated', time: sampleCards[0].updatedAt },
    { id: 'initial-2', action: 'created', title: 'Sunita Sharma’s card added', time: sampleCards[1].updatedAt },
    { id: 'initial-3', action: 'created', title: 'Mohammed Irfan’s card added', time: sampleCards[2].updatedAt },
  ],
}
