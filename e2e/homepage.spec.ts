import { expect, test } from '@playwright/test'

test('homepage: dark default, hero build-log, ledger', async ({ page }) => {
  await page.goto('/pl')

  // domyślny motyw = dark (InitTheme bez localStorage)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  // hero renderuje się z headline
  await expect(page.locator('h1')).toBeVisible()

  // panel build-log obecny (po przełączeniu treści homepage w Task 10)
  // do tego czasu ten expect może być czerwony — patrz kolejność tasków
  await expect(page.locator('.blh-log')).toBeVisible()

  // regresja: treść hero NIE może być przykryta przez .hero-background
  // (opaque gradient, position:absolute z-index:0). elementFromPoint w środku
  // headline musi trafić w headline, nie w overlay tła — inaczej cały hero jest
  // niewidoczny mimo że toBeVisible() przechodzi (Playwright nie łapie occlusion).
  const headlineOnTop = await page.evaluate(() => {
    const h = document.querySelector('.blh-headline') as HTMLElement | null
    if (!h) return false
    const r = h.getBoundingClientRect()
    const top = document.elementFromPoint(r.x + r.width * 0.2, r.y + r.height * 0.5)
    return !!top && (top === h || h.contains(top))
  })
  expect(headlineOnTop).toBe(true)

  // zero requestów do Google Fonts CDN (fonty self-hosted po Task 1)
  const cdnRequests: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('fonts.googleapis') || r.url().includes('fonts.gstatic')) {
      cdnRequests.push(r.url())
    }
  })
  await page.reload()
  expect(cdnRequests).toEqual([])

  await page.screenshot({ path: 'test-results/homepage-dark.png', fullPage: true })
})

test('homepage mobile: bez poziomego scrolla', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/pl')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
  await page.screenshot({ path: 'test-results/homepage-mobile.png', fullPage: true })
})
