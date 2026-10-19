import { useCallback, useEffect, useRef, useState } from 'react'
import type { Activity, CloudConfig, RationCard, SyncState, Workspace } from './types'
import { sampleWorkspace } from './sampleData'
import { mutateLocalWorkspace, persistLocalWorkspace, readLocalWorkspace } from './storage'
import { closeCloud, connectCloud, deleteCloudCards, friendlyError, importCloudCards, restoreCloud, savedConfig, writeCloudCard } from './cloud'

export type Notice = (message: string, type?: 'success' | 'error' | 'info') => void
const activity = (action: Activity['action'], title: string): Activity => ({ id: crypto.randomUUID(), action, title, time: new Date().toISOString() })

export function useWorkspace(notify: Notice) {
  const [cards, setCards] = useState<RationCard[]>(sampleWorkspace.cards)
  const [activities, setActivities] = useState<Activity[]>(sampleWorkspace.activities)
  const [connected, setConnected] = useState(false)
  const [syncState, setSyncState] = useState<SyncState>('local')
  const [syncError, setSyncError] = useState('')
  const [online, setOnline] = useState(navigator.onLine)
  const [ready, setReady] = useState(false)
  const booted = useRef(false)
  const connectedRef = useRef(false)
  const pendingWrites = useRef(0)
  const channel = useRef<BroadcastChannel | null>(null)
  const cardsRef = useRef(cards)
  const activitiesRef = useRef(activities)
  const notifyRef = useRef(notify)
  useEffect(() => { cardsRef.current = cards }, [cards])
  useEffect(() => { activitiesRef.current = activities }, [activities])
  useEffect(() => { notifyRef.current = notify }, [notify])

  const receiveState = useCallback((state: SyncState, message?: string) => {
    setSyncState(state === 'synced' && pendingWrites.current > 0 ? 'syncing' : state)
    if (message) { setSyncError(message); notifyRef.current(message, 'error') }
    else setSyncError('')
  }, [])

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    const broadcast = new BroadcastChannel('annapurna-workspace')
    channel.current = broadcast
    broadcast.onmessage = (event: MessageEvent<Workspace>) => {
      if (!connectedRef.current && event.data.cards) { setCards(event.data.cards); setActivities(event.data.activities) }
    }
    return () => { window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline); broadcast.close() }
  }, [])

  useEffect(() => {
    if (booted.current) return
    booted.current = true
    void (async () => {
      let local = sampleWorkspace
      try { local = await readLocalWorkspace() } catch { notifyRef.current('Device storage is unavailable. Enable browser storage to save local records.', 'error') }
      setCards(local.cards)
      setActivities(local.activities)
      if (savedConfig()) {
        connectedRef.current = true
        setConnected(true)
        setCards([])
        setActivities([])
        const restored = await restoreCloud(setCards, receiveState)
        if (!restored) { connectedRef.current = false; setConnected(false); setCards(local.cards); setActivities(local.activities) }
      }
      setReady(true)
    })()
  }, [receiveState])

  function publishLocal(workspace: Workspace) {
    setCards(workspace.cards)
    setActivities(workspace.activities)
    cardsRef.current = workspace.cards
    activitiesRef.current = workspace.activities
    channel.current?.postMessage(workspace)
  }

  async function commitLocal(workspace: Workspace) {
    await persistLocalWorkspace(workspace)
    publishLocal(workspace)
  }

  async function trackCloudWrite(promise: Promise<void>, message: string) {
    pendingWrites.current++
    setSyncState('syncing')
    let settled = false
    const tracked = promise.then(() => {
      settled = true
      pendingWrites.current--
      if (pendingWrites.current === 0) setSyncState('synced')
      notifyRef.current(message)
    }, error => {
      settled = true
      pendingWrites.current--
      const text = friendlyError(error)
      setSyncState('error')
      setSyncError(text)
      notifyRef.current(text, 'error')
      throw new Error(text)
    })
    if (!navigator.onLine) {
      notifyRef.current(savedConfig()?.trusted ? 'Saved to the device queue. Firebase will sync when you reconnect.' : 'Queued in this session. Keep this tab open until Firebase confirms the sync.', 'info')
      void tracked.catch(() => undefined)
      return
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([tracked, new Promise<void>(resolve => { timer = setTimeout(resolve, 7000) })])
      if (!settled) { notifyRef.current('Write submitted. Waiting for Firebase confirmation—watch the sync indicator.', 'info'); void tracked.catch(() => undefined) }
    } finally { clearTimeout(timer) }
  }

  function checkRecord(list: RationCard[], card: RationCard, previous?: string) {
    if (list.some(item => item.id !== card.id && item.Card_Number.toUpperCase() === card.Card_Number.toUpperCase())) throw new Error('This card number already belongs to another household.')
    const incomingAadhaar = new Set(card.Members.map(m => m.Aadhaar))
    if (list.some(item => item.id !== card.id && item.Members.some(m => incomingAadhaar.has(m.Aadhaar)))) throw new Error('An Aadhaar number on this card is already registered in another household.')
    const existing = list.find(item => item.id === card.id)
    if (previous && !existing) throw new Error('This household was removed in another tab. Your edit was not saved.')
    if (previous && existing && existing.updatedAt !== previous) throw new Error('This record changed in another tab. Reopen the latest version before saving.')
    return existing
  }

  async function saveCard(card: RationCard, previous?: string) {
    if (connectedRef.current) {
      const existing = checkRecord(cardsRef.current, card, previous)
      const event = activity(existing ? 'updated' : 'created', `${card.Card_holder_Name}’s ${existing ? 'household updated' : 'card added'}`)
      await trackCloudWrite(writeCloudCard(card, previous), existing ? 'Household updated in Firebase.' : 'Ration card added to Firebase.')
      setActivities(current => [event, ...current].slice(0, 50))
    } else {
      const next = await mutateLocalWorkspace(local => {
        const existing = checkRecord(local.cards, card, previous)
        const event = activity(existing ? 'updated' : 'created', `${card.Card_holder_Name}’s ${existing ? 'household updated' : 'card added'}`)
        return { cards: existing ? local.cards.map(item => item.id === card.id ? card : item) : [card, ...local.cards], activities: [event, ...local.activities].slice(0, 50) }
      })
      publishLocal(next)
      notifyRef.current(previous ? 'Household updated. A little more organized.' : 'A new household, accounted for.')
    }
  }

  async function deleteCards(records: RationCard[]) {
    const ids = new Set(records.map(c => c.id))
    const event = activity('deleted', records.length === 1 ? `${records[0].Card_holder_Name}’s card removed` : `${records.length} ration cards removed`)
    if (connectedRef.current) {
      await trackCloudWrite(deleteCloudCards(records), `${records.length === 1 ? 'Ration card' : 'Ration cards'} deleted from Firebase.`)
      setActivities(current => [event, ...current].slice(0, 50))
    } else {
      const next = await mutateLocalWorkspace(local => {
        records.forEach(record => {
          const current = local.cards.find(c => c.id === record.id)
          if (current && current.updatedAt !== record.updatedAt) throw new Error('A household changed in another tab. Review it again before deleting.')
        })
        return { cards: local.cards.filter(c => !ids.has(c.id)), activities: [event, ...local.activities].slice(0, 50) }
      })
      publishLocal(next)
      notifyRef.current(`${records.length === 1 ? 'Ration card' : `${records.length} ration cards`} removed.`)
    }
  }

  function checkImport(existing: RationCard[], records: RationCard[]) {
    const duplicate = records.find(c => existing.some(e => e.Card_Number.toUpperCase() === c.Card_Number.toUpperCase()))
    if (duplicate) throw new Error(`Card ${duplicate.Card_Number} already exists. No records were imported. Remove duplicate records from your backup first.`)
    const aadhaars = new Set(existing.flatMap(c => c.Members.map(m => m.Aadhaar?.trim()).filter(Boolean) as string[]))
    for (const card of records) for (const member of card.Members) {
      const aadh = member.Aadhaar?.trim()
      if (aadh) {
        if (aadhaars.has(aadh)) throw new Error(`Aadhaar ending ${aadh.slice(-4)} appears more than once. No records were imported.`)
        aadhaars.add(aadh)
      }
    }
  }

  async function importCards(records: RationCard[]) {
    const event = activity('imported', `${records.length} households imported from backup`)
    if (connectedRef.current) {
      checkImport(cardsRef.current, records)
      await trackCloudWrite(importCloudCards(records), `${records.length} households imported to Firebase.`)
      setActivities(current => [event, ...current].slice(0, 50))
    } else {
      const next = await mutateLocalWorkspace(local => {
        checkImport(local.cards, records)
        return { cards: [...records, ...local.cards], activities: [event, ...local.activities].slice(0, 50) }
      })
      publishLocal(next)
      notifyRef.current(`${records.length} households imported successfully.`)
    }
  }

  async function connect(config: CloudConfig, email: string, password: string, trusted: boolean) {
    if (connectedRef.current) throw new Error('Sign out of the current Firebase workspace in Settings before connecting another account.')
    const local = { cards: cardsRef.current, activities: activitiesRef.current }
    setCards([])
    setActivities([])
    try {
      await connectCloud(config, email, password, trusted, setCards, receiveState)
      connectedRef.current = true
      setConnected(true)
      notifyRef.current('Signed in. Your Firebase workspace is opening.', 'info')
    } catch (error) {
      setCards(local.cards)
      setActivities(local.activities)
      throw error
    }
  }

  async function disconnect() {
    if (syncState === 'syncing' || pendingWrites.current > 0) throw new Error('Wait for pending writes to finish before signing out. Reconnect to the internet if needed.')
    await closeCloud()
    connectedRef.current = false
    setConnected(false)
    setSyncState('local')
    setSyncError('')
    const local = await readLocalWorkspace()
    setCards(local.cards)
    setActivities(local.activities)
    notifyRef.current('Signed out. Your local workspace is ready.')
  }

  async function replaceLocal(records: RationCard[]) {
    if (connectedRef.current) throw new Error('Switch to your local workspace before changing local records.')
    await commitLocal({ cards: records, activities: [] })
    notifyRef.current(records.length ? 'Sample workspace restored.' : 'Local workspace cleared. A fresh start.')
  }

  return { cards, activities, connected, syncState, syncError, online, ready, saveCard, deleteCards, importCards, connect, disconnect, replaceLocal }
}
