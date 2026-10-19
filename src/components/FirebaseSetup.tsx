import { useState, type FormEvent } from 'react'
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCheck, ChevronDown, Cloud, Code2, Copy, Database, ExternalLink, Flame, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import { Modal } from './Modal'
import { parseConfig, savedConfig, securityRules } from '../lib/cloud'
import type { CloudConfig } from '../lib/types'

interface Props { onClose: () => void; onConnect: (config: CloudConfig, email: string, password: string, trusted: boolean) => Promise<void>; startTab?: 'guide' | 'connect' }
export function FirebaseSetup({ onClose, onConnect, startTab = 'guide' }: Props) {
  const [tab, setTab] = useState(startTab)
  const [step, setStep] = useState(0)
  const [config, setConfig] = useState(() => { const stored = savedConfig(); return stored ? JSON.stringify(stored.config, null, 2) : '' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [trusted, setTrusted] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  async function copyRules() {
    try { await navigator.clipboard.writeText(securityRules); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { setError('Clipboard permission was denied. Select and copy the rules below instead.') }
  }
  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const parsed = parseConfig(config)
      if (!accepted) throw new Error('Confirm that Firestore rules and Email/Password authentication are ready.')
      if (!email.trim() || !password) throw new Error('Enter your Firebase Authentication user email and password.')
      setBusy(true)
      await onConnect(parsed, email.trim(), password, trusted)
      setPassword('')
      onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to connect. Please check your configuration.') }
    finally { setBusy(false) }
  }
  const steps = [
    { title: 'Create your Firebase project', description: 'Your own home for your household data.', icon: Flame },
    { title: 'Get your web app configuration', description: 'These are the Firebase credentials you need.', icon: Code2 },
    { title: 'Set up a secure sign-in', description: 'Keep your workspace tied to a permanent account.', icon: UserRound },
    { title: 'Create and protect your database', description: 'Only your signed-in account can read your records.', icon: ShieldCheck },
  ]
  return <Modal wide title="A little setup. A lot of peace of mind." subtitle="Connect your own Firebase project for secure, cross-device access." onClose={() => { if (!busy) onClose() }} className="firebase-modal">
    <div className="editor-tabs"><button className={tab === 'guide' ? 'active' : ''} onClick={() => setTab('guide')}><Flame size={17}/>Setup guide</button><button className={tab === 'connect' ? 'active' : ''} onClick={() => setTab('connect')}><Cloud size={17}/>Connect Firebase</button></div>
    {tab === 'guide' ? <><div className="modal-body firebase-guide"><div className="guide-intro"><span className="guide-intro-icon"><KeyRound size={24}/></span><div><h3>Where do I find my Firebase credentials?</h3><p>You need a web app’s <code>firebaseConfig</code> and a Firebase Authentication user—not a Google password or service-account key.</p></div></div>
      <div className="setup-steps">{steps.map((item, index) => <div className={`setup-step ${step === index ? 'open' : ''}`} key={item.title}><button className="setup-step-title" onClick={() => setStep(index)}><span className="step-number">{index + 1}</span><span><strong>{item.title}</strong><small>{item.description}</small></span><ChevronDown size={18}/></button>{step === index && <div className="setup-step-content">
        {index === 0 && <><p>Open the Firebase console and choose <strong>Create a project</strong>. Give it a name, such as “Annapurna”. Google Analytics is optional for this app.</p><a className="button button-outline button-small" href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">Open Firebase console <ExternalLink size={14}/></a><button className="next-step" onClick={() => setStep(1)}>Project ready <ArrowRight size={15}/></button></>}
        {index === 1 && <><ol><li>In your project overview, click the <strong>Web icon (&lt;/&gt;)</strong> or <strong>Add app → Web</strong>.</li><li>Name the app “Annapurna web” and click <strong>Register app</strong>. Firebase Hosting is not required.</li><li>Copy the complete <code>firebaseConfig</code> object from the SDK setup snippet.</li><li>Already registered? Open <strong>Project settings → General → Your apps → SDK setup and configuration → Config</strong>.</li></ol><div className="info-box"><KeyRound size={17}/><p>The object includes <code>apiKey</code>, <code>authDomain</code>, <code>projectId</code>, and <code>appId</code>. Web API keys identify your project; Authentication and Security Rules protect the data. Never paste a private key.</p></div><button className="next-step" onClick={() => setStep(2)}>Configuration copied <ArrowRight size={15}/></button></>}
        {index === 2 && <><ol><li>Open <strong>Authentication → Get started → Sign-in method</strong>.</li><li>Enable the <strong>Email/Password</strong> provider and save.</li><li>Go to <strong>Authentication → Users → Add user</strong>. Create a dedicated email and a strong password for this workspace.</li><li>Use that account when connecting below. Use the same account on another device to see the same cards.</li></ol><p className="muted">The app does not store your password. Firebase manages the sign-in session.</p><button className="next-step" onClick={() => setStep(3)}>Account ready <ArrowRight size={15}/></button></>}
        {index === 3 && <><ol><li>Open <strong>Firestore Database → Create database</strong>. Choose the standard database, a region close to you, and <strong>Production / locked mode</strong>.</li><li>In the <strong>Rules</strong> tab, replace the default rules with the rules below, then click <strong>Publish</strong>.</li></ol><div className="code-heading"><span>firestore.rules</span><button onClick={copyRules}>{copied ? <CheckCheck size={14}/> : <Copy size={14}/>} {copied ? 'Copied' : 'Copy rules'}</button></div><pre className="rules-code">{securityRules}</pre><p className="muted">Records are stored at <code>users/your-user-id/cards/card-id</code>. Local sample records are never automatically uploaded.</p><button className="next-step" onClick={() => setTab('connect')}>Ready to connect <ArrowRight size={15}/></button></>}
      </div>}</div>)}</div>
      <div className="guide-links"><span>Official Firebase documentation</span><a href="https://firebase.google.com/docs/web/setup" target="_blank" rel="noreferrer">Web setup <ExternalLink size={12}/></a><a href="https://firebase.google.com/docs/firestore/security/get-started" target="_blank" rel="noreferrer">Security rules <ExternalLink size={12}/></a><a href="https://firebase.google.com/docs/firestore/manage-data/enable-offline" target="_blank" rel="noreferrer">Offline caching <ExternalLink size={12}/></a></div>
    </div><footer className="modal-footer"><span className="footer-security"><LockKeyhole size={15}/>Your project. Your data. Always.</span><button className="button button-primary" onClick={() => setTab('connect')}>I have my configuration <ArrowRight size={16}/></button></footer></> : <form onSubmit={submit}><div className="modal-body connect-form">
      <div className="connection-notice"><Database size={20}/><p>Your cloud workspace is separate from your local workspace. Nothing is uploaded automatically. You can import a backup after connecting.</p></div>
      <label>Firebase web configuration <span className="required">*</span><textarea spellCheck={false} value={config} onChange={e => setConfig(e.target.value)} rows={8} placeholder={'Paste your firebaseConfig object here…\n\nProject settings → General → Your apps → Config'} required/><span className="field-hint">Accepts JSON or the JavaScript configuration snippet. No code is executed.</span></label>
      <div className="form-grid"><label>Firebase user email <span className="required">*</span><input type="email" autoComplete="username" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required/></label><label>Firebase user password <span className="required">*</span><input type="password" autoComplete="current-password" placeholder="Your workspace password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}/></label></div>
      <label className="consent-check"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}/><span>I enabled Email/Password sign-in and published the owner-only Firestore rules from the guide.</span></label>
      <label className="consent-check"><input type="checkbox" checked={trusted} onChange={e => setTrusted(e.target.checked)}/><span><strong>This is a trusted device.</strong> Keep me signed in and cache records for fast offline access. Leave unchecked on a shared device.</span></label>
      <div className="info-box"><ShieldCheck size={18}/><p>Cached data is stored in this browser, not encrypted by this app. On shared devices, leave caching off. Signing out clears the cloud cache when no other tab is using it.</p></div>
      {error && <div className="inline-error" role="alert"><AlertCircle size={18}/>{error}</div>}
    </div><footer className="modal-footer"><button type="button" className="button button-plain" onClick={() => setTab('guide')}><ArrowLeft size={15}/>Back to guide</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin"/> : <Check size={17}/>} {busy ? 'Connecting securely…' : 'Connect workspace'}</button></footer></form>}
  </Modal>
}
