import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import fs from 'node:fs'
export default async function teardown() {
  const fixtureUrl = new URL('../.cita-fixture.json', import.meta.url)
  if (fs.existsSync(fixtureUrl)) {
    const fixture = JSON.parse(fs.readFileSync(fixtureUrl, 'utf8'))
    await fetch('http://127.0.0.1:3002/__cita-test/stop', { method: 'POST', headers: { Authorization: 'Bearer ' + fixture.ownerToken } }).catch(() => {})
  }
  execFileSync(process.execPath, [fileURLToPath(new URL('../../api/citas/cleanup-ui.cjs', import.meta.url))], { stdio: 'inherit' })
}
