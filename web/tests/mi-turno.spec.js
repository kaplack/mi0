import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const workspaceId = '11111111-1111-4111-8111-111111111111'
const code = 'screen-test'
async function mockApi(page, { role = 'OWNER', loggedIn = true, documentMode = 'REQUIRED' } = {}) {
  const queue = { id: 'queue', workspaceId, code, name: 'Oficina de atención', documentMode, counterNames: ['Ventanilla 1', 'Entrega'], lastNumber: 1 }
  let tickets = [{ id: 'ticket', number: 1, name: 'Ana Prueba', counter: 1, status: 'CALLED', documentType: 'DNI', documentNumber: '12345678' }]
  let myTicket = null
  const calls = []
  await page.addInitScript(({ loggedIn }) => {
    localStorage.clear()
    if (loggedIn) localStorage.setItem('mi0_user_token', 'test-only-token')
  }, { loggedIn })
  await page.route('**/api/**', async route => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname.replace('/api', '')
    const payload = request.postDataJSON()
    calls.push({ pathname, method: request.method(), payload })
    let data
    if (pathname === '/auth/me') data = { user: { id: 'owner', name: 'Operador' } }
    else if (pathname === '/workspaces') data = { workspaces: [{ id: workspaceId, name: 'Mi oficina', role, modules: [] }] }
    else if (pathname.endsWith('/mine')) data = { ticket: myTicket, ahead: 0, lastStatus: null }
    else if (pathname.endsWith('/join')) { myTicket = { number: 2, status: 'WAITING' }; data = { ticket: myTicket } }
    else if (pathname === '/turnos/public/' + code) data = {
      name: queue.name, code, documentMode: queue.documentMode, counterNames: queue.counterNames, waiting: 0,
      called: tickets.filter(ticket => ticket.status === 'CALLED').map(({ number, counter, status }) => ({ number, counter, status })),
    }
    else if (pathname.endsWith('/settings')) { Object.assign(queue, payload); data = { queue } }
    else if (pathname.endsWith('/finish')) { tickets = []; data = { ticket: null } }
    else if (pathname.endsWith('/close')) { tickets = []; data = { expired: 1 } }
    else if (pathname === '/turnos/workspace/' + workspaceId) data = { queue, tickets, role }
    else return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Test endpoint unavailable' }) })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
  })
  return calls
}
async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

