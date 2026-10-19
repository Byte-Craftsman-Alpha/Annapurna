import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence, type Auth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, collection, onSnapshot, doc, writeBatch, runTransaction, terminate, clearIndexedDbPersistence, type Firestore, type Unsubscribe } from 'firebase/firestore'
import type { CloudConfig, RationCard, SyncState } from './types'

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let unsubscribe: Unsubscribe | undefined
let unsubscribeAuth: Unsubscribe | undefined
let currentConfig: CloudConfig | null = null
export const CONFIG_KEY = 'annapurna-firebase-v2'
export const TRUST_KEY = 'annapurna-trusted-device'

export const securityRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/cards/{cardId} {
      allow read: if request.auth != null
                  && request.auth.uid == userId;
      allow create, update: if request.auth != null
                  && request.auth.uid == userId
                  && request.resource.data.Card_holder_Name is string
                  && request.resource.data.Card_Number is string
                  && request.resource.data.Total_Unit is int
                  && request.resource.data.Total_Unit > 0
                  && request.resource.data.Card_Type in ['APL', 'BPL']
                  && request.resource.data.Category in ['Gen', 'OBC', 'SC', 'ST', 'EWS']
                  && request.resource.data.Members is list;
      allow delete: if request.auth != null
                  && request.auth.uid == userId;
    }
  }
}`

export function parseConfig(raw: string): CloudConfig {
  if (/private_key|service_account|BEGIN PRIVATE KEY/.test(raw)) throw new Error('This looks like a service-account key. Do not use it in a browser. Copy the web app firebaseConfig object instead.')
  const fields = ['apiKey', 'authDomain', 'projectId', 'appId', 'storageBucket', 'messagingSenderId']
  const config: Record<string, string> = {}
  for (const field of fields) {
    const match = raw.match(new RegExp(`["']?${field}["']?\\s*:\\s*["']([^"']+)["']`))
    if (match) config[field] = match[1]
  }
  for (const required of ['apiKey', 'authDomain', 'projectId', 'appId']) {
    if (!config[required]) throw new Error(`Your configuration is missing ${required}. Copy the complete firebaseConfig object.`)
  }
  if (!/^[a-z0-9-]+$/.test(config.projectId)) throw new Error('The project ID is not valid.')
  return config as unknown as CloudConfig
}

export function savedConfig(): { config: CloudConfig; trusted: boolean } | null {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null') } catch { return null }
}

export function cloudIdentity() { return auth?.currentUser?.email || '' }
export function cloudProject() { return currentConfig?.projectId || '' }

async function initialize(config: CloudConfig, trusted: boolean) {
  if (app) await closeCloud(false)
  app = initializeApp(config, 'annapurna-workspace')
  auth = getAuth(app)
  await setPersistence(auth, trusted ? browserLocalPersistence : browserSessionPersistence)
  db = initializeFirestore(app, { localCache: trusted ? persistentLocalCache({ tabManager: persistentMultipleTabManager() }) : memoryLocalCache() })
  currentConfig = config
}

function subscribe(onCards: (cards: RationCard[]) => void, onState: (state: SyncState, message?: string) => void) {
  if (!db || !auth?.currentUser) throw new Error('Please sign in before connecting the database.')
  const userId = auth.currentUser.uid
  unsubscribeAuth = onAuthStateChanged(auth, user => {
    if (user?.uid !== userId) {
      unsubscribe?.()
      onCards([])
      onState('error', 'Your sign-in changed in another tab. Sign out here, then reconnect to your workspace.')
    }
  })
  unsubscribe = onSnapshot(collection(db, 'users', userId, 'cards'), { includeMetadataChanges: true }, snapshot => {
    onCards(snapshot.docs.map(item => ({ ...item.data(), id: item.id }) as RationCard))
    onState(snapshot.metadata.hasPendingWrites ? 'syncing' : snapshot.metadata.fromCache ? 'offline' : 'synced')
  }, error => onState('error', friendlyError(error)))
}

export async function connectCloud(config: CloudConfig, email: string, password: string, trusted: boolean, onCards: (cards: RationCard[]) => void, onState: (state: SyncState, message?: string) => void) {
  try {
    onState('connecting')
    await initialize(config, trusted)
    await signInWithEmailAndPassword(auth!, email, password)
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ config, trusted }))
    subscribe(onCards, onState)
  } catch (error) {
    await closeCloud(false)
    onState('local')
    throw new Error(friendlyError(error))
  }
}

