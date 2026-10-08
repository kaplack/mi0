import { test, expect } from '@playwright/test'
import fs from 'node:fs'
const readFixture = () => JSON.parse(fs.readFileSync(new URL('../.cita-fixture.json', import.meta.url), 'utf8'))
const apiUrl = 'http://127.0.0.1:3002/api/citas'
async function login(page, token) { await page.addInitScript(value => localStorage.setItem('mi0_user_token', value), token) }
async function navigateSection(page, title, mobile) {
  if (mobile) await page.getByRole('button', { name: 'Abrir menú', exact: true }).click()
  await page.getByRole('link', { name: title, exact: true }).click()
}
async function overflow(page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true) }
async function details(page, patient, mobile) {
  const row = page.locator(mobile ? '.cita-appointment-cards .cita-card' : '.cita-table tbody tr').filter({ hasText: patient })
  await row.getByRole('button', { name: 'Ver detalles' }).click()
}
async function config(request, fixture, requireDni) {
  const response = await request.put(apiUrl + '/workspace/' + fixture.workspaceId + '/settings', { headers: { Authorization: 'Bearer ' + fixture.ownerToken }, data: { name: 'Consultorio Vida', timezone: 'America/Lima', requireDni, expirationHours: null } })
  expect(response.ok()).toBe(true)
}
test('owner config, professional editing, QR download and persistent desktop/mobile navigation', async ({ page, context }, testInfo) => {
  const f = readFixture(); const mobile = testInfo.project.name === 'mobile'
  await login(page, f.ownerToken)
  await page.goto('/mi-cita/' + f.workspaceId)
  await expect(page.getByRole('heading', { name: 'Agenda diaria' })).toBeVisible()
  if (!mobile) {
    await expect(page.getByRole('complementary', { name: 'Menú de Mi Cita' })).toBeVisible()
    await page.getByRole('button', { name: 'Colapsar menú' }).click()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Expandir menú' })).toBeVisible()
    await page.getByRole('button', { name: 'Expandir menú' }).click()
  }
  await navigateSection(page, 'Configuración', mobile)
  await expect(page.getByRole('heading', { name: 'Configuración del consultorio' })).toBeVisible()
  await page.getByRole('switch', { name: 'Solicitar DNI al reservar' }).check()
  await page.getByRole('button', { name: 'Guardar configuración' }).click()
  await expect(page.getByRole('status')).toContainText('Configuración guardada')
  await overflow(page)
  await page.screenshot({ path: testInfo.outputPath('configuracion.png'), fullPage: true })
  await navigateSection(page, 'Profesionales', mobile)
  await page.getByRole('button', { name: 'Agregar profesional' }).click()
  await page.getByRole('textbox', { name: 'Nombre del profesional' }).fill('Dra. Nueva ' + testInfo.project.name)
  await page.getByRole('textbox', { name: 'Especialidad', exact: true }).fill('Consulta general')
  await page.getByRole('button', { name: 'Agregar bloque de atención' }).click()
  await page.getByRole('button', { name: 'Guardar profesional' }).click()
  await expect(page.getByRole('heading', { name: 'Dra. Nueva ' + testInfo.project.name })).toBeVisible()
  await page.getByRole('button', { name: 'Editar Dra. Nueva ' + testInfo.project.name }).click()
  await page.getByRole('switch', { name: 'Profesional activo para nuevas reservas' }).uncheck()
  await page.getByRole('button', { name: 'Guardar profesional' }).click()
  await expect(page.locator('article').filter({ hasText: 'Dra. Nueva ' + testInfo.project.name })).toContainText('Inactivo')
  await overflow(page)
  await navigateSection(page, 'QR y enlace', mobile)
  await expect(page.getByRole('img', { name: /QR para solicitar/ })).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Descargar QR' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('mi-cita-' + f.code + '.png')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copiar enlace' }).click()
  await expect(page.getByText('Enlace copiado al portapapeles.')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('http://localhost:5175/cita/' + f.code)
  await overflow(page)
  if (mobile) {
    await page.getByRole('button', { name: 'Abrir menú', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  }
})
test('patient booking without DNI, assistant confirmation/cancellation, receipt and WhatsApp privacy', async ({ page, context, request }, testInfo) => {
  const f = readFixture(); const mobile = testInfo.project.name === 'mobile'
  await config(request, f, false)
  await page.goto('/cita/' + f.code)
  await expect(page.getByRole('heading', { name: 'Consultorio Vida', exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Profesional', exact: true }).selectOption(f.professionals[1].id)
  await page.getByLabel('Fecha', { exact: true }).fill(f.tomorrow)
  await page.getByRole('group', { name: 'Horarios disponibles' }).getByRole('button').first().click()
  await expect(page.getByLabel('DNI', { exact: true })).toHaveCount(0)
  const patientName = 'Paciente UI ' + testInfo.project.name
  await page.getByLabel('Nombre completo').fill(patientName)
  await page.getByLabel('Teléfono con código de país').fill('+51 987 654 321')
  await overflow(page)
  await page.screenshot({ path: testInfo.outputPath('solicitud.png'), fullPage: true })
  await page.getByRole('button', { name: 'Solicitar cita', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Solicitud recibida' })).toBeVisible()
  await expect(page.getByText('Pendiente de confirmación', { exact: true })).toBeVisible()
  const assistant = await context.newPage()
  await login(assistant, f.memberToken)
  await assistant.goto('/mi-cita/' + f.workspaceId)
  await expect(assistant.getByRole('heading', { name: 'Solicitudes pendientes' })).toBeVisible()
  if (mobile) await expect(assistant.getByRole('navigation', { name: 'Navegación de la asistente' })).toBeVisible()
  else await expect(assistant.getByRole('complementary', { name: 'Menú de Mi Cita' })).toBeVisible()
  await expect(assistant.getByRole('link', { name: 'Configuración', exact: true })).toHaveCount(0)
  await details(assistant, patientName, mobile)
  await expect(assistant.getByRole('dialog', { name: 'Detalles de la cita' })).toBeVisible()
  await assistant.screenshot({ path: testInfo.outputPath('detalles.png') })
  await assistant.keyboard.press('Escape')
  await expect(assistant.getByRole('dialog')).toHaveCount(0)
  await details(assistant, patientName, mobile)
  const whatsapp = assistant.getByRole('link', { name: /Contactar por WhatsApp/ })
  await expect(whatsapp).toHaveAttribute('href', /wa\.me\/51987654321\?text=/)
  expect(decodeURIComponent(await whatsapp.getAttribute('href'))).not.toContain('12345678')
  await assistant.getByRole('button', { name: 'Confirmar cita', exact: true }).click()
  await expect(assistant.getByRole('status')).toContainText('Cita confirmada')
  await page.getByRole('button', { name: 'Actualizar estado' }).click()
  await expect(page.getByRole('heading', { name: 'Cita confirmada' })).toBeVisible()
  await assistant.getByRole('link', { name: 'Agenda', exact: true }).click()
  await assistant.getByLabel('Fecha', { exact: true }).fill(f.tomorrow)
  await details(assistant, patientName, mobile)
  await assistant.getByRole('button', { name: 'Cancelar cita', exact: true }).click()
  await assistant.getByRole('button', { name: 'Sí, cancelar cita', exact: true }).click()
  await expect(assistant.getByRole('status')).toContainText('Cita cancelada')
  await overflow(assistant)
  await assistant.screenshot({ path: testInfo.outputPath('agenda-asistente.png'), fullPage: true })
  await page.getByRole('button', { name: 'Actualizar estado' }).click()
  await expect(page.getByText('Cancelada', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Solicitar otra cita' })).toBeVisible()
  await assistant.goto('/mi-cita/' + f.workspaceId + '/configuracion')
  await expect(assistant.getByText('Solo el propietario o administrador puede acceder a esta sección.')).toBeVisible()
  await assistant.close()
})
test('required DNI flow validates and empty day is actionable', async ({ page, request }) => {
  const f = readFixture(); await config(request, f, true)
  await page.goto('/cita/' + f.code)
  await page.getByRole('combobox', { name: 'Profesional', exact: true }).selectOption(f.professionals[1].id)
  const noScheduleDay = new Date(Date.parse(f.tomorrow + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10)
  await page.getByLabel('Fecha', { exact: true }).fill(noScheduleDay)
  await expect(page.getByText('No hay horarios disponibles este día. Prueba otra fecha.')).toBeVisible()
  await page.getByLabel('Fecha', { exact: true }).fill(f.tomorrow)
  await page.getByRole('group', { name: 'Horarios disponibles' }).getByRole('button').first().click()
  await expect(page.getByLabel('DNI', { exact: true })).toBeVisible()
  await page.getByLabel('Nombre completo').fill('Paciente DNI')
  await page.getByLabel('Teléfono con código de país').fill('+51 912 345 678')
  await page.getByLabel('DNI', { exact: true }).fill('123')
  await page.getByRole('button', { name: 'Solicitar cita', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Solicitud recibida' })).toHaveCount(0)
  await page.getByLabel('DNI', { exact: true }).fill('12345678')
  await page.getByRole('button', { name: 'Solicitar cita', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Solicitud recibida' })).toBeVisible()
  await overflow(page)
})
test('lost booking response recovers the real receipt without a duplicate request', async ({ page, request }) => {
  const f = readFixture(); await config(request, f, false)
  let submitted = null
  await page.route('**/api/citas/public/*/appointments', async route => {
    submitted = route.request().postDataJSON()
    const response = await route.fetch()
    expect(response.status()).toBe(201)
    await route.abort('connectionfailed')
  })
  await page.goto('/cita/' + f.code)
  await page.getByRole('combobox', { name: 'Profesional', exact: true }).selectOption(f.professionals[0].id)
  await page.getByLabel('Fecha', { exact: true }).fill(f.tomorrow)
  await page.getByRole('group', { name: 'Horarios disponibles' }).getByRole('button').first().click()
  await page.getByLabel('Nombre completo').fill('Paciente Respuesta Perdida')
  await page.getByLabel('Teléfono con código de país').fill('+51 901 234 567')
  await page.getByRole('button', { name: 'Solicitar cita', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Solicitud recibida' })).toBeVisible()
  const response = await request.get(apiUrl + '/workspace/' + f.workspaceId + '/appointments?date=' + f.tomorrow, { headers: { Authorization: 'Bearer ' + f.ownerToken } })
  const data = await response.json()
  const matching = data.appointments.filter(a => a.professionalId === submitted.professionalId && a.startsAt === submitted.startsAt)
  expect(matching).toHaveLength(1)
  expect(matching[0].patientName).toBe('Paciente Respuesta Perdida')
})

test('next 7 and 30 days persist, filter and update colors when managing appointments', async ({ page, request }, testInfo) => {
  const f = readFixture(); const mobile = testInfo.project.name === 'mobile';
  await config(request, f, false);
  const professionalResponse = await request.post(apiUrl + '/workspace/' + f.workspaceId + '/professionals', {headers:{Authorization:'Bearer '+f.ownerToken},data:{name:'Profesional resumen '+testInfo.project.name,specialty:'Podología',active:true,durationMinutes:30,schedules:[{weekday:new Date(f.tomorrow+'T12:00:00Z').getUTCDay(),startMinute:540,endMinute:720}]}});
  expect(professionalResponse.status()).toBe(201);
  const professionalId = (await professionalResponse.json()).professional.id;
  const availability = await request.get(apiUrl + '/public/' + f.code + '/availability?professionalId=' + professionalId + '&date=' + f.tomorrow);
  const slots = (await availability.json()).slots;
  const patientName = 'Resumen ' + testInfo.project.name;
  const created = await request.post(apiUrl + '/public/' + f.code + '/appointments', {data:{professionalId:professionalId, startsAt:slots[0].startsAt, requestKey:crypto.randomUUID(),patientName,phone:'+51987654321'}});
  expect(created.status()).toBe(201);
  await login(page, f.memberToken);
  await page.goto('/mi-cita/' + f.workspaceId);
  await page.getByRole('link', {name:'Agenda',exact:true}).click();
  const ranges = page.getByRole('group', {name:'Rango de agenda'});
  await expect(ranges.getByRole('button')).toHaveCount(2);
  await expect(page.locator('.cita-day')).toHaveCount(7);
  await page.getByRole('combobox', {name:'Profesional',exact:true}).selectOption(professionalId);
  const tomorrowLabel = new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(f.tomorrow+'T12:00:00Z'));
  const exactDay = page.getByRole('button', {name:new RegExp('^'+tomorrowLabel+':')});
  await expect(exactDay).toHaveClass(/cita-day-pending/);
  await exactDay.click();
  await expect(page.getByLabel('Fecha', {exact:true})).toHaveValue(f.tomorrow);
  await details(page, patientName, mobile);
  await page.getByRole('button',{name:'Confirmar cita',exact:true}).click();
  await expect(exactDay).toHaveClass(/cita-day-confirmed/);
  await ranges.getByRole('button',{name:'Próximos 30 días',exact:true}).click();
  await expect(page.locator('.cita-day')).toHaveCount(30);
  await overflow(page);
  await page.screenshot({path:testInfo.outputPath('proximos-30.png'),fullPage:true});
  await page.reload();
  await expect(ranges.getByRole('button',{name:'Próximos 30 días',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('combobox', {name:'Profesional',exact:true}).selectOption(professionalId);
  await exactDay.click();
  await details(page, patientName, mobile);
  await page.getByRole('button',{name:'Cancelar cita',exact:true}).click();
  await page.getByRole('button',{name:'Sí, cancelar cita',exact:true}).click();
  await expect(exactDay).toHaveClass(/cita-day-empty/);
  await ranges.getByRole('button',{name:'Próximos 7 días',exact:true}).click();
  await expect(page.locator('.cita-day')).toHaveCount(7);
  if (mobile) await page.setViewportSize({width:320,height:740});
  await overflow(page);
  await page.screenshot({path:testInfo.outputPath('proximos-7.png'),fullPage:true});
});