test('configuration saves document policy and named windows; QR downloads a printable poster', async ({ page }, testInfo) => {
  const calls = await mockApi(page)
  await page.goto('/mi-turno/' + workspaceId + '/configuracion')
  await expect(page.getByRole('heading', { name: 'Configuración del negocio' })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Solicitar documento de identidad', exact: true }).uncheck()
  await page.getByLabel('Ventanilla 2', { exact: true }).fill('Documentos')
  await page.getByRole('button', { name: 'Guardar configuración' }).click()
  await expect(page.getByRole('status')).toHaveText('Configuración guardada.')
  expect(calls.find(call => call.pathname.endsWith('/settings')).payload.counterNames).toEqual(['Ventanilla 1', 'Documentos'])
  expect(calls.find(call => call.pathname.endsWith('/settings')).payload.documentMode).toBe('NONE')
  if (await page.getByRole('button', { name: 'Abrir menú', exact: true }).isVisible()) await page.getByRole('button', { name: 'Abrir menú', exact: true }).click()
  await page.getByRole('link', { name: 'QR y cartel', exact: true }).click()
  await expect(page.getByRole('img', { name: 'QR para tomar un turno en Oficina de atención' })).toBeVisible()
  const event = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Descargar QR para imprimir' }).click()
  const download = await event
  expect(download.suggestedFilename()).toBe('mi-turno-screen-test.png')
  const png = await readFile(await download.path())
  expect(png.readUInt32BE(16)).toBe(1600)
  expect(png.readUInt32BE(20)).toBe(2000)
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('configuration.png'), fullPage: true })
})
test('operator completes the last ticket; configuration and public monitor have distinct links', async ({ page }, testInfo) => {
  const calls = await mockApi(page)
  await page.goto('/mi-turno/' + workspaceId + '/operacion')
  await expect(page.getByRole('heading', { name: 'Ana Prueba' })).toBeVisible()
  await expect(page.getByText('DNI: 12345678', { exact: true })).toBeVisible()
  if (await page.getByRole('button', { name: 'Abrir menú', exact: true }).isVisible()) await page.getByRole('button', { name: 'Abrir menú', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Configuración', exact: true })).toHaveAttribute('href', '/mi-turno/' + workspaceId + '/configuracion')
  await page.screenshot({ path: testInfo.outputPath('operation.png'), fullPage: true })
  await page.getByRole('button', { name: 'Finalizar atención' }).click()
  await expect(page.getByText('Tu ventanilla está libre.')).toBeVisible()
  expect(calls.find(call => call.pathname.endsWith('/finish')).payload).toEqual({ ticketId: 'ticket', action: 'SERVED' })
  await noOverflow(page)
})
test('public monitor requires no session and reveals no names, identity or controls', async ({ page }, testInfo) => {
  await mockApi(page, { loggedIn: false })
  await page.goto('/turno/' + code + '/pantalla')
  await expect(page.getByText('001', { exact: true })).toBeVisible()
  await expect(page.getByText('Ventanilla 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Ana Prueba')).toHaveCount(0)
  await expect(page.getByText('12345678')).toHaveCount(0)
  await expect(page.getByRole('button')).toHaveCount(0)
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('display.png'), fullPage: true })
})
test('customer must enter name and required identity before taking a ticket', async ({ page }) => {
  const calls = await mockApi(page, { loggedIn: false })
  await page.goto('/turno/' + code)
  await page.getByLabel('Nombre (obligatorio)', { exact: true }).fill('Cliente Prueba')
  await expect(page.getByLabel('Número de documento')).toHaveAttribute('required', '')
  await page.getByRole('combobox', { name: 'Tipo de documento', exact: true }).selectOption('CE')
  await page.getByLabel('Número de documento').fill('CE1234567')
  await page.getByRole('button', { name: 'Tomar mi turno' }).click()
  await expect(page.getByText('002', { exact: true })).toBeVisible()
  expect(calls.find(call => call.pathname.endsWith('/join')).payload.documentType).toBe('CE')
  await noOverflow(page)
})
test('member cannot configure', async ({ page }) => {
  await mockApi(page, { role: 'MEMBER' })
  await page.goto('/mi-turno/' + workspaceId + '/configuracion')
  await expect(page.getByText('Solo el propietario o administrador puede configurar el negocio.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar configuración' })).toHaveCount(0)
})

test('unsigned operator can open login while preserving the operation URL', async ({ page }) => {
  await mockApi(page, { loggedIn: false })
  await page.goto('/mi-turno/' + workspaceId + '/operacion')
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page.getByLabel('Correo', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible()
  await expect(page).toHaveURL('/mi-turno/' + workspaceId + '/operacion')
})
test('admin menu opens and navigates to the QR section', async ({ page }, testInfo) => {
  await mockApi(page)
  await page.goto('/mi-turno/' + workspaceId + '/operacion')
  await expect(page.getByRole('heading', { name: 'Ana Prueba' })).toBeVisible()
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('sidebar-operation.png'), fullPage: true })
  if (await page.getByRole('button', { name: 'Abrir menú', exact: true }).isVisible()) {
    await page.getByRole('button', { name: 'Abrir menú', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Menú de administración' })).toBeVisible()
  }
  await page.getByRole('link', { name: 'QR y cartel', exact: true }).click()
  await expect(page.getByRole('img', { name: 'QR para tomar un turno en Oficina de atención' })).toBeVisible()
  await noOverflow(page)
})