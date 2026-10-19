import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { chromium, expect } from '@playwright/test'

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' }
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname
    const file = resolve('dist', pathname === '/' ? 'index.html' : pathname.slice(1))
    const data = await readFile(file)
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' })
    response.end(data)
  } catch { response.writeHead(404); response.end('Not found') }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
await mkdir('artifacts', { recursive: true })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const errors = []
const passed = []
function pass(name) { passed.push(name); console.log('PASS', name) }
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] })
  await context.route(/designarena/, route => route.abort())
  const page = await context.newPage()
  page.on('pageerror', error => {
    if (error.message.includes('Failed to fetch')) return
    errors.push(error.message)
    console.error('PAGE ERROR', error.message)
  })
  const modal = () => page.getByRole('dialog')
  async function nav(name) { await page.locator('.nav-item').filter({ hasText: name }).click(); await page.waitForTimeout(230) }
  async function openNew() { await nav('Ration cards'); await page.getByRole('button', { name: 'Add ration card', exact: true }).click(); await expect(modal()).toBeVisible() }
  async function fillCard(name, number) {
    await modal().getByLabel(/^Cardholder name/).fill(name)
    await modal().getByLabel(/^Card number/).fill(number)
    await modal().getByLabel(/^Guardian name/).fill('Test Guardian')
    await modal().getByLabel(/^Mother’s name/).fill('Test Mother')
    await modal().getByLabel(/^Total units/).fill('2')
  }
  async function closeModal() { await page.getByRole('button', { name: 'Close dialog' }).click(); await expect(modal()).toHaveCount(0) }
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.cards-table tbody tr')).toHaveCount(5)
  await expect(page.locator('.stat-value strong').nth(0)).toHaveText('08')
  await expect(page.locator('.stat-value strong').nth(1)).toHaveText('32')
  await page.screenshot({ path: 'artifacts/final-desktop.png', fullPage: true })
  pass('Initial sample workspace, fonts, and metrics')

  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page.locator('.cards-table tbody tr')).toHaveCount(3)
  await page.getByRole('button', { name: 'Previous page', exact: true }).click()
  await page.locator('.card-tabs button').filter({ hasText: /^APL/ }).click()
  await expect(page.locator('.cards-table tbody tr')).toHaveCount(4)
  await expect(page.locator('.cards-table .bpl')).toHaveCount(0)
  await page.locator('.card-tabs button').filter({ hasText: 'All cards' }).click()
  await page.getByRole('searchbox').fill('Rajesh')
  await expect(page.locator('.cards-table tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: 'Clear search' }).click()
  await page.getByRole('button', { name: 'Filters', exact: true }).click()
  await page.locator('.filter-popover').getByLabel('Category', { exact: true }).selectOption('SC')
  await expect(page.locator('.cards-table tbody tr')).toHaveCount(1)
  await expect(page.locator('.holder-name')).toHaveText('Anil Deshmukh')
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click()
  pass('Search, APL/BPL tabs, category filters, and pagination')

  await page.locator('.holder-cell').filter({ hasText: 'Rajesh Kumar' }).click()
  await expect(modal().locator('.detail-member')).toHaveCount(5)
  await expect(modal()).toContainText('•••• •••• 0001')
  await page.getByRole('button', { name: 'Show details', exact: true }).click()
  await expect(modal()).toContainText('0000 0000 0001')
  await page.evaluate(() => { window.print = () => { window.__printed = true } })
  await page.getByRole('button', { name: 'Print', exact: true }).click()
  expect(await page.evaluate(() => window.__printed)).toBe(true)
  await page.getByRole('button', { name: 'Edit household', exact: true }).click()
  await expect(modal().getByLabel(/^Cardholder name/)).toHaveValue('Rajesh Kumar')
  await modal().getByLabel(/^Guardian name/).fill('Suresh Kumar Updated')
  await modal().getByRole('checkbox').check()
  await modal().getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(modal()).toHaveCount(0)
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('.holder-cell').filter({ hasText: 'Rajesh Kumar' }).click()
  await expect(modal()).toContainText('Suresh Kumar Updated')
  await closeModal()
  pass('Household view, masking, print, editing, trusted-device consent, and reload persistence')

  await openNew()
  await modal().getByRole('button', { name: 'Create ration card', exact: true }).click()
  await expect(modal().getByRole('alert')).toContainText('Please complete')
  await fillCard('Test Household', 'TEST20260001')
  await modal().getByRole('button', { name: 'APL', exact: true }).click()
  await modal().getByRole('button', { name: 'Create ration card', exact: true }).click()
  await expect(modal()).toHaveCount(0)
  await expect(page.locator('.stat-value strong').nth(0)).toHaveText('09')
  await openNew()
  await fillCard('Duplicate Household', 'TEST20260001')
  await modal().getByRole('button', { name: 'Create ration card', exact: true }).click()
  await expect(modal().getByRole('alert')).toContainText('already belongs')
  await closeModal()
  pass('New-card CRUD and duplicate-card rejection')

  await nav('Members')
  await expect(page.locator('thead')).toContainText('Cardholder name')
  expect(await page.locator('thead').innerText()).not.toContain('Relation')
  await page.getByRole('button', { name: 'Add member', exact: true }).click()
  const options = await modal().locator('option').allTextContents()
  await modal().getByLabel('Cardholder name').selectOption({ label: options.find(option => option.startsWith('Test Household')) })
  await modal().getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(modal().getByLabel(/^Member name/)).toBeVisible()
  await modal().getByLabel(/^Member name/).fill('Asha Test')
  await modal().getByLabel(/^Gender/).selectOption('F')
  await modal().getByLabel(/^Date of birth/).fill('11-05-2000')
  await modal().getByLabel(/^Aadhaar number/).fill('123456789012')
  await modal().getByLabel(/^Contact number/).fill('9999900000')
  await modal().getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(modal()).toHaveCount(0)
  await page.getByRole('searchbox').fill('Asha Test')
  await expect(page.locator('.members-table tbody tr')).toHaveCount(1)
  await expect(page.locator('.members-table tbody tr')).toContainText('Test Household')
  await expect(page.locator('.members-table tbody tr')).toContainText('11-05-2000')
  expect(await page.locator('.members-table tbody tr').innerText()).not.toContain('123456789012')
  await page.getByRole('button', { name: 'Edit Asha Test', exact: true }).click()
  await modal().getByLabel(/^Date of birth/).fill('31-02-2000')
  await modal().getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(modal().getByRole('alert')).toContainText('valid date of birth')
  await modal().getByLabel(/^Date of birth/).fill('11-05-2000')
  await modal().getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(modal()).toHaveCount(0)
  pass('Member creation, cardholder-name column, masked data, and strict DD-MM-YYYY validation')

  let downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export members', exact: true }).click()
  let download = await downloadPromise
  let contents = await readFile(await download.path(), 'utf8')
  expect(contents).toContain('Cardholder_Name')
  expect(contents).toContain('Test Household')
  expect(contents).not.toContain('123456789012')
  await nav('Ration cards')
  await page.getByRole('button', { name: 'Export records', exact: true }).click()
  downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export filtered cards/ }).click()
  download = await downloadPromise
  contents = await readFile(await download.path(), 'utf8')
  expect(contents).toContain('Card_holder_Name')
  expect(contents).toContain('TEST20260001')
  await page.getByRole('button', { name: 'Export records', exact: true }).click()
  await page.getByRole('button', { name: /Download full backup/ }).click()
  downloadPromise = page.waitForEvent('download')
  await modal().getByRole('button', { name: 'Download full backup', exact: true }).click()
  download = await downloadPromise
  const backupText = await readFile(await download.path(), 'utf8')
  expect(JSON.parse(backupText).cards).toHaveLength(9)
  expect(backupText).toContain('123456789012')
  await page.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backupText) })
  await modal().getByRole('button', { name: 'Import households', exact: true }).click()
  await expect(modal().getByRole('alert')).toContainText('already exists')
  await closeModal()
  pass('CSV exports, masked member CSV, full JSON backup, and atomic duplicate-import rejection')

  const imported = { Card_holder_Name: 'Imported Household', Card_Number: 'IMPORT2026001', Guardian_Name: 'Imported Guardian', Mother_Name: 'Imported Mother', Total_Unit: 1, Card_Type: 'BPL', Category: 'EWS', Members: [] }
  await page.locator('input[type=file]').setInputFiles({ name: 'new-household.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([imported])) })
  await modal().getByRole('button', { name: 'Import household', exact: true }).click()
  await expect(modal()).toHaveCount(0)
  await expect(page.locator('.stat-value strong').nth(0)).toHaveText('10')
  await page.getByRole('button', { name: 'Actions for Imported Household', exact: true }).click()
  await page.getByRole('button', { name: 'Delete card', exact: true }).click()
  await modal().getByRole('button', { name: 'Yes, remove', exact: true }).click()
  await expect(modal()).toHaveCount(0)
  await expect(page.locator('.stat-value strong').nth(0)).toHaveText('09')
  await page.locator('input[type=file]').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('not valid json') })
  await expect(page.getByRole('alert')).toContainText('not valid JSON')
  pass('Validated JSON import, deletion confirmation, and malformed-file handling')

  await page.getByRole('button', { name: 'Export records', exact: true }).click()
  downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export cards as XML/ }).click()
  download = await downloadPromise
  const xmlBulkText = await readFile(await download.path(), 'utf8')
  expect(xmlBulkText).toContain('<?xml version="1.0" encoding="UTF-8"?>')
  expect(xmlBulkText).toContain('<annapurna')
  expect(xmlBulkText).toContain('<rationCards')
  expect(xmlBulkText).toContain('TEST20260001')

  await page.getByRole('button', { name: 'Actions for Test Household', exact: true }).click()
  downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export as XML', exact: true }).click()
  download = await downloadPromise
  const xmlSingleText = await readFile(await download.path(), 'utf8')
  expect(xmlSingleText).toContain('TEST20260001')
  expect(xmlSingleText).toContain('Test Household')

  const singleXml = `<?xml version="1.0" encoding="UTF-8"?>
<annapurna version="2.0">
  <RationCard>
    <Card_holder_Name>Single XML Household</Card_holder_Name>
    <Card_Number>XML2026001</Card_Number>
    <Guardian_Name>XML Guardian</Guardian_Name>
    <Mother_Name>XML Mother</Mother_Name>
    <Total_Unit>2</Total_Unit>
    <Card_Type>APL</Card_Type>
    <Category>Gen</Category>
    <Members>
      <Member>
        <Name>XML Child</Name>
        <Guardian_Name>Single XML Household</Guardian_Name>
        <Gender>M</Gender>
        <DOB>15-08-2012</DOB>
        <Relation_with_Holder>son</Relation_with_Holder>
      </Member>
    </Members>
  </RationCard>
</annapurna>`
  await page.locator('input[type=file]').setInputFiles({ name: 'single.xml', mimeType: 'application/xml', buffer: Buffer.from(singleXml) })
  await expect(modal()).toContainText('A household ready to join')
  await modal().getByRole('button', { name: 'Import household', exact: true }).click()
  await expect(modal()).toHaveCount(0)
  await expect(page.locator('.stat-value strong').nth(0)).toHaveText('10')

  const bulkXml = `<?xml version="1.0" encoding="UTF-8"?>
<annapurna version="2.0">
  <rationCards>
    <RationCard>
      <Card_holder_Name>Bulk XML Household One</Card_holder_Name>
      <Card_Number>XMLBULK001</Card_Number>
      <Guardian_Name>Guardian One</Guardian_Name>
      <Mother_Name>Mother One</Mother_Name>
      <Total_Unit>1</Total_Unit>
      <Card_Type>BPL</Card_Type>
      <Category>OBC</Category>
    </RationCard>
    <RationCard>
      <Card_holder_Name>Bulk XML Household Two</Card_holder_Name>
      <Card_Number>XMLBULK002</Card_Number>
      <Guardian_Name>Guardian Two</Guardian_Name>
      <Mother_Name>Mother Two</Mother_Name>
      <Total_Unit>1</Total_Unit>
      <Card_Type>APL</Card_Type>
      <Category>SC</Category>
    </RationCard>
  </rationCards>
</annapurna>`
  await page.locator('input[type=file]').setInputFiles({ name: 'bulk.xml', mimeType: 'application/xml', buffer: Buffer.from(bulkXml) })
  await expect(modal()).toContainText('2 ration cards')
  await modal().getByRole('button', { name: 'Import households', exact: true }).click()
  await expect(modal()).toHaveCount(0)
  await expect(page.locator('.stat-value strong').nth(0)).toHaveText('12')

  for (const name of ['Single XML Household', 'Bulk XML Household One', 'Bulk XML Household Two']) {
    await page.getByRole('button', { name: `Actions for ${name}`, exact: true }).click()
    await page.getByRole('button', { name: 'Delete card', exact: true }).click()
    await modal().getByRole('button', { name: 'Yes, remove', exact: true }).click()
    await expect(modal()).toHaveCount(0)
  }
  await expect(page.locator('.stat-value strong').nth(0)).toHaveText('09')
  pass('XML bulk export, single card XML export, and XML bulk/single import')

  await page.locator('.sidebar-cloud-card button').click()
  await expect(modal()).toContainText('Where do I find my Firebase credentials?')
  await modal().getByRole('button', { name: /Get your web app configuration/ }).click()
  await expect(modal()).toContainText('Project settings → General → Your apps')
  await modal().getByRole('button', { name: /Create and protect your database/ }).click()
  await modal().getByRole('button', { name: 'Copy rules', exact: true }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('request.auth.uid == userId')
  await modal().getByRole('button', { name: 'Connect Firebase', exact: true }).click()
  await modal().getByLabel(/^Firebase web configuration/).fill('{"private_key":"not-a-browser-key"}')
  await modal().getByLabel(/^Firebase user email/).fill('test@example.com')
  await modal().getByLabel(/^Firebase user password/).fill('not-a-real-password')
  await modal().getByRole('checkbox').nth(0).check()
  await modal().getByRole('button', { name: 'Connect workspace', exact: true }).click()
  await expect(modal().getByRole('alert')).toContainText('service-account key')
  await modal().getByLabel(/^Firebase web configuration/).fill('{"apiKey":"example"}')
  await modal().getByRole('button', { name: 'Connect workspace', exact: true }).click()
  await expect(modal().getByRole('alert')).toContainText('missing authDomain')
  await closeModal()
  await nav('Help & support')
  await page.getByRole('textbox', { name: 'Search help' }).fill('relationship')
  await expect(page.locator('.faq-item')).toHaveCount(2)
  pass('Firebase credential guide, clipboard rules, private-key rejection, configuration validation, and help search')

  await nav('Settings')
  await page.getByLabel('Workspace name', { exact: true }).fill('Community desk')
  await page.getByRole('button', { name: 'Save name', exact: true }).click()
  await expect(page.locator('.sidebar-workspace')).toContainText('Community desk')
  await nav('Overview')
  await expect(page.locator('.donut')).toHaveAttribute('aria-label', '4 BPL and 5 APL households')
  await expect(page.locator('.category-bar-row')).toHaveCount(5)
  pass('Saved settings, live overview calculations, and category distribution')

  await nav('Ration cards')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.stat-value strong').nth(0)).toHaveText('09')
  await expect(page.locator('.sync-status')).toContainText('Available offline')
  await page.getByRole('button', { name: 'Add ration card', exact: true }).click()
  await fillCard('Offline Household', 'OFFLINE2026001')
  await modal().getByRole('button', { name: 'Create ration card', exact: true }).click()
  await expect(modal()).toHaveCount(0)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.stat-value strong').nth(0)).toHaveText('10')
  await expect(page.locator('.holder-name')).toContainText(['Offline Household', 'Test Household'])
  await context.setOffline(false)
  pass('Offline app-shell reload, cached fonts, local creation, and durable offline writes')

  await page.locator('.holder-cell').filter({ hasText: 'Rajesh Kumar' }).click()
  await modal().getByRole('button', { name: 'Edit household', exact: true }).click()
  const second = await context.newPage()
  second.on('pageerror', error => { if (!error.message.includes('Failed to fetch')) errors.push(error.message) })
  await second.goto(base, { waitUntil: 'networkidle' })
  await second.locator('.holder-cell').filter({ hasText: 'Rajesh Kumar' }).click()
  await second.getByRole('button', { name: 'Edit household', exact: true }).click()
  await modal().getByLabel(/^Guardian name/).fill('First tab update')
  await modal().getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(modal()).toHaveCount(0)
  await second.getByRole('dialog').getByLabel(/^Guardian name/).fill('Stale second tab update')
  await second.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(second.getByRole('dialog').getByRole('alert')).toContainText('changed in another tab')
  await second.close()
  pass('Cross-tab synchronization and stale-write conflict protection')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(1000)
  const overflow = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 3 && !e.closest('.table-scroll')).map(e => ({ tag: e.tagName, class: e.className, right: e.getBoundingClientRect().right, width: e.getBoundingClientRect().width })).slice(0, 12) }))
  console.log('Mobile layout diagnostics', overflow)
  expect(overflow.document).toBeLessThanOrEqual(390)
  await page.screenshot({ path: 'artifacts/final-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  await nav('Members')
  await expect(page.locator('.sidebar')).not.toHaveClass(/mobile-visible/)
  await expect(page.locator('thead')).toContainText('Cardholder name')
  await page.screenshot({ path: 'artifacts/final-mobile-members.png', fullPage: true })
  await page.getByRole('button', { name: 'Add member', exact: true }).click()
  await expect(modal()).toBeVisible()
  expect(await modal().evaluate(e => e.getBoundingClientRect().width)).toBeLessThanOrEqual(370)
  await closeModal()
  pass('Mobile navigation, horizontal table containment, and responsive dialogs')
  expect(errors).toEqual([])
  console.log(`SUCCESS: ${passed.length} test groups passed. No browser runtime errors.`)
} catch (error) { console.error('TEST FAILURE', error); console.error('Completed tests:', passed); throw error }
finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
