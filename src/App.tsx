import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { AlertCircle, ArrowRight, ArrowUpRight, Bell, Check, CheckCheck, CheckCircle2, ChevronRight, CircleHelp, Cloud, CloudCheck, CloudOff, CreditCard, Database, Download, FileJson, HardDrive, Heart, LayoutGrid, Leaf, LoaderCircle, LogOut, Menu, Monitor, Settings2, ShieldCheck, Trash2, Upload, UsersRound, Wheat, WifiOff, X } from 'lucide-react'
import { CardsPage } from './pages/CardsPage'
import { MembersPage } from './pages/MembersPage'
import { OverviewPage } from './pages/OverviewPage'
import { SettingsPage } from './pages/SettingsPage'
import { HelpPage } from './pages/HelpPage'
import { Modal } from './components/Modal'
import { Popover } from './components/TableTools'
import { CardForm } from './components/CardForm'
import { CardDetails } from './components/CardDetails'
import { FirebaseSetup } from './components/FirebaseSetup'
import { cloudIdentity, TRUST_KEY } from './lib/cloud'
import { exportBackup, exportCardsCSV, exportCardsXML, exportMembersCSV, exportSingleCardXML, parseImport } from './lib/export'
import { sampleCards } from './lib/sampleData'
import { useWorkspace } from './lib/useWorkspace'
import { displayDate, initials, type Page, type RationCard } from './lib/types'

type Dialog =
  | { kind: 'form'; card?: RationCard; tab?: 'details' | 'members'; appendMember?: boolean }
  | { kind: 'details'; card: RationCard }
  | { kind: 'firebase'; tab?: 'guide' | 'connect' }
  | { kind: 'delete'; cards: RationCard[] }
  | { kind: 'import'; cards: RationCard[]; fileName: string }
  | { kind: 'backup' | 'clear' | 'restore' | 'member-picker' | 'sync' | 'install' }
type Toast = { message: string; type: 'success' | 'error' | 'info'; id: number }
interface InstallPrompt extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const pageNames: Record<Page, string> = { cards: 'Ration cards', members: 'Members', overview: 'Overview', settings: 'Settings', help: 'Help & support' }
function pageFromHash(): Page { const value = window.location.hash.replace('#/', ''); return value in pageNames ? value as Page : 'cards' }
function readPreference(key: string, fallback: string) { try { return localStorage.getItem(key) || fallback } catch { return fallback } }

