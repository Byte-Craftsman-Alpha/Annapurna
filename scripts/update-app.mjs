#!/usr/bin/env node

/**
 * Conflict-Free Application Updater for Annapurna.
 * Safely updates this workspace to the latest build release of the `main` branch
 * from Byte-Craftsman-Alpha/Annapurna without installation conflicts.
 */

import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

console.log('🌾 [Annapurna Updater] Starting conflict-free update to latest main branch release...\n')

function run(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: options.silent ? 'pipe' : 'inherit', ...options })
  } catch (err) {
    if (options.ignoreError) return null
    throw err
  }
}

function runSilent(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim()
  } catch {
    return ''
  }
}

// 1. Verify Git workspace
const isGit = runSilent('git rev-parse --is-inside-work-tree') === 'true'
if (!isGit) {
  console.error('❌ Current directory is not a Git repository.')
  console.log('💡 To update installed desktop packages, download the latest release from:')
  console.log('   https://github.com/Byte-Craftsman-Alpha/Annapurna/releases/latest\n')
  process.exit(1)
}

// 2. Check remote configuration
const remoteUrl = runSilent('git remote get-url origin')
console.log(`📡 Remote repository: ${remoteUrl || 'origin'}`)

// 3. Stash any uncommitted local work so no conflict occurs
const status = runSilent('git status --porcelain')
let stashed = false
if (status) {
  console.log('🛡️ Preserving your uncommitted changes into git stash to prevent merge conflicts...')
  run('git stash push -u -m "Auto-stashed by Annapurna update script"')
  stashed = true
  console.log('  ✓ Changes safely stashed.\n')
}

// 4. Fetch the latest commits and tags from the main branch
console.log('📥 Fetching latest build release from origin/main...')
run('git fetch origin main --tags')

// 5. Checkout main and update to origin/main cleanly without conflict
console.log('🔄 Syncing local workspace directly with origin/main...')
run('git checkout main')
run('git reset --hard origin/main')

// 6. Restore stashed changes if any
if (stashed) {
  console.log('\n📦 Checking stashed local changes...')
  try {
    run('git stash pop', { silent: true })
    console.log('  ✓ Stashed local changes restored cleanly.')
  } catch {
    console.log('  ℹ️ Local changes are safely kept in your stash. Run `git stash pop` to apply them.')
  }
}

// 7. Update dependencies
console.log('\n📦 Installing updated dependencies...')
run('npm install --no-audit')

// 8. Rebuild production bundle
console.log('\n🏗️ Rebuilding production web assets (dist)...')
run('npm run build')

// 9. Read updated version
let version = '1.0.0'
try {
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
  version = pkg.version || version
} catch { /* ignore */ }

const latestCommit = runSilent('git log -1 --pretty=format:"%h - %s (%cr)"')

console.log('\n' + '='.repeat(60))
console.log(`✨ Annapurna successfully updated to v${version}!`)
console.log(`🌿 Latest commit: ${latestCommit}`)
console.log('🌾 You are now running the latest build release of the main branch.')
console.log('='.repeat(60) + '\n')

