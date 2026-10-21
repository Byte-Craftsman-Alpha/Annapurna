import { useState, type FormEvent } from 'react'
import { AlertCircle, ArrowDownToLine, ArrowUpRight, Check, Cloud, Database, Download, ExternalLink, FileCode, GitBranch, HardDrive, Import, Laptop, LogOut, RefreshCw, RotateCcw, Settings2, ShieldCheck, Sparkles, Trash2, WifiOff } from 'lucide-react'
import { cloudIdentity, cloudProject } from '../lib/cloud'
import { CURRENT_VERSION, REPO_NAME, REPO_OWNER, checkForAppUpdates, formatBytes, type UpdateCheckResult } from '../lib/updater'
import type { RationCard, SyncState } from '../lib/types'

interface Props { cards: RationCard[]; connected: boolean; syncState: SyncState; syncError: string; trusted: boolean; workspaceName: string; installAvailable: boolean; onName: (name: string) => void; onTrust: (value: boolean) => void; onConnect: () => void; onDisconnect: () => void; onBackup: () => void; onExportXML?: () => void; onImport: () => void; onClear: () => void; onRestore: () => void; onInstall: () => void; onGuide: () => void }
export function SettingsPage({ cards, connected, syncState, syncError, trusted, workspaceName, installAvailable, onName, onTrust, onConnect, onDisconnect, onBackup, onExportXML, onImport, onClear, onRestore, onInstall, onGuide }: Props) {
  const [name, setName] = useState(workspaceName)
  const [saved, setSaved] = useState(false)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null)
  const [updateError, setUpdateError] = useState('')

  function saveName(e: FormEvent) { e.preventDefault(); if (!name.trim()) return; onName(name.trim()); setSaved(true); setTimeout(() => setSaved(false), 2000) }

  async function handleCheckUpdate() {
    setCheckingUpdate(true)
    setUpdateError('')
    try {
      const result = await checkForAppUpdates()
      setUpdateResult(result)
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Unable to connect to GitHub releases.')
    } finally {
      setCheckingUpdate(false)
    }
  }

  function openUrl(url: string) {
    const desktop = (window as unknown as { annapurnaDesktop?: { openExternal?: (u: string) => void } }).annapurnaDesktop
    if (desktop?.openExternal) {
      desktop.openExternal(url)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }
  return <><div className="page-heading"><div><span className="eyebrow plain">A WORKSPACE THAT FEELS LIKE YOURS</span><h1>A few thoughtful preferences.</h1><p>Your data, your device, your way of working.</p></div><span className="heading-decor"><Settings2 size={28} strokeWidth={1.5}/></span></div>
    <div className="settings-grid"><div className="settings-stack"><section className="settings-panel"><div className="insight-heading"><div><h2>Make yourself at home</h2><p>A name for your everyday workspace.</p></div><span className="small-icon sage"><Laptop size={19}/></span></div><form onSubmit={saveName} className="workspace-name-form"><label>Workspace name<input value={name} maxLength={40} onChange={e => { setName(e.target.value); setSaved(false) }} required/></label><button className="button button-outline button-small" type="submit">{saved ? <Check size={15}/> : null}{saved ? 'Saved' : 'Save name'}</button></form></section>
    <section className="settings-panel"><div className="insight-heading"><div><h2>Close at hand. Ready to go.</h2><p>Local caching for a faster, calmer experience.</p></div><span className="small-icon sand"><HardDrive size={19}/></span></div><div className="setting-info-row"><span>Storage engine</span><strong>{connected ? 'Firebase + IndexedDB' : 'IndexedDB on this device'}</strong></div><div className="setting-info-row"><span>Current workspace</span><strong>{cards.length} cards · {cards.reduce((s,c) => s + c.Members.length, 0)} members</strong></div><div className="setting-toggle-row"><div><strong>Trusted local device</strong><p>Allow household records to be saved in this browser.</p></div><button role="switch" aria-checked={trusted} aria-label="Trusted local device" className={`toggle-switch ${trusted ? 'on' : ''}`} onClick={() => onTrust(!trusted)}><span/></button></div><div className="info-box"><ShieldCheck size={18}/><p>Browser caches are not encrypted by this app. Only save personal records on devices you trust. Turning this off requests consent on the next local save; existing local records are retained until you clear them below. Firebase caching is selected when connecting.</p></div></section>
    <section className="settings-panel"><div className="insight-heading"><div><h2>Your records, portable</h2><p>Take a backup. Start somewhere new.</p></div><span className="small-icon lilac"><Download size={19}/></span></div><div className="backup-actions"><button className="backup-action" onClick={onBackup}><span className="small-icon sage"><ArrowDownToLine size={19}/></span><span><strong>Download full backup</strong><small>JSON · includes all member details</small></span><ArrowUpRight size={17}/></button>{onExportXML && <button className="backup-action" onClick={onExportXML}><span className="small-icon lilac"><FileCode size={19}/></span><span><strong>Export all cards as XML</strong><small>XML · well-defined schema</small></span><ArrowUpRight size={17}/></button>}<button className="backup-action" onClick={onImport}><span className="small-icon sand"><Import size={19}/></span><span><strong>Import backup or XML</strong><small>JSON / XML · bulk or single card</small></span><ArrowUpRight size={17}/></button></div><p className="privacy-note">Backups contain full Aadhaar and contact numbers. Keep them private and store them securely.</p></section></div>
    <div className="settings-stack"><section className={`cloud-settings-panel ${connected ? 'is-connected' : ''}`}><span className="cloud-settings-icon"><Cloud size={30} strokeWidth={1.5}/></span><span className="connection-tag"><span/>{connected ? syncState === 'error' ? 'Needs attention' : 'Firebase connected' : 'Local-first workspace'}</span><h2>{connected ? 'A little more connected.' : 'Your community.\nConnected everywhere.'}</h2><p>{connected ? 'Your records belong to your signed-in account. Use the same account on another device to pick up where you left off.' : 'Bring your records together across devices with your own Firebase project. Your local workspace stays right here.'}</p>{connected && <div className="cloud-project-details"><span>PROJECT<strong>{cloudProject()}</strong></span><span>ACCOUNT<strong>{cloudIdentity()}</strong></span></div>}{syncError && <div className="inline-error">{syncError}</div>}<button className="button button-primary" onClick={connected ? onDisconnect : onConnect}>{connected ? <LogOut size={16}/> : <Cloud size={17}/>} {connected ? 'Sign out of Firebase' : 'Connect Firebase'}{!connected && <ArrowUpRight size={16}/>}</button><button className="cloud-guide-link" onClick={onGuide}>Where do I find my credentials? <ArrowRightIcon/></button><div className="cloud-feature"><Check size={14}/>Private, account-scoped database</div><div className="cloud-feature"><Check size={14}/>Fast reads with a local cache</div><div className="cloud-feature"><Check size={14}/>Offline write queue on trusted devices</div></section>
    <section className="settings-panel install-panel"><span className="small-icon blue"><Laptop size={20}/></span><h2>A place on your desktop</h2><p>Install Annapurna in Chrome or Edge for an app-like workspace and offline access after your first visit.</p><button className="button button-outline button-small" onClick={onInstall}>{installAvailable ? <Download size={15}/> : <ArrowUpRight size={15}/>} {installAvailable ? 'Install Annapurna' : 'How to install'}</button></section>
    <section className="settings-panel update-panel" aria-labelledby="update-heading">
      <div className="insight-heading">
        <div>
          <h2 id="update-heading">App updates & releases</h2>
          <p>Tracking the latest build release from the main branch.</p>
        </div>
        <span className="small-icon sage"><Sparkles size={19}/></span>
      </div>
      <div className="setting-info-row">
        <span>Installed version</span>
        <strong>v{updateResult?.currentVersion || CURRENT_VERSION}</strong>
      </div>
      <div className="setting-info-row">
        <span>Release channel</span>
        <span className="channel-tag"><GitBranch size={12}/>main branch releases only</span>
      </div>
      {updateError && (
        <div className="inline-error" role="alert" style={{ marginTop: 12 }}>
          <AlertCircle size={16}/><span>{updateError}</span>
        </div>
      )}
      {updateResult && (
        <div className={`update-card ${updateResult.isUpdateAvailable ? 'is-available' : ''}`}>
          <span className={`update-badge ${updateResult.isUpdateAvailable ? 'pulse' : ''}`}>
            {updateResult.isUpdateAvailable ? <Sparkles size={13}/> : <Check size={13}/>}
            {updateResult.isUpdateAvailable ? `New release available: ${updateResult.tagName}` : 'Up to date with main'}
          </span>
          {updateResult.isUpdateAvailable ? (
            <>
              <p style={{ margin: '4px 0 8px', fontSize: '11px', color: '#4d6935' }}>
                A newer release built from the <strong>main</strong> branch is ready.
              </p>
              {updateResult.asset && (
                <div style={{ background: '#fff', border: '1px solid #dbe8cd', borderRadius: 8, padding: '9px 12px', margin: '8px 0' }}>
                  <div style={{ fontSize: '10px', color: '#7a9166', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Conflict-free package for your system ({updateResult.platform}):
                  </div>
                  <div className="update-asset-name">{updateResult.asset.name}</div>
                  <div className="update-asset-meta">{formatBytes(updateResult.asset.size)} · Standalone execution, preserves local data</div>
                </div>
              )}
              {updateResult.releaseNotes && (
                <div className="update-notes-preview">
                  {updateResult.releaseNotes.slice(0, 320)}{updateResult.releaseNotes.length > 320 ? '…' : ''}
                </div>
              )}
              <div className="update-actions">
                {updateResult.asset && (
                  <button
                    type="button"
                    className="button button-primary button-small"
                    onClick={() => openUrl(updateResult.asset!.browser_download_url)}
                  >
                    <Download size={14}/>Download latest build
                  </button>
                )}
                <button
                  type="button"
                  className="button button-outline button-small"
                  onClick={() => openUrl(updateResult.releaseUrl)}
                >
                  Release notes <ExternalLink size={13}/>
                </button>
              </div>
            </>
          ) : (
            <p style={{ margin: '4px 0 0', fontSize: '10.5px', color: '#68854f' }}>
              Your workspace is running the latest build release ({updateResult.tagName}) of the main branch.
            </p>
          )}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: updateResult ? 10 : 16 }}>
        <button
          type="button"
          className="button button-outline button-small"
          disabled={checkingUpdate}
          onClick={handleCheckUpdate}
        >
          <RefreshCw size={14} className={checkingUpdate ? 'spin' : ''}/>
          {checkingUpdate ? 'Checking GitHub…' : updateResult ? 'Check again' : 'Check for updates'}
        </button>
        <button
          type="button"
          className="text-button"
          style={{ fontSize: '10px' }}
          onClick={() => openUrl(`https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`)}
        >
          All releases <ArrowUpRight size={13}/>
        </button>
      </div>
      <p className="update-note">
        <strong>Conflict-free updates:</strong> Standalone desktop binaries (.AppImage, portable Windows .exe, macOS .dmg) require zero installation changes and share your existing workspace settings and IndexedDB/Firebase records safely without conflict. For local source builds, run <code style={{ background: '#f0f5e8', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>npm run update</code>.
      </p>
    </section>
    {!connected && <section className="settings-panel danger-panel"><h2>A fresh start</h2><p>Only affects the local workspace on this browser. Download a backup before clearing records.</p><button className="text-button danger-text" onClick={onClear}><Trash2 size={15}/>Clear local workspace</button><button className="text-button" onClick={onRestore}><RotateCcw size={15}/>Restore fictional sample records</button></section>}
    </div></div><div className="settings-footer"><Database size={14}/><span>No third-party analytics. No data is uploaded until you connect and save to Firebase.</span><WifiOff size={14}/></div></>
}
function ArrowRightIcon() { return <ArrowUpRight size={14}/> }
