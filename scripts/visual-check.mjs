import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { chromium } from '@playwright/test'

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' }
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname
    const path = resolve('dist', pathname === '/' ? 'index.html' : pathname.slice(1))
    const data = await readFile(path)
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' })
    response.end(data)
  } catch { response.writeHead(404); response.end('Not found') }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
await mkdir('artifacts', { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => { errors.push(error.message); console.error('PAGE ERROR:', error.message) })
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'artifacts/annapurna-desktop.png', fullPage: true })
  console.log('Desktop dimensions', await page.evaluate(() => ({ width: innerWidth, height: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth > innerWidth, fonts: [...document.fonts].map(f => ({ family: f.family, status: f.status })) })))
  await page.locator('.nav-item').filter({ hasText: 'Members' }).click()
  await page.waitForTimeout(350)
  await page.screenshot({ path: 'artifacts/annapurna-members.png', fullPage: true })
  console.log('Member columns', await page.locator('thead').innerText())
  await page.locator('.sidebar-cloud-card button').click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'artifacts/annapurna-firebase.png', fullPage: true })
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.locator('.nav-item').filter({ hasText: 'Ration cards' }).click()
  await page.getByRole('button', { name: 'Add ration card', exact: true }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'artifacts/annapurna-form.png', fullPage: true })
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'artifacts/annapurna-mobile.png', fullPage: true })
  console.log('Mobile overflow', await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth })))
  console.log('Overflow causes', await page.evaluate(() => [...document.querySelectorAll('body *')].filter(element => element.getBoundingClientRect().right > innerWidth + 3 && !element.closest('.table-scroll')).map(element => ({ tag: element.tagName, class: String(element.className), right: element.getBoundingClientRect().right, width: element.getBoundingClientRect().width })).slice(0, 15)))
  console.log('Browser errors', errors)
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