export async function restoreCloud(onCards: (cards: RationCard[]) => void, onState: (state: SyncState, message?: string) => void) {
  const stored = savedConfig()
  if (!stored) return false
  onState('connecting')
  try {
    await initialize(stored.config, stored.trusted)
    const user = await new Promise<import('firebase/auth').User | null>(resolve => {
      const stop = onAuthStateChanged(auth!, user => { stop(); resolve(user) })
    })
    if (!user) {
      await closeCloud(false)
      onState('local')
      return false
    }
    subscribe(onCards, onState)
    return true
  } catch (error) {
    await closeCloud(false)
    onState('local', friendlyError(error))
    return false
  }
}

export async function writeCloudCard(card: RationCard, expectedUpdatedAt?: string) {
  if (!db || !auth?.currentUser) throw new Error('Firebase is not connected.')
  const reference = doc(db, 'users', auth.currentUser.uid, 'cards', card.id)
  if (expectedUpdatedAt && navigator.onLine) {
    await runTransaction(db, async transaction => {
      const current = await transaction.get(reference)
      if (!current.exists()) throw new Error('This household was removed on another device. Your edit was not saved.')
      if (current.data().updatedAt !== expectedUpdatedAt) throw new Error('This household was changed on another device. Reopen the latest record before saving.')
      transaction.set(reference, card)
    })
  } else {
    const batch = writeBatch(db)
    batch.set(reference, card)
    await batch.commit()
  }
}

export async function deleteCloudCards(cards: RationCard[]) {
  if (!db || !auth?.currentUser) throw new Error('Firebase is not connected.')
  if (navigator.onLine) {
    const references = cards.map(card => doc(db!, 'users', auth!.currentUser!.uid, 'cards', card.id))
    await runTransaction(db, async transaction => {
      const snapshots = await Promise.all(references.map(reference => transaction.get(reference)))
      snapshots.forEach((snapshot, index) => {
        if (snapshot.exists() && snapshot.data().updatedAt !== cards[index].updatedAt) throw new Error('A household changed on another device. Review the latest version before deleting it.')
      })
      references.forEach(reference => transaction.delete(reference))
    })
    return
  }
  const batch = writeBatch(db)
  cards.forEach(card => batch.delete(doc(db!, 'users', auth!.currentUser!.uid, 'cards', card.id)))
  await batch.commit()
}

export async function importCloudCards(cards: RationCard[]) {
  if (!db || !auth?.currentUser) throw new Error('Firebase is not connected.')
  if (cards.length > 400) throw new Error('Import up to 400 cards at a time to keep the write atomic.')
  const batch = writeBatch(db)
  cards.forEach(card => batch.set(doc(db!, 'users', auth!.currentUser!.uid, 'cards', card.id), card))
  await batch.commit()
}

export async function closeCloud(clear = true) {
  unsubscribe?.()
  unsubscribe = undefined
  unsubscribeAuth?.()
  unsubscribeAuth = undefined
  if (auth && clear) await signOut(auth)
  if (db) {
    try { await terminate(db); if (clear) await clearIndexedDbPersistence(db) } catch { /* An open tab may still own the cache; access remains scoped to the signed-in user. */ }
  }
  if (app) await deleteApp(app)
  app = null
  auth = null
  db = null
  currentConfig = null
  if (clear) localStorage.removeItem(CONFIG_KEY)
}

export function friendlyError(error: unknown) {
  const value = error as { code?: string; message?: string }
  switch (value.code) {
    case 'auth/invalid-credential': return 'The email or password is incorrect. Use an account from Firebase Authentication → Users.'
    case 'auth/operation-not-allowed': return 'Enable Email/Password under Firebase Authentication → Sign-in method.'
    case 'auth/invalid-api-key': return 'The API key is not valid. Copy the web configuration from Project settings.'
    case 'auth/network-request-failed': return 'Firebase could not be reached. Check your internet connection.'
    case 'auth/too-many-requests': return 'Too many sign-in attempts. Please wait a moment before trying again.'
    case 'permission-denied': return 'Database access was denied. Publish the owner-only rules from the setup guide in Firestore → Rules.'
    case 'failed-precondition': return 'Create your Cloud Firestore database, then reconnect.'
    default: return value.message || 'Something went wrong. Your local records have not been removed.'
  }
}
