/**
 * Vérifie que le bouton FR/EN change la langue SANS recharger la page (lang-swap.js), dans les deux sens.
 * Le changement de langue retombe sur un rechargement dès que la page affichée ne correspond plus à celle de l'autre
 * langue (un script qui ajoute une classe, un élément…) : ce test le repère avant la mise en ligne.
 * À lancer après `npm run build` : sert dist/ (vite preview) et le parcourt avec Chromium (Playwright).
 */
import { preview } from 'vite'
import { chromium } from 'playwright'

const server = await preview({ preview: { port: 4178, strictPort: true }, logLevel: 'silent' })
const BASE = '/'   // les pages compilées (base « ./ ») se servent à la racine, quel que soit BASE_PATH
const base = 'http://localhost:4178' + BASE
const browser = await chromium.launch()
let failed = false
const fail = (msg) => { failed = true; console.error('✗', msg) }

try {
  for (const [start, other] of [['fr', 'en'], ['en', 'fr']]) {
    const page = await browser.newPage({ locale: start === 'fr' ? 'fr-FR' : 'en-GB', viewport: { width: 1440, height: 900 } })
    const warns = []
    page.on('console', (m) => { if (m.text().includes('changement de langue')) warns.push(m.text()) })
    await page.goto(base + (start === 'en' ? 'en/' : ''), { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('html.intro-done', { timeout: 60000 })
    // marque posée dans la page : elle disparaît si la page est rechargée
    await page.evaluate(() => { window.__noReload = true })
    for (const [from, want] of [[start, other], [other, start]]) {
      await page.click('.topbar .lang')
      try { await page.waitForFunction((l) => document.documentElement.lang === l, want, { timeout: 15000 }) } catch { fail(`${from} → ${want} : la langue n'a pas changé`); break }
      await page.waitForTimeout(500)
      const kept = await page.evaluate(() => window.__noReload === true)
      if (!kept) { fail(`${from} → ${want} : la page a été rechargée (${warns.join(' ; ') || 'raison inconnue'})`); break }
      const path = new URL(page.url()).pathname
      if (path !== BASE + (want === 'en' ? 'en/' : '')) fail(`${from} → ${want} : adresse inattendue ${path}`)
      console.log('✓', `${from} → ${want} sans rechargement`)
    }
    await page.close()
  }
} finally {
  await browser.close()
  await new Promise((r) => server.httpServer.close(r))
}
if (failed) { console.error('Le changement de langue recharge la page : voir src/lang-swap.js (correspondance des éléments).'); process.exit(1) }
