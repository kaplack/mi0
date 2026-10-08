import { test, expect } from '@playwright/test'
const workspaceId = '11111111-1111-4111-8111-111111111111'
test('dashboard offers paid access and displays metrics and CSV after approval', async ({ page }, testInfo) => {
  let active = false, pending = false
  await page.addInitScript(() => localStorage.setItem('mi0_user_token', 'test-token'))
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    let data
    if (path.endsWith('/auth/me')) data = { user: { id: 'owner' } }
    else if (path.endsWith('/workspaces')) data = { workspaces: [{ id: workspaceId, name: 'Cosa nostra', role: 'OWNER' }] }
    else if (path.endsWith('/subscription')) data = { active, validUntil: active ? '2027-10-08T12:00:00Z' : null, plans: [{ code: 'MONTHLY', label: 'Mensual', amountCents: 1000 }, { code: 'ANNUAL', label: 'Anual', amountCents: 7900 }], payment: pending ? { status: 'PENDING', amountCents: 7900, reference: 'YAPE1234' } : null, paymentInstructions: { enabled: true, phone: '999999999', name: 'mi0 prueba' } }
    else if (path.endsWith('/payments')) { expect(route.request().postDataJSON()).toEqual({ plan: 'ANNUAL', reference: 'YAPE1234' }); pending = true; data = {} }
    else if (path.endsWith('/dashboard')) data = { from: '2026-09-09', to: '2026-10-08', summary: { total: 5, served: 3, absent: 1, expired: 1, active: 0, waitAverageSeconds: 120, serviceAverageSeconds: 300, waitSamples: 4, serviceSamples: 3 }, counters: [{ counter: 1, name: 'Ventanilla 1', served: 3, absent: 1, expired: 0, waitAverageSeconds: 120, serviceAverageSeconds: 300, waitSamples: 4, serviceSamples: 3 }], hours: Array.from({ length: 24 }, (_, hour) => ({ hour, count: hour === 9 ? 5 : 0 })) }
    else if (path.endsWith('/workspace/' + workspaceId)) data = { queue: { id: 'queue', name: 'Cosa nostra', code: 'public-test', counterNames: ['Ventanilla 1'] }, tickets: [], role: 'OWNER' }
    else return route.fulfill({ status: 404, json: { message: 'Unexpected route' } })
    await route.fulfill({ json: data })
  })
  await page.goto('/mi-turno/' + workspaceId + '/dashboard')
  await page.getByRole('button', { name: 'Contratar Dashboard', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar contratación' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Contratar Dashboard', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Contratar Dashboard' })).toBeVisible()
  await expect(page.getByText('Anual · S/79', { exact: true })).toBeVisible()
  await expect(page.getByText('Mensual · S/10', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Demanda por hora' })).toHaveCount(0)
  await page.getByLabel('Número de operación Yape').fill('YAPE1234')
  await page.getByRole('button', { name: 'Enviar pago para verificación' }).click()
  await expect(page.getByText(/Pago de S\/79 en revisión/)).toBeVisible()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  active = true
  await page.getByRole('button', { name: 'Actualizar estado' }).click()
  await expect(page.getByRole('heading', { name: 'Demanda por hora' })).toBeVisible()
  await expect(page.getByText('5 min', { exact: true }).first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV' }).click()
  expect((await downloaded).suggestedFilename()).toMatch(/dashboard.*\.csv$/)
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true })
})
