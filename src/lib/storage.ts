import { openDB } from 'idb'
import type { Workspace } from './types'
import { sampleWorkspace } from './sampleData'

const database = openDB('annapurna-workspace-v2', 1, {
  upgrade(db) { db.createObjectStore('workspace') },
})

export async function readLocalWorkspace(): Promise<Workspace> {
  const db = await database
  return (await db.get('workspace', 'local')) ?? structuredClone(sampleWorkspace)
}

export async function persistLocalWorkspace(data: Workspace) {
  const db = await database
  await db.put('workspace', structuredClone(data), 'local')
}

export async function mutateLocalWorkspace(update: (current: Workspace) => Workspace): Promise<Workspace> {
  const db = await database
  const transaction = db.transaction('workspace', 'readwrite')
  try {
    const current: Workspace = (await transaction.store.get('local')) ?? structuredClone(sampleWorkspace)
    const next = update(current)
    await transaction.store.put(structuredClone(next), 'local')
    await transaction.done
    return next
  } catch (error) {
    try { transaction.abort(); await transaction.done } catch { /* The write is rolled back atomically. */ }
    throw error
  }
}

export async function clearLocalWorkspace() {
  const db = await database
  await db.delete('workspace', 'local')
}
