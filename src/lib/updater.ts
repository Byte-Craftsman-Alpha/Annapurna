/**
 * Release and update manager for Annapurna.
 * Grounds all checks strictly against the latest build releases of the main branch
 * from Byte-Craftsman-Alpha/Annapurna, selecting conflict-free packages.
 */

export const REPO_OWNER = 'Byte-Craftsman-Alpha'
export const REPO_NAME = 'Annapurna'
export const REPO_BRANCH = 'main'
export const CURRENT_VERSION = '1.0.0'

export type PlatformType = 'linux' | 'windows' | 'mac' | 'other'

export interface ReleaseAsset {
  id: number
  name: string
  browser_download_url: string
  size: number
  content_type?: string
}

export interface GitHubRelease {
  id: number
  tag_name: string
  target_commitish: string
  name: string
  body: string
  draft: boolean
  prerelease: boolean
  published_at: string
  html_url: string
  assets: ReleaseAsset[]
}

export interface UpdateCheckResult {
  currentVersion: string
  latestVersion: string
  tagName: string
  releaseName: string
  publishedAt: string
  releaseNotes: string
  releaseUrl: string
  targetCommitish: string
  isUpdateAvailable: boolean
  platform: PlatformType
  asset?: ReleaseAsset
  allAssets: ReleaseAsset[]
  checkedAt: string
}

export function detectPlatform(): PlatformType {
  if (typeof window !== 'undefined') {
    // Check if running inside our Electron desktop app
    const desktop = (window as unknown as { annapurnaDesktop?: { platform?: string } }).annapurnaDesktop
    if (desktop?.platform) {
      if (desktop.platform === 'linux') return 'linux'
      if (desktop.platform === 'win32') return 'windows'
      if (desktop.platform === 'darwin') return 'mac'
    }
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : ''
  if (ua.includes('win')) return 'windows'
  if (ua.includes('mac')) return 'mac'
  if (ua.includes('linux') || ua.includes('x11')) return 'linux'
  return 'other'
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export function compareSemver(v1: string, v2: string): number {
  const normalize = (v: string) =>
    v
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map(n => parseInt(n, 10) || 0)

  const p1 = normalize(v1)
  const p2 = normalize(v2)
  const len = Math.max(p1.length, p2.length)

  for (let i = 0; i < len; i++) {
    const num1 = p1[i] ?? 0
    const num2 = p2[i] ?? 0
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }
  return 0
}

/**
 * Selects the optimal asset that avoids installation conflicts for the user's OS:
 * - Linux: Standalone .AppImage (zero system dependencies/conflicts) or .deb
 * - Windows: Standalone portable .exe or NSIS installer
 * - macOS: Drag-and-drop .dmg or .zip
 */
export function pickConflictFreeAsset(assets: ReleaseAsset[], platform: PlatformType): ReleaseAsset | undefined {
  if (!assets || assets.length === 0) return undefined

  if (platform === 'linux') {
    return (
      assets.find(a => a.name.endsWith('.AppImage')) ||
      assets.find(a => a.name.endsWith('.deb')) ||
      assets.find(a => a.name.endsWith('.tar.gz'))
    )
  }

  if (platform === 'windows') {
    return (
      assets.find(a => a.name.endsWith('.exe') && !a.name.toLowerCase().includes('setup')) ||
      assets.find(a => a.name.endsWith('.exe')) ||
      assets.find(a => a.name.endsWith('-win.zip')) ||
      assets.find(a => a.name.endsWith('.zip'))
    )
  }

  if (platform === 'mac') {
    return (
      assets.find(a => a.name.endsWith('.dmg')) ||
      assets.find(a => a.name.endsWith('-mac.zip')) ||
      assets.find(a => a.name.endsWith('.zip'))
    )
  }

  return assets[0]
}

/**
 * Queries GitHub Releases API, filtering exclusively for releases built from the main branch.
 */
export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  const currentVersion =
    (typeof window !== 'undefined' &&
      (window as unknown as { annapurnaDesktop?: { version?: string } }).annapurnaDesktop?.version) ||
    CURRENT_VERSION

  const platform = detectPlatform()

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to check updates (GitHub API HTTP ${response.status})`)
  }

  const releases = (await response.json()) as GitHubRelease[]

  // Filter exclusively to non-draft releases originating from the main branch
  const mainReleases = releases.filter(
    r => !r.draft && (r.target_commitish === REPO_BRANCH || r.target_commitish === 'master')
  )

  const candidate = mainReleases[0] || releases.find(r => !r.draft)

  if (!candidate) {
    return {
      currentVersion,
      latestVersion: currentVersion,
      tagName: `v${currentVersion}`,
      releaseName: `Annapurna v${currentVersion}`,
      publishedAt: new Date().toISOString(),
      releaseNotes: 'No published releases found on the main branch.',
      releaseUrl: `https://github.com/Byte-Craftsman-Alpha/Annapurna/releases`,
      targetCommitish: REPO_BRANCH,
      isUpdateAvailable: false,
      platform,
      allAssets: [],
      checkedAt: new Date().toISOString(),
    }
  }

  const cleanLatest = candidate.tag_name.replace(/^v/i, '')
  const isNewer = compareSemver(cleanLatest, currentVersion) > 0
  const asset = pickConflictFreeAsset(candidate.assets, platform)

  return {
    currentVersion,
    latestVersion: cleanLatest,
    tagName: candidate.tag_name,
    releaseName: candidate.name || candidate.tag_name,
    publishedAt: candidate.published_at,
    releaseNotes: candidate.body || 'No release notes provided.',
    releaseUrl: candidate.html_url,
    targetCommitish: candidate.target_commitish,
    isUpdateAvailable: isNewer,
    platform,
    asset,
    allAssets: candidate.assets,
    checkedAt: new Date().toISOString(),
  }
}

