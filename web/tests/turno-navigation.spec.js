import { test, expect } from '@playwright/test'
test('admin drawer and operator bottom navigation', async ({ page }, testInfo) => {
  let role = 'OWNER'
  const id = '11111111-1111-4111-8111-111111111111'
  await page.addInitScript(() => localStorage.setItem('mi0_user_token', 'test-token'))
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    const data = path.endsWith('/auth/me') ? { user: { id: 'test' } } : path.endsWith('/workspaces') ? { workspaces: [{ id, name: 'Oficina', role }] } : { role, assignedCounter: 1, queue: { id: 'queue', name: 'Oficina', code: 'queue-test', counterNames: ['Ventanilla 1'] }, tickets: [] }
    return route.fulfill({ json: data })
  })
  await page.goto('/mi-turno/' + id + '/operacion')
  if (testInfo.project.name === 'desktop') {
    await expect(page.getByRole('complementary', { name: 'Menú de Mi Turno' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Abrir menú', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Colapsar menú', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Expandir menú', exact: true })).toBeVisible()
    role = 'MEMBER'
    await page.goto('/mi-turno/' + id + '/operacion')
    await expect(page.getByRole('complementary', { name: 'Menú de Mi Turno' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Navegación del operador' })).toHaveCount(0)
    return
  }
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Menú de administración' })).toBeVisible()
  await page.getByRole('link', { name: 'Configuración', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Configuración del negocio' })).toBeVisible()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  role = 'MEMBER'
  await page.goto('/mi-turno/' + id + '/operacion')
  const nav = page.getByRole('navigation', { name: 'Navegación del operador' })
  await expect(nav).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir menú', exact: true })).toHaveCount(0)
  await nav.getByRole('link', { name: 'QR y cartel' }).click()
  await expect(page.getByRole('heading', { name: 'QR para los clientes' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'QR y cartel' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: /Pantalla pública/ })).toHaveAttribute('target', '_blank')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