function App() {
  const [page, setPage] = useState<Page>(pageFromHash)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsRead, setNotificationsRead] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [trusted, setTrusted] = useState(() => readPreference(TRUST_KEY, 'false') === 'true')
  const [workspaceName, setWorkspaceName] = useState(() => readPreference('annapurna-workspace-name', 'Local workspace'))
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null)
  const [cardFilter, setCardFilter] = useState<'All' | 'APL' | 'BPL'>('All')
  const [cardPageKey, setCardPageKey] = useState(0)
  const [memberCardId, setMemberCardId] = useState('')
  const [processing, setProcessing] = useState(false)
  const [actionError, setActionError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const notify = useCallback((message: string, type: Toast['type'] = 'success') => {
    clearTimeout(toastTimer.current)
    setToast({ message, type, id: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), type === 'error' ? 8500 : 4800)
  }, [])
  const workspace = useWorkspace(notify)
  const { cards, activities, connected, syncState, syncError, online } = workspace

  function navigate(next: Page) {
    setPage(next)
    window.location.hash = `/${next}`
    setMobileOpen(false)
    setProfileOpen(false)
    setNotificationsOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  function show(next: Dialog) { setActionError(''); setDialog(next); setNotificationsOpen(false); setProfileOpen(false) }
  function close() { if (!processing) { setDialog(null); setActionError('') } }
  function viewCards(type: 'All' | 'APL' | 'BPL' = 'All') { setCardFilter(type); setCardPageKey(key => key + 1); navigate('cards') }
  function setTrust(value: boolean) { setTrusted(value); localStorage.setItem(TRUST_KEY, String(value)) }
  function addMember() {
    if (!cards.length) { show({ kind: 'form' }); notify('Create a ration card first, then add its household members.', 'info'); return }
    setMemberCardId(cards[0].id)
    show({ kind: 'member-picker' })
  }
  function exportCSV(records: RationCard[]) { exportCardsCSV(records); notify(`${records.length} card records exported as CSV.`) }
  function exportXML(records: RationCard[]) { exportCardsXML(records); notify(`${records.length} ${records.length === 1 ? 'card record' : 'card records'} exported as XML.`) }
  function exportSingleXML(record: RationCard) { exportSingleCardXML(record); notify(`${record.Card_holder_Name}’s card exported as XML.`) }
  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try { const records = await parseImport(file); show({ kind: 'import', cards: records, fileName: file.name }) }
    catch (err) { notify(err instanceof Error ? err.message : 'The file could not be read.', 'error') }
  }
  async function perform(action: () => Promise<void>) {
    setProcessing(true)
    setActionError('')
    try { await action(); setDialog(null) }
    catch (err) { setActionError(err instanceof Error ? err.message : 'The action could not be completed.') }
    finally { setProcessing(false) }
  }
  async function disconnect() { try { await workspace.disconnect(); setProfileOpen(false) } catch (err) { notify(err instanceof Error ? err.message : 'Unable to sign out.', 'error') } }
  async function install() {
    if (!installPrompt) { show({ kind: 'install' }); return }
    try { await installPrompt.prompt(); const choice = await installPrompt.userChoice; if (choice.outcome === 'accepted') notify('Annapurna has a new home on your device.'); setInstallPrompt(null) }
    catch { show({ kind: 'install' }) }
  }

  useEffect(() => {
    const onHash = () => { setPage(pageFromHash()); setMobileOpen(false) }
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt) }
    window.addEventListener('hashchange', onHash)
    window.addEventListener('beforeinstallprompt', onInstall)
    if ('serviceWorker' in navigator && import.meta.env.PROD) void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    return () => { window.removeEventListener('hashchange', onHash); window.removeEventListener('beforeinstallprompt', onInstall) }
  }, [])

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (dialog) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); const search = document.getElementById('workspace-search'); if (search) search.focus(); else { navigate('cards'); setTimeout(() => document.getElementById('workspace-search')?.focus(), 150) } }
      const target = event.target as HTMLElement
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return
      if (event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); setActionError(''); setDialog({ kind: 'form' }) }
    }
    document.addEventListener('keydown', keyboard)
    return () => document.removeEventListener('keydown', keyboard)
  }, [dialog])

  const status = !online ? (connected ? 'Offline · changes queued' : 'Available offline') : syncState === 'synced' ? 'All changes synced' : syncState === 'syncing' ? 'Syncing changes…' : syncState === 'connecting' ? 'Connecting to Firebase…' : syncState === 'offline' && connected ? 'Reading from local cache' : syncState === 'error' ? 'Sync needs attention' : 'Saved on this device'
  const StatusIcon = !online ? WifiOff : connected ? syncState === 'synced' ? CloudCheck : Cloud : CloudOff
  const countMembers = cards.reduce((sum, card) => sum + card.Members.length, 0)
  const nav = [{ id: 'cards' as const, icon: CreditCard, label: 'Ration cards', count: cards.length }, { id: 'members' as const, icon: UsersRound, label: 'Members', count: null }, { id: 'overview' as const, icon: LayoutGrid, label: 'Overview', count: null }]

  return <MotionConfig reducedMotion="user"><div className="app-shell">
    <AnimatePresence>{mobileOpen && <motion.button className="mobile-nav-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} aria-label="Close navigation"/>}</AnimatePresence>
    <aside className={`sidebar ${mobileOpen ? 'mobile-visible' : ''}`}><button className="brand" onClick={() => viewCards()} aria-label="Annapurna home"><span className="brand-icon"><Wheat size={27} strokeWidth={1.5}/></span><span><strong>Annapurna<span className="brand-period">.</span></strong><small>EVERY HOUSEHOLD MATTERS</small></span></button>
      <div className="sidebar-navigation"><span className="nav-section-label">YOUR WORKSPACE</span><nav aria-label="Workspace">{nav.map(({ id, icon: Icon, label, count }) => <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => id === 'cards' ? viewCards() : navigate(id)} aria-current={page === id ? 'page' : undefined}><Icon size={19} strokeWidth={1.7}/><span>{label}</span>{count !== null && <span className="nav-count">{count}</span>}{page === id && <motion.span className="nav-active-dot" layoutId="nav-indicator"/>}</button>)}</nav>
      <div className="nav-divider"/><span className="nav-section-label">MAKE IT YOURS</span><button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')} aria-current={page === 'settings' ? 'page' : undefined}><Settings2 size={19} strokeWidth={1.7}/><span>Settings</span></button><button className={`nav-item ${page === 'help' ? 'active' : ''}`} onClick={() => navigate('help')} aria-current={page === 'help' ? 'page' : undefined}><CircleHelp size={19} strokeWidth={1.7}/><span>Help & support</span></button></div>
      <div className="sidebar-bottom"><div className="sidebar-cloud-card"><div className="sidebar-cloud-icon"><Cloud size={24} strokeWidth={1.5}/><span><Check size={8}/></span></div><strong>{connected ? 'Connected. And cared for.' : 'Local first. Always ready.'}</strong><p>{connected ? 'Your community, safely in sync with your Firebase workspace.' : 'Your records stay close. Connect Firebase to take them further.'}</p><button onClick={() => connected ? navigate('settings') : show({ kind: 'firebase' })}>{connected ? 'Manage connection' : 'Connect Firebase'}<ArrowUpRight size={15}/></button></div><div className="sidebar-workspace"><span className="workspace-device"><Monitor size={18}/></span><span><strong>{connected ? 'Cloud workspace' : workspaceName}</strong><small><span className="status-dot"/>{connected ? 'Connected to Firebase' : 'On this device'}</small></span><button className="icon-button" aria-label="Workspace settings" onClick={() => navigate('settings')}><ChevronRight size={16}/></button></div><div className="sidebar-motto"><Heart size={10}/> Thoughtfully made for your community.</div></div>
    </aside>

    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21}/></button><button className="breadcrumb-home" onClick={() => navigate('overview')}>Workspace</button><ChevronRight size={13}/><span>{pageNames[page]}</span></div><div className="topbar-actions"><button className={`sync-status ${syncState === 'error' ? 'sync-error' : ''}`} onClick={() => show({ kind: 'sync' })}><StatusIcon size={16} strokeWidth={1.6}/><span>{status}</span><span className={`status-dot ${syncState === 'error' ? 'error-dot' : ''}`}/></button><span className="topbar-divider"/><div className="relative"><button className="icon-button notification-button" aria-label="View recent activity" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false) }}><Bell size={20} strokeWidth={1.6}/>{!notificationsRead && activities.length > 0 && <span className="notification-dot"/>}</button>{notificationsOpen && <Popover className="notification-popover" onClose={() => setNotificationsOpen(false)}><div className="notification-heading"><h3>A little progress.</h3><button className="icon-button" aria-label="Mark activity as read" onClick={() => { setNotificationsRead(true); notify('You’re all caught up.', 'info') }}><CheckCheck size={17}/></button></div><p className="notification-subtitle">Recent activity in this workspace</p>{activities.length ? activities.slice(0, 4).map(a => <div className="notification-item" key={a.id}><span className="small-icon sage"><CreditCard size={16}/></span><span><strong>{a.title}</strong><small>{displayDate(a.time)}</small></span></div>) : <div className="no-activity"><Leaf size={26}/><p>A fresh workspace. Your next step starts the story.</p></div>}<button className="notification-view-all" onClick={() => { setNotificationsRead(true); navigate('overview') }}>View all activity<ArrowRight size={15}/></button></Popover>}</div><div className="relative"><button className="profile-avatar" aria-label="Open workspace menu" aria-expanded={profileOpen} onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false) }}>{initials(connected ? cloudIdentity() || 'Cloud workspace' : workspaceName)}</button>{profileOpen && <Popover className="profile-popover" onClose={() => setProfileOpen(false)}><span className="popover-caption">YOUR WORKSPACE</span><strong className="profile-name">{connected ? cloudIdentity() : workspaceName}</strong><span className="profile-mode">{connected ? 'Signed in with Firebase' : 'Local mode · No account needed'}</span><div className="menu-divider"/><button onClick={() => navigate('settings')}><Settings2 size={16}/>Workspace settings</button><button onClick={() => navigate('help')}><CircleHelp size={16}/>A little guidance</button>{connected ? <button onClick={() => void disconnect()}><LogOut size={16}/>Sign out of Firebase</button> : <button onClick={() => show({ kind: 'firebase' })}><Cloud size={16}/>Connect Firebase</button>}</Popover>}</div></div></header>
      <main className="main-content" id="main-content"><AnimatePresence mode="wait"><motion.div key={page} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
        {page === 'cards' && <CardsPage key={cardPageKey} cards={cards} initialType={cardFilter} onAdd={() => show({ kind: 'form' })} onView={card => show({ kind: 'details', card })} onEdit={card => show({ kind: 'form', card })} onDelete={records => show({ kind: 'delete', cards: records })} onMembers={() => navigate('members')} onOverview={() => navigate('overview')} onExport={exportCSV} onExportXML={exportXML} onExportSingleXML={exportSingleXML} onBackup={() => show({ kind: 'backup' })} onImport={() => fileInput.current?.click()}/>}
        {page === 'members' && <MembersPage cards={cards} onView={card => show({ kind: 'details', card })} onEdit={card => show({ kind: 'form', card, tab: 'members' })} onAdd={addMember} onExport={members => { exportMembersCSV(members); notify(`${members.length} members exported with personal numbers masked.`) }}/>}
        {page === 'overview' && <OverviewPage cards={cards} activities={activities} onCards={viewCards} onMembers={() => navigate('members')} onAdd={() => show({ kind: 'form' })} onView={card => show({ kind: 'details', card })}/>}
        {page === 'settings' && <SettingsPage cards={cards} connected={connected} syncState={syncState} syncError={syncError} trusted={trusted} workspaceName={workspaceName} installAvailable={!!installPrompt} onName={name => { localStorage.setItem('annapurna-workspace-name', name); setWorkspaceName(name); notify('Your workspace feels a little more like you.') }} onTrust={setTrust} onConnect={() => show({ kind: 'firebase', tab: 'connect' })} onDisconnect={() => void disconnect()} onBackup={() => show({ kind: 'backup' })} onExportXML={() => exportXML(cards)} onImport={() => fileInput.current?.click()} onClear={() => show({ kind: 'clear' })} onRestore={() => show({ kind: 'restore' })} onInstall={() => void install()} onGuide={() => show({ kind: 'firebase' })}/>}
        {page === 'help' && <HelpPage onFirebase={() => show({ kind: 'firebase' })} onCards={() => viewCards()} onMembers={() => navigate('members')}/>}
      </motion.div></AnimatePresence></main>
    </div>
    <input type="file" ref={fileInput} className="sr-only" tabIndex={-1} aria-label="Import a JSON or XML backup" accept="application/json,.json,application/xml,text/xml,.xml" onChange={importFile}/>

    <AnimatePresence>{dialog?.kind === 'form' && <CardForm key="card-form" card={dialog.card} initialTab={dialog.tab} appendMember={dialog.appendMember} trusted={connected || trusted} onTrust={() => setTrust(true)} onClose={close} onSave={workspace.saveCard}/>}
      {dialog?.kind === 'details' && <CardDetails key="card-details" card={cards.find(c => c.id === dialog.card.id) || dialog.card} onClose={close} onEdit={() => show({ kind: 'form', card: cards.find(c => c.id === dialog.card.id) || dialog.card })} onDelete={() => show({ kind: 'delete', cards: [dialog.card] })} onExportXML={exportSingleXML}/>}
      {dialog?.kind === 'firebase' && <FirebaseSetup key="firebase-setup" onClose={close} startTab={dialog.tab} onConnect={workspace.connect}/>}
      {dialog?.kind === 'member-picker' && <Modal key="member-picker" title="Every member needs a household." subtitle="Choose the card this person will belong to." onClose={close}><div className="modal-body"><div className="picker-illustration"><UsersRound size={32}/><CreditCard size={26}/></div><label>Cardholder name<select aria-label="Cardholder name" value={memberCardId} onChange={e => setMemberCardId(e.target.value)}>{cards.map(card => <option key={card.id} value={card.id}>{card.Card_holder_Name} · {card.Card_Number}</option>)}</select></label><p className="field-hint picker-hint">This name will appear in the Cardholder name column on the Members page.</p></div><footer className="modal-footer"><button className="button button-plain" onClick={close}>Cancel</button><button className="button button-primary" onClick={() => { const card = cards.find(c => c.id === memberCardId); if (card) show({ kind: 'form', card, tab: 'members', appendMember: true }) }}>Continue<ArrowRight size={16}/></button></footer></Modal>}
      {dialog?.kind === 'delete' && <Modal key="delete-dialog" title={dialog.cards.length === 1 ? 'Remove this household?' : `Remove ${dialog.cards.length} households?`} subtitle="A moment to make sure. This action can’t be undone." onClose={close}><div className="modal-body confirmation-body"><span className="confirmation-icon danger"><Trash2 size={27}/></span><p>{dialog.cards.length === 1 ? <><strong>{dialog.cards[0].Card_holder_Name}’s</strong> ration card and its {dialog.cards[0].Members.length} member records will be permanently removed from this {connected ? 'Firebase' : 'local'} workspace.</> : <>These {dialog.cards.length} cards and all of their member records will be permanently removed.</>}</p><p className="muted">Need a copy? Cancel and download a backup first.</p>{actionError && <div className="inline-error" role="alert"><AlertCircle size={17}/>{actionError}</div>}</div><footer className="modal-footer"><button className="button button-plain" onClick={close} disabled={processing}>Keep {dialog.cards.length === 1 ? 'household' : 'households'}</button><button className="button button-danger" disabled={processing} onClick={() => void perform(() => workspace.deleteCards(dialog.cards))}>{processing ? <LoaderCircle size={16} className="spin"/> : <Trash2 size={16}/>} {processing ? 'Removing…' : 'Yes, remove'}</button></footer></Modal>}
      {dialog?.kind === 'backup' && <Modal key="backup-dialog" title="A little backup. A lot of reassurance." subtitle="Take your complete workspace with you." onClose={close}><div className="modal-body confirmation-body"><span className="confirmation-icon sage"><FileJson size={29}/></span><div className="backup-summary"><span><strong>{cards.length}</strong>ration cards</span><span><strong>{countMembers}</strong>members</span><span><strong>JSON</strong>re-importable</span></div><div className="info-box warning"><ShieldCheck size={20}/><p>This file contains full Aadhaar numbers, contact numbers, and dates of birth. Keep it private and store it securely. Use a CSV export if you only need a summary.</p></div></div><footer className="modal-footer"><button className="button button-plain" onClick={close}>Not now</button><button className="button button-primary" onClick={() => { exportBackup(cards); close(); notify('Full backup downloaded. Keep this file somewhere safe.') }}><Download size={16}/>Download full backup</button></footer></Modal>}
      {dialog?.kind === 'import' && <Modal key="import-dialog" title={dialog.cards.length === 1 ? 'A household ready to join.' : 'A familiar community. A new home.'} subtitle={dialog.cards.length === 1 ? 'Review this household before adding it to your workspace.' : 'Review your backup before bringing it into this workspace.'} onClose={close}><div className="modal-body confirmation-body"><span className="confirmation-icon sage"><Upload size={29}/></span><p className="import-file-name">{dialog.fileName}</p><div className="backup-summary"><span><strong>{dialog.cards.length}</strong> {dialog.cards.length === 1 ? 'ration card' : 'ration cards'}</span><span><strong>{dialog.cards.reduce((sum,c) => sum+c.Members.length,0)}</strong> members</span><span><strong><Check size={27}/></strong>validated</span></div><div className="info-box"><Database size={19}/><p>Records will be added to your <strong>{connected ? 'Firebase' : 'local'} workspace</strong>. Existing records are never overwritten. Duplicate card or Aadhaar numbers will cancel the entire import.</p></div>{!connected && !trusted && <label className="consent-check"><input type="checkbox" checked={trusted} onChange={e => setTrust(e.target.checked)}/><span>This is a trusted device. Allow personal information to be saved in this browser.</span></label>}{actionError && <div className="inline-error" role="alert"><AlertCircle size={17}/>{actionError}</div>}</div><footer className="modal-footer"><button className="button button-plain" disabled={processing} onClick={close}>Cancel</button><button className="button button-primary" disabled={processing || (!connected && !trusted)} onClick={() => void perform(() => workspace.importCards(dialog.cards))}>{processing ? <LoaderCircle size={17} className="spin"/> : <Upload size={16}/>} {processing ? 'Importing…' : dialog.cards.length === 1 ? 'Import household' : 'Import households'}</button></footer></Modal>}
      {(dialog?.kind === 'clear' || dialog?.kind === 'restore') && <Modal key="reset-dialog" title={dialog.kind === 'clear' ? 'Make room for a fresh start?' : 'Bring the sample community back?'} subtitle="This replaces the local records on this device only." onClose={close}><div className="modal-body confirmation-body"><span className="confirmation-icon sand"><HardDrive size={28}/></span><p>{dialog.kind === 'clear' ? 'All local ration cards, member records, and activity will be removed. Your Firebase records will not be affected.' : 'Your current local records will be replaced with the original eight fictional sample households.'}</p><div className="info-box warning"><AlertCircle size={18}/><p>Download a JSON backup first if you want to keep your current records. This action can’t be undone.</p></div>{actionError && <div className="inline-error" role="alert">{actionError}</div>}</div><footer className="modal-footer"><button className="button button-plain" onClick={close} disabled={processing}>Cancel</button><button className={`button ${dialog.kind === 'clear' ? 'button-danger' : 'button-primary'}`} disabled={processing} onClick={() => void perform(() => workspace.replaceLocal(dialog.kind === 'clear' ? [] : structuredClone(sampleCards)))}>{processing && <LoaderCircle size={16} className="spin"/>}{dialog.kind === 'clear' ? 'Clear local workspace' : 'Restore samples'}</button></footer></Modal>}
      {dialog?.kind === 'sync' && <Modal key="sync-dialog" title="Right here. When you need it." subtitle="A clear view of where your records live." onClose={close}><div className="modal-body"><div className="sync-detail-header"><span className="confirmation-icon sage"><StatusIcon size={30}/></span><h3>{status}</h3><p>{connected ? 'Firebase is your source of truth. The sync indicator confirms when writes reach the server.' : 'Your records are saved in IndexedDB on this device. No Firebase project is connected, and nothing is uploaded.'}</p></div><div className="setting-info-row"><span>Network</span><strong>{online ? 'Online' : 'Offline'}</strong></div><div className="setting-info-row"><span>Data source</span><strong>{connected ? 'Your Firebase account' : 'Local browser storage'}</strong></div><div className="setting-info-row"><span>Records</span><strong>{cards.length} cards · {countMembers} members</strong></div>{syncError && <div className="inline-error" role="alert">{syncError}</div>}<div className="info-box"><ShieldCheck size={18}/><p>{connected ? 'Offline writes are queued in the Firebase cache on trusted devices. Wait for “All changes synced” before signing out or clearing browser data.' : 'Your browser data is not a permanent backup. Export your records regularly or connect Firebase to access them across devices.'}</p></div></div><footer className="modal-footer"><button className="button button-plain" onClick={close}>Got it</button><button className="button button-primary" onClick={() => connected ? show({ kind: 'backup' }) : show({ kind: 'firebase' })}>{connected ? <Download size={16}/> : <Cloud size={16}/>} {connected ? 'Download a backup' : 'Connect Firebase'}</button></footer></Modal>}
      {dialog?.kind === 'install' && <Modal key="install-dialog" title="Give Annapurna a home." subtitle="Your workspace, one click away on your desktop." onClose={close}><div className="modal-body"><span className="confirmation-icon sage"><Monitor size={28}/></span><ol className="install-steps"><li><span>1</span><div><strong>Open in Chrome or Edge</strong><p>Use the deployed app in a full browser tab, not an embedded preview.</p></div></li><li><span>2</span><div><strong>Look for the install icon</strong><p>Find it in the address bar, or choose Install app from the browser menu. In Chrome, check “Cast, save and share”.</p></div></li><li><span>3</span><div><strong>A little more within reach</strong><p>Confirm the installation. Annapurna opens in its own window and is available offline after the first visit.</p></div></li></ol></div><footer className="modal-footer"><span className="footer-security"><ShieldCheck size={15}/>No extra software or executable needed.</span><button className="button button-primary" onClick={close}>Sounds good<Check size={16}/></button></footer></Modal>}
    </AnimatePresence>
    <AnimatePresence>{toast && <motion.div key={toast.id} role={toast.type === 'error' ? 'alert' : 'status'} className={`toast toast-${toast.type}`} style={{ x: '-50%' }} initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}><span>{toast.type === 'error' ? <AlertCircle size={21}/> : toast.type === 'success' ? <CheckCircle2 size={21}/> : <Leaf size={20}/>}</span><p>{toast.message}</p><button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={16}/></button></motion.div>}</AnimatePresence>
  </div></MotionConfig>
}

export default App
