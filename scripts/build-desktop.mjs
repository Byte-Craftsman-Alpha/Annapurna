#!/usr/bin/env node

/**
 * Cross-platform desktop packager for Annapurna.
 * Handles Vite compilation, filesystem symlink workarounds,
 * and multi-target electron-builder packaging.
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, cpSync, rmSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'

const targetArg = process.argv.slice(2).join(' ') || '--dir'

console.log('🌾 [Annapurna Desktop] Compiling frontend bundle...')
execSync('npm run build', { stdio: 'inherit' })

// Verify dist/ exists
if (!existsSync('dist/index.html')) {
  console.error('❌ Build failed: dist/index.html not found.')
  process.exit(1)
}

// On FAT/exFAT/NTFS drives without symlink support, build in system temp dir
const isSymlinkSupported = (() => {
  try {
    const testSym = resolve('.symlink-test')
    if (existsSync(testSym)) rmSync(testSym)
    execSync(`ln -s package.json "${testSym}"`, { stdio: 'ignore' })
    rmSync(testSym)
    return true
  } catch {
    return false
  }
})()

const outDir = isSymlinkSupported ? resolve('release') : join(tmpdir(), 'annapurna-release')

if (!isSymlinkSupported) {
  console.log(`💡 Filesystem does not support symlinks; packaging in system temp: ${outDir}`)
}

mkdirSync(outDir, { recursive: true })

console.log(`🚀 [Annapurna Desktop] Running electron-builder ${targetArg}...`)
const builderCmd = `node node_modules/electron-builder/out/cli/cli.js ${targetArg} -c.directories.output="${outDir}"`
execSync(builderCmd, { stdio: 'inherit' })

// If built in temp directory, copy final installable packages back to ./release
if (!isSymlinkSupported && outDir !== resolve('release')) {
  const localRelease = resolve('release')
  mkdirSync(localRelease, { recursive: true })
  console.log(`📦 Copying final packages to ${localRelease}...`)
  
  const entries = readdirSync(outDir)
  for (const entry of entries) {
    const srcPath = join(outDir, entry)
    const stat = statSync(srcPath)
    if (stat.isFile() && (entry.endsWith('.AppImage') || entry.endsWith('.deb') || entry.endsWith('.tar.gz') || entry.endsWith('.exe') || entry.endsWith('.zip') || entry.endsWith('.dmg'))) {
      const destPath = join(localRelease, entry)
      cpSync(srcPath, destPath)
      console.log(`  ✓ ${entry}`)
    }
  }
}

console.log('✨ [Annapurna Desktop] Packaging complete!')
